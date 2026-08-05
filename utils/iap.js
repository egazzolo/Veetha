import { initConnection, endConnection, fetchProducts, requestPurchase, purchaseUpdatedListener, purchaseErrorListener, finishTransaction, getAvailablePurchases, getPendingTransactionsIOS, syncIOS, clearTransactionIOS, } from 'react-native-iap';
import { Platform, AppState, NativeModules } from 'react-native';
import { supabase } from './supabase';

// Android goes straight through Play Billing Library (see
// android/.../NativeBillingModule.kt) instead of react-native-iap, to rule
// out react-native-iap's own wrapper as the source of the empty-SKU issue.
// iOS is untouched and stays on react-native-iap.
const { NativeBillingModule } = NativeModules;

export const PRODUCT_ID_MONTHLY = 'com.yourname.veetha.premium.plan';
export const PRODUCT_ID_ANNUAL = 'com.yourname.veetha.premium.annual';

// TEMPORARY — test product IDs to isolate whether fetchProducts empty result
// is specific to the original two products or affects any product on this app.
// Remove once diagnosed.
export const PRODUCT_ID_MONTHLY_TEST = 'com.yourname.veetha.premium.monthly2';
export const PRODUCT_ID_ANNUAL_TEST = 'com.yourname.veetha.premium.annual2';

export const SUBSCRIPTION_SKUS = [PRODUCT_ID_MONTHLY_TEST, PRODUCT_ID_ANNUAL_TEST];

// This specific transaction is stuck in the on-device StoreKit queue and gets
// redelivered on every purchase attempt regardless of which sandbox tester is
// signed in, always failing the appAccountToken check since it belongs to a
// different user. clearTransactionIOS() should flush it but hasn't, so it's
// force-finished by id as a targeted fallback. Safe to leave in even after
// the queue clears — the id simply won't match anything in the pending list.
const KNOWN_STUCK_TRANSACTION_IDS_IOS = ['2000001206453510'];

// ── Force-finish known stuck iOS transactions ──────────────────────
async function finishKnownStuckTransactionsIOS() {
  if (Platform.OS !== 'ios') return;
  try {
    const pending = await getPendingTransactionsIOS();
    const stuck = pending.filter((purchase) =>
      KNOWN_STUCK_TRANSACTION_IDS_IOS.includes(purchase.transactionId)
    );
    for (const purchase of stuck) {
      try {
        await finishTransaction({ purchase, isConsumable: false });
        console.log('✅ Force-finished stuck transaction:', purchase.transactionId);
      } catch (finishError) {
        console.error('❌ Force-finish stuck transaction error:', finishError);
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
      await finishKnownStuckTransactionsIOS();
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
// and finish that transaction before purchaseUpdatedListener ever sees
// it, so the request silently gets no response. It must only run once,
// at session start (inside initIAP()), never right before requestPurchase().
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
      console.log('🛒 [purchaseSubscription] iOS AppState.currentState:', AppState.currentState, 'productId:', productId);
      await requestPurchase({
        request: {
          apple: {
            sku: productId,
            andDangerouslyFinishTransactionAutomatically: false,
            appAccountToken: currentUser?.id,
          }
        },
        type: 'subs',
      });
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

// ── Validate receipt with Supabase Edge Function ─────────────────
export async function validateReceipt(purchase) {
  console.log('🔍 [validateReceipt] enter, purchaseToken present:', !!purchase?.purchaseToken, 'productId:', purchase?.productId);
  try {
    console.log('🔍 [validateReceipt] calling supabase.auth.getSession()...');
    const { data: { session } } = await supabase.auth.getSession();
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

    const { data, error } = await supabase.functions.invoke('validate-receipt', {
      body,
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
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
export function setupPurchaseListeners(onSuccess, onError) {
  console.log('🔔 [setupPurchaseListeners] registering listeners');
  const purchaseUpdateSubscription = purchaseUpdatedListener(async (purchase) => {
    console.log('🔔 [purchaseUpdatedListener] fired');
    console.log('🛒 Purchase update:', purchase.productId);
    let result;
    let validationError;
    try {
      result = await validateReceipt(purchase);
    } catch (error) {
      validationError = error;
    }
    // Always finish the transaction, even when validation failed, so it
    // doesn't stay stuck unfinished in the StoreKit queue — an unfinished
    // transaction gets redelivered on every future connection init (to any
    // sandbox tester on the device) and makes StoreKit report the product
    // as already purchased on the next purchase attempt.
    try {
      await finishTransaction({ purchase, isConsumable: false });
    } catch (finishError) {
      console.error('❌ Finish transaction error:', finishError);
    }
    if (validationError) {
      console.error('❌ Purchase listener error:', validationError);
      onError && onError(validationError);
      return;
    }
    if (result?.valid) {
      onSuccess && onSuccess(result);
    } else {
      // The edge function can resolve with { valid: false, error } instead of
      // throwing (e.g. Apple's Get Transaction Info API not yet having the
      // just-completed transaction indexed). Without this branch neither
      // onSuccess nor onError ever fires, so the ref/promise this listener is
      // meant to settle is left dangling until the caller's own timeout fires.
      console.error('❌ Purchase validation returned invalid:', result?.error);
      onError && onError(new Error(result?.error || 'Purchase could not be verified. Please try again.'));
    }
  });

  const purchaseErrorSubscription = purchaseErrorListener((error) => {
    console.error('❌ Purchase error listener:', error);
    try {
      console.error('❌ Purchase error listener (raw):', JSON.stringify(error, Object.getOwnPropertyNames(error)));
    } catch (stringifyError) {
      console.error('❌ Purchase error listener stringify failed:', stringifyError);
    }
    onError && onError(error);
  });

  return () => {
    purchaseUpdateSubscription.remove();
    purchaseErrorSubscription.remove();
  };
}