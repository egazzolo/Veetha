import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLanguage } from '../../utils/LanguageContext';

export default function OnboardingStep4b({ navigation }) {
  const { t } = useLanguage();

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Progress */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: '50%' }]} />
          </View>
          <Text style={styles.progressText}>{t('onboarding.step')} 4 {t('onboarding.of')} 8</Text>
        </View>

        {/* Main Icon */}
        <Text style={styles.mainEmoji}>📓</Text>

        {/* Stat Card */}
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>2x</Text>
          <Text style={styles.statLabel}>{t('onboarding.statLabel')}</Text>
        </View>

        {/* Quote */}
        <View style={styles.quoteContainer}>
          <Text style={styles.quoteText}>{t('onboarding.quote')}</Text>
        </View>

        {/* Source */}
        <Text style={styles.sourceText}>{t('onboarding.source')}</Text>

        {/* Bottom message */}
        <Text style={styles.message}>{t('onboarding.message')}</Text>

      </ScrollView>

      {/* Next Button */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.continueButton}
          onPress={() => navigation.navigate('OnboardingStep5')}
        >
          <Text style={styles.continueButtonText}>{t('onboarding.continue')}</Text>
        </TouchableOpacity>
      </View>
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
    paddingHorizontal: 30,
    paddingTop: 20,
    paddingBottom: 130,
  },
  progressContainer: {
    marginBottom: 30,
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
    fontSize: 12,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
  mainEmoji: {
    fontSize: 72,
    textAlign: 'center',
    marginBottom: 30,
    marginTop: 10,
  },
  statCard: {
    backgroundColor: '#4CAF50',
    borderRadius: 20,
    paddingVertical: 30,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginBottom: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  statNumber: {
    fontSize: 72,
    fontWeight: 'bold',
    color: '#fff',
    lineHeight: 80,
  },
  statLabel: {
    fontSize: 18,
    color: '#fff',
    fontWeight: '600',
    marginTop: 4,
  },
  quoteContainer: {
    borderLeftWidth: 4,
    borderLeftColor: '#6B5B45',
    paddingLeft: 16,
    marginBottom: 20,
  },
  quoteText: {
    fontSize: 17,
    fontStyle: 'italic',
    color: '#333',
    lineHeight: 26,
  },
  sourceText: {
    fontSize: 13,
    color: '#888',
    lineHeight: 20,
    marginBottom: 28,
  },
  message: {
    fontSize: 18,
    fontWeight: '600',
    color: '#4CAF50',
    textAlign: 'center',
    lineHeight: 26,
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 60,
    left: 30,
    right: 30,
  },
  continueButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  continueButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});