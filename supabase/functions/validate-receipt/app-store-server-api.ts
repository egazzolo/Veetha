const APPLE_ISSUER_ID = Deno.env.get('APPLE_ISSUER_ID')!
const APPLE_KEY_ID = Deno.env.get('APPLE_KEY_ID')!
const APPLE_IAP_PRIVATE_KEY = Deno.env.get('APPLE_IAP_PRIVATE_KEY')!
const APPLE_BUNDLE_ID = 'com.yourname.veetha'

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

function pemToDer(pem: string): Uint8Array {
  const b64 = pem
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s/g, '')
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

async function signAppleServerJWT(): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  const header = { alg: 'ES256', kid: APPLE_KEY_ID, typ: 'JWT' }
  const payload = {
    iss: APPLE_ISSUER_ID,
    iat: now,
    exp: now + 1200,
    aud: 'appstoreconnect-v1',
    bid: APPLE_BUNDLE_ID,
  }

  const encode = (obj: object) =>
    base64UrlEncode(new TextEncoder().encode(JSON.stringify(obj)))

  const headerB64 = encode(header)
  const payloadB64 = encode(payload)
  const signingInput = `${headerB64}.${payloadB64}`

  const derBytes = pemToDer(APPLE_IAP_PRIVATE_KEY)
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    derBytes,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  )

  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    cryptoKey,
    new TextEncoder().encode(signingInput)
  )

  const signatureB64 = base64UrlEncode(new Uint8Array(signature))
  return `${signingInput}.${signatureB64}`
}

const APPLE_FETCH_TIMEOUT_MS = 15_000

export async function getTransactionInfo(transactionId: string): Promise<string> {
  const jwt = await signAppleServerJWT()

  const fetchFrom = async (baseUrl: string) => {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), APPLE_FETCH_TIMEOUT_MS)
    try {
      return await fetch(`${baseUrl}/inApps/v1/transactions/${transactionId}`, {
        headers: { Authorization: `Bearer ${jwt}` },
        signal: controller.signal,
      })
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        throw new Error(`Apple Get Transaction Info timed out after ${APPLE_FETCH_TIMEOUT_MS}ms (${baseUrl})`)
      }
      throw err
    } finally {
      clearTimeout(timeout)
    }
  }

  let res = await fetchFrom('https://api.storekit.apple.com')
  if (res.status === 404) {
    res = await fetchFrom('https://api.storekit-sandbox.apple.com')
  }

  if (!res.ok) {
    const bodyText = await res.text().catch(() => '<failed to read response body>')
    console.error(`Apple Get Transaction Info failed: ${res.status}`, bodyText)
    throw new Error(`Apple Get Transaction Info failed: ${res.status} - ${bodyText}`)
  }

  const data = await res.json()
  return data.signedTransactionInfo
}