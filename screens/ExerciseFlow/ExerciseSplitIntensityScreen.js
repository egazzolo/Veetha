import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Keyboard, TouchableWithoutFeedback } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLanguage } from '../../utils/LanguageContext';
import { supabase } from '../../utils/supabase';
import { showToast } from '../../components/VeethaToast';
import { posthog } from '../../utils/posthog';

const INTENSITIES = ['light', 'moderate', 'vigorous'];

// Flat MET-equivalent values for this flow specifically -- not read from
// the old per-activity intensity table (see ExerciseIntensityScreen.js),
// since this flow has no single "activity" to look one up for. Same
// standard formula as the rest of the app: calories = MET × weight(kg) ×
// duration(hours).
const INTENSITY_MET = { light: 3, moderate: 5, vigorous: 8 };

const DURATION_PRESETS = [15, 30, 45, 60];

export default function ExerciseSplitIntensityScreen({ navigation, route }) {
  const { t } = useLanguage();
  const { splits, subCategories, customLabel, weight, theme } = route.params;

  const [intensity, setIntensity] = useState(null);
  const [selectedDuration, setSelectedDuration] = useState(30);
  const [customDuration, setCustomDuration] = useState('');
  const [isCustom, setIsCustom] = useState(false);
  const [loading, setLoading] = useState(false);

  const duration = isCustom ? (parseFloat(customDuration) || 0) : selectedDuration;
  const met = intensity ? INTENSITY_MET[intensity] : 0;
  const estimatedCalories = Math.round(met * weight * (duration / 60));

  const splitLabels = splits
    .filter((s) => s !== 'other')
    .map((s) => t(`exercise.splitFlow.splits.${s}`));
  if (splits.includes('other') && customLabel) {
    splitLabels.push(customLabel);
  }
  const subCategoryLabels = (subCategories || []).map((s) => t(`exercise.splitFlow.subCategories.${s}`));

  const summaryParts = [splitLabels.join(', ')];
  if (subCategoryLabels.length > 0) summaryParts.push(subCategoryLabels.join(', '));
  if (intensity) summaryParts.push(t(`exercise.intensities.${intensity}`));
  const summaryLine = `${t('exercise.splitFlow.summaryPrefix')} ${summaryParts.filter(Boolean).join(' • ')}`;

  const canContinue = !!intensity && duration > 0;

  const handleSave = async () => {
    if (!intensity) {
      Alert.alert(t('common.error'), t('exercise.splitFlow.selectIntensity'));
      return;
    }
    if (duration <= 0) {
      Alert.alert(t('common.error'), t('exercise.invalidDuration'));
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // split_type is a single text column (not an array) even though this
      // flow allows selecting multiple splits -- comma-joining is a
      // pragmatic fit for the existing schema. sub_categories is a real
      // text[] column, so that one holds every selected value directly.
      const splitTypeValue = splits
        .map((s) => (s === 'other' ? (customLabel || 'other') : s))
        .join(',');

      const { error } = await supabase
        .from('exercise_logs')
        .insert({
          user_id: user.id,
          split_type: splitTypeValue,
          sub_categories: subCategories || [],
          intensity,
          calories_burned: estimatedCalories
        });

      if (error) throw error;

      posthog.capture('exercise_split_logged', {
        splits,
        sub_categories: subCategories,
        intensity,
        duration_minutes: duration,
        calories: estimatedCalories
      });

      showToast('success', t('common.success'), t('exercise.loggedSuccess', { calories: estimatedCalories }));
      navigation.navigate('Home');
    } catch (err) {
      console.error('Error logging split exercise:', err);
      Alert.alert(t('common.error'), t('exercise.logFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top', 'bottom']}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <Text style={styles.backArrow}>←</Text>
            </TouchableOpacity>
            <Text style={[styles.title, { color: theme.text }]}>
              {t('exercise.splitFlow.selectIntensity')}
            </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Home')} style={styles.cancelButton}>
              <Text style={[styles.cancelText, { color: theme.primary }]}>
                {t('common.cancel')}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollView} keyboardShouldPersistTaps="handled">
            {/* Intensity */}
            <View style={[styles.card, { backgroundColor: theme.cardBackground }]}>
              <Text style={[styles.label, { color: theme.text }]}>{t('exercise.splitFlow.selectIntensity')}</Text>
              <View style={styles.presetRow}>
                {INTENSITIES.map((level) => (
                  <TouchableOpacity
                    key={level}
                    style={[
                      styles.presetButton,
                      intensity === level && { backgroundColor: theme.primary, borderColor: theme.primary }
                    ]}
                    onPress={() => setIntensity(level)}
                  >
                    <Text style={[styles.presetText, intensity === level && { color: '#fff' }]}>
                      {t(`exercise.intensities.${level}`)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Duration */}
            <View style={[styles.card, { backgroundColor: theme.cardBackground }]}>
              <Text style={[styles.label, { color: theme.text }]}>{t('exercise.duration')}:</Text>
              <View style={styles.presetRow}>
                {DURATION_PRESETS.map((dur) => (
                  <TouchableOpacity
                    key={dur}
                    style={[
                      styles.presetButton,
                      !isCustom && selectedDuration === dur && { backgroundColor: theme.primary, borderColor: theme.primary }
                    ]}
                    onPress={() => {
                      setIsCustom(false);
                      setSelectedDuration(dur);
                    }}
                  >
                    <Text style={[styles.presetText, !isCustom && selectedDuration === dur && { color: '#fff' }]}>
                      {dur}
                    </Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity
                  style={[styles.presetButton, isCustom && { backgroundColor: theme.primary, borderColor: theme.primary }]}
                  onPress={() => setIsCustom(true)}
                >
                  <Text style={[styles.presetText, isCustom && { color: '#fff' }]}>
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
            {intensity && (
              <View style={[styles.estimateCard, { backgroundColor: theme.primaryLight || '#E3F2FD' }]}>
                <Text style={[styles.estimateLabel, { color: theme.textSecondary }]}>
                  {t('exercise.estimatedBurn')}
                </Text>
                <Text style={[styles.estimateValue, { color: theme.primary }]}>
                  {estimatedCalories} {t('common.kcal')}
                </Text>
              </View>
            )}

            {/* Live summary */}
            <Text style={[styles.summaryLine, { color: theme.textSecondary }]}>{summaryLine}</Text>
          </ScrollView>

          <TouchableOpacity
            style={[styles.continueButton, { backgroundColor: theme.primary, opacity: canContinue ? 1 : 0.5 }]}
            disabled={!canContinue || loading}
            onPress={handleSave}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.continueText}>{t('exercise.splitFlow.continue')}</Text>
            )}
          </TouchableOpacity>
        </SafeAreaView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20
  },
  backButton: { padding: 8 },
  backArrow: { fontSize: 28, color: '#007AFF' },
  title: { fontSize: 18, fontWeight: '600' },
  cancelButton: { padding: 8 },
  cancelText: { fontSize: 16 },
  scrollView: { flex: 1, paddingHorizontal: 20 },
  card: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16
  },
  label: { fontSize: 16, fontWeight: '500', marginBottom: 12 },
  presetRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap'
  },
  presetButton: {
    flex: 1,
    minWidth: 70,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ccc',
    backgroundColor: '#f5f5f5'
  },
  presetText: { fontSize: 16, fontWeight: '500', color: '#333' },
  customInput: {
    marginTop: 12,
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
    marginBottom: 16
  },
  estimateLabel: { fontSize: 15, marginBottom: 8 },
  estimateValue: { fontSize: 28, fontWeight: 'bold' },
  summaryLine: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20
  },
  continueButton: {
    marginHorizontal: 20,
    marginBottom: 20,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center'
  },
  continueText: { color: '#fff', fontSize: 17, fontWeight: '700' }
});
