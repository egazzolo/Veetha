import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useLanguage } from '../../utils/LanguageContext';

const CATEGORIES = [
  { id: 'cardio', icon: '🏃', key: 'cardio' },
  { id: 'strength', icon: '💪', key: 'strength' },
  { id: 'lifestyle', icon: '🧘', key: 'lifestyle' },
  { id: 'sports', icon: '⚽', key: 'sports' }
];

export default function ExerciseCategoryScreen({ navigation, route }) {
  const { t } = useLanguage();
  const { weight } = route.params;
  const theme = route.params?.theme || {};

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.text }]}>
          {t('exercise.selectCategory')}
        </Text>
        <TouchableOpacity onPress={() => navigation.navigate('Home')} style={styles.cancelButton}>
          <Text style={[styles.cancelText, { color: theme.primary }]}>
            {t('common.cancel')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Categories */}
      <ScrollView style={styles.scrollView}>
        {CATEGORIES.map(cat => (
          <TouchableOpacity
            key={cat.id}
            style={[styles.categoryCard, { backgroundColor: theme.cardBackground }]}
            onPress={() => navigation.navigate('ExerciseActivityScreen', { 
              category: cat.id, 
              weight,
              theme 
            })}
          >
            <Text style={styles.categoryIcon}>{cat.icon}</Text>
            <Text style={[styles.categoryName, { color: theme.text }]}>
              {t(`exercise.categories.${cat.key}`)}
            </Text>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
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
  scrollView: { flex: 1, paddingHorizontal: 20 },
  categoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 12,
    marginBottom: 12
  },
  categoryIcon: { fontSize: 28, marginRight: 16 },
  categoryName: { flex: 1, fontSize: 17, fontWeight: '500' },
  chevron: { fontSize: 24, color: '#C7C7CC' }
});

