import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, Alert, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../utils/ThemeContext';
import { useLanguage } from '../utils/LanguageContext';
import { supabase } from '../utils/supabase';
import { useUser } from '../utils/UserContext';
import { logScreen, logEvent } from '../utils/analytics';

const ACTIVITY_LEVELS = [
  { value: 'sedentary', multiplier: 1.2 },
  { value: 'light', multiplier: 1.375 },
  { value: 'moderate', multiplier: 1.55 },
  { value: 'active', multiplier: 1.725 },
  { value: 'very_active', multiplier: 1.9 },
];

export default function GoalsPreferencesScreen({ navigation }) {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const { profile, refreshProfile } = useUser();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Goals state
  const [dailyCalorieGoal, setDailyCalorieGoal] = useState('2000');
  const [proteinGoal, setProteinGoal] = useState('150');
  const [carbsGoal, setCarbsGoal] = useState('200');
  const [fatGoal, setFatGoal] = useState('65');
  const [targetWeight, setTargetWeight] = useState('');
  const [activityLevel, setActivityLevel] = useState('moderate');

  const [waterGoal, setWaterGoal] = useState('8');
  const [waterUnit, setWaterUnit] = useState('cups');

  useEffect(() => {
    logScreen('GoalsPreferences');
  }, []);

  useEffect(() => {
    loadGoals();
  }, []);

  const loadGoals = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigation.navigate('Login');
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      // Load ALL goals (including water)
      setDailyCalorieGoal(String(data.daily_calorie_goal || 2000));
      setProteinGoal(String(data.protein_goal || 150));
      setCarbsGoal(String(data.carbs_goal || 200));
      setFatGoal(String(data.fat_goal || 65));
      setWaterGoal(String(data.daily_water_goal_cups || 8));
      setWaterUnit(data.water_unit_preference || 'cups');
      setTargetWeight(
        data.unit_preference === 'metric'
          ? (data.target_weight_kg ? String(data.target_weight_kg) : '')
          : (data.target_weight_lbs ? String(data.target_weight_lbs) : '')
      );
      setActivityLevel(data.activity_level || 'moderate');
    } catch (error) {
      console.error('Error loading goals:', error);
      Alert.alert(t('goalsPreferences.error'), t('goalsPreferences.errorLoading'));
    } finally {
      setLoading(false);
    }
  };

  const handleRecalculate = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('age, gender, height_cm, height_ft, height_in, weight_kg, weight_lbs, unit_preference')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      // Get height and weight in metric (kg/cm)
      let heightCm, weightKg;
      
      if (profileData.unit_preference === 'imperial') {
        heightCm = ((profileData.height_ft || 0) * 12 + (profileData.height_in || 0)) * 2.54;
        weightKg = (profileData.weight_lbs || 0) * 0.453592;
      } else {
        heightCm = profileData.height_cm || 0;
        weightKg = profileData.weight_kg || 0;
      }

      if (!profileData.age || !heightCm || !weightKg || !profileData.gender) {
        Alert.alert(
          t('goalsPreferences.error'),
          t('goalsPreferences.completeProfile')
        );
        return;
      }

      // Calculate BMR with metric values (Mifflin-St Jeor)
      let bmr;
      if (profileData.gender === 'male') {
        bmr = (10 * weightKg) + (6.25 * heightCm) - (5 * profileData.age) + 5;
      } else {
        bmr = (10 * weightKg) + (6.25 * heightCm) - (5 * profileData.age) - 161;
      }

      const ACTIVITY_MULTIPLIERS = {
        'sedentary': 1.2,
        'light': 1.375,
        'moderate': 1.55,
        'active': 1.725,
        'very_active': 1.9,
      };

      const tdee = Math.round(bmr * (ACTIVITY_MULTIPLIERS[activityLevel] || 1.55));
      
      Alert.alert(
        t('goalsPreferences.recalculateTitle'),
        t('goalsPreferences.recalculateMessage').replace('{calories}', tdee),
        [
          { text: t('goalsPreferences.cancel'), style: 'cancel' },
          { 
            text: t('goalsPreferences.update'),
            onPress: () => setDailyCalorieGoal(String(tdee))
          },
        ]
      );
    } catch (error) {
      console.error('Error recalculating:', error);
      Alert.alert(
        t('goalsPreferences.error'),
        t('goalsPreferences.errorSaving')
      );
    }
  };

  const handleSave = async () => {
    // Validation
    const calories = parseFloat(dailyCalorieGoal);
    const protein = parseFloat(proteinGoal);
    const carbs = parseFloat(carbsGoal);
    const fat = parseFloat(fatGoal);

    if (!calories || calories < 800 || calories > 10000) {
      Alert.alert(
        t('goalsPreferences.invalidInput'),
        t('goalsPreferences.invalidCalories')
      );
      return;
    }

    if (!protein || protein < 0) {
      Alert.alert(
        t('goalsPreferences.invalidInput'),
        t('goalsPreferences.invalidProtein')
      );
      return;
    }

    if (!carbs || carbs < 0) {
      Alert.alert(
        t('goalsPreferences.invalidInput'),
        t('goalsPreferences.invalidCarbs')
      );
      return;
    }

    if (!fat || fat < 0) {
      Alert.alert(
        t('goalsPreferences.invalidInput'),
        t('goalsPreferences.invalidFat')
      );
      return;
    }

    setSaving(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigation.navigate('Login');
        return;
      }

      // Update profile
      const { error } = await supabase
        .from('profiles')
        .update({
          daily_calorie_goal: calories,
          protein_goal: protein,
          carbs_goal: carbs,
          fat_goal: fat,
          daily_water_goal_cups: parseInt(waterGoal),
          water_unit_preference: waterUnit,
          daily_water_goal_cups: parseInt(waterGoal),
          water_unit_preference: waterUnit,
          target_weight_kg: profile?.unit_preference === 'metric' && targetWeight ? parseFloat(targetWeight) : null,
          target_weight_lbs: profile?.unit_preference === 'imperial' && targetWeight ? parseFloat(targetWeight) : null,
          activity_level: activityLevel,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) throw error;

      await logEvent('goals_updated');

      // Refresh profile context
      await refreshProfile();

      Alert.alert(
        t('goalsPreferences.success'),
        t('goalsPreferences.successMessage'),
        [
          {
            text: t('goalsPreferences.ok'),
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error) {
      console.error('Error saving goals:', error);
      Alert.alert(
        t('goalsPreferences.error'),
        t('goalsPreferences.errorSaving')
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top', 'bottom']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
            {t('goalsPreferences.loading')}
          </Text>
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
            <Text style={[styles.title, { color: theme.text }]}>
              {t('goalsPreferences.title')}
            </Text>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
              {t('goalsPreferences.subtitle')}
            </Text>
          </View>

          {/* Daily Calorie Goal */}
          <View style={[styles.card, { backgroundColor: theme.cardBackground }]}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>
              {t('goalsPreferences.dailyCalorieGoal')}
            </Text>
            <TextInput
              style={[styles.input, styles.largeInput, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
              placeholder="2000"
              placeholderTextColor={theme.textTertiary}
              keyboardType="numeric"
              value={dailyCalorieGoal}
              onChangeText={setDailyCalorieGoal}
              maxLength={5}
            />
            <Text style={[styles.helperText, { color: theme.textTertiary }]}>
              {t('goalsPreferences.recommendedText')}
            </Text>
          </View>

          {/* Activity Level */}
          <View style={[styles.card, { backgroundColor: theme.cardBackground }]}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>
              {t('goalsPreferences.activityLevel')}
            </Text>
            <Text style={[styles.helperText, { color: theme.textTertiary, marginBottom: 15 }]}>
              {t('goalsPreferences.activityLevelHelper')}
            </Text>
            {ACTIVITY_LEVELS.map((level) => (
              <TouchableOpacity
                key={level.value}
                style={[
                  styles.activityOption,
                  { 
                    backgroundColor: theme.background,
                    borderColor: activityLevel === level.value ? theme.primary : theme.border,
                    borderWidth: activityLevel === level.value ? 2 : 1,
                  }
                ]}
                onPress={() => setActivityLevel(level.value)}
              >
                <View style={styles.activityOptionContent}>
                  <Text style={[styles.activityLabel, { color: theme.text }]}>
                    {t(`goalsPreferences.${level.value}`)}
                  </Text>
                  <Text style={[styles.activityDescription, { color: theme.textSecondary }]}>
                    {t(`goalsPreferences.${level.value}Desc`)}
                  </Text>
                </View>
                {activityLevel === level.value && (
                  <Text style={styles.checkmark}>✓</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>

          {/* Recalculate button */}
          <TouchableOpacity 
            style={[styles.recalculateButtonBottom, { backgroundColor: theme.primary }]}
            onPress={handleRecalculate}
          >
            <Text style={styles.recalculateButtonText}>
              {t('goalsPreferences.recalculate')}
            </Text>
          </TouchableOpacity>

          {/* Macro Goals */}
          <View style={[styles.card, { backgroundColor: theme.cardBackground }]}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>
              {t('goalsPreferences.macroTargets')}
            </Text>
            <Text style={[styles.helperText, { color: theme.textTertiary, marginBottom: 15 }]}>
              {t('goalsPreferences.macroTargetsHelper')}
            </Text>

            {/* Protein */}
            <View style={styles.macroRow}>
              <Text style={[styles.macroLabel, { color: theme.text }]}>
                {t('goalsPreferences.protein')}
              </Text>
              <TextInput
                style={[styles.macroInput, { backgroundColor: theme.background, color: theme.text, borderColor: '#2196F3' }]}
                placeholder="150"
                placeholderTextColor={theme.textTertiary}
                keyboardType="numeric"
                value={proteinGoal}
                onChangeText={setProteinGoal}
                maxLength={4}
              />
              <Text style={[styles.macroUnit, { color: theme.textSecondary }]}>g</Text>
            </View>

            {/* Carbs */}
            <View style={styles.macroRow}>
              <Text style={[styles.macroLabel, { color: theme.text }]}>
                {t('goalsPreferences.carbs')}
              </Text>
              <TextInput
                style={[styles.macroInput, { backgroundColor: theme.background, color: theme.text, borderColor: '#FF9800' }]}
                placeholder="200"
                placeholderTextColor={theme.textTertiary}
                keyboardType="numeric"
                value={carbsGoal}
                onChangeText={setCarbsGoal}
                maxLength={4}
              />
              <Text style={[styles.macroUnit, { color: theme.textSecondary }]}>g</Text>
            </View>

            {/* Fat */}
            <View style={styles.macroRow}>
              <Text style={[styles.macroLabel, { color: theme.text }]}>
                {t('goalsPreferences.fat')}
              </Text>
              <TextInput
                style={[styles.macroInput, { backgroundColor: theme.background, color: theme.text, borderColor: '#9C27B0' }]}
                placeholder="65"
                placeholderTextColor={theme.textTertiary}
                keyboardType="numeric"
                value={fatGoal}
                onChangeText={setFatGoal}
                maxLength={4}
              />
              <Text style={[styles.macroUnit, { color: theme.textSecondary }]}>g</Text>
            </View>
          </View>

          {/* Weight Goal */}
          <View style={[styles.card, { backgroundColor: theme.cardBackground }]}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>
              {t('goalsPreferences.targetWeight')}
            </Text>
            <Text style={[styles.helperText, { color: theme.textTertiary, marginBottom: 10 }]}>
              {t('goalsPreferences.targetWeightHelper')}
            </Text>
            <View style={styles.weightInputRow}>
              <TextInput
                style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border, flex: 1 }]}
                placeholder={profile?.unit_preference === 'metric' ? '75' : '165'}
                placeholderTextColor={theme.textTertiary}
                keyboardType="numeric"
                value={targetWeight}
                onChangeText={setTargetWeight}
                maxLength={5}
              />
              <Text style={[styles.weightUnit, { color: theme.textSecondary }]}>
                {profile?.unit_preference === 'metric' ? 'kg' : 'lbs'}
              </Text>
            </View>
          </View>

          {/* Water Goal */}
          <View style={[styles.card, { backgroundColor: theme.cardBackground }]}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>
              {t('goalsPreferences.dailyWaterGoal')}
            </Text>
            <Text style={[styles.helperText, { color: theme.textTertiary, marginBottom: 15 }]}>
              {t('goalsPreferences.waterGoalHelper')} 
            </Text>
            
            {/* Unit Toggle */}
            <View style={styles.macroRow}>
              <TouchableOpacity
                style={[
                  styles.unitToggle,
                  { backgroundColor: waterUnit === 'cups' ? theme.primary : theme.background }
                ]}
                onPress={() => setWaterUnit('cups')}
              >
                <Text style={{ color: waterUnit === 'cups' ? '#fff' : theme.text }}>
                  {t('goalsPreferences.cups')}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.unitToggle,
                  { backgroundColor: waterUnit === 'liters' ? theme.primary : theme.background }
                ]}
                onPress={() => setWaterUnit('liters')}
              >
                <Text style={{ color: waterUnit === 'liters' ? '#fff' : theme.text }}>
                  {t('goalsPreferences.liters')}
                </Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.weightInputRow}>
              <TextInput
                style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border, flex: 1 }]}
                placeholder={waterUnit === 'cups' ? '8' : '2'}
                placeholderTextColor={theme.textTertiary}
                keyboardType="numeric"
                value={waterGoal}
                onChangeText={setWaterGoal}
                maxLength={3}
              />
              <Text style={[styles.weightUnit, { color: theme.textSecondary }]}>
                {waterUnit === 'cups' ? t('goalsPreferences.cups') : t('goalsPreferences.liters')}
              </Text>
            </View>
          </View>

          {/* Save Button */}
          <TouchableOpacity 
            style={[styles.saveButton, { backgroundColor: theme.primary }, saving && { opacity: 0.6 }]}
            onPress={handleSave}
            disabled={saving}
          >
            <Text style={styles.saveButtonText}>
              {saving ? t('goalsPreferences.saving') : t('goalsPreferences.saveGoals')}
            </Text>
          </TouchableOpacity>

          {/* Cancel Button */}
          <TouchableOpacity 
            style={[styles.cancelButton, { borderColor: theme.border }]}
            onPress={() => navigation.goBack()}
          >
            <Text style={[styles.cancelButtonText, { color: theme.textSecondary }]}>
              {t('goalsPreferences.cancel')}
            </Text>
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
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 15,
    fontSize: 16,
  },
  largeInput: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    paddingVertical: 20,
  },
  helperText: {
    fontSize: 12,
    marginTop: 8,
    fontStyle: 'italic',
  },
  activityOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
  },
  activityOptionContent: {
    flex: 1,
  },
  activityLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  activityDescription: {
    fontSize: 13,
  },
  checkmark: {
    fontSize: 20,
    color: '#4CAF50',
    marginLeft: 10,
  },
  macroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  macroLabel: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  macroInput: {
    borderWidth: 2,
    borderRadius: 10,
    padding: 10,
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    width: 80,
  },
  macroUnit: {
    fontSize: 16,
    marginLeft: 8,
    width: 20,
  },
  weightInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  weightUnit: {
    fontSize: 18,
    fontWeight: '600',
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
  recalculateButtonBottom: {
    marginHorizontal: 20,
    marginBottom: 15,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  unitToggle: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginHorizontal: 5,
  },
});