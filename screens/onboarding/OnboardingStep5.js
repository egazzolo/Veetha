// *** Dietary Restrictions ***
import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useOnboarding } from '../../utils/OnboardingContext';
import { useLanguage } from '../../utils/LanguageContext';
import { scale } from '../../utils/responsive';

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