//*** HEIGHT AND WEIGHT SCREEN ***
import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useOnboarding } from '../../utils/OnboardingContext';
import { useLanguage } from '../../utils/LanguageContext';
import { scale } from '../../utils/responsive';
import { posthog } from '../../utils/posthog';

export default function OnboardingStep2({ navigation }) {
  useEffect(() => { posthog.capture('onboarding_step_viewed', { step: 'current_stats' }); }, []);
  const { updateOnboardingData } = useOnboarding();
  const [unit, setUnit] = useState('imperial'); // 'imperial' or 'metric'
  const [heightFeet, setHeightFeet] = useState('');
  const [heightInches, setHeightInches] = useState('');
  const [heightCm, setHeightCm] = useState('');
  const [weight, setWeight] = useState('');
  const [error, setError] = useState('');
  const heightInchesRef = React.useRef(null);
  const heightCmWeightRef = React.useRef(null);
  const weightRef = React.useRef(null);
  const { t } = useLanguage(); 

  const handleContinue = () => {
    setError('');

    // Validation
    if (unit === 'imperial') {
      if (!heightFeet || !heightInches) {
        setError(t('onboarding.enterHeight'));
        return;
      }
      const feet = parseInt(heightFeet);
      const inches = parseInt(heightInches);
      if (isNaN(feet) || isNaN(inches) || feet < 3 || feet > 8 || inches < 0 || inches >= 12) {
        setError(t('onboarding.validHeightImperial'));
        return;
      }
    } else {
      if (!heightCm) {
        setError(t('onboarding.enterHeight'));
        return;
      }
      const cm = parseInt(heightCm);
      if (isNaN(cm) || cm < 100 || cm > 250) {
        setError(t('onboarding.validHeightMetric'));
        return;
      }
    }

    if (!weight) {
      setError(t('onboarding.enterWeight'));
      return;
    }

    const weightNum = parseFloat(weight);
    if (isNaN(weightNum) || weightNum <= 0) {
      setError('Please enter a valid weight');
      return;
    }

    if (unit === 'imperial' && (weightNum < 50 || weightNum > 700)) {
      setError(t('onboarding.validWeightImperial'));
      return;
    }

    if (unit === 'metric' && (weightNum < 20 || weightNum > 300)) {
      setError(t('onboarding.validWeightMetric'));
      return;
    }

    // TODO: Save to user profile
    console.log('Height:', unit === 'imperial' ? `${heightFeet}'${heightInches}"` : `${heightCm}cm`);
    console.log('Weight:', weight, unit === 'imperial' ? 'lbs' : 'kg');

    // Save data to context
    updateOnboardingData({
      heightFeet: unit === 'imperial' ? heightFeet : '',
      heightInches: unit === 'imperial' ? heightInches : '',
      heightCm: unit === 'metric' ? heightCm : '',
      weight: weight,
      unit: unit,
    });
    console.log('✅ Step 1 saved:', { heightFeet, heightInches, heightCm, weight, unit });

    // Navigate to next step
    navigation.navigate('OnboardingStep3');
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
                <View style={[styles.progressFill, { width: '25%' }]} />
              </View>
              <Text style={styles.progressText}>{t('onboarding.step')} 2 {t('onboarding.of')} 8</Text>
            </View>

            {/* Title */}
            <Text style={styles.title}>{t('onboarding.step2Title')}</Text>

            {/* Error Message */}
            {error ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {/* Unit Toggle */}
            <View style={styles.unitToggle}>
              <TouchableOpacity
                style={[styles.unitButton, unit === 'imperial' && styles.unitButtonSelected]}
                onPress={() => setUnit('imperial')}
              >
                <Text
                  style={[styles.unitText, unit === 'imperial' && styles.unitTextSelected]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.7}
                >
                  {t('onboarding.imperial')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.unitButton, unit === 'metric' && styles.unitButtonSelected]}
                onPress={() => setUnit('metric')}
              >
                <Text
                  style={[styles.unitText, unit === 'metric' && styles.unitTextSelected]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.7}
                >
                  {t('onboarding.metric')}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Height Input */}
            <View style={styles.section}>
              <Text style={styles.label}>{t('onboarding.height')}</Text>
              {unit === 'imperial' ? (
                <View style={styles.heightRow}>
                  <View style={styles.heightInput}>
                  <TextInput
                    style={styles.input}
                    placeholder="5"
                    placeholderTextColor="#999"
                    value={heightFeet}
                    onChangeText={setHeightFeet}
                    keyboardType="number-pad"
                    maxLength={1}
                    returnKeyType="next"
                    onSubmitEditing={() => heightInchesRef.current?.focus()}
                  />
                    <Text style={styles.unitLabel}>ft</Text>
                  </View>
                  <View style={styles.heightInput}>
                  <TextInput
                    ref={heightInchesRef}
                    style={styles.input}
                    placeholder="7"
                    placeholderTextColor="#999"
                    value={heightInches}
                    onChangeText={setHeightInches}
                    keyboardType="number-pad"
                    maxLength={2}
                    returnKeyType="next"
                    onSubmitEditing={() => weightRef.current?.focus()}
                  />
                    <Text style={styles.unitLabel}>in</Text>
                  </View>
                </View>
              ) : (
                <View style={styles.singleInput}>
                <TextInput
                  ref={heightCmWeightRef}
                  style={styles.input}
                  placeholder="170"
                  placeholderTextColor="#999"
                  value={heightCm}
                  onChangeText={setHeightCm}
                  keyboardType="number-pad"
                  maxLength={3}
                  returnKeyType="next"
                  onSubmitEditing={() => weightRef.current?.focus()}
                />
                  <Text style={styles.unitLabel}>cm</Text>
                </View>
              )}
            </View>

            {/* Weight Input */}
            <View style={styles.section}>
              <Text style={styles.label}>{t('onboarding.weight')}</Text>
              <View style={styles.singleInput}>
              <TextInput
                ref={weightRef}
                style={styles.input}
                placeholder={unit === 'imperial' ? '165' : '75'}
                placeholderTextColor="#999"
                value={weight}
                onChangeText={setWeight}
                keyboardType="decimal-pad"
                returnKeyType="done"
                onSubmitEditing={handleContinue}
              />
                <Text style={styles.unitLabel}>{unit === 'imperial' ? 'lbs' : 'kg'}</Text>
              </View>
            </View>

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
                <Text style={styles.continueButtonText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{t('onboarding.continue')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

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
  unitToggle: {
    flexDirection: 'row',
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    padding: 4,
    marginBottom: scale(25),
  },
  unitButton: {
    flex: 1,
    paddingVertical: scale(10),
    alignItems: 'center',
    borderRadius: 8,
  },
  unitButtonSelected: {
    backgroundColor: '#fff',
  },
  unitText: {
    fontSize: scale(14),
    color: '#999',
    flexShrink: 1,
  },
  unitTextSelected: {
    color: '#4CAF50',
    fontWeight: '600',
  },
  section: {
    marginBottom: scale(25),
  },
  label: {
    fontSize: scale(15),
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  heightRow: {
    flexDirection: 'row',
    gap: 15,
  },
  heightInput: {
    flex: 1,
    position: 'relative',
  },
  singleInput: {
    position: 'relative',
  },
  input: {
    borderWidth: 2,
    borderColor: '#6B5B45',
    borderRadius: 10,
    padding: scale(14),
    fontSize: scale(15),
    paddingRight: 50,
    color: '#333',
  },
  unitLabel: {
    position: 'absolute',
    right: 15,
    top: scale(14),
    fontSize: scale(15),
    color: '#999',
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