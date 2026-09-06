import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../utils/ThemeContext';
import { useUser } from '../utils/UserContext';
import { useLanguage } from '../utils/LanguageContext';
import { supabase } from '../utils/supabase';
import { scale } from '../utils/responsive';

const LBS_PER_KG = 2.20462;
const MACRO_ROWS = [
  { key: 'calories', labelKey: 'home.calories', unit: '' },
  { key: 'protein', labelKey: 'home.protein', unit: 'g' },
  { key: 'carbs', labelKey: 'home.carbs', unit: 'g' },
  { key: 'fat', labelKey: 'home.fat', unit: 'g' },
];

// Average daily intake over the 7 days ending on `centerDateIso`, averaged
// only across days that actually have a logged meal (not a flat /7), same
// convention StatsScreen already uses for its weekly averages.
async function fetchWeekAverage(userId, centerDateIso) {
  const center = new Date(centerDateIso);
  const start = new Date(center);
  start.setDate(start.getDate() - 6);
  start.setHours(0, 0, 0, 0);
  const end = new Date(center);
  end.setHours(23, 59, 59, 999);

  const { data, error } = await supabase
    .from('meals')
    .select(`
      serving_grams,
      logged_at,
      product:food_database!meals_product_fk ( calories, protein, carbs, fat )
    `)
    .eq('user_id', userId)
    .gte('logged_at', start.toISOString())
    .lte('logged_at', end.toISOString());
  if (error) throw error;

  const byDay = {};
  (data || []).forEach((m) => {
    const day = new Date(m.logged_at).toDateString();
    const grams = m.serving_grams || 0;
    const p = m.product || {};
    if (!byDay[day]) byDay[day] = { calories: 0, protein: 0, carbs: 0, fat: 0 };
    byDay[day].calories += ((p.calories || 0) * grams) / 100;
    byDay[day].protein += ((p.protein || 0) * grams) / 100;
    byDay[day].carbs += ((p.carbs || 0) * grams) / 100;
    byDay[day].fat += ((p.fat || 0) * grams) / 100;
  });

  const days = Object.values(byDay);
  const n = days.length || 1;
  return {
    calories: Math.round(days.reduce((s, d) => s + d.calories, 0) / n),
    protein: Math.round(days.reduce((s, d) => s + d.protein, 0) / n),
    carbs: Math.round(days.reduce((s, d) => s + d.carbs, 0) / n),
    fat: Math.round(days.reduce((s, d) => s + d.fat, 0) / n),
    daysLogged: days.length,
  };
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export default function ProgressCompareScreen({ navigation, route }) {
  const { earlier, later } = route.params;
  const { theme } = useTheme();
  const { user } = useUser();
  const { t } = useLanguage();

  const [loading, setLoading] = useState(true);
  const [avgEarlier, setAvgEarlier] = useState(null);
  const [avgLater, setAvgLater] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const [a, b] = await Promise.all([
          fetchWeekAverage(user.id, earlier.logged_at),
          fetchWeekAverage(user.id, later.logged_at),
        ]);
        setAvgEarlier(a);
        setAvgLater(b);
      } catch (e) {
        console.error('ProgressCompare average fetch error:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, [earlier.logged_at, later.logged_at, user.id]);

  const toLbs = (kg) => Math.round(kg * LBS_PER_KG);
  const weightDiff = toLbs(later.weight_kg) - toLbs(earlier.weight_kg);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={[styles.backBtn, { color: theme.text }]}>←</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>{t('progress.compareTitle')}</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.scroll}>
        <View style={styles.compareRow}>
          {[earlier, later].map((log) => (
            <View key={log.id} style={styles.compareCol}>
              {log.signedUrl ? (
                <Image source={{ uri: log.signedUrl }} style={[styles.comparePhoto, { backgroundColor: theme.cardBackground }]} resizeMode="cover" />
              ) : (
                <View style={[styles.comparePhoto, { backgroundColor: theme.cardBackground }]} />
              )}
              <Text style={[styles.compareDate, { color: theme.text }]}>{formatDate(log.logged_at)}</Text>
              <Text style={[styles.compareWeight, { color: theme.textSecondary }]}>{toLbs(log.weight_kg)} lbs</Text>
            </View>
          ))}
        </View>

        <View style={[styles.diffCard, { backgroundColor: theme.cardBackground }]}>
          <Text style={[styles.diffVal, { color: weightDiff <= 0 ? '#1F9B39' : theme.text }]}>
            {weightDiff > 0 ? '+' : ''}{weightDiff} lbs
          </Text>
          <Text style={[styles.diffLabel, { color: theme.textSecondary }]}>{t('progress.overSpan')}</Text>
        </View>

        <Text style={[styles.intakeSectionTitle, { color: theme.textSecondary }]}>{t('progress.avgIntakeTitle')}</Text>

        {loading ? (
          <ActivityIndicator color={theme.primary} style={{ marginTop: 10 }} />
        ) : (
          <>
            <View style={[styles.intakeCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
              <View style={[styles.intakeHeadRow, { borderBottomColor: theme.border }]}>
                <View style={{ flex: 1 }} />
                <Text style={[styles.intakeHeadCol, { color: theme.textSecondary }]}>{formatDate(earlier.logged_at)}</Text>
                <Text style={[styles.intakeHeadCol, { color: theme.textSecondary }]}>{formatDate(later.logged_at)}</Text>
              </View>
              {MACRO_ROWS.map((row) => (
                <View key={row.key} style={[styles.intakeRow, { borderBottomColor: theme.border }]}>
                  <Text style={[styles.intakeLabel, { color: theme.textSecondary }]}>{t(row.labelKey)}</Text>
                  <Text style={[styles.intakeVal, { color: theme.text }]}>{avgEarlier?.[row.key] ?? 0}{row.unit}</Text>
                  <Text style={[styles.intakeVal, { color: theme.text }]}>{avgLater?.[row.key] ?? 0}{row.unit}</Text>
                </View>
              ))}
            </View>
            <Text style={[styles.intakeNote, { color: theme.textTertiary }]}>{t('progress.avgIntakeNote')}</Text>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
  },
  backBtn: { fontSize: scale(22), fontWeight: '600' },
  headerTitle: { fontSize: scale(18), fontWeight: '700' },
  scroll: { padding: 20, paddingTop: 4 },
  compareRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  compareCol: { flex: 1, alignItems: 'center' },
  comparePhoto: { width: '100%', aspectRatio: 0.75, borderRadius: 12, marginBottom: 8 },
  compareDate: { fontSize: scale(12.5), fontWeight: '700' },
  compareWeight: { fontSize: scale(11.5), marginTop: 2 },
  diffCard: { borderRadius: 12, padding: 14, alignItems: 'center', marginBottom: 4 },
  diffVal: { fontSize: scale(20), fontWeight: '800' },
  diffLabel: { fontSize: scale(11.5), marginTop: 2 },
  intakeSectionTitle: {
    fontSize: scale(12.5), fontWeight: '700', marginTop: 18, marginBottom: 8,
    textTransform: 'uppercase', letterSpacing: 0.4,
  },
  intakeCard: { borderRadius: 14, paddingHorizontal: 14 },
  intakeHeadRow: { flexDirection: 'row', paddingVertical: 10, borderBottomWidth: 1 },
  intakeHeadCol: { flex: 1, textAlign: 'center', fontSize: scale(10.5), fontWeight: '800' },
  intakeRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 11, borderBottomWidth: 1 },
  intakeLabel: { flex: 1, fontSize: scale(12.5), fontWeight: '700' },
  intakeVal: { flex: 1, textAlign: 'center', fontSize: scale(13), fontWeight: '700' },
  intakeNote: { textAlign: 'center', fontSize: scale(11), marginTop: 8 },
});
