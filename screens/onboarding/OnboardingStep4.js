// ** Lifestyle **
import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useOnboarding } from '../../utils/OnboardingContext';
import { useLanguage } from '../../utils/LanguageContext';

export default function OnboardingStep4({ navigation }) {
  const { updateOnboardingData } = useOnboarding();
  const { t } = useLanguage(); 
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
    navigation.navigate('OnboardingStep5');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
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
        <ScrollView 
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
        >
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
        </ScrollView>

        {/* Continue Button */}
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    paddingHorizontal: 30,
    paddingTop: 20,
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
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
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
  },
  scrollView: {
    flex: 1,
    marginBottom: 20,
  },
  activityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderWidth: 2,
    borderColor: '#ddd',
    borderRadius: 12,
    marginBottom: 12,
  },
  activityCardSelected: {
    borderColor: '#4CAF50',
    backgroundColor: '#e8f5e9',
  },
  activityEmoji: {
    fontSize: 32,
    marginRight: 12,
  },
  activityTextContainer: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  activityTitleSelected: {
    color: '#4CAF50',
  },
  activityDescription: {
    fontSize: 13,
    color: '#999',
  },
  activityDescriptionSelected: {
    color: '#666',
  },
  checkmark: {
    fontSize: 24,
    color: '#4CAF50',
    marginLeft: 8,
  },
  navigationButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
    marginBottom: 20,
    },
    backButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: '#ddd',
    justifyContent: 'center',
    alignItems: 'center',
    },
    backArrow: {
    fontSize: 24,
    color: '#666',
    },
    continueButton: {
    flex: 1,
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