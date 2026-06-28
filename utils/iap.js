import {
  initConnection,
  endConnection,
  getSubscriptions,
  requestSubscription,
  purchaseUpdatedListener,
  purchaseErrorListener,
  finishTransaction,
  getAvailablePurchases,
} from 'react-native-iap';
import { Platform } from 'react-native';
import { supabase } from './supabase';

export const PRODUCT_ID_MONTHLY = 'com.yourname.veetha.premium.plan';
export const PRODUCT_ID_ANNUAL = 'com.yourname.veetha.premium.annual';

export const SUBSCRIPTION_SKUS = [PRODUCT_ID_MONTHLY, PRODUCT_ID_ANNUAL];

// ── Initialize IAP connection ────────────────────────────────────
export async function initIAP() {
  try {
    await initConnection();
    console.log('✅ IAP connection initialized');
    return true;
  } catch (error) {
    console.error('❌ IAP init error:', error);
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
    const subscriptions = await getSubscriptions({ skus: SUBSCRIPTION_SKUS });
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
    if (Platform.OS === 'android') {
      await requestSubscription({
        sku: productId,
        subscriptionOffers: [{ sku: productId, offerToken: '' }],
      });
    } else {
      await requestSubscription({ sku: productId });
    }
  } catch (error) {
    console.error('❌ Purchase error:', error);
    throw error;
  }
}

// ── Validate receipt with Supabase Edge Function ─────────────────
export async function validateReceipt(purchase) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('No session');

    const platform = Platform.OS === 'ios' ? 'ios' : 'android';

    const body = platform === 'ios'
      ? {
          platform: 'ios',
          receiptData: purchase.transactionReceipt,
        }
      : {
          platform: 'android',
          productId: purchase.productId,
          purchaseToken: purchase.purchaseToken,
        };

    const { data, error } = await supabase.functions.invoke('validate-receipt', {
      body,
      headers: { Authorization: `Bearer ${session.access_token}` },
    });

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
  const purchaseUpdateSubscription = purchaseUpdatedListener(async (purchase) => {
    try {
      console.log('🛒 Purchase update:', purchase.productId);
      const result = await validateReceipt(purchase);
      await finishTransaction({ purchase, isConsumable: false });
      if (result?.valid) {
        onSuccess && onSuccess(result);
      }
    } catch (error) {
      console.error('❌ Purchase listener error:', error);
      onError && onError(error);
    }
  });

  const purchaseErrorSubscription = purchaseErrorListener((error) => {
    console.error('❌ Purchase error listener:', error);
    onError && onError(error);
  });

  return () => {
    purchaseUpdateSubscription.remove();
    purchaseErrorSubscription.remove();
  };
}