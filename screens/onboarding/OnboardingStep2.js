//*** HEIGHT AND WEIGHT SCREEN ***
import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useOnboarding } from '../../utils/OnboardingContext';
import { useLanguage } from '../../utils/LanguageContext';

export default function OnboardingStep2({ navigation }) {
  const { updateOnboardingData } = useOnboarding();
  const [unit, setUnit] = useState('imperial'); // 'imperial' or 'metric'
  const [heightFeet, setHeightFeet] = useState('');
  const [heightInches, setHeightInches] = useState('');
  const [heightCm, setHeightCm] = useState('');
  const [weight, setWeight] = useState('');
  const [error, setError] = useState('');
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
                <Text style={[styles.unitText, unit === 'imperial' && styles.unitTextSelected]}>
                  {t('onboarding.imperial')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.unitButton, unit === 'metric' && styles.unitButtonSelected]}
                onPress={() => setUnit('metric')}
              >
                <Text style={[styles.unitText, unit === 'metric' && styles.unitTextSelected]}>
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
                    />
                    <Text style={styles.unitLabel}>ft</Text>
                  </View>
                  <View style={styles.heightInput}>
                    <TextInput
                      style={styles.input}
                      placeholder="7"
                      placeholderTextColor="#999" 
                      value={heightInches}
                      onChangeText={setHeightInches}
                      keyboardType="number-pad"
                      maxLength={2}
                    />
                    <Text style={styles.unitLabel}>in</Text>
                  </View>
                </View>
              ) : (
                <View style={styles.singleInput}>
                  <TextInput
                    style={styles.input}
                    placeholder="170"
                    placeholderTextColor="#999" 
                    value={heightCm}
                    onChangeText={setHeightCm}
                    keyboardType="number-pad"
                    maxLength={3}
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
                  style={styles.input}
                  placeholder={unit === 'imperial' ? '165' : '75'}
                  placeholderTextColor="#999" 
                  value={weight}
                  onChangeText={setWeight}
                  keyboardType="decimal-pad"
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
                <Text style={styles.continueButtonText}>{t('onboarding.continue')}</Text>
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
  unitToggle: {
    flexDirection: 'row',
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    padding: 4,
    marginBottom: 30,
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
  section: {
    marginBottom: 30,
  },
  label: {
    fontSize: 16,
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
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    paddingRight: 50,
    color: '#333',
  },
  unitLabel: {
    position: 'absolute',
    right: 15,
    top: 15,
    fontSize: 16,
    color: '#999',
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