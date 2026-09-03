import React, { useState, useRef, useEffect } from 'react';
  import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Linking, Animated, ActivityIndicator, Alert, Image } from 'react-native';
  import { SafeAreaView } from 'react-native-safe-area-context';
  import { useTheme } from '../utils/ThemeContext';
  import { useUser } from '../utils/UserContext';
  import VeethaModal from '../components/VeethaModal';
  import { showToast } from '../components/VeethaToast';
  import { posthog } from '../utils/posthog';
  import {
    initIAP,
    endIAP,
    ensureIAPConnection,
    purchaseSubscription,
    setupPurchaseListeners,
    restorePurchases,
    PRODUCT_ID_MONTHLY,
    PRODUCT_ID_ANNUAL,
  } from '../utils/iap';

  // Bounds how long the spinner waits on purchaseSubscription() before giving
  // up and letting the user retry -- e.g. if the native purchase sheet gets
  // stuck (an "already subscribed" case never resolving the call at all).
  // 60s, not 30s: validateReceipt()'s own Get Transaction Info call can retry
  // up to 3x on Apple's transient 5xxs (see app-store-server-api.ts), ~47s
  // worst case alone -- a 30s outer bound could cut off a retry sequence that
  // was about to legitimately succeed.
  const PURCHASE_TIMEOUT_MS = 60_000;

  function withTimeout(promise, ms, message) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(message)), ms);
      promise.then(
        (value) => { clearTimeout(timer); resolve(value); },
        (error) => { clearTimeout(timer); reject(error); }
      );
    });
  }

  const TABLE_ROWS = [
    { label: 'Barcode scanning',          free: 'Unlimited', premium: 'Unlimited' },
    { label: 'Manual logging',            free: 'Unlimited', premium: 'Unlimited' },
    { label: 'AI photo recognition',      free: '5/month',   premium: '5/day'     },
    { label: 'All exercise categories',   free: '✗',         premium: '✓'         },
    { label: 'PDF & Excel exports',       free: '✗',         premium: '✓'         },
    { label: 'Historical monthly stats',  free: '✗',         premium: '✓'         },
    { label: 'Individual food breakdown', free: '✗',         premium: '✓'         },
    { label: 'Meal comparison',           free: '✗',         premium: '✓'         },
  ];

  export default function PaywallScreen({ navigation, route }) {
    const { highlightFeature } = route.params ?? {};
    const { theme } = useTheme();
    const { refreshProfile } = useUser();
    const [plan, setPlan] = useState('yearly');
    const [modalVisible, setModalVisible] = useState(false);
    const [purchasing, setPurchasing] = useState(false);
    const [restoring, setRestoring] = useState(false);
    const pulseAnims = useRef(TABLE_ROWS.map(() => new Animated.Value(0))).current;

    const trialEndDate = new Date();
    trialEndDate.setDate(trialEndDate.getDate() + 7);
    const formattedDate = trialEndDate.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });

    useEffect(() => {
      posthog.capture('paywall_viewed', { highlight_feature: highlightFeature || null });
    }, []);

    useEffect(() => {
      if (!highlightFeature) return;
      const idx = TABLE_ROWS.findIndex(r => r.label === highlightFeature);
      if (idx === -1) return;
      Animated.sequence([
        Animated.timing(pulseAnims[idx], { toValue: 1, duration: 200, useNativeDriver: false }),
        Animated.delay(1600),
        Animated.timing(pulseAnims[idx], { toValue: 0, duration: 200, useNativeDriver: false }),
      ]).start();
    }, [highlightFeature]);

    // IAP setup
    useEffect(() => {
      let cancelled = false;
      let cleanup;
      // Wait for initIAP() (initConnection + clearTransactionIOS +
      // finishKnownStuckTransactionsIOS) to fully finish before attaching
      // the NativeStoreKitModule listener. Attaching it earlier races the
      // native queue flush: any stale transaction left over from a
      // different account on this device gets redelivered as soon as the
      // connection opens, and if the listener is already live it gets
      // reported to this user as a failed purchase before they've done
      // anything.
      // This listener only ever fires for background-delivered transactions
      // now (renewals, a purchase that completed while the app was closed)
      // -- the primary purchase flow in handleConfirmTrial() below gets its
      // result directly and doesn't route through this at all.
      (async () => {
        await initIAP();
        if (cancelled) return;
        cleanup = setupPurchaseListeners(
          (result) => {
            setPurchasing(false);
            showToast('success', 'Welcome to Premium! 🎉');
            navigation.goBack();
          },
          (error) => {
            setPurchasing(false);
            if (error?.code !== 'USER_CANCELLED' && error?.code !== 'USER_CANCELED') {
              Alert.alert('Purchase failed', error?.message || 'Please try again.');
              navigation.goBack();
            }
          }
        );
      })();
      return () => {
        cancelled = true;
        cleanup && cleanup();
        endIAP();
      };
    }, []);

    const handleConfirmTrial = async () => {
      if (purchasing) return;
      setModalVisible(false);
      setPurchasing(true);

      // withTimeout() below can't actually cancel purchaseSubscription() if
      // it loses the race -- confirmed on a real device that a slow native
      // purchase-sheet interaction (~3 minutes) went on to genuinely
      // succeed, validated and all, roughly 200ms after the 60s timeout had
      // already shown the user an error. Nothing was left listening for
      // that late success, so it silently set is_premium=true server-side
      // with zero UI feedback the purchase had actually worked -- this is
      // the mechanism behind the original "no toast, but somehow premium"
      // mystery this whole investigation started from. outcomeShown makes
      // sure exactly one of (early success, late success, error) ever
      // reaches the UI, whichever happens to land.
      let outcomeShown = false;
      const showSuccess = async () => {
        if (outcomeShown) return;
        outcomeShown = true;
        setPurchasing(false);
        showToast('success', 'Welcome to Premium! 🎉');
        // UserContext's profile is cached, not live -- without this, the
        // "Go Premium" card on Profile keeps showing after a successful
        // purchase until the user manually pulls to refresh, confirmed on
        // a real device. Awaited before navigating back so whichever screen
        // the user lands on already has the correct premium status.
        try {
          await refreshProfile();
        } catch (refreshError) {
          console.error('❌ refreshProfile after purchase error:', refreshError);
        }
        navigation.goBack();
      };

      try {
        // Defensive re-init: a fast unmount/remount of this screen (e.g. the
        // user dismissing an error and reopening the paywall) can race the
        // previous instance's endIAP() cleanup against this instance's
        // initIAP(), leaving the native connection torn down even though we
        // think we're connected. initConnection() is safe to call again.
        // Use ensureIAPConnection() (not initIAP()) so this doesn't also
        // re-run clearTransactionIOS() — doing that right before a purchase
        // races with StoreKit delivering the new transaction and can eat it
        // before the native purchase call resolves.
        await ensureIAPConnection();
        const productId = plan === 'yearly' ? PRODUCT_ID_ANNUAL : PRODUCT_ID_MONTHLY;

        // purchaseSubscription() resolves/rejects with the validated
        // purchase result directly on both platforms now -- iOS calls
        // NativeStoreKitModule's product.purchase() directly (a real
        // request/response call) instead of react-native-iap's
        // requestPurchase(), which only dispatched the request and left the
        // actual result to arrive later, indirectly, via a separate event
        // stream that months of testing showed could simply never deliver
        // anything. Still timeout-guarded in case the native call itself
        // hangs (e.g. a stuck purchase sheet) -- but the promise itself is
        // also given a standing success handler below, independent of the
        // race, so a late-but-real success still reaches the UI.
        const purchasePromise = purchaseSubscription(productId);
        purchasePromise.then(showSuccess).catch(() => {});

        await withTimeout(
          purchasePromise,
          PURCHASE_TIMEOUT_MS,
          'Purchase is taking longer than expected. Please check your connection and try again.'
        );
        showSuccess();
      } catch (error) {
        if (outcomeShown) return;
        setPurchasing(false);
        const isUserCancelled = error?.code === 'USER_CANCELED' || error?.code === 'USER_CANCELLED';
        if (!isUserCancelled) {
          Alert.alert('Purchase failed', error?.message || 'Please try again.');
          navigation.goBack();
        }
      }
    };

    const handleRestorePurchases = async () => {
      setRestoring(true);
      try {
        await ensureIAPConnection();
        const result = await restorePurchases();
        if (result?.restored) {
          showToast('success', 'Purchases restored! 🎉');
          try {
            await refreshProfile();
          } catch (refreshError) {
            console.error('❌ refreshProfile after restore error:', refreshError);
          }
          navigation.goBack();
        } else {
          Alert.alert('No purchases found', 'No active subscriptions were found for your account.');
        }
      } catch (error) {
        Alert.alert('Restore failed', error?.message || 'Please try again.');
      } finally {
        setRestoring(false);
      }
    };

    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top', 'bottom']}>
        <TouchableOpacity style={styles.closeButton} onPress={() => navigation.goBack()}>
          <Text style={[styles.closeText, { color: theme.text }]}>✕</Text>
        </TouchableOpacity>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Text style={[styles.logo, { color: theme.textSecondary }]}>MEAL BREAK PREMIUM</Text>

          {/* Plan toggle */}
          <View style={styles.toggleRow}>
            <TouchableOpacity
              style={[styles.togglePill, plan === 'monthly' && styles.togglePillActive]}
              onPress={() => setPlan('monthly')}
            >
              <Text style={[styles.toggleText, plan === 'monthly' && styles.toggleTextActive]}>
                Monthly
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.togglePill, plan === 'yearly' && styles.togglePillActive]}
              onPress={() => setPlan('yearly')}
            >
              <Text style={[styles.toggleText, plan === 'yearly' && styles.toggleTextActive]}>
                Yearly
              </Text>
            </TouchableOpacity>
          </View>

          {/* Price -- the most prominent element on the page, per Apple's review guidance on subscription transparency */}
          <View style={styles.priceBlock}>
            <Text style={[styles.priceBig, { color: theme.text }]}>
              {plan === 'yearly' ? '$59.99' : '$7.99'}
              <Text style={styles.priceUnit}>{plan === 'yearly' ? '/year' : '/month'}</Text>
            </Text>
            {plan === 'yearly' && (
              <>
                <Text style={styles.priceCalc}>that's $5.00 / month</Text>
                <View style={styles.saveBadge}>
                  <Text style={styles.saveBadgeText}>Save 37%</Text>
                </View>
              </>
            )}
          </View>

          <Text style={[styles.trialLine, { color: theme.text }]}>
            <Text style={styles.trialLineBold}>7 days free</Text>, then {plan === 'yearly' ? '$59.99/year' : '$7.99/month'} — cancel anytime before {formattedDate}
          </Text>

          {/* CTA -- states the price and duration directly on the button, per Apple's guidance */}
          <TouchableOpacity
            style={[styles.ctaButton, purchasing && { opacity: 0.7 }]}
            onPress={() => setModalVisible(true)}
            disabled={purchasing}
          >
            {purchasing
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.ctaText}>Start Free Trial — then {plan === 'yearly' ? '$59.99/year' : '$7.99/month'}</Text>
            }
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: theme.border }]} />

          {/* Marketing content -- demoted below the price/CTA, smaller and quieter throughout */}
          <Text style={[styles.headline, { color: theme.textSecondary }]}>
            Take a photo. Track your food. See your progress — Meal Break Premium makes staying consistent easier.
          </Text>

          <View style={styles.storyRow}>
            <View style={styles.storyStep}>
              <View style={[styles.storyIcon, { backgroundColor: theme.cardBackground }]}>
                <Image source={require('../assets/icons/icon_plate.png')} style={styles.storyImg} resizeMode="contain" />
              </View>
              <Text style={[styles.storyCaption, { color: theme.textTertiary }]}>You snap</Text>
            </View>
            <Text style={styles.storyArrow}>→</Text>
            <View style={styles.storyStep}>
              <View style={[styles.storyIcon, { backgroundColor: theme.cardBackground }]}>
                <Image source={require('../assets/icons/icon_camera.png')} style={styles.storyImg} resizeMode="contain" />
              </View>
              <Text style={[styles.storyCaption, { color: theme.textTertiary }]}>We do the rest</Text>
            </View>
            <Text style={styles.storyArrow}>→</Text>
            <View style={styles.storyStep}>
              <View style={[styles.storyIcon, { backgroundColor: theme.cardBackground }]}>
                <Image source={require('../assets/icons/icon_chart.png')} style={styles.storyImg} resizeMode="contain" />
              </View>
              <Text style={[styles.storyCaption, { color: theme.textTertiary }]}>You see results</Text>
            </View>
          </View>

          <View style={styles.featuresGrid}>
            <View style={styles.featureCard}>
              <View style={styles.heroBadge}>
                <Text style={styles.heroBadgeText}>Biggest upgrade</Text>
              </View>
              <View style={styles.featureIcon}>
                <Image source={require('../assets/icons/icon_camera.png')} style={styles.featureImg} resizeMode="contain" />
              </View>
              <Text style={[styles.featureLabel, { color: theme.textSecondary }]}>AI photo scans</Text>
              <Text style={styles.heroCompare}><Text style={styles.heroCompareOld}>5/mo</Text> 5/day</Text>
            </View>
            <View style={styles.featureCard}>
              <View style={[styles.heroBadge, styles.badgeSpacer]}>
                <Text style={styles.heroBadgeText}>Biggest upgrade</Text>
              </View>
              <View style={styles.featureIcon}>
                <Image source={require('../assets/icons/icon_lifting.png')} style={styles.featureImg} resizeMode="contain" />
              </View>
              <Text style={[styles.featureLabel, { color: theme.textSecondary }]}>All exercise categories</Text>
            </View>
            <View style={styles.featureCard}>
              <View style={styles.featureIcon}>
                <Image source={require('../assets/icons/icon_stats.png')} style={styles.featureImg} resizeMode="contain" />
              </View>
              <Text style={[styles.featureLabel, { color: theme.textSecondary }]}>Monthly history</Text>
            </View>
            <View style={styles.featureCard}>
              <View style={styles.featureIcon}>
                <Image source={require('../assets/icons/icon_export.png')} style={styles.featureImg} resizeMode="contain" />
              </View>
              <Text style={[styles.featureLabel, { color: theme.textSecondary }]}>Exercise report</Text>
            </View>
          </View>

          <View style={styles.trustRow}>
            <View style={styles.trustItem}>
              <Image source={require('../assets/icons/icon_lock.png')} style={styles.trustImg} resizeMode="contain" />
              <Text style={[styles.trustText, { color: theme.textTertiary }]}>Secure & private</Text>
            </View>
            <Text style={[styles.trustText, { color: theme.textTertiary }]}>Cancel anytime</Text>
            <Text style={[styles.trustText, { color: theme.textTertiary }]}>Used by real people</Text>
          </View>

          {/* Comparison table */}
          <View style={[styles.table, { backgroundColor: theme.cardBackground }]}>
            <View style={[styles.tableHeader, { borderBottomColor: theme.border }]}>
              <Text style={[styles.tableHeaderFeature, { color: theme.text }]}>Feature</Text>
              <Text style={[styles.tableHeaderCol, { color: theme.textSecondary }]}>Free</Text>
              <Text style={[styles.tableHeaderCol, { color: '#1F9B39' }]}>Premium</Text>
            </View>
            {TABLE_ROWS.map((row, idx) => {
              const overlayColor = pulseAnims[idx].interpolate({
                inputRange: [0, 1],
                outputRange: ['rgba(255,241,118,0)', 'rgba(255,241,118,1)'],
              });
              return (
                <View
                  key={row.label}
                  style={[
                    styles.tableRow,
                    idx % 2 === 1 && { backgroundColor: 'rgba(0,0,0,0.03)' },
                  ]}
                >
                  <Animated.View
                    style={[StyleSheet.absoluteFill, { backgroundColor: overlayColor }]}
                    pointerEvents="none"
                  />
                  <Text style={[styles.rowLabel, { color: theme.text }]}>{row.label}</Text>
                  <Text style={[styles.rowCell, { color: theme.textSecondary }]}>{row.free}</Text>
                  <Text style={[
                    styles.rowCell,
                    { color: row.premium === '✓' ? '#1F9B39' : theme.text },
                  ]}>
                    {row.premium}
                  </Text>
                </View>
              );
            })}
          </View>

          {/* Fine print */}
          <Text style={[styles.finePrint, { color: theme.textTertiary }]}>
            By continuing, you agree to our{' '}
            <Text style={styles.linkText} onPress={() => Linking.openURL('https://mealbreak.fit/terms.html')}>Terms of Service</Text>
             {' '}and{' '}
             <Text style={styles.linkText} onPress={() => Linking.openURL('https://mealbreak.fit/privacy.html')}>Privacy Policy</Text>
            Subscriptions auto-renew unless cancelled at least 24 hours before the end of the current period.
          </Text>

          <TouchableOpacity onPress={handleRestorePurchases} disabled={restoring}>
            {restoring
              ? <ActivityIndicator color={theme.textSecondary} />
              : <Text style={[styles.restoreText, { color: theme.textSecondary }]}>Restore Purchases</Text>
            }
          </TouchableOpacity>
        </ScrollView>

        <VeethaModal
          visible={modalVisible}
          title="Start Free Trial"
          message={`Your 7-day free trial starts today. You won't be charged until ${formattedDate}. Cancel anytime in 
  Settings.`}
          confirmText="Start Trial"
          cancelText="Cancel"
          onConfirm={handleConfirmTrial}
          onCancel={() => setModalVisible(false)}
        />
      </SafeAreaView>
    );
  }

  const styles = StyleSheet.create({
    container: {
      flex: 1,
    },
    closeButton: {
      position: 'absolute',
      top: 16,
      right: 20,
      zIndex: 10,
      padding: 8,
    },
    closeText: {
      fontSize: 20,
      fontWeight: '600',
    },
    scroll: {
      paddingTop: 56,
      paddingHorizontal: 20,
      paddingBottom: 40,
    },
    logo: {
      fontSize: 13,
      fontWeight: '700',
      textAlign: 'center',
      letterSpacing: 0.5,
      marginBottom: 14,
    },
    table: {
      borderRadius: 14,
      overflow: 'hidden',
      marginBottom: 24,
    },
    tableHeader: {
      flexDirection: 'row',
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderBottomWidth: 1,
    },
    tableHeaderFeature: {
      flex: 2,
      fontWeight: '700',
      fontSize: 13,
    },
    tableHeaderCol: {
      flex: 1,
      fontWeight: '700',
      fontSize: 13,
      textAlign: 'center',
    },
    tableRow: {
      flexDirection: 'row',
      paddingVertical: 10,
      paddingHorizontal: 12,
    },
    rowLabel: {
      flex: 2,
      fontSize: 13,
    },
    rowCell: {
      flex: 1,
      fontSize: 13,
      textAlign: 'center',
    },
    toggleRow: {
      flexDirection: 'row',
      backgroundColor: '#E0E0E0',
      borderRadius: 24,
      padding: 3,
      marginBottom: 16,
      alignSelf: 'center',
    },
    togglePill: {
      paddingVertical: 8,
      paddingHorizontal: 28,
      borderRadius: 22,
    },
    togglePillActive: {
      backgroundColor: '#fff',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.12,
      shadowRadius: 3,
      elevation: 2,
    },
    toggleText: {
      fontSize: 14,
      color: '#888',
      fontWeight: '500',
    },
    toggleTextActive: {
      color: '#1B1B1B',
      fontWeight: '700',
    },
    linkText: {
      color: '#4A90E2',
      textDecorationLine: 'underline',
    },
    priceBlock: {
      alignItems: 'center',
      marginBottom: 6,
    },
    priceBig: {
      fontSize: 42,
      fontWeight: '800',
      letterSpacing: -0.5,
    },
    priceUnit: {
      fontSize: 18,
      fontWeight: '700',
      color: '#888',
    },
    priceCalc: {
      fontSize: 13,
      color: '#1F9B39',
      fontWeight: '700',
      marginTop: 2,
    },
    saveBadge: {
      backgroundColor: '#E8F5E9',
      borderRadius: 8,
      paddingVertical: 3,
      paddingHorizontal: 10,
      marginTop: 6,
    },
    saveBadgeText: {
      color: '#1F9B39',
      fontSize: 11,
      fontWeight: '800',
    },
    trialLine: {
      fontSize: 13.5,
      fontWeight: '600',
      textAlign: 'center',
      lineHeight: 19,
      marginVertical: 14,
      paddingHorizontal: 10,
    },
    trialLineBold: {
      color: '#1F9B39',
      fontWeight: '800',
    },
    divider: {
      height: 1,
      marginVertical: 20,
    },
    headline: {
      fontSize: 15.5,
      fontWeight: '600',
      textAlign: 'center',
      lineHeight: 21,
      marginBottom: 20,
      paddingHorizontal: 10,
    },
    storyRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      marginBottom: 24,
    },
    storyStep: {
      alignItems: 'center',
      gap: 6,
    },
    storyIcon: {
      width: 54,
      height: 54,
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
    },
    storyImg: {
      width: 26,
      height: 26,
    },
    storyArrow: {
      fontSize: 16,
      color: '#ccc',
    },
    storyCaption: {
      fontSize: 10,
      textAlign: 'center',
      width: 68,
    },
    featuresGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginBottom: 22,
    },
    featureCard: {
      width: '50%',
      alignItems: 'center',
      paddingVertical: 10,
      paddingHorizontal: 6,
    },
    heroBadge: {
      backgroundColor: '#1F9B39',
      borderRadius: 8,
      paddingVertical: 2,
      paddingHorizontal: 8,
      marginBottom: 6,
    },
    badgeSpacer: {
      opacity: 0,
    },
    heroBadgeText: {
      color: '#fff',
      fontSize: 9,
      fontWeight: '700',
    },
    featureIcon: {
      marginBottom: 6,
    },
    featureImg: {
      width: 24,
      height: 24,
    },
    featureLabel: {
      fontSize: 10.5,
      fontWeight: '600',
      textAlign: 'center',
      lineHeight: 13,
    },
    heroCompare: {
      fontSize: 12,
      fontWeight: '800',
      color: '#1F9B39',
      marginTop: 4,
    },
    heroCompareOld: {
      color: '#aaa',
      fontWeight: '600',
      fontSize: 10.5,
      textDecorationLine: 'line-through',
    },
    trustRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      flexWrap: 'wrap',
      gap: 14,
      marginBottom: 22,
    },
    trustItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    trustImg: {
      width: 11,
      height: 11,
    },
    trustText: {
      fontSize: 10,
      fontWeight: '600',
    },
    ctaButton: {
      backgroundColor: '#1F9B39',
      borderRadius: 14,
      paddingVertical: 16,
      alignItems: 'center',
      marginBottom: 20,
    },
    ctaText: {
      color: '#fff',
      fontSize: 17,
      fontWeight: '700',
    },
    finePrint: {
      fontSize: 11,
      textAlign: 'center',
      lineHeight: 16,
      marginBottom: 14,
    },
    restoreText: {
      fontSize: 13,
      textAlign: 'center',
      textDecorationLine: 'underline',
      marginBottom: 8,
    },
  });