import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextInput, ActivityIndicator, Alert } from 'react-native';
import { useLanguage } from '../../utils/LanguageContext';
import { supabase } from '../../utils/supabase';

const DURATION_PRESETS = [15, 30, 45, 60];

export default function ExerciseLogModal({ navigation, route }) {
  const { t } = useLanguage();
  const { activity, intensity, met, weight, theme } = route.params;
  
  const [selectedDuration, setSelectedDuration] = useState(30);
  const [customDuration, setCustomDuration] = useState('');
  const [isCustom, setIsCustom] = useState(false);
  const [editingWeight, setEditingWeight] = useState(false);
  const [newWeight, setNewWeight] = useState(weight.toString());
  const [loading, setLoading] = useState(false);

  const currentWeight = editingWeight ? parseFloat(newWeight) || weight : weight;
  const duration = isCustom ? (parseFloat(customDuration) || 0) : selectedDuration;
  
  // MET formula: Calories = MET × weight(kg) × duration(hours)
  const estimatedCalories = Math.round(met * currentWeight * (duration / 60));

  const handleSaveWeight = async () => {
    const wt = parseFloat(newWeight);
    if (!wt || wt <= 0) {
      Alert.alert(t('common.error'), t('exercise.invalidWeight'));
      return;
    }
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('profiles')
        .update({ weight: wt })
        .eq('id', user.id);

      if (error) throw error;
      setEditingWeight(false);
    } catch (err) {
      console.error('Error updating weight:', err);
      Alert.alert(t('common.error'), t('exercise.weightUpdateFailed'));
    }
  };

  const handleLogExercise = async () => {
    if (duration <= 0) {
      Alert.alert(t('common.error'), t('exercise.invalidDuration'));
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('exercises')
        .insert({
          user_id: user.id,
          activity_name: activity,
          intensity,
          met_value: met,
          duration_minutes: duration,
          calories_burned: estimatedCalories,
          user_weight_kg: currentWeight
        });

      if (error) throw error;

      Alert.alert(
        t('common.success'),
        t('exercise.loggedSuccess', { calories: estimatedCalories }),
        [{ text: t('common.ok'), onPress: () => navigation.navigate('Home') }]
      );
    } catch (err) {
      console.error('Error logging exercise:', err);
      Alert.alert(t('common.error'), t('exercise.logFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.text }]}>
          {t('exercise.logExercise')}
        </Text>
        <TouchableOpacity onPress={() => navigation.navigate('Home')} style={styles.cancelButton}>
          <Text style={[styles.cancelText, { color: theme.primary }]}>
            {t('common.cancel')}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {/* Activity Info */}
        <View style={[styles.card, { backgroundColor: theme.cardBackground }]}>
          <Text style={[styles.activityName, { color: theme.text }]}>
            {t(`exercise.activities.${activity}`)} ({t(`exercise.intensities.${intensity}`)})
          </Text>
        </View>

        {/* Weight */}
        <View style={[styles.card, { backgroundColor: theme.cardBackground }]}>
          <View style={styles.row}>
            <Text style={[styles.label, { color: theme.text }]}>
              {t('exercise.weight')}:
            </Text>
            {editingWeight ? (
              <View style={styles.weightEdit}>
                <TextInput
                  style={[styles.weightInput, { color: theme.text, borderColor: theme.border }]}
                  value={newWeight}
                  onChangeText={setNewWeight}
                  keyboardType="decimal-pad"
                  autoFocus
                />
                <TouchableOpacity onPress={handleSaveWeight}>
                  <Text style={[styles.saveButton, { color: theme.primary }]}>
                    {t('common.save')}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.weightDisplay}>
                <Text style={[styles.weightText, { color: theme.text }]}>
                  {currentWeight} kg
                </Text>
                <TouchableOpacity onPress={() => setEditingWeight(true)}>
                  <Text style={[styles.editButton, { color: theme.primary }]}>
                    {t('common.edit')}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        {/* Duration */}
        <View style={[styles.card, { backgroundColor: theme.cardBackground }]}>
          <Text style={[styles.label, { color: theme.text }]}>
            {t('exercise.duration')}:
          </Text>
          <View style={styles.presetRow}>
            {DURATION_PRESETS.map(dur => (
              <TouchableOpacity
                key={dur}
                style={[
                  styles.presetButton,
                  !isCustom && selectedDuration === dur && { backgroundColor: theme.primary }
                ]}
                onPress={() => {
                  setIsCustom(false);
                  setSelectedDuration(dur);
                }}
              >
                <Text style={[
                  styles.presetText,
                  !isCustom && selectedDuration === dur && { color: '#fff' }
                ]}>
                  {dur}
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={[
                styles.presetButton,
                isCustom && { backgroundColor: theme.primary }
              ]}
              onPress={() => setIsCustom(true)}
            >
              <Text style={[
                styles.presetText,
                isCustom && { color: '#fff' }
              ]}>
                {t('exercise.custom')}
              </Text>
            </TouchableOpacity>
          </View>

          {isCustom && (
            <TextInput
              style={[styles.customInput, { color: theme.text, borderColor: theme.border }]}
              placeholder={t('exercise.enterMinutes')}
              placeholderTextColor={theme.textSecondary}
              value={customDuration}
              onChangeText={setCustomDuration}
              keyboardType="decimal-pad"
            />
          )}
        </View>

        {/* Estimated Burn */}
        <View style={[styles.estimateCard, { backgroundColor: theme.primaryLight || '#E3F2FD' }]}>
          <Text style={[styles.estimateLabel, { color: theme.textSecondary }]}>
            📊 {t('exercise.estimatedBurn')}
          </Text>
          <Text style={[styles.estimateValue, { color: theme.primary }]}>
            {estimatedCalories} {t('common.kcal')}
          </Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.button, styles.cancelBtn, { borderColor: theme.border }]}
            onPress={() => navigation.navigate('Home')}
          >
            <Text style={[styles.buttonText, { color: theme.text }]}>
              {t('common.cancel')}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.button, styles.logBtn, { backgroundColor: theme.primary }]}
            onPress={handleLogExercise}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={[styles.buttonText, { color: '#fff' }]}>
                {t('exercise.logExercise')}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20
  },
  backButton: { padding: 8 },
  backArrow: { fontSize: 28, color: '#007AFF' },
  title: { fontSize: 18, fontWeight: '600' },
  cancelButton: { padding: 8 },
  cancelText: { fontSize: 16 },
  content: { flex: 1, paddingHorizontal: 20 },
  card: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16
  },
  activityName: {
    fontSize: 17,
    fontWeight: '600'
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { fontSize: 16, fontWeight: '500', marginBottom: 12 },
  weightEdit: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  weightInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    width: 80,
    fontSize: 16
  },
  saveButton: { fontSize: 16, fontWeight: '600' },
  weightDisplay: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  weightText: { fontSize: 16 },
  editButton: { fontSize: 16 },
  presetRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12
  },
  presetButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#F0F0F0',
    alignItems: 'center'
  },
  presetText: { fontSize: 16, fontWeight: '500' },
  customInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16
  },
  estimateCard: {
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 24
  },
  estimateLabel: { fontSize: 15, marginBottom: 8 },
  estimateValue: { fontSize: 28, fontWeight: 'bold' },
  buttonRow: {
    flexDirection: 'row',
    gap: 12
  },
  button: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center'
  },
  cancelBtn: {
    borderWidth: 1,
    backgroundColor: 'transparent'
  },
  logBtn: {},
  buttonText: { fontSize: 17, fontWeight: '600' }
});

