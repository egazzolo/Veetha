// Standalone StoreKit 2 JWS verification module.
//
// NOT YET WIRED into index.ts — this is for review before integration.
//
// Verifies a StoreKit 2 signed transaction / renewal info JWS
// (compact form: base64url(header).base64url(payload).base64url(signature))
// by:
//   1. Decoding the header and extracting the x5c certificate chain.
//   2. Validating that chain against a hardcoded Apple Root CA - G3.
//   3. Verifying the JWS signature against the leaf certificate's public key.
//   4. Only then decoding and returning the payload.
//
// If any step fails, the function returns a `{ valid: false }` result and
// never returns payload fields — there is no partial-trust path.

// Must be the first import: pkijs crashes during its own module-level
// self-init (see process-pid-polyfill.ts for why, and why import order
// is what makes this fix work rather than a same-file statement placed
// after the pkijs import).
import "./process-pid-polyfill.ts";
import * as pkijs from "npm:pkijs@3.4.0";
import * as asn1js from "npm:asn1js@3.0.10";

// ---------------------------------------------------------------------------
// Engine setup (module load time)
// ---------------------------------------------------------------------------
//
// pkijs has no built-in Deno detection (only "node" / "browser" heuristics
// in its default getEngine() fallback), so it needs an explicit CryptoEngine
// bound to Deno's standard WebCrypto implementation.
//
// Import strategy: `npm:` specifier, not esm.sh.
// Supabase's Edge Runtime (Deno-based) has first-class support for `npm:`
// specifiers and resolves pkijs's full dependency graph (asn1js, pvutils,
// pvtsutils, tslib) as one consistent tree from the npm registry. esm.sh is
// a third-party CDN that re-bundles npm packages on the fly for ESM/browser
// consumption; for multi-package graphs like pkijs it has a history of
// resolving mismatched transitive versions (e.g. serving pkijs a different
// asn1js build than the one it expects), which breaks ASN.1 class identity
// checks (`instanceof` across duplicated class definitions) in subtle,
// hard-to-debug ways. We are not 100% certain esm.sh would fail for this
// exact version combination — only that `npm:` avoids the whole class of
// bug by construction, which matters more for a receipt-verification path.
// If `npm:` specifiers are ever unavailable in a target deployment, fall
// back to esm.sh but pin exact versions for every package in the chain.
const cryptoEngine = new pkijs.CryptoEngine({
  name: "deno",
  crypto: globalThis.crypto,
  subtle: globalThis.crypto.subtle,
});

// --- pkijs's Node/browser heuristic is broken on Deno v2 (which this
// Edge Runtime uses) ---------------------------------------------------
//
// pkijs's setEngine()/getEngine() (pkijs@3.4.0, src/common.ts) decide
// "Node.js vs. browser" purely via `typeof window === "undefined"`. Deno v2
// removed the `window` global entirely (it was only a Deno 1.x alias for
// globalThis), so that check now misfires and pkijs takes its "Node.js"
// branch. That branch runs `global[process.pid] = {}`. The crash this
// caused at *module load time* — before this fix — is handled separately
// by process-pid-polyfill.ts (imported above, first, on purpose); see
// that file for the full explanation of why a `window` shim placed here
// cannot prevent it (pkijs's own module-level self-init runs to
// completion before any statement in this file executes, so by the time
// this line runs, pkijs has already taken the Node.js branch once —
// process-pid-polyfill.ts is what keeps that first pass from throwing).
//
// This shim still earns its keep for everything *after* module load:
// this is a known, still-unresolved pkijs design issue, not something
// fixed by bumping versions: see
// github.com/PeculiarVentures/PKI.js/issues/210, where the maintainer says
// of this exact Node/browser heuristic "there is no best solution here".
// pkijs's Certificate / CertificateChainValidationEngine APIs also have no
// way to inject a crypto engine that bypasses setEngine()/getEngine(), so
// we can't route around the global registry either. Defining `window`
// here — now that it's reachable — routes our own setEngine("deno", ...)
// call below, and every getEngine() call pkijs makes internally from this
// point on, into the safe "browser" branch (`engine = { name, crypto }`,
// a plain module-scoped variable that never touches `global`/`globalThis`
// again), rather than continuing to depend on the pid-keyed global object.
if (typeof (globalThis as Record<string, unknown>).window === "undefined") {
  (globalThis as Record<string, unknown>).window = globalThis;
}

pkijs.setEngine("deno", cryptoEngine);

// ---------------------------------------------------------------------------
// Hardcoded trust anchor: Apple Root CA - G3
// ---------------------------------------------------------------------------
//
// Fetched directly from https://www.apple.com/certificateauthority/AppleRootCA-G3.cer
// (verified 2026-07-12). Do not replace with a copy from any source other
// than apple.com/certificateauthority.
//
//   Subject / Issuer : CN=Apple Root CA - G3, OU=Apple Certification
//                       Authority, O=Apple Inc., C=US
//   Validity         : 2014-04-30 -> 2039-04-30
//   Serial           : 2D:C5:FC:88:D2:C5:4B:95
//   SHA-256 fingerprint: 63:34:3A:BF:B8:9A:6A:03:EB:B5:7E:9B:3F:5F:A7:BE:
//                        7C:4F:5C:75:6F:30:17:B3:A8:C4:88:C3:65:3E:91:79
const APPLE_ROOT_CA_G3_BASE64 =
  "MIICQzCCAcmgAwIBAgIILcX8iNLFS5UwCgYIKoZIzj0EAwMwZzEbMBkGA1UEAwwS" +
  "QXBwbGUgUm9vdCBDQSAtIEczMSYwJAYDVQQLDB1BcHBsZSBDZXJ0aWZpY2F0aW9u" +
  "IEF1dGhvcml0eTETMBEGA1UECgwKQXBwbGUgSW5jLjELMAkGA1UEBhMCVVMwHhcN" +
  "MTQwNDMwMTgxOTA2WhcNMzkwNDMwMTgxOTA2WjBnMRswGQYDVQQDDBJBcHBsZSBS" +
  "b290IENBIC0gRzMxJjAkBgNVBAsMHUFwcGxlIENlcnRpZmljYXRpb24gQXV0aG9y" +
  "aXR5MRMwEQYDVQQKDApBcHBsZSBJbmMuMQswCQYDVQQGEwJVUzB2MBAGByqGSM49" +
  "AgEGBSuBBAAiA2IABJjpLz1AcqTtkyJygRMc3RCV8cWjTnHcFBbZDuWmBSp3ZHtf" +
  "TjjTuxxEtX/1H7YyYl3J6YRbTzBPEVoA/VhYDKX1DyxNB0cTddqXl5dvMVztK517" +
  "IDvYuVTZXpmkOlEKMaNCMEAwHQYDVR0OBBYEFLuw3qFYM4iapIqZ3r6966/ayySr" +
  "MA8GA1UdEwEB/wQFMAMBAf8wDgYDVR0PAQH/BAQDAgEGMAoGCCqGSM49BAMDA2gA" +
  "MGUCMQCD6cHEFl4aXTQY2e3v9GwOAEZLuN+yRhHFD/3meoyhpmvOwgPUnPWTxnS4" +
  "at+qIxUCMG1mihDK1A3UT82NQz60imOlM27jbdoXt2QfyFMm+YhidDkLF1vLUagM" +
  "6BgD56KyKA==";

// ---------------------------------------------------------------------------
// Result & payload types
// ---------------------------------------------------------------------------

export type StoreKitJWSVerificationResult =
  | { valid: true; payload: JWSTransactionDecodedPayload }
  | { valid: false; reason: string };

// Subset of Apple's JWSTransactionDecodedPayload / JWSRenewalInfoDecodedPayload
// fields that callers in this codebase rely on today. Apple periodically adds
// fields, so unknown keys are preserved rather than stripped.
export interface JWSTransactionDecodedPayload {
  transactionId?: string;
  originalTransactionId?: string;
  bundleId?: string;
  productId?: string;
  subscriptionGroupIdentifier?: string;
  purchaseDate?: number;
  originalPurchaseDate?: number;
  expiresDate?: number;
  quantity?: number;
  type?: string;
  appAccountToken?: string;
  inAppOwnershipType?: string;
  signedDate?: number;
  environment?: "Sandbox" | "Production";
  transactionReason?: string;
  storefront?: string;
  storefrontId?: string;
  price?: number;
  currency?: string;
  offerType?: number;
  offerIdentifier?: string;
  revocationDate?: number;
  revocationReason?: number;
  [key: string]: unknown;
}

interface StoreKitJWSHeader {
  alg?: string;
  x5c?: string[];
}

// ---------------------------------------------------------------------------
// base64 / base64url helpers (no Node `Buffer` — Deno-native only)
// ---------------------------------------------------------------------------

function standardBase64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function base64UrlToBytes(b64url: string): Uint8Array {
  const b64 = b64url.replace(/-/g, "+").replace(/_/g, "/");
  const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
  return standardBase64ToBytes(padded);
}

function base64UrlToUtf8String(b64url: string): string {
  return new TextDecoder().decode(base64UrlToBytes(b64url));
}

// x5c entries are RFC 7515 §4.1.6 standard base64 (not base64url) DER bytes.
function certificateFromX5cEntry(x5cEntryBase64: string): pkijs.Certificate {
  const derBytes = standardBase64ToBytes(x5cEntryBase64);
  const asn1 = asn1js.fromBER(derBytes.buffer);
  if (asn1.offset === -1) {
    throw new Error("could not parse certificate ASN.1 structure");
  }
  return new pkijs.Certificate({ schema: asn1.result });
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

export async function verifyStoreKitJWS(
  jws: string,
): Promise<StoreKitJWSVerificationResult> {
  try {
    const parts = jws.split(".");
    if (parts.length !== 3) {
      return {
        valid: false,
        reason: `Malformed JWS: expected 3 dot-separated segments, got ${parts.length}`,
      };
    }
    const [headerB64, payloadB64, signatureB64] = parts;

    // --- Step 1: decode header, extract x5c -----------------------------
    let header: StoreKitJWSHeader;
    try {
      header = JSON.parse(base64UrlToUtf8String(headerB64));
    } catch {
      return { valid: false, reason: "Malformed JWS header: not valid JSON" };
    }

    if (header.alg !== "ES256") {
      return {
        valid: false,
        reason: `Unsupported JWS algorithm: ${header.alg ?? "(missing)"}`,
      };
    }

    if (!Array.isArray(header.x5c) || header.x5c.length < 2) {
      return {
        valid: false,
        reason: "JWS header is missing an x5c chain (need leaf + intermediate)",
      };
    }

    let chainCerts: pkijs.Certificate[];
    try {
      chainCerts = header.x5c.map(certificateFromX5cEntry);
    } catch (err) {
      return {
        valid: false,
        reason: `Failed to parse x5c certificates: ${(err as Error).message}`,
      };
    }
    const leafCert = chainCerts[0];

    let rootCert: pkijs.Certificate;
    try {
      rootCert = certificateFromX5cEntry(APPLE_ROOT_CA_G3_BASE64);
    } catch (err) {
      return {
        valid: false,
        reason: `Failed to parse hardcoded Apple root certificate: ${
          (err as Error).message
        }`,
      };
    }

    // --- Step 2: validate chain against the hardcoded root --------------
    let chainResult: Awaited<
      ReturnType<pkijs.CertificateChainValidationEngine["verify"]>
    >;
    try {
      const chainEngine = new pkijs.CertificateChainValidationEngine({
        trustedCerts: [rootCert],
        certs: chainCerts,
        checkDate: new Date(),
      });
      chainResult = await chainEngine.verify();
    } catch (err) {
      return {
        valid: false,
        reason: `Certificate chain validation threw: ${(err as Error).message}`,
      };
    }

    if (!chainResult.result) {
      return {
        valid: false,
        reason: `Certificate chain is not trusted: ${chainResult.resultMessage}`,
      };
    }

    // --- Step 3: verify the JWS signature against the leaf's public key -
    let publicKey: CryptoKey;
    try {
      publicKey = await leafCert.getPublicKey({
        algorithm: {
          algorithm: { name: "ECDSA", namedCurve: "P-256" },
          usages: ["verify"],
        },
      });
    } catch (err) {
      return {
        valid: false,
        reason: `Failed to import leaf certificate public key: ${
          (err as Error).message
        }`,
      };
    }

    // ES256 JWS signatures are already raw r||s (IEEE P1363), which is
    // exactly what WebCrypto's "ECDSA" verify expects — no DER conversion.
    const signingInput = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
    const signatureBytes = base64UrlToBytes(signatureB64);

    let signatureIsValid: boolean;
    try {
      signatureIsValid = await crypto.subtle.verify(
        { name: "ECDSA", hash: "SHA-256" },
        publicKey,
        signatureBytes,
        signingInput,
      );
    } catch (err) {
      return {
        valid: false,
        reason: `Signature verification threw: ${(err as Error).message}`,
      };
    }

    if (!signatureIsValid) {
      return {
        valid: false,
        reason: "JWS signature does not match the leaf certificate's public key",
      };
    }

    // --- Step 4: only now decode and return the payload ------------------
    let payload: JWSTransactionDecodedPayload;
    try {
      payload = JSON.parse(base64UrlToUtf8String(payloadB64));
    } catch {
      return { valid: false, reason: "Malformed JWS payload: not valid JSON" };
    }

    return { valid: true, payload };
  } catch (err) {
    return {
      valid: false,
      reason: `Unexpected error during verification: ${(err as Error).message}`,
    };
  }
}
