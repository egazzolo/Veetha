// *** Goal: Gain, maintain or lose weight ***
import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useOnboarding } from '../../utils/OnboardingContext';
import { useLanguage } from '../../utils/LanguageContext';

export default function OnboardingStep3({ navigation }) {
  const { updateOnboardingData, onboardingData } = useOnboarding();
  const { t } = useLanguage(); 
  const [goal, setGoal] = useState('');
  const [targetWeight, setTargetWeight] = useState('');
  const unit = onboardingData.unit || 'imperial';
  const [error, setError] = useState('');

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

    console.log('Goal:', goal);
    if (goal === 'lose') {
      console.log('Target Weight:', targetWeight);
    };

    updateOnboardingData({
      goal: goal,
      targetWeight: targetWeight,
      // Don't save unit here - it was already saved in Step 2!
    });

console.log('✅ Step 3 saved:', { goal, targetWeight });

    // Navigate to next step
    navigation.navigate('OnboardingStep4');
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
                <View style={[styles.progressFill, { width: '37.5%' }]} />
              </View>
              <Text style={styles.progressText}>{t('onboarding.step')} 3 {t('onboarding.of')} 8</Text>
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

          {/* Spacer */}
          <View style={{ flex: 1 }} />

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
        </ScrollView>
      </KeyboardAvoidingView>
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
    marginBottom: 30,
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
  section: {
    marginBottom: 30,
  },
  goalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderWidth: 2,
    borderColor: '#ddd',
    borderRadius: 12,
    marginBottom: 15,
  },
  goalCardSelected: {
    borderColor: '#4CAF50',
    backgroundColor: '#e8f5e9',
  },
  goalEmoji: {
    fontSize: 32,
    marginRight: 15,
  },
  goalText: {
    fontSize: 18,
    color: '#666',
  },
  goalTextSelected: {
    color: '#4CAF50',
    fontWeight: '600',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  targetWeightContainer: {
    position: 'relative',
  },
  input: {
    borderWidth: 2,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    paddingRight: 50,
  },
  unitLabel: {
    position: 'absolute',
    right: 15,
    top: 15,
    fontSize: 16,
    color: '#999',
  },
  hint: {
    fontSize: 12,
    color: '#999',
    marginTop: 8,
  },
  unitToggle: {
    flexDirection: 'row',
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    padding: 4,
    marginBottom: 20,
  },
  unitButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  unitButtonSelected: {
    backgroundColor: '#fff',
  },
  unitText: {
    fontSize: 14,
    color: '#999',
  },
  unitTextSelected: {
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
  scrollContent: {
    flexGrow: 1,
  }
});