import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLanguage } from '../../utils/LanguageContext';

const SPLITS = ['fullBody', 'upperLower', 'pushPullLegs', 'broSplit', 'other'];

export default function ExerciseSplitScreen({ navigation, route }) {
  const { t } = useLanguage();
  const { weight, theme } = route.params;
  const [selected, setSelected] = useState([]);

  const toggleSplit = (id) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.text }]}>
          {t('exercise.splitFlow.selectSplit')}
        </Text>
        <TouchableOpacity onPress={() => navigation.navigate('Home')} style={styles.cancelButton}>
          <Text style={[styles.cancelText, { color: theme.primary }]}>
            {t('common.cancel')}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView}>
        {SPLITS.map((id) => {
          const isSelected = selected.includes(id);
          return (
            <TouchableOpacity
              key={id}
              style={[
                styles.splitCard,
                { backgroundColor: theme.cardBackground },
                isSelected && { borderColor: theme.primary, borderWidth: 2 }
              ]}
              onPress={() => toggleSplit(id)}
            >
              <Text style={[styles.splitName, { color: theme.text }]}>
                {t(`exercise.splitFlow.splits.${id}`)}
              </Text>
              {isSelected && <Text style={[styles.checkmark, { color: theme.primary }]}>✓</Text>}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <TouchableOpacity
        style={[
          styles.continueButton,
          { backgroundColor: theme.primary, opacity: selected.length === 0 ? 0.5 : 1 }
        ]}
        disabled={selected.length === 0}
        onPress={() => {
          // Full Body has no sub-categories -- skip straight to intensity
          // rather than showing an empty/no-op sub-category screen.
          const isFullBodyOnly = selected.length === 1 && selected[0] === 'fullBody';
          if (isFullBodyOnly) {
            navigation.navigate('ExerciseSplitIntensityScreen', {
              splits: selected,
              subCategories: [],
              customLabel: '',
              weight,
              theme
            });
          } else {
            navigation.navigate('ExerciseSubCategoryScreen', { splits: selected, weight, theme });
          }
        }}
      >
        <Text style={styles.continueText}>{t('exercise.splitFlow.continue')}</Text>
      </TouchableOpacity>
    </SafeAreaView>
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
  splitCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent'
  },
  splitName: { fontSize: 17, fontWeight: '500' },
  checkmark: { fontSize: 20, fontWeight: '700' },
  continueButton: {
    marginHorizontal: 20,
    marginBottom: 20,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center'
  },
  continueText: { color: '#fff', fontSize: 17, fontWeight: '700' }
});
