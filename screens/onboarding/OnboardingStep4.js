// ** Lifestyle **
import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useOnboarding } from '../../utils/OnboardingContext';
import { useLanguage } from '../../utils/LanguageContext';
import { scale } from '../../utils/responsive';
import { posthog } from '../../utils/posthog';

export default function OnboardingStep4({ navigation }) {
  const { updateOnboardingData } = useOnboarding();
  const { t } = useLanguage();

  useEffect(() => { posthog.capture('onboarding_step_viewed', { step: 'activity_level' }); }, []);
  const [activityLevel, setActivityLevel] = useState('');
  const [error, setError] = useState('');

  const activityOptions = [
    {
      id: 'sedentary',
      emoji: '🪑',
      title: t('onboarding.sedentary'),
      description: t('onboarding.sedentaryDesc'),
    },
    {
      id: 'lightly_active',
      emoji: '🚶',
      title: t('onboarding.lightlyActive'),
      description: t('onboarding.lightlyActiveDesc'),
    },
    {
      id: 'moderately_active',
      emoji: '🏃',
      title: t('onboarding.moderatelyActive'),
      description: t('onboarding.moderatelyActiveDesc'),
    },
    {
      id: 'very_active',
      emoji: '🏋️',
      title: t('onboarding.veryActive'),
      description: t('onboarding.veryActiveDesc'),
    },
    {
      id: 'extremely_active',
      emoji: '💪',
      title: t('onboarding.extremelyActive'),
      description: t('onboarding.extremelyActiveDesc'),
    },
  ];

  const handleContinue = () => {
    setError('');

    // Validation
    if (!activityLevel) {
      setError(t('onboarding.selectActivityLevel'));
      return;
    };

    // TODO: Save to user profile
    console.log('Activity Level:', activityLevel);
    
    updateOnboardingData({
      activityLevel: activityLevel,
    });

    console.log('✅ Step 4 saved:', { activityLevel });

    // Navigate to next step
    navigation.navigate('OnboardingStep4b');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          {/* Progress Indicator */}
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: '50%' }]} />
            </View>
            <Text style={styles.progressText}>{t('onboarding.step')} 4 {t('onboarding.of')} 8</Text>
          </View>

          {/* Title */}
          <Text style={styles.title}>{t('onboarding.step4Title')}</Text>

          {/* Error Message */}
          {error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* Activity Options */}
          {activityOptions.map((option) => (
            <TouchableOpacity
              key={option.id}
              style={[
                styles.activityCard,
                activityLevel === option.id && styles.activityCardSelected,
              ]}
              onPress={() => setActivityLevel(option.id)}
            >
              <Text style={styles.activityEmoji}>{option.emoji}</Text>
              <View style={styles.activityTextContainer}>
                <Text
                  style={[
                    styles.activityTitle,
                    activityLevel === option.id && styles.activityTitleSelected,
                  ]}
                >
                  {option.title}
                </Text>
                <Text
                  style={[
                    styles.activityDescription,
                    activityLevel === option.id && styles.activityDescriptionSelected,
                  ]}
                >
                  {option.description}
                </Text>
              </View>
              {activityLevel === option.id && (
                <Text style={styles.checkmark}>✓</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Navigation Buttons - fixed at bottom */}
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
            <Text style={styles.continueButtonText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{t('onboarding.continue')}</Text>
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
  },
  content: {
    flex: 1,
    paddingHorizontal: 30,
    paddingTop: 20,
    paddingBottom: 20,
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
    marginBottom: scale(18),
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
  activityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: scale(14),
    borderWidth: 2,
    borderColor: '#6B5B45',
    borderRadius: 12,
    marginBottom: scale(10),
  },
  activityCardSelected: {
    borderColor: '#4CAF50',
    backgroundColor: '#e8f5e9',
  },
  activityEmoji: {
    fontSize: scale(28),
    marginRight: 12,
  },
  activityTextContainer: {
    flex: 1,
  },
  activityTitle: {
    fontSize: scale(15),
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  activityTitleSelected: {
    color: '#4CAF50',
  },
  activityDescription: {
    fontSize: scale(12),
    color: '#999',
  },
  activityDescriptionSelected: {
    color: '#666',
  },
  checkmark: {
    fontSize: scale(22),
    color: '#4CAF50',
    marginLeft: 8,
  },
  navigationButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
    paddingHorizontal: 30,
    paddingVertical: 12,
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