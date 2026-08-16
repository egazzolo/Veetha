import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLanguage } from '../../utils/LanguageContext';

const SPLITS = ['fullBody', 'upperLower', 'pushPullLegs', 'broSplit', 'other'];

export default function ExerciseSplitScreen({ navigation, route }) {
  const { t } = useLanguage();
  const { weight, theme } = route.params;

  // Single-select: combining two different splits (e.g. Bro Split and Full
  // Body) in one session isn't a real workout pattern, so there's no need
  // to wait for a Continue tap -- selecting a split advances immediately.
  const selectSplit = (id) => {
    if (id === 'fullBody') {
      // Full Body has no sub-categories -- skip straight to entering
      // exercises rather than showing an empty/no-op sub-category screen.
      navigation.navigate('ExerciseEntriesScreen', {
        splits: [id],
        subCategories: [],
        customLabel: '',
        weight,
        theme
      });
    } else {
      navigation.navigate('ExerciseSubCategoryScreen', { splits: [id], weight, theme });
    }
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
        {SPLITS.map((id) => (
          <TouchableOpacity
            key={id}
            style={[styles.splitCard, { backgroundColor: theme.cardBackground }]}
            onPress={() => selectSplit(id)}
          >
            <Text style={[styles.splitName, { color: theme.text }]}>
              {t(`exercise.splitFlow.splits.${id}`)}
            </Text>
            <Text style={[styles.chevron, { color: theme.textSecondary }]}>›</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
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
    marginBottom: 12
  },
  splitName: { fontSize: 17, fontWeight: '500' },
  chevron: { fontSize: 24 }
});
