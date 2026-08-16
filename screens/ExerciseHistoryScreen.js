import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { useLanguage } from '../utils/LanguageContext';
import { supabase } from '../utils/supabase';
import { useUser } from '../utils/UserContext';
import VeethaModal from '../components/VeethaModal';

const SPLIT_KEYS = ['fullBody', 'upperLower', 'pushPullLegs', 'broSplit'];
const SUB_CATEGORY_KEYS = ['upper', 'lower', 'push', 'pull', 'legs', 'chest', 'back', 'shoulders', 'arms', 'core'];

export default function ExerciseHistoryScreen({ route, nestedInScrollView }) {
  const { t } = useLanguage();
  const { user, loading: userContextLoading } = useUser();
  const { theme, isPremium } = route.params || {};

  const isNested = nestedInScrollView === true;

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  useEffect(() => {
    // `user` is set early in UserContext's load chain -- well before it
    // goes on to also fetch the full profile and today's meals -- so fetch
    // as soon as a user id shows up instead of waiting for that unrelated
    // work to finish too. Only fall back to `userContextLoading` to detect
    // the "confirmed guest, no user" case so the spinner doesn't hang forever.
    if (user?.id) {
      fetchExercises();
    } else if (!userContextLoading) {
      setLoading(false);
    }
  }, [user?.id, userContextLoading]);

  const formatSplitType = (splitTypeValue) => {
    return splitTypeValue
      .split(',')
      .map((part) => (SPLIT_KEYS.includes(part) ? t(`exercise.splitFlow.splits.${part}`) : part))
      .join(', ');
  };

  const formatSubCategory = (key) => (
    key && SUB_CATEGORY_KEYS.includes(key) ? t(`exercise.splitFlow.subCategories.${key}`) : null
  );

  const fetchExercises = async () => {
    try {
      if (!user) return;

      // Two separate sources feed this list: the original per-activity
      // "exercises" table, and the newer split-based "exercise_logs" table
      // (with its child "exercise_log_entries" for individual sets/reps),
      // merged here by date so both show up in one unified history.
      const [legacyResult, splitResult] = await Promise.all([
        supabase
          .from('exercises')
          .select('*')
          .eq('user_id', user.id)
          .order('logged_at', { ascending: false }),
        supabase
          .from('exercise_logs')
          .select('*, exercise_log_entries(*)')
          .eq('user_id', user.id)
          .order('logged_at', { ascending: false })
      ]);

      if (legacyResult.error) throw legacyResult.error;
      if (splitResult.error) throw splitResult.error;

      const legacyItems = (legacyResult.data || []).map((item) => ({
        type: 'legacy',
        id: `legacy-${item.id}`,
        rawId: item.id,
        logged_at: item.logged_at,
        calories_burned: item.calories_burned,
        raw: item
      }));

      const splitItems = (splitResult.data || []).map((item) => ({
        type: 'split',
        id: `split-${item.id}`,
        rawId: item.id,
        logged_at: item.logged_at,
        calories_burned: item.calories_burned,
        raw: item
      }));

      const merged = [...legacyItems, ...splitItems].sort(
        (a, b) => new Date(b.logged_at) - new Date(a.logged_at)
      );

      setItems(merged);
    } catch (error) {
      console.error('Error fetching exercises:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (item) => {
    setDeleteTarget(item);
    setDeleteModalVisible(true);
  };

  const confirmDelete = async () => {
    setDeleteModalVisible(false);
    try {
      const table = deleteTarget.type === 'legacy' ? 'exercises' : 'exercise_logs';
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('id', deleteTarget.rawId);

      if (error) throw error;
      fetchExercises();
    } catch (error) {
      console.error('Error deleting exercise:', error);
      Alert.alert(t('common.error'), t('exercise.deleteFailed'));
    }
    setDeleteTarget(null);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return t('common.today');
    } else if (date.toDateString() === yesterday.toDateString()) {
      return t('common.yesterday');
    } else {
      return date.toLocaleDateString();
    }
  };

  const renderLegacyItem = (item) => (
    <View style={[styles.exerciseCard, { backgroundColor: theme.cardBackground }]}>
      <View style={styles.exerciseInfo}>
        <Text style={[styles.activityName, { color: theme.text }]}>
          {t(`exercise.activities.${item.raw.activity_name}`)}
        </Text>
        <Text style={[styles.activityDetails, { color: theme.textSecondary }]}>
          {t(`exercise.intensities.${item.raw.intensity}`)} • {item.raw.duration_minutes} min
        </Text>
        <Text style={[styles.dateText, { color: theme.textSecondary }]}>
          {formatDate(item.logged_at)}
        </Text>
      </View>

      <View style={styles.caloriesSection}>
        <Text style={[styles.caloriesValue, { color: theme.success || '#4CAF50' }]}>
          -{item.calories_burned}
        </Text>
        <Text style={[styles.caloriesLabel, { color: theme.textSecondary }]}>
          {t('common.kcal')}
        </Text>
      </View>

      <TouchableOpacity style={styles.deleteButton} onPress={() => handleDelete(item)}>
        <Text style={styles.deleteIcon}>🗑️</Text>
      </TouchableOpacity>
    </View>
  );

  const renderSplitItem = (item) => {
    const isExpanded = expandedId === item.id;
    const entries = item.raw.exercise_log_entries || [];

    // Group entries by sub-category for display -- entries with no
    // sub-category (Full Body / a custom "Other" label) are listed
    // ungrouped.
    const grouped = {};
    const ungrouped = [];
    for (const entry of entries) {
      const label = formatSubCategory(entry.sub_category);
      if (label) {
        if (!grouped[label]) grouped[label] = [];
        grouped[label].push(entry);
      } else {
        ungrouped.push(entry);
      }
    }

    return (
      <View style={[styles.exerciseCard, styles.splitCard, { backgroundColor: theme.cardBackground }]}>
        <TouchableOpacity
          style={styles.splitCardHeader}
          onPress={() => setExpandedId(isExpanded ? null : item.id)}
        >
          <View style={styles.exerciseInfo}>
            <Text style={[styles.activityName, { color: theme.text }]}>
              {formatSplitType(item.raw.split_type)}
            </Text>
            <Text style={[styles.activityDetails, { color: theme.textSecondary }]}>
              {t(`exercise.intensities.${item.raw.intensity}`)}
            </Text>
            <Text style={[styles.dateText, { color: theme.textSecondary }]}>
              {formatDate(item.logged_at)}
            </Text>
          </View>

          <View style={styles.caloriesSection}>
            <Text style={[styles.caloriesValue, { color: theme.success || '#4CAF50' }]}>
              -{item.calories_burned}
            </Text>
            <Text style={[styles.caloriesLabel, { color: theme.textSecondary }]}>
              {t('common.kcal')}
            </Text>
          </View>

          <TouchableOpacity style={styles.deleteButton} onPress={() => handleDelete(item)}>
            <Text style={styles.deleteIcon}>🗑️</Text>
          </TouchableOpacity>
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.expandedDetail}>
            {Object.entries(grouped).map(([label, groupEntries]) => (
              <View key={label} style={styles.detailGroup}>
                <Text style={[styles.detailGroupTitle, { color: theme.text }]}>{label}</Text>
                {groupEntries.map((entry) => (
                  <Text key={entry.id} style={[styles.detailRow, { color: theme.textSecondary }]}>
                    {entry.name} — {entry.sets} × {entry.reps}
                    {entry.weight ? ` @ ${entry.weight}${entry.weight_unit ? ` ${entry.weight_unit}` : ''}` : ''}
                  </Text>
                ))}
              </View>
            ))}
            {ungrouped.length > 0 && (
              <View style={styles.detailGroup}>
                {ungrouped.map((entry) => (
                  <Text key={entry.id} style={[styles.detailRow, { color: theme.textSecondary }]}>
                    {entry.name} — {entry.sets} × {entry.reps}
                    {entry.weight ? ` @ ${entry.weight}${entry.weight_unit ? ` ${entry.weight_unit}` : ''}` : ''}
                  </Text>
                ))}
              </View>
            )}
            {entries.length === 0 && (
              <Text style={[styles.detailRow, { color: theme.textSecondary }]}>
                {t('exercise.noHistory')}
              </Text>
            )}
          </View>
        )}
      </View>
    );
  };

  const renderExerciseItem = ({ item }) => (
    item.type === 'legacy' ? renderLegacyItem(item) : renderSplitItem(item)
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  if (items.length === 0) {
    return (
      <View style={[styles.container, styles.centerContent, { backgroundColor: theme.background }]}>
        <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
          {t('exercise.noHistory')}
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>

      <FlatList
        data={items}
        renderItem={renderExerciseItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        scrollEnabled={nestedInScrollView !== true}
        nestedScrollEnabled={true}
      />

      <VeethaModal
        visible={deleteModalVisible}
        title={t('common.confirm')}
        message={t('exercise.deleteConfirm')}
        confirmText={t('common.delete')}
        cancelText={t('common.cancel')}
        onConfirm={confirmDelete}
        onCancel={() => {
          setDeleteModalVisible(false);
          setDeleteTarget(null);
        }}
        destructive
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centerContent: { justifyContent: 'center', alignItems: 'center' },
  limitBanner: {
    padding: 12,
    alignItems: 'center'
  },
  limitText: { fontSize: 14, fontWeight: '500' },
  listContent: { padding: 16 },
  exerciseCard: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    alignItems: 'center'
  },
  splitCard: { flexDirection: 'column', alignItems: 'stretch' },
  splitCardHeader: { flexDirection: 'row', alignItems: 'center' },
  exerciseInfo: { flex: 1 },
  activityName: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 4
  },
  activityDetails: {
    fontSize: 15,
    marginBottom: 4
  },
  dateText: { fontSize: 14 },
  caloriesSection: { alignItems: 'center', marginRight: 12 },
  caloriesValue: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 2
  },
  caloriesLabel: { fontSize: 13 },
  deleteButton: { padding: 8 },
  deleteIcon: { fontSize: 20 },
  emptyText: {
    fontSize: 16,
    textAlign: 'center'
  },
  expandedDetail: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#00000022'
  },
  detailGroup: { marginBottom: 10 },
  detailGroupTitle: { fontSize: 14, fontWeight: '700', marginBottom: 4 },
  detailRow: { fontSize: 14, marginBottom: 2 }
});
