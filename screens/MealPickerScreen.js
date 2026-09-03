import React, { useState, useEffect, useMemo } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Image, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../utils/ThemeContext';
import { useUser } from '../utils/UserContext';
import { useLanguage } from '../utils/LanguageContext';
import { supabase } from '../utils/supabase';
import { scale } from '../utils/responsive';

const RECENT_MEALS_LIMIT = 30;

function dateGroupLabel(loggedAt, t) {
  const date = new Date(loggedAt);
  const now = new Date();
  if (date.toDateString() === now.toDateString()) return t('home.today');
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return t('home.yesterday');
  return date.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });
}

export default function MealPickerScreen({ navigation, route }) {
  const { theme } = useTheme();
  const { user } = useUser();
  const { t } = useLanguage();
  const excludeIds = route.params?.excludeIds || [];
  const onSelect = route.params?.onSelect;

  const [meals, setMeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortMode, setSortMode] = useState('recent'); // 'recent' | 'name'

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('meals')
          .select(`
            id,
            image_url,
            logged_at,
            product:food_database!meals_product_fk ( name )
          `)
          .eq('user_id', user.id)
          .order('logged_at', { ascending: false })
          .limit(RECENT_MEALS_LIMIT);
        if (error) throw error;
        if (!cancelled) {
          setMeals((data || []).map((m) => ({
            id: m.id,
            name: m.product?.name || t('compare.unnamedMeal'),
            image_url: m.image_url,
            logged_at: m.logged_at,
          })));
        }
      } catch (e) {
        console.error('MealPickerScreen load error:', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user.id, t]);

  const grouped = useMemo(() => {
    if (sortMode === 'name') {
      const sorted = [...meals].sort((a, b) => a.name.localeCompare(b.name));
      return [{ label: null, items: sorted }];
    }
    const groups = [];
    let currentLabel = null;
    let currentItems = null;
    meals.forEach((meal) => {
      const label = dateGroupLabel(meal.logged_at, t);
      if (label !== currentLabel) {
        currentLabel = label;
        currentItems = [];
        groups.push({ label, items: currentItems });
      }
      currentItems.push(meal);
    });
    return groups;
  }, [meals, sortMode, t]);

  const handlePick = (meal) => {
    if (excludeIds.includes(meal.id)) return;
    onSelect?.(meal.id);
    navigation.goBack();
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={[styles.backBtn, { color: theme.text }]}>←</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>{t('compare.addMeal')}</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.sortRow}>
        <TouchableOpacity
          style={[styles.sortPill, sortMode === 'recent' && styles.sortPillActive]}
          onPress={() => setSortMode('recent')}
        >
          <Text style={[styles.sortPillText, sortMode === 'recent' && styles.sortPillTextActive]}>{t('compare.sortRecent')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.sortPill, sortMode === 'name' && styles.sortPillActive]}
          onPress={() => setSortMode('name')}
        >
          <Text style={[styles.sortPillText, sortMode === 'name' && styles.sortPillTextActive]}>{t('compare.sortName')}</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={theme.primary} />
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {meals.length === 0 && (
            <Text style={[styles.emptyHint, { color: theme.textSecondary }]}>{t('compare.noMeals')}</Text>
          )}
          {grouped.map((group, gi) => (
            <View key={gi}>
              {group.label && <Text style={[styles.dateGroup, { color: theme.textSecondary }]}>{group.label}</Text>}
              {group.items.map((meal) => {
                const disabled = excludeIds.includes(meal.id);
                return (
                  <TouchableOpacity
                    key={meal.id}
                    style={[styles.row, disabled && styles.rowDisabled]}
                    onPress={() => handlePick(meal)}
                    disabled={disabled}
                  >
                    <View style={[styles.thumb, { backgroundColor: theme.cardBackground }]}>
                      {meal.image_url ? (
                        <Image source={{ uri: meal.image_url }} style={styles.thumbImage} resizeMode="cover" />
                      ) : (
                        <Text style={styles.thumbPlaceholder}>🍽️</Text>
                      )}
                    </View>
                    <View style={styles.rowInfo}>
                      <Text style={[styles.rowName, { color: theme.text }]} numberOfLines={1}>{meal.name}</Text>
                      <Text style={[styles.rowMeta, { color: theme.textSecondary }]}>
                        {new Date(meal.logged_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                        {disabled ? ` · ${t('compare.alreadyAdded')}` : ''}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
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
  sortRow: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 12 },
  sortPill: { paddingVertical: 6, paddingHorizontal: 16, borderRadius: 16, backgroundColor: '#F0E9D8' },
  sortPillActive: { backgroundColor: '#4CAF50' },
  sortPillText: { fontSize: scale(12), fontWeight: '700', color: '#8a8265' },
  sortPillTextActive: { color: '#fff' },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 30 },
  emptyHint: { textAlign: 'center', fontSize: scale(13), marginTop: 30 },
  dateGroup: { fontSize: scale(11), fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 14, marginBottom: 8 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 8, paddingHorizontal: 6, borderRadius: 10, marginBottom: 4,
  },
  rowDisabled: { opacity: 0.4 },
  thumb: {
    width: scale(42), height: scale(42), borderRadius: 10,
    justifyContent: 'center', alignItems: 'center', overflow: 'hidden',
  },
  thumbImage: { width: '100%', height: '100%' },
  thumbPlaceholder: { fontSize: scale(18) },
  rowInfo: { flex: 1, minWidth: 0 },
  rowName: { fontSize: scale(13), fontWeight: '600' },
  rowMeta: { fontSize: scale(10.5), marginTop: 1 },
});
