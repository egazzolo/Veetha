// *** Agreement ***
import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useOnboarding } from '../../utils/OnboardingContext';
import { useLanguage } from '../../utils/LanguageContext';
import { scale } from '../../utils/responsive';
import { posthog } from '../../utils/posthog';

export default function OnboardingStep6({ navigation }) {
  const { updateOnboardingData } = useOnboarding();
  const { t } = useLanguage();
  const [agreed, setAgreed] = useState(false);
  const scrollRef = useRef(null);
  const hasAutoScrolled = useRef(false);

  useEffect(() => { posthog.capture('onboarding_step_viewed', { step: 'agreement' }); }, []);
  const [error, setError] = useState('');

  useEffect(() => {
    if (agreed && !hasAutoScrolled.current) {
      hasAutoScrolled.current = true;
      setTimeout(() => {
        scrollRef.current?.scrollToEnd({ animated: true });
      }, 200);
    }
  }, [agreed]);

  const handleContinue = () => {
    setError('');

    // Validation
    if (!agreed) {
      setError(t('onboarding.pleaseAgree'));
      return;
    }

    // Save agreement to context
    updateOnboardingData({
      medicalDisclaimerAgreed: true,
    });

    console.log('Medical Disclaimer Agreed:', agreed);

    // Navigate to next step
    navigation.navigate('OnboardingStep7');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.content}>
            {/* Progress Indicator */}
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: '77.78%' }]} />
              </View>
              <Text style={styles.progressText}>{t('onboarding.step')} 7 {t('onboarding.of')} 9</Text>
            </View>

            {/* Icon */}
            <View style={styles.iconContainer}>
              <Text style={styles.icon}>⚠️</Text>
            </View>

            {/* Title */}
            <Text style={styles.title}>{t('onboarding.step6Title')}</Text>

            {/* Disclaimer Text */}
            <View style={styles.disclaimerBox}>
              <Text style={styles.disclaimerText}>
                {t('onboarding.disclaimerLine1')}
              </Text>
              
              <Text style={styles.disclaimerText}>
                {t('onboarding.disclaimerLine2')}
              </Text>

              <Text style={styles.disclaimerText}>
                {t('onboarding.disclaimerLine3')}
              </Text>
            </View>

            {/* Error Message */}
            {error ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {/* Agreement Checkbox */}
            <TouchableOpacity 
              style={styles.checkboxContainer}
              onPress={() => setAgreed(!agreed)}
            >
              <View style={[styles.checkbox, agreed && styles.checkboxChecked]}>
                {agreed && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <Text style={styles.checkboxLabel}>
                {t('onboarding.agreeCheckbox')}
              </Text>
            </TouchableOpacity>

            {/* Spacer */}
            <View style={{ flex: 1 }} />

            {/* Navigation Buttons */}
            <View style={styles.navigationButtons}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => navigation.goBack()}
              >
                <Text style={styles.backArrow}>←</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.continueButton, !agreed && styles.continueButtonDisabled]}
                onPress={handleContinue}
              >
                <Text style={styles.continueButtonText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{t('onboarding.agreeButton')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EAE0C8',
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 30,
    paddingTop: 20,
  },
  progressContainer: {
    marginBottom: scale(25),
  },
  progressBar: {
    height: 4,
    backgroundColor: '#e0e0e0',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
  },
  progressText: {
    fontSize: scale(12),
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: scale(16),
  },
  icon: {
    fontSize: scale(54),
  },
  title: {
    fontSize: scale(26),
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: scale(25),
  },
  disclaimerBox: {
    backgroundColor: '#fff8e1',
    borderLeftWidth: 4,
    borderLeftColor: '#ffa726',
    padding: scale(18),
    borderRadius: 8,
    marginBottom: scale(25),
  },
  disclaimerText: {
    fontSize: scale(14),
    lineHeight: scale(22),
    color: '#333',
    marginBottom: scale(12),
  },
  bold: {
    fontWeight: '700',
    color: '#000',
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  errorText: {
    color: '#c62828',
    textAlign: 'center',
    fontSize: scale(14),
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: scale(25),
  },
  checkbox: {
    width: scale(26),
    height: scale(26),
    borderWidth: 2,
    borderColor: '#4CAF50',
    borderRadius: 6,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#4CAF50',
  },
  checkmark: {
    color: '#fff',
    fontSize: scale(16),
    fontWeight: 'bold',
  },
  checkboxLabel: {
    flex: 1,
    fontSize: scale(15),
    color: '#333',
    fontWeight: '600',
  },
  navigationButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
    marginBottom: 20,
  },
  backButton: {
    width: scale(46),
    height: scale(46),
    borderRadius: scale(23),
    borderWidth: 2,
    borderColor: '#ddd',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backArrow: {
    fontSize: scale(22),
    color: '#666',
  },
  continueButton: {
    flex: 1,
    backgroundColor: '#4CAF50',
    paddingVertical: scale(14),
    borderRadius: 10,
    alignItems: 'center',
  },
  continueButtonDisabled: {
    backgroundColor: '#ccc',
  },
  continueButtonText: {
    color: '#fff',
    fontSize: scale(16),
    fontWeight: '600',
  },
});