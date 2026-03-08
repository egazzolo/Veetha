import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useOnboarding } from '../../utils/OnboardingContext';
import { useLanguage } from '../../utils/LanguageContext';
import { scale } from '../../utils/responsive';

export default function OnboardingStep7({ navigation }) {
  const { updateOnboardingData } = useOnboarding();
  const { t } = useLanguage(); 
  const [source, setSource] = useState('');

  const sourceOptions = [
    { id: 'tiktok', label: t('onboarding.tiktok'), icon: require('../../assets/icons/Social Media icons/tiktokIcon.png') },
    { id: 'instagram', label: t('onboarding.instagram'), icon: require('../../assets/icons/Social Media icons/instagramIcon.png') },
    { id: 'youtube', label: t('onboarding.youtube'), icon: require('../../assets/icons/Social Media icons/youtubeIcon.png') },
    { id: 'friend', label: t('onboarding.friend'), emoji: '👥' },
    { id: 'google', label: t('onboarding.google'), icon: require('../../assets/icons/Social Media icons/googleIcon.png') },
    { id: 'facebook', label: t('onboarding.facebook'), icon: require('../../assets/icons/Social Media icons/facebookicon.png') },
    { id: 'other', label: t('onboarding.other'), emoji: '💭' },
  ];

  const handleContinue = () => {
    // No validation needed - this is optional
    console.log('Referral Source:', source);

    updateOnboardingData({
      referralSource: source,
    })

    console.log('✅ Step 7 saved:', { source });

    // Navigate to final step
    navigation.navigate('OnboardingComplete');
  };

  const handleSkip = () => {
    // Skip this step
    setSource('');
    navigation.navigate('OnboardingComplete');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.content}>
            {/* Progress Indicator */}
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: '87.5%' }]} />
              </View>
              <Text style={styles.progressText}>{t('onboarding.step')} 7 {t('onboarding.of')} 8</Text>
            </View>

            {/* Title */}
            <Text style={styles.title}>{t('onboarding.step7Title')}</Text>
            <Text style={styles.subtitle}>{t('onboarding.step7Subtitle')}</Text>

            {/* Source Options */}
            <View style={styles.optionsContainer}>
              {sourceOptions.map((option) => (
                <TouchableOpacity
                  key={option.id}
                  style={[
                    styles.optionCard,
                    source === option.id && styles.optionCardSelected,
                  ]}
                  onPress={() => setSource(option.id)}
                >
                  {option.icon ? (
                    <Image 
                      source={option.icon} 
                      style={styles.optionIcon}
                      resizeMode="contain"
                    />
                  ) : (
                    <Text style={styles.optionEmoji}>{option.emoji}</Text>
                  )}
                  <Text
                    style={[
                      styles.optionLabel,
                      source === option.id && styles.optionLabelSelected,
                    ]}
                  >
                    {option.label}
                  </Text>
                  {source === option.id && (
                    <View style={styles.checkmark}>
                      <Text style={styles.checkmarkText}>✓</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>

            {/* Skip Link */}
            <TouchableOpacity onPress={handleSkip} style={styles.skipContainer}>
              <Text style={styles.skipText}>{t('onboarding.skipStep')}</Text>
            </TouchableOpacity>

            {/* Spacer */}
            <View style={{ height: 20 }} />

            {/* Navigation Buttons */}
            <View style={styles.navigationButtons}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => navigation.goBack()}
              >
                <Text style={styles.backArrow}>←</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.continueButton}
                onPress={handleContinue}
              >
                <Text style={styles.continueButtonText}>{t('onboarding.continue')}</Text>
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
  title: {
    fontSize: scale(26),
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: scale(13),
    color: '#999',
    marginBottom: scale(25),
  },
  optionsContainer: {
    marginBottom: 20,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: scale(14),
    borderWidth: 2,
    borderColor: '#6B5B45',
    borderRadius: 12,
    marginBottom: scale(10),
  },
  optionCardSelected: {
    borderColor: '#4CAF50',
    backgroundColor: '#e8f5e9',
  },
  optionEmoji: {
    fontSize: scale(24),
    marginRight: 12,
  },
  optionIcon: {
    width: scale(28),
    height: scale(28),
    marginRight: 12,
  },
  optionImage: {
    width: scale(28),
    height: scale(28),
    resizeMode: 'contain',
    marginBottom: 6,
  },
  optionLabel: {
    flex: 1,
    fontSize: scale(15),
    color: '#333',
  },
  optionLabelSelected: {
    color: '#4CAF50',
    fontWeight: '600',
  },
  checkmark: {
    width: scale(22),
    height: scale(22),
    borderRadius: scale(11),
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmarkText: {
    color: '#fff',
    fontSize: scale(14),
    fontWeight: 'bold',
  },
  skipContainer: {
    alignItems: 'center',
    paddingVertical: 15,
  },
  skipText: {
    fontSize: scale(15),
    color: '#4CAF50',
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
    borderColor: '#6B5B45',
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
  continueButtonText: {
    color: '#fff',
    fontSize: scale(16),
    fontWeight: '600',
  },
});