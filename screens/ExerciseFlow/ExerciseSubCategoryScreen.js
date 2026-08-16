import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLanguage } from '../../utils/LanguageContext';

// Full Body intentionally has no entry -- it's skipped before this screen
// is ever reached (see ExerciseSplitScreen.js). 'other' has no picker
// options -- it's handled entirely via the free-text field below.
const SUB_CATEGORY_MAP = {
  upperLower: ['upper', 'lower'],
  pushPullLegs: ['push', 'pull', 'legs'],
  broSplit: ['chest', 'back', 'shoulders', 'arms', 'legs', 'core'],
  other: []
};

export default function ExerciseSubCategoryScreen({ navigation, route }) {
  const { t } = useLanguage();
  const { splits, weight, theme } = route.params;
  const [selected, setSelected] = useState([]);
  const [customLabel, setCustomLabel] = useState('');

  const showOtherInput = splits.includes('other');

  // Union of sub-categories across every selected split, deduped -- e.g.
  // Upper/Lower + Bro Split selected together would otherwise show two
  // separate "Legs" options.
  const options = useMemo(() => {
    const seen = new Set();
    const result = [];
    for (const split of splits) {
      for (const sub of SUB_CATEGORY_MAP[split] || []) {
        if (!seen.has(sub)) {
          seen.add(sub);
          result.push(sub);
        }
      }
    }
    return result;
  }, [splits]);

  const toggleSub = (id) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const canContinue = selected.length > 0 || (showOtherInput && customLabel.trim().length > 0);

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>
          <Text style={[styles.title, { color: theme.text }]}>
            {t('exercise.splitFlow.selectSubCategory')}
          </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Home')} style={styles.cancelButton}>
            <Text style={[styles.cancelText, { color: theme.primary }]}>
              {t('common.cancel')}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scrollView}>
          {options.map((id) => {
            const isSelected = selected.includes(id);
            return (
              <TouchableOpacity
                key={id}
                style={[
                  styles.subCard,
                  { backgroundColor: theme.cardBackground },
                  isSelected && { borderColor: theme.primary, borderWidth: 2 }
                ]}
                onPress={() => toggleSub(id)}
              >
                <Text style={[styles.subName, { color: theme.text }]}>
                  {t(`exercise.splitFlow.subCategories.${id}`)}
                </Text>
                {isSelected && <Text style={[styles.checkmark, { color: theme.primary }]}>✓</Text>}
              </TouchableOpacity>
            );
          })}

          {showOtherInput && (
            <View style={[styles.otherCard, { backgroundColor: theme.cardBackground }]}>
              <Text style={[styles.otherLabel, { color: theme.text }]}>
                {t('exercise.splitFlow.otherLabel')}
              </Text>
              <TextInput
                style={[styles.otherInput, { color: theme.text, borderColor: theme.border }]}
                placeholder={t('exercise.splitFlow.otherPlaceholder')}
                placeholderTextColor={theme.textSecondary}
                value={customLabel}
                onChangeText={setCustomLabel}
              />
            </View>
          )}
        </ScrollView>

        <TouchableOpacity
          style={[
            styles.continueButton,
            { backgroundColor: theme.primary, opacity: canContinue ? 1 : 0.5 }
          ]}
          disabled={!canContinue}
          onPress={() => navigation.navigate('ExerciseSplitIntensityScreen', {
            splits,
            subCategories: selected,
            customLabel: customLabel.trim(),
            weight,
            theme
          })}
        >
          <Text style={styles.continueText}>{t('exercise.splitFlow.continue')}</Text>
        </TouchableOpacity>
      </SafeAreaView>
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
  subCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent'
  },
  subName: { fontSize: 17, fontWeight: '500' },
  checkmark: { fontSize: 20, fontWeight: '700' },
  otherCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12
  },
  otherLabel: { fontSize: 15, fontWeight: '500', marginBottom: 8 },
  otherInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16
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
