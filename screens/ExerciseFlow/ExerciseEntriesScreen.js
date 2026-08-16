import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput, KeyboardAvoidingView, Platform, Keyboard, TouchableWithoutFeedback } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLanguage } from '../../utils/LanguageContext';
import { supabase } from '../../utils/supabase';

let nextRowId = 0;
const makeRow = () => ({ id: `row-${nextRowId++}`, name: '', sets: '', reps: '', weight: '' });

const MAX_SUGGESTIONS = 5;

export default function ExerciseEntriesScreen({ navigation, route }) {
  const { t } = useLanguage();
  const { splits, subCategories, customLabel, weight, theme } = route.params;

  // One kg/lb choice for this whole logging session -- independent of the
  // profile's own unit_system setting (a separate, unrelated preference).
  // Stored per-entry alongside the weight value it describes.
  const [weightUnit, setWeightUnit] = useState('kg');

  // Past exercise names this user has already logged, grouped by the body
  // part they were logged under -- a Bench Press logged under Chest should
  // only suggest itself again for Chest, not for Legs. Names saved under
  // Full Body / a custom "Other" label have sub_category = null (see the
  // save mapping below), grouped here under '_none'. RLS on
  // exercise_log_entries already scopes this to the current user -- no
  // explicit user_id filter needed.
  const [knownNamesByCategory, setKnownNamesByCategory] = useState({});
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from('exercise_log_entries')
        .select('name, sub_category');
      if (error) {
        console.error('Error fetching known exercise names:', error);
        return;
      }
      const grouped = {};
      for (const row of data || []) {
        if (!row.name) continue;
        const key = row.sub_category || '_none';
        if (!grouped[key]) grouped[key] = new Set();
        grouped[key].add(row.name);
      }
      const sorted = {};
      for (const key of Object.keys(grouped)) {
        sorted[key] = Array.from(grouped[key]).sort((a, b) => a.localeCompare(b));
      }
      setKnownNamesByCategory(sorted);
    })();
  }, []);

  // Which row's suggestion list is currently open, if any -- a composite
  // key since row ids alone aren't guaranteed unique across sections.
  const [activeSuggestionKey, setActiveSuggestionKey] = useState(null);

  // One section per selected sub-category, plus one more for the "Other"
  // free-text label if it was filled in. Full Body (and any edge case with
  // no sub-categories/custom label at all) gets a single unlabeled section.
  const sections = useMemo(() => {
    if ((subCategories || []).length === 0 && !customLabel) {
      return [{ key: 'fullBody', label: t('exercise.splitFlow.splits.fullBody') }];
    }
    const result = (subCategories || []).map((sub) => ({
      key: sub,
      label: t(`exercise.splitFlow.subCategories.${sub}`)
    }));
    if (customLabel) {
      result.push({ key: 'other', label: customLabel });
    }
    return result;
  }, [subCategories, customLabel]);

  const [rowsBySection, setRowsBySection] = useState(() => {
    const initial = {};
    for (const section of sections) {
      initial[section.key] = [makeRow()];
    }
    return initial;
  });

  const addRow = (sectionKey) => {
    setRowsBySection((prev) => ({
      ...prev,
      [sectionKey]: [...prev[sectionKey], makeRow()]
    }));
  };

  const removeRow = (sectionKey, rowId) => {
    setRowsBySection((prev) => ({
      ...prev,
      [sectionKey]: prev[sectionKey].filter((r) => r.id !== rowId)
    }));
  };

  const updateRow = (sectionKey, rowId, field, value) => {
    setRowsBySection((prev) => ({
      ...prev,
      [sectionKey]: prev[sectionKey].map((r) => (r.id === rowId ? { ...r, [field]: value } : r))
    }));
  };

  const suggestionsFor = (query, sectionKey) => {
    const lookupKey = (sectionKey === 'fullBody' || sectionKey === 'other') ? '_none' : sectionKey;
    const pool = knownNamesByCategory[lookupKey] || [];
    const q = query.trim().toLowerCase();
    // Empty field (just tapped in, nothing typed yet) shows the full pool
    // for that body part -- filters down as the user types, but the field
    // stays a normal, freely-editable TextInput the whole time.
    if (!q) return pool.slice(0, MAX_SUGGESTIONS);
    return pool.filter((n) => n.toLowerCase().includes(q)).slice(0, MAX_SUGGESTIONS);
  };

  // A row counts once it has a name, sets, and reps -- weight is optional
  // (not every exercise has a meaningful external load, e.g. bodyweight
  // work). At least one complete row across all sections is required to
  // continue.
  const completeEntries = [];
  for (const section of sections) {
    for (const row of rowsBySection[section.key] || []) {
      if (row.name.trim() && row.sets && row.reps) {
        completeEntries.push({
          subCategory: section.key === 'fullBody' || section.key === 'other' ? null : section.key,
          name: row.name.trim(),
          sets: parseInt(row.sets, 10),
          reps: parseInt(row.reps, 10),
          weight: row.weight ? parseFloat(row.weight) : null,
          weightUnit: row.weight ? weightUnit : null
        });
      }
    }
  }
  const canContinue = completeEntries.length > 0;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top', 'bottom']}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <Text style={styles.backArrow}>←</Text>
            </TouchableOpacity>
            <Text style={[styles.title, { color: theme.text }]}>
              {t('exercise.splitFlow.enterExercises')}
            </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Home')} style={styles.cancelButton}>
              <Text style={[styles.cancelText, { color: theme.primary }]}>
                {t('common.cancel')}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Weight unit -- applies to every weight value entered below,
              independent of the profile's own unit preference. */}
          <View style={styles.unitRow}>
            <Text style={[styles.unitLabel, { color: theme.textSecondary }]}>{t('exercise.weight')}:</Text>
            {['kg', 'lb'].map((unit) => (
              <TouchableOpacity
                key={unit}
                style={[
                  styles.unitButton,
                  weightUnit === unit && { backgroundColor: theme.primary, borderColor: theme.primary }
                ]}
                onPress={() => setWeightUnit(unit)}
              >
                <Text style={[styles.unitButtonText, weightUnit === unit && { color: '#fff' }]}>
                  {unit}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <ScrollView style={styles.scrollView} keyboardShouldPersistTaps="handled">
            {sections.map((section) => (
              <View key={section.key} style={styles.section}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>{section.label}</Text>

                {rowsBySection[section.key].map((row, idx) => {
                  const suggestionKey = `${section.key}-${row.id}`;
                  const suggestions = activeSuggestionKey === suggestionKey ? suggestionsFor(row.name, section.key) : [];
                  return (
                    <View key={row.id} style={[styles.rowCard, { backgroundColor: theme.cardBackground }]}>
                      <View style={styles.rowHeader}>
                        <Text style={[styles.rowIndex, { color: theme.textSecondary }]}>#{idx + 1}</Text>
                        {rowsBySection[section.key].length > 1 && (
                          <TouchableOpacity onPress={() => removeRow(section.key, row.id)}>
                            <Text style={styles.removeIcon}>✕</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                      <TextInput
                        style={[styles.nameInput, { color: theme.text, borderColor: theme.border }]}
                        placeholder={t('exercise.splitFlow.exerciseName')}
                        placeholderTextColor={theme.textSecondary}
                        value={row.name}
                        onFocus={() => setActiveSuggestionKey(suggestionKey)}
                        onChangeText={(v) => {
                          updateRow(section.key, row.id, 'name', v);
                          setActiveSuggestionKey(suggestionKey);
                        }}
                        onBlur={() => {
                          // Delayed rather than immediate: tapping a
                          // suggestion below also blurs this field, and an
                          // immediate clear here would hide the list before
                          // that tap's onPress had a chance to register.
                          setTimeout(() => {
                            setActiveSuggestionKey((prev) => (prev === suggestionKey ? null : prev));
                          }, 150);
                        }}
                      />
                      {suggestions.length > 0 && (
                        <View style={[styles.suggestionBox, { borderColor: theme.border, backgroundColor: theme.background }]}>
                          {suggestions.map((name) => (
                            <TouchableOpacity
                              key={name}
                              style={styles.suggestionItem}
                              onPress={() => {
                                updateRow(section.key, row.id, 'name', name);
                                setActiveSuggestionKey(null);
                                Keyboard.dismiss();
                              }}
                            >
                              <Text style={{ color: theme.text }}>{name}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      )}
                      <View style={styles.numberRow}>
                        <View style={styles.numberField}>
                          <Text style={[styles.numberLabel, { color: theme.textSecondary }]}>{t('exercise.splitFlow.sets')}</Text>
                          <TextInput
                            style={[styles.numberInput, { color: theme.text, borderColor: theme.border }]}
                            keyboardType="number-pad"
                            value={row.sets}
                            onChangeText={(v) => updateRow(section.key, row.id, 'sets', v)}
                          />
                        </View>
                        <View style={styles.numberField}>
                          <Text style={[styles.numberLabel, { color: theme.textSecondary }]}>{t('exercise.splitFlow.reps')}</Text>
                          <TextInput
                            style={[styles.numberInput, { color: theme.text, borderColor: theme.border }]}
                            keyboardType="number-pad"
                            value={row.reps}
                            onChangeText={(v) => updateRow(section.key, row.id, 'reps', v)}
                          />
                        </View>
                        <View style={styles.numberField}>
                          <Text style={[styles.numberLabel, { color: theme.textSecondary }]}>{t('exercise.weight')} ({weightUnit})</Text>
                          <TextInput
                            style={[styles.numberInput, { color: theme.text, borderColor: theme.border }]}
                            keyboardType="decimal-pad"
                            value={row.weight}
                            onChangeText={(v) => updateRow(section.key, row.id, 'weight', v)}
                          />
                        </View>
                      </View>
                    </View>
                  );
                })}

                <TouchableOpacity style={styles.addRowButton} onPress={() => addRow(section.key)}>
                  <Text style={[styles.addRowText, { color: theme.primary }]}>+ {t('exercise.splitFlow.addExercise')}</Text>
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>

          <TouchableOpacity
            style={[styles.continueButton, { backgroundColor: theme.primary, opacity: canContinue ? 1 : 0.5 }]}
            disabled={!canContinue}
            onPress={() => navigation.navigate('ExerciseSplitIntensityScreen', {
              splits,
              subCategories,
              customLabel,
              entries: completeEntries,
              weight,
              theme
            })}
          >
            <Text style={styles.continueText}>{t('exercise.splitFlow.continue')}</Text>
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
  unitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    marginBottom: 16
  },
  unitLabel: { fontSize: 14, marginRight: 4 },
  unitButton: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ccc',
    backgroundColor: '#f5f5f5'
  },
  unitButtonText: { fontSize: 14, fontWeight: '600', color: '#333' },
  scrollView: { flex: 1, paddingHorizontal: 20 },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 10 },
  rowCard: {
    padding: 14,
    borderRadius: 12,
    marginBottom: 10
  },
  rowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  rowIndex: { fontSize: 12, fontWeight: '600' },
  removeIcon: { fontSize: 16, color: '#D94F3B', fontWeight: '700' },
  nameInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15
  },
  suggestionBox: {
    borderWidth: 1,
    borderRadius: 8,
    marginTop: 4,
    overflow: 'hidden'
  },
  suggestionItem: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#00000022'
  },
  numberRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  numberField: { flex: 1 },
  numberLabel: { fontSize: 12, marginBottom: 4 },
  numberInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 15
  },
  addRowButton: { paddingVertical: 8 },
  addRowText: { fontSize: 15, fontWeight: '600' },
  continueButton: {
    marginHorizontal: 20,
    marginBottom: 20,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center'
  },
  continueText: { color: '#fff', fontSize: 17, fontWeight: '700' }
});
