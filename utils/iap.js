import * as FileSystem from 'expo-file-system/legacy';

// TEMPORARY DIAGNOSTIC -- local-disk-only, no network, no Sentry client
// state, no native RCTLog gate. Both of those were separately confirmed
// this session to silently drop every diagnostic tried so far in this
// exact Release/TestFlight build (Sentry.captureMessage: silently no-op'd
// pre-init, and still invisible after fixing that ordering; NSLog: still
// invisible). This has no such dependency -- it's a plain file write.
//
// Genuinely the first executable statement in this file -- not just
// visually first. Babel's CommonJS transform hoists every `import`-derived
// require() above a module's own top-level statements as one block,
// regardless of source position (this is the same mechanism behind the
// Sentry.init() ordering bug fixed earlier this session in index.js/calo.js
// -- verified again here the same way, by compiling this exact file and
// checking the real output). A first version of this diagnostic put it
// between `import * as FileSystem ...` and this file's other imports
// (react-native-iap, react-native, @sentry/react-native, ./supabase) and
// verifiably did NOT run first -- those four got hoisted above it just the
// same, meaning if any of THEM throw while loading, this diagnostic would
// never run at all, defeating its purpose. Fix: those four are required
// below, as plain require() calls (not `import`), positioned textually
// after this diagnostic -- a literal require() is left exactly where it's
// written, not hoisted, so this now genuinely runs before any of them are
// even required, let alone before any of their own module bodies evaluate.
//
// writeAsStringAsync always overwrites (this API has no append mode), so
// each load reads whatever's already there and writes it back plus one new
// line, to build a history across sessions/loads rather than just the
// latest one. Wrapped so this can never itself throw: a failure here must
// never become a NEW reason for this module to fail to load. Read back via
// the temporary button in calo.js (imports IAP_DIAGNOSTIC_LOG_PATH from
// here) -- no Console.app, Sentry, or device connection required. Remove
// both once confirmed.
export const IAP_DIAGNOSTIC_LOG_PATH = `${FileSystem.documentDirectory}iap-diagnostic-log.txt`;
// Factored out (rather than inlined per call site) so every diagnostic
// write below goes through the exact same read-modify-write path -- not
// just structurally similar copies of it.
export function appendIapDiagnosticLog(message) {
  const line = `${new Date().toISOString()} ${message}\n`;
  FileSystem.readAsStringAsync(IAP_DIAGNOSTIC_LOG_PATH)
    .catch(() => '')
    .then((existing) => FileSystem.writeAsStringAsync(IAP_DIAGNOSTIC_LOG_PATH, existing + line))
    .catch(() => {});
}
appendIapDiagnosticLog('iap.js loaded');

// require(), not `import`, and deliberately placed after the diagnostic
// above -- see the comment there for why. Destructuring off require()'s
// return value gives identical bindings to the `import { x } from 'y'`
// syntax this replaced; nothing below this point needed to change.
const {
  initConnection, endConnection, fetchProducts, finishTransaction, getAvailablePurchases,
  getPendingTransactionsIOS, syncIOS, clearTransactionIOS,
} = require('react-native-iap');
const { Platform, AppState, NativeModules, NativeEventEmitter } = require('react-native');
const Sentry = require('@sentry/react-native');
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
// TEMPORARY DIAGNOSTIC -- second line in the same disk log appendIapDiagnosticLog()
// wrote to above, right after NativeModules is destructured. The first line
// only proves this module's top-level code ran at all; it says nothing
// about whether the native module actually resolved. Same append pattern,
// same file, so both lines land in one place readable via the button in
// calo.js. Remove alongside the rest of this diagnostic.
appendIapDiagnosticLog(`NativeStoreKitModule resolved: ${!!NativeStoreKitModule}`);
// TEMPORARY DIAGNOSTIC -- confirms two things at once: (1) that this module
// (utils/iap.js) actually loaded at all this session -- if this line never
// appears in Sentry, nothing below it ever ran, independent of any bug; (2)
// if it does appear, whether the native module resolved to a real object
// or came back undefined (e.g. registered-but-stripped in a Release/
// TestFlight build vs. genuinely never linked). Uses Sentry.captureMessage,
// not console.log/addBreadcrumb: console.log is silently discarded in
// Release/TestFlight builds (RCT_DEBUG is 0 there and this project
// registers no custom RCTLogFunction, so React Native's own native log
// bridge drops every JS console.log unconditionally -- confirmed against
// react-native/React/Base/RCTLog.mm). addBreadcrumb was considered instead
// but breadcrumbs are only ever attached to a *later* captured event
// (per @sentry/core's own Breadcrumb doc comment) -- iap.js has no other
// Sentry calls anywhere in it for a bare breadcrumb to ever attach to, so
// it would have been just as invisible as console.log, for a different
// reason. captureMessage sends a real, standalone, immediately-visible
// Sentry event regardless of build type. Remove once confirmed.
Sentry.captureMessage(`[iap.js] NativeStoreKitModule resolved: ${!!NativeStoreKitModule}`);

export const PRODUCT_ID_MONTHLY = 'com.yourname.veetha.premium.plan';
export const PRODUCT_ID_ANNUAL = 'com.yourname.veetha.premium.annual';

// TEMPORARY — test product IDs to isolate whether fetchProducts empty result
// is specific to the original two products or affects any product on this app.
// Remove once diagnosed.
export const PRODUCT_ID_MONTHLY_TEST = 'com.yourname.veetha.premium.monthly2';
export const PRODUCT_ID_ANNUAL_TEST = 'com.yourname.veetha.premium.annual2';

export const SUBSCRIPTION_SKUS = [PRODUCT_ID_MONTHLY_TEST, PRODUCT_ID_ANNUAL_TEST];

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

// ── Fetch subscription products ──────────────────────────────────
export async function fetchSubscriptions() {
  try {
    if (Platform.OS === 'android') {
      console.log('🔍 [fetchSubscriptions] Android (native): calling NativeBillingModule.fetchSubscriptionProducts()');
      const subscriptions = await NativeBillingModule.fetchSubscriptionProducts();
      console.log('✅ Subscriptions fetched (native):', subscriptions.length, JSON.stringify(subscriptions));
      return subscriptions;
    }

    const fetchProductsRequest = { skus: SUBSCRIPTION_SKUS, productType: 'subs' };
    console.log('🔍 [fetchSubscriptions] BEFORE fetchProducts(), timestamp:', new Date().toISOString(), 'request:', JSON.stringify(fetchProductsRequest));
    let subscriptions;
    try {
      subscriptions = await fetchProducts(fetchProductsRequest);
    } catch (fetchProductsError) {
      console.error('❌ [fetchSubscriptions] fetchProducts() threw, full error:', JSON.stringify(fetchProductsError, Object.getOwnPropertyNames(fetchProductsError)));
      throw fetchProductsError;
    }
    console.log(
      '🔍 [fetchSubscriptions] AFTER fetchProducts() returned, timestamp:', new Date().toISOString(),
      'isNull:', subscriptions === null,
      'isUndefined:', subscriptions === undefined,
      'isEmptyArray:', Array.isArray(subscriptions) && subscriptions.length === 0,
      'raw:', JSON.stringify(subscriptions)
    );
    console.log('✅ Subscriptions fetched:', subscriptions.length);
    return subscriptions;
  } catch (error) {
    console.error('❌ Fetch subscriptions error:', error);
    return [];
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
      appendIapDiagnosticLog(`purchaseSubscription (iOS, direct): currentUser.id present: ${!!currentUser?.id}, appAccountToken sent: ${currentUser?.id || '(none)'}`);
      const purchase = await NativeStoreKitModule.purchaseSubscription(productId, currentUser?.id || '');
      appendIapDiagnosticLog(`purchaseSubscription (iOS, direct): native call resolved, transactionId=${purchase.transactionId}`);
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

// ── TEMPORARY DIAGNOSTIC: isolate billing client vs. Play Console catalog ──
// 'android.test.purchased' is Google's reserved static test product ID —
// Play always resolves it regardless of what's configured in Play Console.
// If this succeeds while real SKUs come back empty, the billing client and
// connection are fine and the problem is catalog propagation, not app code.
// Remove once the empty-SKU issue is diagnosed.
export async function diagnosticFetchStaticTestProduct() {
  const request = { skus: ['android.test.purchased'], productType: 'inapp' };
  console.log('🧪 [diagnosticFetchStaticTestProduct] BEFORE fetchProducts(), request:', JSON.stringify(request));
  try {
    const result = await fetchProducts(request);
    console.log('🧪 [diagnosticFetchStaticTestProduct] RESULT:', JSON.stringify(result));
    return result;
  } catch (error) {
    console.error('🧪 [diagnosticFetchStaticTestProduct] THREW:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
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
  appendIapDiagnosticLog('NativeStoreKitModule listener registered');
  const subscription = emitter.addListener('onTransactionUpdate', async (event) => {
    appendIapDiagnosticLog(`onTransactionUpdate fired: ${JSON.stringify(event)}`);
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