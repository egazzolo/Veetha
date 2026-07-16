import { verifyStoreKitJWS } from './storekit-jws-verify.ts'
import { getTransactionInfo } from './app-store-server-api.ts'
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const APPLE_SHARED_SECRET = Deno.env.get('APPLE_SHARED_SECRET')!
const GOOGLE_SERVICE_ACCOUNT_JSON = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_JSON')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const APPLE_PRODUCT_IDS = [
  'com.yourname.veetha.premium.plan',
  'com.yourname.veetha.premium.annual',
]

const GOOGLE_PACKAGE_NAME = 'com.yourname.veetha'
const GOOGLE_PRODUCT_IDS = [
  'com.yourname.veetha.premium.plan',
  'com.yourname.veetha.premium.annual',
]

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

const GOOGLE_FETCH_TIMEOUT_MS = 15_000

async function fetchWithTimeout(url: string, init: RequestInit, label: string): Promise<Response> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), GOOGLE_FETCH_TIMEOUT_MS)
  try {
    return await fetch(url, { ...init, signal: controller.signal })
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new Error(`${label} timed out after ${GOOGLE_FETCH_TIMEOUT_MS}ms`)
    }
    throw err
  } finally {
    clearTimeout(timeout)
  }
}

// ── Google JWT auth ──────────────────────────────────────────────
async function getGoogleAccessToken(): Promise<string> {
  const serviceAccount = JSON.parse(GOOGLE_SERVICE_ACCOUNT_JSON)
  const now = Math.floor(Date.now() / 1000)

  const header = { alg: 'RS256', typ: 'JWT' }
  const payload = {
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/androidpublisher',
    aud: serviceAccount.token_uri,
    exp: now + 3600,
    iat: now,
  }

  const encode = (obj: object) =>
    btoa(JSON.stringify(obj)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')

  const headerB64 = encode(header)
  const payloadB64 = encode(payload)
  const signingInput = `${headerB64}.${payloadB64}`

  // Import private key
  const privateKeyPem = serviceAccount.private_key
  const pemContents = privateKeyPem
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\n/g, '')

  const binaryDer = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0))
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    binaryDer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  )

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    new TextEncoder().encode(signingInput)
  )

  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')

  const jwt = `${signingInput}.${signatureB64}`

  const tokenRes = await fetchWithTimeout(serviceAccount.token_uri, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  }, 'Google token exchange')

  const tokenData = await tokenRes.json()
  return tokenData.access_token
}

// ── Apple validation ─────────────────────────────────────────────
async function validateAppleReceipt(transactionJws: string, userId: string) {
  const parts = transactionJws.split('.')
  if (parts.length !== 3) {
    return { valid: false, error: 'Malformed transaction JWS from client' }
  }

  let unverifiedPayload: any
  try {
    const json = atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'))
    unverifiedPayload = JSON.parse(json)
  } catch {
    return { valid: false, error: 'Could not decode transaction JWS payload' }
  }

  const transactionId = unverifiedPayload.transactionId
  if (!transactionId) {
    return { valid: false, error: 'No transactionId in submitted JWS' }
  }

  let signedTransactionInfo: string
  try {
    signedTransactionInfo = await getTransactionInfo(transactionId)
  } catch (err) {
    return { valid: false, error: `Apple Get Transaction Info failed: ${err.message}` }
  }

  const verification = await verifyStoreKitJWS(signedTransactionInfo)
  if (!verification.valid) {
    return { valid: false, error: `JWS verification failed: ${verification.reason}` }
  }

  const payload = verification.payload

  if (payload.appAccountToken !== userId) {
    return { valid: false, error: 'Transaction does not belong to this user' }
  }

  if (!APPLE_PRODUCT_IDS.includes(payload.productId ?? '')) {
    return { valid: false, error: 'Unrecognized product ID' }
  }

  const now = Date.now()
  const expiresMs = payload.expiresDate ?? 0

  if (expiresMs <= now) {
    await supabase.from('profiles').update({
      is_premium: false,
      subscription_expires_at: null,
      subscription_product_id: null,
    }).eq('id', userId)
    return { valid: false, error: 'Subscription expired' }
  }

  const expiresAt = new Date(expiresMs).toISOString()

  await supabase.from('profiles').update({
    is_premium: true,
    subscription_expires_at: expiresAt,
    subscription_product_id: payload.productId,
  }).eq('id', userId)

  return { valid: true, expiresAt, productId: payload.productId }
}

// ── Google validation ────────────────────────────────────────────
async function validateGooglePurchase(
  productId: string,
  purchaseToken: string,
  userId: string
) {
  const accessToken = await getGoogleAccessToken()

  const url = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${GOOGLE_PACKAGE_NAME}/purchases/subscriptionsv2/tokens/${purchaseToken}`

  const res = await fetchWithTimeout(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  }, 'Google Play purchase lookup')

  const data = await res.json()

  if (!res.ok) {
    return { valid: false, error: data.error?.message || 'Google API error' }
  }

  // Check subscription state
  const lineItems = data.lineItems || []
  const activeItem = lineItems.find((item: any) =>
    GOOGLE_PRODUCT_IDS.includes(item.productId) &&
    item.expiryTime &&
    new Date(item.expiryTime) > new Date()
  )

  if (!activeItem) {
    await supabase.from('profiles').update({
      is_premium: false,
      subscription_expires_at: null,
      subscription_product_id: null,
    }).eq('id', userId)
    return { valid: false, error: 'No active subscription' }
  }

  const expiresAt = new Date(activeItem.expiryTime).toISOString()

  await supabase.from('profiles').update({
    is_premium: true,
    subscription_expires_at: expiresAt,
    subscription_product_id: activeItem.productId,
    android_purchase_token: purchaseToken,
  }).eq('id', userId)

  return { valid: true, expiresAt, productId: activeItem.productId }
}

// ── Main handler ─────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, content-type',
      },
    })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    }

    // Get user from JWT
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    )

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    }

    const body = await req.json()
    const { platform, transactionJws, productId, purchaseToken } = body

    let result

    if (platform === 'ios') {
      if (!transactionJws) {
        return new Response(JSON.stringify({ error: 'transactionJws required' }), { status: 400 })
      }
      result = await validateAppleReceipt(transactionJws, user.id)
    } else if (platform === 'android') {
      if (!productId || !purchaseToken) {
        return new Response(JSON.stringify({ error: 'productId and purchaseToken required' }), { status: 400 })
      }
      result = await validateGooglePurchase(productId, purchaseToken, user.id)
    } else {
      return new Response(JSON.stringify({ error: 'platform must be ios or android' }), { status: 400 })
    }

    return new Response(JSON.stringify(result), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})