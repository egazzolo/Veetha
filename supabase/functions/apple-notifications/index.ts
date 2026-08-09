// Apple App Store Server Notifications V2 webhook.
//
// Apple POSTs here directly whenever a transaction event happens (purchase,
// renewal, expiration, refund, ...) — independent of whether the device's
// own StoreKit purchaseUpdatedListener ever fires. This is a second,
// independent path into `profiles.is_premium`, alongside the client-driven
// path in supabase/functions/validate-receipt/index.ts. Both must keep
// working on their own; this function does not replace that one.
//
// Payload shape: https://developer.apple.com/documentation/appstoreservernotifications/responsebodyv2decodedpayload
//
// verifyStoreKitJWS is reused as-is from validate-receipt: it verifies any
// compact JWS (header.payload.signature) signed by Apple with an x5c chain
// rooted at Apple Root CA - G3, and doesn't assume anything about the
// payload's shape. That holds for all three JWS values Apple sends here —
// the outer signedPayload, and the nested signedTransactionInfo /
// signedRenewalInfo — so each is verified independently with the same call.
import { verifyStoreKitJWS } from '../validate-receipt/storekit-jws-verify.ts'
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

// Notification types that unambiguously end access, regardless of what the
// transaction's own expiresDate says (e.g. a REFUND can arrive for a
// transaction whose expiresDate is still in the future).
const DEACTIVATE_TYPES = new Set(['EXPIRED', 'DID_FAIL_TO_RENEW', 'REFUND'])

// Notification types that unambiguously (re)activate a subscription.
// Anything else falls back to the verified transaction's own expiresDate,
// which covers "any other type indicating an active subscription"
// (OFFER_REDEEMED, DID_CHANGE_RENEWAL_PREF, etc.) without hardcoding
// Apple's full, evolving notificationType list.
const ACTIVATE_TYPES = new Set(['SUBSCRIBED', 'DID_RENEW'])

interface ResponseBodyV2DecodedPayload {
  notificationType?: string
  subtype?: string
  notificationUUID?: string
  data?: {
    bundleId?: string
    environment?: 'Sandbox' | 'Production'
    signedTransactionInfo?: string
    signedRenewalInfo?: string
  }
  version?: string
  signedDate?: number
}

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  // Apple expects a fast 200 ack on every call it makes, or it queues
  // retries with exponential backoff. Every branch below returns 200 —
  // failures are logged, not surfaced as HTTP errors, since a retry can't
  // fix a bad signature or a missing profile.
  try {
    const body = await req.json().catch(() => null)
    const signedPayload = body?.signedPayload

    if (typeof signedPayload !== 'string') {
      console.error('apple-notifications: request body missing signedPayload')
      return new Response('OK', { status: 200 })
    }

    const outerVerification = await verifyStoreKitJWS(signedPayload)
    if (!outerVerification.valid) {
      console.error('apple-notifications: outer signedPayload failed verification:', outerVerification.reason)
      return new Response('OK', { status: 200 })
    }

    const notification = outerVerification.payload as unknown as ResponseBodyV2DecodedPayload
    const { notificationType, subtype, data } = notification

    console.log(
      `apple-notifications: received notificationType=${notificationType ?? '(none)'} subtype=${subtype ?? '(none)'} environment=${data?.environment ?? '(unknown)'}`
    )

    const signedTransactionInfo = data?.signedTransactionInfo
    if (!signedTransactionInfo) {
      console.log(`apple-notifications: no signedTransactionInfo for notificationType=${notificationType}, nothing to do`)
      return new Response('OK', { status: 200 })
    }

    const transactionVerification = await verifyStoreKitJWS(signedTransactionInfo)
    if (!transactionVerification.valid) {
      console.error(
        `apple-notifications: signedTransactionInfo failed verification for notificationType=${notificationType}:`,
        transactionVerification.reason
      )
      return new Response('OK', { status: 200 })
    }

    const transaction = transactionVerification.payload
    const { transactionId, appAccountToken, productId, expiresDate } = transaction

    // signedRenewalInfo is optional and only informational here (auto-renew
    // status, etc.) — access is driven by the transaction's own
    // expiresDate, so a missing or unverifiable renewal info doesn't block
    // acting on the notification.
    if (data?.signedRenewalInfo) {
      const renewalVerification = await verifyStoreKitJWS(data.signedRenewalInfo)
      if (!renewalVerification.valid) {
        console.error(
          `apple-notifications: signedRenewalInfo failed verification for notificationType=${notificationType}:`,
          renewalVerification.reason
        )
      }
    }

    if (!appAccountToken) {
      console.log(`apple-notifications: transactionId=${transactionId} has no appAccountToken, cannot map to a user, skipping`)
      return new Response('OK', { status: 200 })
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', appAccountToken)
      .maybeSingle()

    if (profileError) {
      console.error(`apple-notifications: profile lookup failed for appAccountToken=${appAccountToken}:`, profileError.message)
      return new Response('OK', { status: 200 })
    }

    if (!profile) {
      console.log(`apple-notifications: no profile found for appAccountToken=${appAccountToken}, notificationType=${notificationType}`)
      return new Response('OK', { status: 200 })
    }

    const userId = profile.id

    if (DEACTIVATE_TYPES.has(notificationType ?? '')) {
      await supabase.from('profiles').update({ is_premium: false }).eq('id', userId)
      console.log(`apple-notifications: user=${userId} is_premium=false (notificationType=${notificationType}, transactionId=${transactionId})`)
      return new Response('OK', { status: 200 })
    }

    const isActive =
      ACTIVATE_TYPES.has(notificationType ?? '') || (typeof expiresDate === 'number' && expiresDate > Date.now())

    if (isActive) {
      const expiresAt = typeof expiresDate === 'number' ? new Date(expiresDate).toISOString() : null
      await supabase
        .from('profiles')
        .update({
          is_premium: true,
          subscription_expires_at: expiresAt,
          subscription_product_id: productId ?? null,
        })
        .eq('id', userId)
      console.log(
        `apple-notifications: user=${userId} is_premium=true expiresAt=${expiresAt} productId=${productId} (notificationType=${notificationType}, transactionId=${transactionId})`
      )
    } else {
      console.log(
        `apple-notifications: notificationType=${notificationType} for user=${userId}, transactionId=${transactionId} did not indicate active or inactive subscription, no change made`
      )
    }

    return new Response('OK', { status: 200 })
  } catch (err) {
    console.error('apple-notifications: unexpected error:', err)
    return new Response('OK', { status: 200 })
  }
})
