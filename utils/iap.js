const {
  initConnection, endConnection, finishTransaction, getAvailablePurchases,
  getPendingTransactionsIOS, syncIOS, clearTransactionIOS,
} = require('react-native-iap');
const { Platform, AppState, NativeModules, NativeEventEmitter } = require('react-native');
const { supabase } = require('./supabase');

// Android goes straight through Play Billing Library (see
// android/.../NativeBillingModule.kt) instead of react-native-iap, to rule
// out react-native-iap's own wrapper as the source of the empty-SKU issue.
// iOS purchase *initiation and delivery/listening* both go through
// NativeStoreKitModule, a direct StoreKit 2 bridge (see
// ios/NativeStoreKitModule.swift, generated from plugins/templates/) --
// react-native-iap is no longer used for the iOS purchase flow at all.
// (It was originally run in parallel with react-native-iap's own
// purchaseUpdatedListener as a second independent path, after that listener
// was confirmed to sometimes never fire in JS even though StoreKit
// completed the transaction on-device. Running two independent listeners
// for the same underlying transaction stream turned out to be its own
// source of unreliable delivery, so react-native-iap's purchase handling
// was removed for iOS entirely rather than kept as a second path.)
const { NativeBillingModule, NativeStoreKitModule } = NativeModules;

export const PRODUCT_ID_MONTHLY = 'com.yourname.veetha.premium.plan';
export const PRODUCT_ID_ANNUAL = 'com.yourname.veetha.premium.annual';

// This transaction is confirmed (via diagnostic logging across many real
// device tests) to belong to a different, earlier test account, and to keep
// getting redelivered by StoreKit no matter which account is signed in --
// finishTransaction() alone doesn't stop the redelivery (a known sandbox
// limitation, not specific to this app). Left unvalidated and unreported to
// the caller entirely: reporting it as an error confuses/covers up whatever
// the user's actual, current purchase attempt is doing, since this has
// nothing to do with it.
// Second entry: orphaned by the pre-timeout-fix validateReceipt() hang
// (see withTimeout() below) -- that hang meant finishTransaction() never
// ran for it, so it's been stuck redelivering since.
const KNOWN_GHOST_TRANSACTION_IDS_IOS = ['2000001218944727', '2000001221221842'];

// A transaction created via purchaseSubscription()'s direct product.purchase()
// call also flows through Transaction.updates like any other -- confirmed via
// real device testing that the background listener in setupPurchaseListeners()
// independently validates and reports success for the exact same transaction
// moments later, showing "Welcome to Premium!" and navigating back twice.
// Shared across both so whichever one handles a given transaction first marks
// it done for the other.
const directlyHandledTransactionIds = new Set();

// Any transaction left unfinished in the on-device StoreKit queue --
// belonging to this sandbox tester or any other one that's used this
// device -- gets redelivered on every future connection init and can get
// validated against whichever user happens to be signed in at that moment
// (surfacing as "Transaction does not belong to this user"), or can occupy
// the onTransactionUpdate slot a genuinely new purchase needed, making it
// look like the new purchase silently never arrived. finishTransaction()
// only tells StoreKit "stop redelivering
// this" -- it doesn't touch whatever server-side validation already ran --
// so it's safe to force-finish every pending transaction unconditionally
// here, not just ones matching a specific known-bad id.
async function finishStuckTransactionsIOS() {
  if (Platform.OS !== 'ios') return;
  try {
    const pending = await getPendingTransactionsIOS();
    for (const purchase of pending) {
      try {
        await finishTransaction({ purchase, isConsumable: false });
        console.log('✅ Force-finished pending transaction:', purchase.transactionId);
      } catch (finishError) {
        console.error('❌ Force-finish pending transaction error:', finishError);
      }
    }
  } catch (error) {
    console.error('❌ Get pending transactions error:', error);
  }
}

// ── Initialize IAP connection ────────────────────────────────────
export async function initIAP() {
  try {
    console.log('🔍 [initIAP] BEFORE initConnection(), timestamp:', new Date().toISOString());
    const initConnectionResult = await initConnection();
    console.log('🔍 [initIAP] AFTER initConnection() resolved, timestamp:', new Date().toISOString(), 'return value:', JSON.stringify(initConnectionResult));
    if (Platform.OS === 'ios') {
      // App Store Connect's "Clear Purchase History" for a sandbox tester
      // only resets Apple's server-side records — it does not touch the
      // on-device StoreKit transaction queue (owned by the storekitd system
      // daemon, independent of app install state). Any transaction left
      // unfinished on this device from before the finishTransaction fix in
      // setupPurchaseListeners will keep sitting in that local queue and
      // make StoreKit report the product as already purchased. Flush it here.
      try {
        await clearTransactionIOS();
      } catch (clearError) {
        console.error('❌ Clear transaction error:', clearError);
      }
      await finishStuckTransactionsIOS();
      try {
        const pendingAtReady = await getPendingTransactionsIOS();
        console.log('🔍 [initIAP] pending StoreKit transactions:', JSON.stringify(
          pendingAtReady.map((p) => ({ transactionId: p.transactionId, productId: p.productId }))
        ));
      } catch (pendingError) {
        console.error('❌ Get pending transactions (post-init) error:', pendingError);
      }
    }
    console.log('✅ IAP connection initialized');
    return true;
  } catch (error) {
    console.error('❌ IAP init error:', error);
    return false;
  }
}

// ── Reconnect without re-flushing the transaction queue ───────────
// Safe to call right before a purchase attempt: unlike initIAP(), this
// never calls clearTransactionIOS(). clearTransactionIOS() drains and
// finishes every unfinished transaction in the on-device StoreKit queue,
// which can take a long time and races with StoreKit delivering the
// transaction for a purchase in progress — the drain loop can scoop up
// and finish that transaction before the app's own purchase call ever sees
// it, so the request silently gets no response. It must only run once,
// at session start (inside initIAP()), never right before a purchase.
export async function ensureIAPConnection() {
  try {
    await initConnection();
    return true;
  } catch (error) {
    console.error('❌ IAP reconnect error:', error);
    return false;
  }
}

// ── End IAP connection ───────────────────────────────────────────
export async function endIAP() {
  try {
    await endConnection();
  } catch (error) {
    console.error('❌ IAP end error:', error);
  }
}

// ── Purchase a subscription ──────────────────────────────────────
export async function purchaseSubscription(productId) {
  try {
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (Platform.OS === 'android') {
      const offerId = productId === 'com.yourname.veetha.premium.plan'
        ? 'free-trial-7'
        : 'free-trial-7-annual';

      console.log('🛒 [purchaseSubscription] Android (native): fetching offers for', productId);
      const offers = await NativeBillingModule.fetchSubscriptionProducts();
      const matchingOffers = offers.filter((o) => o.productId === productId);
      const offer = matchingOffers.find((o) => o.offerId === offerId) || matchingOffers[0];
      const offerToken = offer?.offerToken || '';

      console.log('🛒 [purchaseSubscription] Android (native): launching purchase', productId, 'offerToken present:', !!offerToken);
      const purchase = await NativeBillingModule.purchaseSubscription(productId, offerToken);
      console.log('🛒 [purchaseSubscription] Android (native): purchase resolved', JSON.stringify(purchase));

      const result = await validateReceipt(purchase);

      try {
        await NativeBillingModule.acknowledgePurchase(purchase.purchaseToken);
      } catch (acknowledgeError) {
        console.error('❌ Acknowledge purchase error:', acknowledgeError);
      }

      if (!result?.valid) {
        throw new Error(result?.error || 'Purchase could not be verified. Please try again.');
      }

      return result;
    } else {
      // Calls NativeStoreKitModule.purchaseSubscription() (native Swift,
      // StoreKit 2's Product.purchase()) directly instead of going through
      // react-native-iap's requestPurchase() + purchaseUpdatedListener.
      // requestPurchase() only dispatches the request -- the actual result
      // arrives later, indirectly, via a separate async event stream that
      // months of testing showed can simply never deliver anything at all.
      // product.purchase() is a direct request/response call that resolves
      // deterministically once the user completes or cancels the purchase
      // sheet, so there's nothing to separately wait on and nothing for an
      // event stream to fail to deliver.
      console.log('🛒 [purchaseSubscription] iOS AppState.currentState:', AppState.currentState, 'productId:', productId);
      const purchase = await NativeStoreKitModule.purchaseSubscription(productId, currentUser?.id || '');
      console.log('🛒 [purchaseSubscription] iOS (direct): native call resolved, transactionId=', purchase.transactionId);
      if (purchase.transactionId) directlyHandledTransactionIds.add(purchase.transactionId);

      // product.purchase() can resolve with a pre-existing unfinished
      // transaction instead of creating a new one, if one is already sitting
      // in the local queue for this product -- confirmed via real device
      // testing (product.purchase() returned the known ghost transaction id
      // directly as its result, not just via the background listener).
      // Treated the same way as the background listener treats it: never
      // validated or reported as this attempt's result, since it has
      // nothing to do with it and would only produce the same confusing
      // "doesn't belong to this user" error again.
      if (KNOWN_GHOST_TRANSACTION_IDS_IOS.includes(purchase.transactionId)) {
        throw new Error('A stale transaction is blocking new purchases. Please try again.');
      }

      const result = await validateReceipt({ purchaseToken: purchase.jwsRepresentation, productId: purchase.productId });

      if (!result?.valid) {
        throw new Error(result?.error || 'Purchase could not be verified. Please try again.');
      }

      return result;
    }
  } catch (error) {
    console.error('❌ Purchase error:', error);
    throw error;
  }
}

// A hang here (stuck token refresh, network hiccup reaching Supabase) has no
// timeout of its own to fail fast with -- it silently eats time until
// PaywallScreen's unrelated outer purchase timeout eventually catches it,
// showing a generic "check your connection" message that doesn't reflect
// what actually happened (confirmed via the server-side audit log showing
// zero entries for an attempt that timed out client-side -- the request
// never got far enough to reach the edge function at all).
function withTimeout(promise, ms, message) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms);
    promise.then(
      (value) => { clearTimeout(timer); resolve(value); },
      (error) => { clearTimeout(timer); reject(error); }
    );
  });
}

// ── Validate receipt with Supabase Edge Function ─────────────────
export async function validateReceipt(purchase) {
  console.log('🔍 [validateReceipt] enter, purchaseToken present:', !!purchase?.purchaseToken, 'productId:', purchase?.productId);
  try {
    console.log('🔍 [validateReceipt] calling supabase.auth.getSession()...');
    const { data: { session } } = await withTimeout(
      supabase.auth.getSession(),
      10_000,
      'Getting your session timed out. Please check your connection and try again.'
    );
    console.log('🔍 [validateReceipt] getSession() resolved, session present:', !!session);
    if (!session) throw new Error('No session');

    const platform = Platform.OS === 'ios' ? 'ios' : 'android';
    console.log('🔍 [validateReceipt] platform:', platform);

    const body = platform === 'ios'
      ? {
          platform: 'ios',
          transactionJws: purchase.purchaseToken,
        }
      : {
          platform: 'android',
          productId: purchase.productId,
          purchaseToken: purchase.purchaseToken,
        };
    console.log('🔍 [validateReceipt] body constructed, about to call supabase.functions.invoke()');

    const { data, error } = await withTimeout(
      supabase.functions.invoke('validate-receipt', {
        body,
        headers: { Authorization: `Bearer ${session.access_token}` },
      }),
      20_000,
      'Validating your purchase timed out. Please check your connection and try again.'
    );
    console.log('🔍 [validateReceipt] invoke() resolved, error:', !!error, 'data:', JSON.stringify(data));

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('❌ Validate receipt error:', error);
    throw error;
  }
}

// ── Restore purchases ────────────────────────────────────────────
export async function restorePurchases() {
  try {
    if (Platform.OS === 'ios') {
      await syncIOS();
    }
    const purchases = await getAvailablePurchases();
    if (!purchases || purchases.length === 0) {
      return { restored: false };
    }

    // Validate the most recent purchase
    const latest = purchases[purchases.length - 1];
    const result = await validateReceipt(latest);
    return { restored: result?.valid === true };
  } catch (error) {
    console.error('❌ Restore purchases error:', error);
    throw error;
  }
}

// ── Set up purchase listeners ────────────────────────────────────
// Background-only: the primary purchase flow (PaywallScreen ->
// purchaseSubscription()) now gets its result directly from the native
// product.purchase() call and never goes through this at all. This exists
// purely to catch transactions StoreKit delivers *outside* an active,
// JS-initiated purchase -- renewals, or a transaction that completed while
// the app was closed. Previously this also ran react-native-iap's own
// purchaseUpdatedListener in parallel with this same native listener, both
// independently observing the same underlying transaction stream -- exactly
// the kind of redundant dual-observer setup Apple's own guidance warns
// causes inconsistent delivery. Removed; NativeStoreKitModule is now the
// only iOS transaction-delivery path, for both the direct-purchase and
// background cases.
export function setupPurchaseListeners(onSuccess, onError) {
  console.log('🔔 [setupPurchaseListeners] registering listeners');
  if (Platform.OS !== 'ios' || !NativeStoreKitModule) {
    return () => {};
  }

  const handledTransactionIds = new Set();
  const emitter = new NativeEventEmitter(NativeStoreKitModule);
  const subscription = emitter.addListener('onTransactionUpdate', async (event) => {
    const { transactionId, productId, jwsRepresentation } = event || {};
    console.log('🔔 [NativeStoreKitModule] onTransactionUpdate fired:', transactionId, productId);
    if (!transactionId || !jwsRepresentation) {
      console.error('❌ [NativeStoreKitModule] onTransactionUpdate missing transactionId/jwsRepresentation');
      return;
    }
    if (KNOWN_GHOST_TRANSACTION_IDS_IOS.includes(transactionId)) {
      console.log('🔔 [NativeStoreKitModule] known ghost transaction, ignoring silently:', transactionId);
      return;
    }
    if (directlyHandledTransactionIds.has(transactionId)) {
      console.log('🔔 [NativeStoreKitModule] transaction already handled by direct purchaseSubscription() call, skipping:', transactionId);
      return;
    }
    if (handledTransactionIds.has(transactionId)) {
      console.log('🔔 [NativeStoreKitModule] transaction already handled this session, skipping:', transactionId);
      return;
    }
    handledTransactionIds.add(transactionId);

    try {
      const result = await validateReceipt({ purchaseToken: jwsRepresentation, productId });
      if (result?.valid) {
        onSuccess && onSuccess(result);
      } else {
        console.error('❌ [NativeStoreKitModule] Purchase validation returned invalid:', result?.error);
        onError && onError(new Error(result?.error || 'Purchase could not be verified. Please try again.'));
      }
    } catch (error) {
      console.error('❌ [NativeStoreKitModule] Validate receipt error:', error);
      onError && onError(error);
    }
  });

  return () => subscription.remove();
}