import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useOnboarding } from '../../utils/OnboardingContext';
import { useLanguage } from '../../utils/LanguageContext';

export default function OnboardingStep5({ navigation }) {
  const { updateOnboardingData } = useOnboarding();
  const { t } = useLanguage();
  const [selectedRestrictions, setSelectedRestrictions] = useState([]);

  const dietaryOptions = [
    { id: 'vegetarian', label: t('onboarding.vegetarian'), emoji: '🥬' },
    { id: 'vegan', label: t('onboarding.vegan'), emoji: '🌱' },
    { id: 'pescatarian', label: t('onboarding.pescatarian'), emoji: '🐟' },
    { id: 'keto', label: t('onboarding.ketoLowCarb'), emoji: '🥑' },
    { id: 'gluten_free', label: t('onboarding.glutenFree'), emoji: '🌾' },
    { id: 'lactose_intolerant', label: t('onboarding.lactoseIntolerant'), emoji: '🥛' },
    { id: 'nut_allergy', label: t('onboarding.nutAllergy'), emoji: '🥜' },
    { id: 'none', label: t('onboarding.noDietary'), emoji: '✅' },
  ];

  const toggleRestriction = (id) => {
    if (id === 'none') {
      // If "None" is selected, clear all others
      setSelectedRestrictions(['none']);
    } else {
      // Remove "none" if selecting any specific restriction
      const withoutNone = selectedRestrictions.filter(r => r !== 'none');
      
      if (selectedRestrictions.includes(id)) {
        // Remove if already selected
        setSelectedRestrictions(withoutNone.filter(r => r !== id));
      } else {
        // Add to selection
        setSelectedRestrictions([...withoutNone, id]);
      }
    }
  };

  const handleContinue = () => {
    // No validation needed - dietary restrictions are optional
    // TODO: Save to user profile
    console.log('Dietary Restrictions:', selectedRestrictions);

    updateOnboardingData({
      dietaryRestrictions: selectedRestrictions,
    })

    console.log('✅ Step 5 saved:', { selectedRestrictions });

    // Navigate to next step
    navigation.navigate('OnboardingStep6');
  };

  const handleSkip = () => {
    // Skip this step
    setSelectedRestrictions([]);
    navigation.navigate('OnboardingStep6');
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
                <View style={[styles.progressFill, { width: '62.5%' }]} />
              </View>
              <Text style={styles.progressText}>{t('onboarding.step')} 5 {t('onboarding.of')} 8</Text>
            </View>

            {/* Title */}
            <Text style={styles.title}>{t('onboarding.step5Title')}</Text>
            <Text style={styles.subtitle}>{t('onboarding.step5Subtitle')}</Text>

            {/* Dietary Options */}
            <View style={styles.optionsContainer}>
              {dietaryOptions.map((option) => (
                <TouchableOpacity
                  key={option.id}
                  style={[
                    styles.optionCard,
                    selectedRestrictions.includes(option.id) && styles.optionCardSelected,
                  ]}
                  onPress={() => toggleRestriction(option.id)}
                >
                  <Text style={styles.optionEmoji}>{option.emoji}</Text>
                  <Text
                    style={[
                      styles.optionLabel,
                      selectedRestrictions.includes(option.id) && styles.optionLabelSelected,
                    ]}
                  >
                    {option.label}
                  </Text>
                  {selectedRestrictions.includes(option.id) && (
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
    backgroundColor: '#fff',
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
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 14,
    color: '#999',
    marginBottom: 30,
  },
  optionsContainer: {
    marginBottom: 20,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderWidth: 2,
    borderColor: '#ddd',
    borderRadius: 12,
    marginBottom: 12,
  },
  optionCardSelected: {
    borderColor: '#4CAF50',
    backgroundColor: '#e8f5e9',
  },
  optionEmoji: {
    fontSize: 28,
    marginRight: 12,
  },
  optionLabel: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  optionLabelSelected: {
    color: '#4CAF50',
    fontWeight: '600',
  },
  checkmark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmarkText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  skipContainer: {
    alignItems: 'center',
    paddingVertical: 15,
  },
  skipText: {
    fontSize: 16,
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
  navigationButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
    marginBottom: 20,
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