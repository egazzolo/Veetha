import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Alert, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../utils/ThemeContext';
import { supabase } from '../utils/supabase';
import { useUser } from '../utils/UserContext';
import { useLanguage } from '../utils/LanguageContext';

const ALLERGIES = [
  { id: 'peanuts', emoji: '🥜' },
  { id: 'dairy', emoji: '🥛' },
  { id: 'shellfish', emoji: '🦐' },
  { id: 'eggs', emoji: '🥚' },
  { id: 'soy', emoji: '🫘' },
  { id: 'wheat', emoji: '🌾' },
  { id: 'fish', emoji: '🐟' },
  { id: 'tree_nuts', emoji: '🌰' },
];

const DIET_TYPES = [
  { value: 'none' },
  { value: 'vegetarian' },
  { value: 'vegan' },
  { value: 'pescatarian' },
  { value: 'keto' },
  { value: 'paleo' },
  { value: 'halal' },
  { value: 'kosher' },
];

const PREFERENCES = [
  { id: 'gluten_free', emoji: '🌾' },
  { id: 'lactose_free', emoji: '🥛' },
  { id: 'low_sodium', emoji: '🧂' },
  { id: 'sugar_free', emoji: '🍬' },
  { id: 'organic', emoji: '🌱' },
];

export default function DietaryRestrictionsScreen({ navigation }) {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const { profile, refreshProfile } = useUser();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [selectedAllergies, setSelectedAllergies] = useState([]);
  const [dietType, setDietType] = useState('none');
  const [selectedPreferences, setSelectedPreferences] = useState([]);

  useEffect(() => {
    loadRestrictions();
  }, []);

  const loadRestrictions = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigation.navigate('Login');
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('allergies, diet_type, dietary_preferences')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      setSelectedAllergies(data.allergies || []);
      setDietType(data.diet_type || 'none');
      setSelectedPreferences(data.dietary_preferences || []);
    } catch (error) {
      console.error('Error loading restrictions:', error);
      Alert.alert(t('dietaryRestrictions.error'), t('dietaryRestrictions.errorLoading'));
    } finally {
      setLoading(false);
    }
  };

  const toggleAllergy = (allergyId) => {
    if (selectedAllergies.includes(allergyId)) {
      setSelectedAllergies(selectedAllergies.filter(id => id !== allergyId));
    } else {
      setSelectedAllergies([...selectedAllergies, allergyId]);
    }
  };

  const togglePreference = (prefId) => {
    if (selectedPreferences.includes(prefId)) {
      setSelectedPreferences(selectedPreferences.filter(id => id !== prefId));
    } else {
      setSelectedPreferences([...selectedPreferences, prefId]);
    }
  };

  const handleSave = async () => {
    setSaving(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigation.navigate('Login');
        return;
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          allergies: selectedAllergies,
          diet_type: dietType,
          dietary_preferences: selectedPreferences,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) throw error;

      await refreshProfile();

      Alert.alert(
        t('dietaryRestrictions.success'),
        t('dietaryRestrictions.successMessage'),
        [
          {
            text: t('dietaryRestrictions.ok'),
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error) {
      console.error('Error saving restrictions:', error);
      Alert.alert(t('dietaryRestrictions.error'), t('dietaryRestrictions.errorSaving'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top', 'bottom']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>{t('dietaryRestrictions.loading')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top', 'bottom']}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={{ paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={[styles.header, { backgroundColor: theme.cardBackground }]}>
            <Text style={[styles.title, { color: theme.text }]}>{t('dietaryRestrictions.title')}</Text>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
              {t('dietaryRestrictions.subtitle')}
            </Text>
          </View>

          {/* Allergies Section */}
          <View style={[styles.card, { backgroundColor: theme.cardBackground }]}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>{t('dietaryRestrictions.allergiesTitle')}</Text>
            <Text style={[styles.helperText, { color: theme.textTertiary, marginBottom: 15 }]}>
              {t('dietaryRestrictions.allergiesHelper')}
            </Text>
            
            <View style={styles.chipsContainer}>
              {ALLERGIES.map((allergy) => (
                <TouchableOpacity
                  key={allergy.id}
                  style={[
                    styles.chip,
                    { 
                      backgroundColor: selectedAllergies.includes(allergy.id) 
                        ? theme.primary 
                        : theme.background,
                      borderColor: selectedAllergies.includes(allergy.id)
                        ? theme.primary
                        : theme.border,
                    }
                  ]}
                  onPress={() => toggleAllergy(allergy.id)}
                >
                  <Text style={[
                    styles.chipText,
                    { 
                      color: selectedAllergies.includes(allergy.id) 
                        ? '#fff' 
                        : theme.text 
                    }
                  ]}>
                    {allergy.emoji} {t(`dietaryRestrictions.${allergy.id.replace('_', '')}`)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Diet Type Section */}
          <View style={[styles.card, { backgroundColor: theme.cardBackground }]}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>{t('dietaryRestrictions.dietTypeTitle')}</Text>
            <Text style={[styles.helperText, { color: theme.textTertiary, marginBottom: 15 }]}>
              {t('dietaryRestrictions.dietTypeHelper')}
            </Text>
            
            {DIET_TYPES.map((diet) => (
              <TouchableOpacity
                key={diet.value}
                style={[
                  styles.dietOption,
                  { 
                    backgroundColor: theme.background,
                    borderColor: dietType === diet.value ? theme.primary : theme.border,
                    borderWidth: dietType === diet.value ? 2 : 1,
                  }
                ]}
                onPress={() => setDietType(diet.value)}
              >
                <View style={styles.dietOptionContent}>
                  <Text style={[styles.dietLabel, { color: theme.text }]}>
                    {t(`dietaryRestrictions.${diet.value}`)}
                  </Text>
                  <Text style={[styles.dietDescription, { color: theme.textSecondary }]}>
                    {t(`dietaryRestrictions.${diet.value}Desc`)}
                  </Text>
                </View>
                {dietType === diet.value && (
                  <Text style={[styles.checkmark, { color: theme.primary }]}>✓</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>

          {/* Other Preferences Section */}
          <View style={[styles.card, { backgroundColor: theme.cardBackground }]}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>{t('dietaryRestrictions.preferencesTitle')}s</Text>
            <Text style={[styles.helperText, { color: theme.textTertiary, marginBottom: 15 }]}>
              {t('dietaryRestrictions.preferencesHelper')}
            </Text>
            
            <View style={styles.chipsContainer}>
              {PREFERENCES.map((pref) => (
                <TouchableOpacity
                  key={pref.id}
                  style={[
                    styles.chip,
                    { 
                      backgroundColor: selectedPreferences.includes(pref.id) 
                        ? theme.primary 
                        : theme.background,
                      borderColor: selectedPreferences.includes(pref.id)
                        ? theme.primary
                        : theme.border,
                    }
                  ]}
                  onPress={() => togglePreference(pref.id)}
                >
                  <Text style={[styles.chipText, { color: selectedPreferences.includes(pref.id) ? '#fff' : theme.text }]}>
                    {pref.emoji} {t(`dietaryRestrictions.${
                      pref.id === 'gluten_free' ? 'glutenFree' :
                      pref.id === 'lactose_free' ? 'lactoseFree' :
                      pref.id === 'low_sodium' ? 'lowSodium' :
                      pref.id === 'sugar_free' ? 'sugarFree' :
                      'organic'
                    }`)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Info Box */}
          <View style={[styles.infoBox, { backgroundColor: theme.cardBackground, borderColor: theme.primary }]}>
            <Text style={[styles.infoIcon]}>💡</Text>
            <Text style={[styles.infoText, { color: theme.textSecondary }]}>
              {t('dietaryRestrictions.infoText')}
            </Text>
          </View>

          {/* Save Button */}
          <TouchableOpacity 
            style={[styles.saveButton, { backgroundColor: theme.primary }, saving && { opacity: 0.6 }]}
            onPress={handleSave}
            disabled={saving}
          >
            <Text style={styles.saveButtonText}>
              {saving ? t('dietaryRestrictions.saving') : t('dietaryRestrictions.saveRestrictions')}
            </Text>
          </TouchableOpacity>

          {/* Cancel Button */}
          <TouchableOpacity 
            style={[styles.cancelButton, { borderColor: theme.border }]}
            onPress={() => navigation.goBack()}
          >
            <Text style={[styles.cancelButtonText, { color: theme.textSecondary }]}>{t('dietaryRestrictions.cancel')}</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 20,
    paddingTop: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 14,
  },
  card: {
    marginHorizontal: 20,
    marginBottom: 15,
    padding: 20,
    borderRadius: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  helperText: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 2,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '600',
  },
  dietOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
  },
  dietOptionContent: {
    flex: 1,
  },
  dietLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  dietDescription: {
    fontSize: 13,
  },
  checkmark: {
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  infoBox: {
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  infoIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  saveButton: {
    marginHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cancelButton: {
    marginHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
    borderWidth: 1,
  },
  cancelButtonText: {
    fontSize: 16,
  },
});