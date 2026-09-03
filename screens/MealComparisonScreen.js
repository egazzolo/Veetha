import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Image, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../utils/ThemeContext';
import { useUser } from '../utils/UserContext';
import { useLanguage } from '../utils/LanguageContext';
import { supabase } from '../utils/supabase';
import { scale } from '../utils/responsive';

const MAX_MEALS = 4;

const MACRO_ROWS = [
  { key: 'calories', color: '#4CAF50', unit: '' },
  { key: 'protein', color: '#2196F3', unit: 'g' },
  { key: 'carbs', color: '#FF9800', unit: 'g' },
  { key: 'fat', color: '#9C27B0', unit: 'g' },
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
            calories,
            protein,
            carbs,
            fat
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
          image_url: m.image_url,
          logged_at: m.logged_at,
          calories: Math.round(((p.calories || 0) * grams) / 100),
          protein: Math.round(((p.protein || 0) * grams) / 100),
          carbs: Math.round(((p.carbs || 0) * grams) / 100),
          fat: Math.round(((p.fat || 0) * grams) / 100),
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
  const maxByRow = MACRO_ROWS.reduce((acc, row) => {
    acc[row.key] = Math.max(1, ...orderedMeals.map((m) => m[row.key] || 0));
    return acc;
  }, {});

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
          <View style={styles.mealCols}>
            {orderedMeals.map((meal) => (
              <View key={meal.id} style={styles.mealCol}>
                <TouchableOpacity style={styles.removeX} onPress={() => handleRemove(meal.id)}>
                  <Text style={styles.removeXText}>✕</Text>
                </TouchableOpacity>
                <View style={[styles.thumb, { backgroundColor: theme.cardBackground }]}>
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

            {orderedMeals.length < MAX_MEALS && (
              <TouchableOpacity style={styles.addCol} onPress={handleAddMeal}>
                <Text style={styles.addPlus}>+</Text>
                <Text style={styles.addColText}>{t('compare.olderMeals')}</Text>
              </TouchableOpacity>
            )}
          </View>

          {orderedMeals.length < 2 ? (
            <Text style={[styles.emptyHint, { color: theme.textSecondary }]}>{t('compare.needTwo')}</Text>
          ) : (
            <View style={[styles.macroRows, { backgroundColor: theme.cardBackground }]}>
              {MACRO_ROWS.map((row) => (
                <View key={row.key} style={styles.macroRow}>
                  <Text style={[styles.macroLabel, { color: theme.text }]}>{t(`home.${row.key}`)}</Text>
                  {orderedMeals.map((meal) => {
                    const value = meal[row.key] || 0;
                    const pct = Math.max(6, (value / maxByRow[row.key]) * 100);
                    return (
                      <View key={meal.id} style={styles.barLine}>
                        <View style={[styles.barTrack, { backgroundColor: theme.border }]}>
                          <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: row.color }]}>
                            <Text style={styles.barVal}>{value}{row.unit}</Text>
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </View>
              ))}
            </View>
          )}
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
  mealCols: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  mealCol: { flex: 1 },
  removeX: {
    position: 'absolute', top: -6, right: 6, zIndex: 2,
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd',
    justifyContent: 'center', alignItems: 'center',
  },
  removeXText: { fontSize: 10, color: '#999' },
  thumb: {
    width: '100%', aspectRatio: 1, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center', overflow: 'hidden', marginBottom: 8,
  },
  thumbImage: { width: '100%', height: '100%' },
  thumbPlaceholder: { fontSize: scale(28) },
  mealName: { fontSize: scale(12), fontWeight: '700', textAlign: 'center', marginBottom: 2 },
  mealMeta: { fontSize: scale(10), textAlign: 'center' },
  addCol: {
    flex: 1, aspectRatio: 1, borderWidth: 2, borderStyle: 'dashed', borderColor: '#C9BFA8',
    borderRadius: 12, justifyContent: 'center', alignItems: 'center', alignSelf: 'flex-end',
  },
  addPlus: { fontSize: scale(20), color: '#8a8265', lineHeight: scale(22) },
  addColText: { fontSize: scale(10), fontWeight: '700', color: '#8a8265', textAlign: 'center' },
  emptyHint: { textAlign: 'center', fontSize: scale(13), marginTop: 20 },
  macroRows: { borderRadius: 14, padding: 14 },
  macroRow: { marginBottom: 14 },
  macroLabel: { fontSize: scale(12), fontWeight: '700', marginBottom: 6 },
  barLine: { marginBottom: 4 },
  barTrack: { height: 16, borderRadius: 8, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 8, justifyContent: 'center', alignItems: 'flex-end', paddingRight: 6 },
  barVal: { fontSize: scale(9.5), fontWeight: '800', color: '#fff' },
});
