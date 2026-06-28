import React, { useState, useRef, useEffect } from 'react';
  import {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    StyleSheet,
    Animated,
    ActivityIndicator,
    Alert,
    Platform,
  } from 'react-native';
  import { SafeAreaView } from 'react-native-safe-area-context';
  import { useTheme } from '../utils/ThemeContext';
  import VeethaModal from '../components/VeethaModal';
  import { showToast } from '../components/VeethaToast';
  import {
    initIAP,
    endIAP,
    fetchSubscriptions,
    purchaseSubscription,
    setupPurchaseListeners,
    restorePurchases,
    PRODUCT_ID_MONTHLY,
    PRODUCT_ID_ANNUAL,
  } from '../utils/iap';

  const TABLE_ROWS = [
    { label: 'Barcode scanning',          free: 'Unlimited', premium: 'Unlimited' },
    { label: 'Manual logging',            free: 'Unlimited', premium: 'Unlimited' },
    { label: 'AI photo recognition',      free: '5/month',   premium: '5/day'     },
    { label: 'All exercise categories',   free: '✗',         premium: '✓'         },
    { label: 'PDF & Excel exports',       free: '✗',         premium: '✓'         },
    { label: 'Historical monthly stats',  free: '✗',         premium: '✓'         },
    { label: 'Weight target tracking',    free: '✗',         premium: '✓'         },
    { label: 'Custom step goals',         free: '✗',         premium: '✓'         },
    { label: 'Individual food breakdown', free: '✗',         premium: '✓'         },
    { label: 'Premium badges & themes',   free: '✗',         premium: '✓'         },
  ];

  export default function PaywallScreen({ navigation, route }) {
    const { highlightFeature } = route.params ?? {};
    const { theme } = useTheme();
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
      initIAP();
      const cleanup = setupPurchaseListeners(
        (result) => {
          setPurchasing(false);
          showToast('success', 'Welcome to Premium! 🎉');
          navigation.goBack();
        },
        (error) => {
          setPurchasing(false);
          if (error?.code !== 'E_USER_CANCELLED') {
            Alert.alert('Purchase failed', error?.message || 'Please try again.');
          }
        }
      );
      return () => {
        cleanup();
        endIAP();
      };
    }, []);

    const handleConfirmTrial = async () => {
      setModalVisible(false);
      setPurchasing(true);
      try {
        const productId = plan === 'yearly' ? PRODUCT_ID_ANNUAL : PRODUCT_ID_MONTHLY;
        await purchaseSubscription(productId);
      } catch (error) {
        setPurchasing(false);
        if (error?.code !== 'E_USER_CANCELLED') {
          Alert.alert('Purchase failed', error?.message || 'Please try again.');
        }
      }
    };

    const handleRestorePurchases = async () => {
      setRestoring(true);
      try {
        const result = await restorePurchases();
        if (result?.restored) {
          showToast('success', 'Purchases restored! 🎉');
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
          <Text style={[styles.header, { color: theme.text }]}>Start your 7-day free trial</Text>
          <Text style={[styles.subhead, { color: theme.textSecondary }]}>
            Cancel anytime. No charge until your trial ends.
          </Text>

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

          {/* Plan toggle */}
          <View style={styles.toggleRow}>
            <TouchableOpacity
              style={[styles.togglePill, plan === 'yearly' && styles.togglePillActive]}
              onPress={() => setPlan('yearly')}
            >
              <Text style={[styles.toggleText, plan === 'yearly' && styles.toggleTextActive]}>
                Yearly
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.togglePill, plan === 'monthly' && styles.togglePillActive]}
              onPress={() => setPlan('monthly')}
            >
              <Text style={[styles.toggleText, plan === 'monthly' && styles.toggleTextActive]}>
                Monthly
              </Text>
            </TouchableOpacity>
          </View>

          {/* Pricing card */}
          <View style={[styles.pricingCard, { backgroundColor: theme.cardBackground }]}>
            {plan === 'yearly' ? (
              <>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>Best Value — Save 37%</Text>
                </View>
                <Text style={[styles.priceMain, { color: theme.text }]}>$59.99/year</Text>
                <Text style={[styles.priceSub, { color: theme.textSecondary }]}>$5/mo effective</Text>
              </>
            ) : (
              <Text style={[styles.priceMain, { color: theme.text }]}>$7.99/month</Text>
            )}
          </View>

          {/* CTA */}
          <TouchableOpacity
            style={[styles.ctaButton, purchasing && { opacity: 0.7 }]}
            onPress={() => setModalVisible(true)}
            disabled={purchasing}
          >
            {purchasing
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.ctaText}>Start Free Trial</Text>
            }
          </TouchableOpacity>

          {/* Fine print */}
          <Text style={[styles.finePrint, { color: theme.textTertiary }]}>
            By continuing, you agree to our Terms of Service and Privacy Policy.{'\n'}
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
    header: {
      fontSize: 26,
      fontWeight: '700',
      textAlign: 'center',
      marginBottom: 8,
    },
    subhead: {
      fontSize: 14,
      textAlign: 'center',
      marginBottom: 24,
      lineHeight: 20,
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
    pricingCard: {
      borderRadius: 14,
      padding: 20,
      alignItems: 'center',
      marginBottom: 20,
    },
    badge: {
      backgroundColor: '#1F9B39',
      borderRadius: 20,
      paddingVertical: 4,
      paddingHorizontal: 14,
      marginBottom: 10,
    },
    badgeText: {
      color: '#fff',
      fontSize: 12,
      fontWeight: '700',
    },
    priceMain: {
      fontSize: 28,
      fontWeight: '800',
      marginBottom: 4,
    },
    priceSub: {
      fontSize: 14,
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