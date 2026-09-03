import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Image, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../utils/ThemeContext';
import { useUser } from '../utils/UserContext';
import { useLanguage } from '../utils/LanguageContext';
import { supabase } from '../utils/supabase';
import { scale } from '../utils/responsive';

const MAX_MEALS = 4;
const LABEL_COL_WIDTH = scale(64);
const TRAILING_COL_WIDTH = scale(44);

const MACRO_ROWS = [
  { key: 'calories', labelKey: 'home.calories', unit: '' },
  { key: 'protein', labelKey: 'home.protein', unit: 'g' },
  { key: 'carbs', labelKey: 'home.carbs', unit: 'g' },
  { key: 'fat', labelKey: 'home.fat', unit: 'g' },
  { key: 'sugar', labelKey: 'results.sugar', unit: 'g' },
  { key: 'fiber', labelKey: 'results.fiber', unit: 'g' },
  { key: 'sodium', labelKey: 'results.sodium', unit: 'mg' },
];

function formatMealMeta(loggedAt, t) {
  if (!loggedAt) return '';
  const date = new Date(loggedAt);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();
  const time = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  const dayLabel = isToday ? t('home.today') : isYesterday ? t('home.yesterday') : date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  return `${dayLabel}, ${time}`;
}

export default function MealComparisonScreen({ navigation, route }) {
  const { theme } = useTheme();
  const { user } = useUser();
  const { t } = useLanguage();
  const [mealIds, setMealIds] = useState(route.params?.mealIds || []);
  const [meals, setMeals] = useState({});
  const [loading, setLoading] = useState(true);

  const loadMeals = useCallback(async (ids) => {
    if (!ids.length) { setMeals({}); setLoading(false); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('meals')
        .select(`
          id,
          serving_grams,
          image_url,
          logged_at,
          product:food_database!meals_product_fk (
            name,
            image_url,
            calories,
            protein,
            carbs,
            fat,
            sugar,
            fiber,
            sodium
          )
        `)
        .eq('user_id', user.id)
        .in('id', ids);
      if (error) throw error;

      const byId = {};
      (data || []).forEach((m) => {
        const grams = m.serving_grams || 0;
        const p = m.product || {};
        byId[m.id] = {
          id: m.id,
          name: p.name || t('compare.unnamedMeal'),
          image_url: m.image_url || p.image_url,
          logged_at: m.logged_at,
          calories: Math.round(((p.calories || 0) * grams) / 100),
          protein: Math.round(((p.protein || 0) * grams) / 100),
          carbs: Math.round(((p.carbs || 0) * grams) / 100),
          fat: Math.round(((p.fat || 0) * grams) / 100),
          sugar: Math.round(((p.sugar || 0) * grams) / 100),
          fiber: Math.round(((p.fiber || 0) * grams) / 100),
          sodium: Math.round(((p.sodium || 0) * grams) / 100),
        };
      });
      setMeals(byId);
    } catch (e) {
      console.error('MealComparisonScreen load error:', e);
    } finally {
      setLoading(false);
    }
  }, [t, user.id]);

  useEffect(() => { loadMeals(mealIds); }, [mealIds, loadMeals]);

  const handleRemove = (id) => {
    setMealIds((prev) => prev.filter((x) => x !== id));
  };

  const handleAddMeal = () => {
    navigation.navigate('MealPicker', {
      excludeIds: mealIds,
      onSelect: (id) => setMealIds((prev) => (prev.includes(id) ? prev : [...prev, id])),
    });
  };

  const orderedMeals = mealIds.map((id) => meals[id]).filter(Boolean);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={[styles.backBtn, { color: theme.text }]}>←</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>{t('compare.title')}</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={theme.primary} />
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={[styles.compareCard, { backgroundColor: theme.cardBackground }]}>
            {/* Header row -- photo/name/date columns. Every data row below
                reuses this exact same column layout (fixed label width,
                one flex:1 per meal, fixed trailing width) so each meal's
                numbers land directly under its own photo. */}
            <View style={styles.gridRow}>
              <View style={{ width: LABEL_COL_WIDTH }} />
              {orderedMeals.map((meal) => (
                <View key={meal.id} style={styles.mealHeadCol}>
                  <TouchableOpacity style={styles.removeX} onPress={() => handleRemove(meal.id)}>
                    <Text style={styles.removeXText}>✕</Text>
                  </TouchableOpacity>
                  <View style={[styles.thumb, { backgroundColor: theme.background }]}>
                    {meal.image_url ? (
                      <Image source={{ uri: meal.image_url }} style={styles.thumbImage} resizeMode="cover" />
                    ) : (
                      <Text style={styles.thumbPlaceholder}>🍽️</Text>
                    )}
                  </View>
                  <Text style={[styles.mealName, { color: theme.text }]} numberOfLines={2}>{meal.name}</Text>
                  <Text style={[styles.mealMeta, { color: theme.textSecondary }]}>{formatMealMeta(meal.logged_at, t)}</Text>
                </View>
              ))}
              <View style={{ width: TRAILING_COL_WIDTH }}>
                {orderedMeals.length < MAX_MEALS && (
                  <TouchableOpacity style={styles.addCol} onPress={handleAddMeal}>
                    <Text style={styles.addPlus}>+</Text>
                    <Text style={styles.addColText}>{t('compare.olderMeals')}</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {orderedMeals.length < 2 ? (
              <Text style={[styles.emptyHint, { color: theme.textSecondary }]}>{t('compare.needTwo')}</Text>
            ) : (
              <View style={[styles.dataRows, { borderTopColor: theme.border }]}>
                {MACRO_ROWS.map((row) => (
                  <View key={row.key} style={styles.gridRow}>
                    <View style={{ width: LABEL_COL_WIDTH, justifyContent: 'center' }}>
                      <Text style={[styles.rowLabel, { color: theme.textSecondary }]}>{t(row.labelKey)}</Text>
                    </View>
                    {orderedMeals.map((meal) => (
                      <View key={meal.id} style={styles.mealValCol}>
                        <Text style={[styles.rowVal, { color: theme.text }]}>{meal[row.key] || 0}{row.unit}</Text>
                      </View>
                    ))}
                    <View style={{ width: TRAILING_COL_WIDTH }} />
                  </View>
                ))}
              </View>
            )}
          </View>
        </ScrollView>
      )}
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
    paddingVertical: 14,
  },
  backBtn: { fontSize: scale(22), fontWeight: '600' },
  headerTitle: { fontSize: scale(18), fontWeight: '700' },
  scrollContent: { padding: 20, paddingTop: 4 },

  compareCard: { borderRadius: 16, padding: 16 },
  gridRow: { flexDirection: 'row', alignItems: 'center', gap: scale(8), paddingVertical: 6 },
  dataRows: { borderTopWidth: 1, marginTop: 12, paddingTop: 4 },

  mealHeadCol: { flex: 1, position: 'relative' },
  mealValCol: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  removeX: {
    position: 'absolute', top: -8, right: 6, zIndex: 2,
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd',
    justifyContent: 'center', alignItems: 'center',
  },
  removeXText: { fontSize: 10, color: '#999' },
  thumb: {
    width: '100%', aspectRatio: 1, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center', overflow: 'hidden', marginBottom: 6,
  },
  thumbImage: { width: '100%', height: '100%' },
  thumbPlaceholder: { fontSize: scale(26) },
  mealName: { fontSize: scale(11.5), fontWeight: '700', textAlign: 'center', lineHeight: scale(14) },
  mealMeta: { fontSize: scale(9.5), textAlign: 'center', marginTop: 2 },

  addCol: {
    flex: 1, borderWidth: 2, borderStyle: 'dashed', borderColor: '#C9BFA8',
    borderRadius: 12, justifyContent: 'center', alignItems: 'center', aspectRatio: 1,
  },
  addPlus: { fontSize: scale(16), color: '#8a8265', lineHeight: scale(18) },
  addColText: { fontSize: scale(9.5), fontWeight: '700', color: '#8a8265', textAlign: 'center' },

  emptyHint: { textAlign: 'center', fontSize: scale(13), marginTop: 20 },
  rowLabel: { fontSize: scale(12.5), fontWeight: '700' },
  rowVal: { fontSize: scale(14), fontWeight: '700' },
});
