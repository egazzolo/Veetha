// *** Goal + Activity Level ***
import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useOnboarding } from '../../utils/OnboardingContext';
import { useLanguage } from '../../utils/LanguageContext';
import { scale } from '../../utils/responsive';
import { posthog } from '../../utils/posthog';

export default function OnboardingStep3({ navigation }) {
  const { updateOnboardingData, onboardingData } = useOnboarding();
  const { t } = useLanguage();

  useEffect(() => { posthog.capture('onboarding_step_viewed', { step: 'goal' }); }, []);
  const [goal, setGoal] = useState('');
  const [targetWeight, setTargetWeight] = useState('');
  const [activityLevel, setActivityLevel] = useState('');
  const unit = onboardingData.unit || 'imperial';
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
    if (!goal) {
      setError(t('onboarding.selectGoal'));
      return;
    }

    // Only validate target weight if goal is "lose"
    if (goal === 'lose') {
      if (!targetWeight) {
        setError(t('onboarding.enterTargetWeight'));
        return;
      }
      const targetNum = parseFloat(targetWeight);
      if (isNaN(targetNum) || targetNum <= 0) {
        setError(t('onboarding.validTargetWeight'));
        return;
      }
    }

    if (!activityLevel) {
      setError(t('onboarding.selectActivityLevel'));
      return;
    }

    updateOnboardingData({
      goal: goal,
      targetWeight: targetWeight,
      // Don't save unit here - it was already saved in Step 1!
      activityLevel: activityLevel,
    });

    console.log('✅ Step 3 saved:', { goal, targetWeight, activityLevel });

    // Navigate to next step
    navigation.navigate('OnboardingStep4b');
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
                <View style={[styles.progressFill, { width: '33.33%' }]} />
              </View>
              <Text style={styles.progressText}>{t('onboarding.step')} 2 {t('onboarding.of')} 6</Text>
          </View>

          {/* Title */}
          <Text style={styles.title}>{t('onboarding.step3Title')}</Text>

          {/* Error Message */}
          {error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* Goal Selection */}
          <View style={styles.section}>
            <TouchableOpacity
              style={[styles.goalCard, goal === 'lose' && styles.goalCardSelected]}
              onPress={() => setGoal('lose')}
            >
              <Text style={styles.goalEmoji}>📉</Text>
              <Text style={[styles.goalText, goal === 'lose' && styles.goalTextSelected]}>
                {t('onboarding.loseWeight')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.goalCard, goal === 'maintain' && styles.goalCardSelected]}
              onPress={() => setGoal('maintain')}
            >
              <Text style={styles.goalEmoji}>⚖️</Text>
              <Text style={[styles.goalText, goal === 'maintain' && styles.goalTextSelected]}>
                {t('onboarding.maintainWeight')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.goalCard, goal === 'gain' && styles.goalCardSelected]}
              onPress={() => setGoal('gain')}
            >
              <Text style={styles.goalEmoji}>💪</Text>
              <Text style={[styles.goalText, goal === 'gain' && styles.goalTextSelected]}>
                {t('onboarding.gainMuscle')}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Target Weight Input (only show if goal is "lose") */}
          {goal === 'lose' && (
            <View style={styles.section}>

              <Text style={styles.label}>{t('onboarding.targetWeightQuestion')}</Text>
              <View style={styles.targetWeightContainer}>
                <TextInput
                  style={styles.input}
                  placeholder={unit === 'imperial' ? '150' : '68'}
                  value={targetWeight}
                  onChangeText={setTargetWeight}
                  keyboardType="decimal-pad"
                />
                <Text style={styles.unitLabel}>{unit === 'imperial' ? 'lbs' : 'kg'}</Text>
              </View>
              <Text style={styles.hint}>{t('onboarding.reachGoalSafely')}</Text>
            </View>
          )}

          {/* Activity Level */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('onboarding.step4Title')}</Text>
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
                <Text style={styles.continueButtonText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{t('onboarding.continue')}</Text>
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
    marginBottom: scale(25),
  },
  sectionTitle: {
    fontSize: scale(19),
    fontWeight: 'bold',
    color: '#333',
    marginBottom: scale(16),
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
  section: {
    marginBottom: scale(25),
  },
  goalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: scale(16),
    borderWidth: 2,
    borderColor: '#6B5B45',
    borderRadius: 12,
    marginBottom: scale(12),
  },
  goalCardSelected: {
    borderColor: '#4CAF50',
    backgroundColor: '#e8f5e9',
  },
  goalEmoji: {
    fontSize: scale(28),
    marginRight: 15,
  },
  goalText: {
    fontSize: scale(16),
    color: '#666',
  },
  goalTextSelected: {
    color: '#4CAF50',
    fontWeight: '600',
  },
  label: {
    fontSize: scale(15),
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  targetWeightContainer: {
    position: 'relative',
  },
  input: {
    borderWidth: 2,
    borderColor: '#6B5B45',
    borderRadius: 10,
    padding: scale(14),
    fontSize: scale(15),
    paddingRight: 50,
  },
  unitLabel: {
    position: 'absolute',
    right: 15,
    top: scale(14),
    fontSize: scale(15),
    color: '#999',
  },
  hint: {
    fontSize: scale(12),
    color: '#999',
    marginTop: 8,
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
  scrollContent: {
    flexGrow: 1,
  }
});
