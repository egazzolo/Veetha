import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, Alert, Modal } from 'react-native';
import { useLanguage } from '../utils/LanguageContext';
import { supabase } from '../utils/supabase';
import { useUser } from '../utils/UserContext';
import VeethaModal from '../components/VeethaModal';
import ExerciseButton from '../components/ExerciseButton';

const SPLIT_KEYS = ['fullBody', 'upperLower', 'pushPullLegs', 'broSplit'];
const SUB_CATEGORY_KEYS = ['upper', 'lower', 'push', 'pull', 'legs', 'chest', 'back', 'shoulders', 'arms', 'core'];

export default function ExerciseHistoryScreen({ route, navigation, nestedInScrollView }) {
  const { t } = useLanguage();
  const { user, loading: userContextLoading } = useUser();
  const { theme, isPremium } = route.params || {};

  const isNested = nestedInScrollView === true;

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [editingEntry, setEditingEntry] = useState(null);
  const [savingEntry, setSavingEntry] = useState(false);

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

      // This list only ever shows today's exercises -- anything further
      // back requires Premium + generating a report (ExportReportScreen),
      // rather than scrolling an ever-growing in-app history.
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);

      // Two separate sources feed this list: the original per-activity
      // "exercises" table, and the newer split-based "exercise_logs" table
      // (with its child "exercise_log_entries" for individual sets/reps),
      // merged here by date so both show up in one unified history.
      const [legacyResult, splitResult] = await Promise.all([
        supabase
          .from('exercises')
          .select('*')
          .eq('user_id', user.id)
          .gte('logged_at', startOfDay.toISOString())
          .lte('logged_at', endOfDay.toISOString())
          .order('logged_at', { ascending: false }),
        supabase
          .from('exercise_logs')
          .select('*, exercise_log_entries(*)')
          .eq('user_id', user.id)
          .gte('logged_at', startOfDay.toISOString())
          .lte('logged_at', endOfDay.toISOString())
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

  const openEditEntry = (entry) => {
    setEditingEntry({
      id: entry.id,
      name: entry.name || '',
      sets: entry.sets != null ? String(entry.sets) : '',
      reps: entry.reps != null ? String(entry.reps) : '',
      weight: entry.weight != null ? String(entry.weight) : '',
      weight_unit: entry.weight_unit || 'kg',
    });
  };

  // id: null marks a new row rather than an edit of an existing one --
  // exerciseLogId/subCategory are only needed for that insert path, so the
  // update path (openEditEntry above) doesn't carry them.
  const openAddEntry = (exerciseLogId, subCategory) => {
    setEditingEntry({
      id: null,
      exerciseLogId,
      subCategory,
      name: '',
      sets: '',
      reps: '',
      weight: '',
      weight_unit: 'kg',
    });
  };

  const saveEditedEntry = async () => {
    if (!editingEntry.name.trim() || !editingEntry.sets || !editingEntry.reps) {
      Alert.alert(t('common.error'), 'Please fill in the exercise name, sets, and reps.');
      return;
    }

    setSavingEntry(true);
    try {
      const hasWeight = editingEntry.weight !== '' && !isNaN(parseFloat(editingEntry.weight));
      const payload = {
        name: editingEntry.name.trim(),
        sets: parseInt(editingEntry.sets, 10) || 0,
        reps: parseInt(editingEntry.reps, 10) || 0,
        weight: hasWeight ? parseFloat(editingEntry.weight) : null,
        weight_unit: hasWeight ? editingEntry.weight_unit : null,
      };

      const { error } = editingEntry.id
        ? await supabase.from('exercise_log_entries').update(payload).eq('id', editingEntry.id)
        : await supabase.from('exercise_log_entries').insert({
            ...payload,
            exercise_log_id: editingEntry.exerciseLogId,
            sub_category: editingEntry.subCategory,
          });

      if (error) throw error;

      setEditingEntry(null);
      fetchExercises();
    } catch (error) {
      console.error('Error saving exercise entry:', error);
      Alert.alert(t('common.error'), 'Could not save changes. Please try again.');
    } finally {
      setSavingEntry(false);
    }
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

  const renderColumnHeader = (key) => (
    <View key={`header-${key}`} style={[styles.entryRow, styles.columnHeaderRow, { borderBottomColor: theme.border }]}>
      <View style={styles.entryName} />
      <View style={[styles.entryCol, { borderLeftColor: theme.border }]}>
        <Text style={[styles.columnHeaderText, { color: theme.textSecondary }]}>{t('exercise.splitFlow.sets')}</Text>
      </View>
      <View style={[styles.entryCol, { borderLeftColor: theme.border }]}>
        <Text style={[styles.columnHeaderText, { color: theme.textSecondary }]}>{t('exercise.splitFlow.reps')}</Text>
      </View>
      <View style={[styles.entryCol, { borderLeftColor: theme.border }]}>
        <Text style={[styles.columnHeaderText, { color: theme.textSecondary }]}>{t('exercise.weight')}</Text>
      </View>
    </View>
  );

  const renderEntryRow = (entry) => (
    <TouchableOpacity key={entry.id} onPress={() => openEditEntry(entry)} style={styles.entryRow}>
      <Text style={[styles.entryName, { color: theme.textSecondary }]} numberOfLines={1}>
        {entry.name}
      </Text>
      <View style={[styles.entryCol, { borderLeftColor: theme.border }]}>
        <Text style={{ color: theme.textSecondary }}>{entry.sets}</Text>
      </View>
      <View style={[styles.entryCol, { borderLeftColor: theme.border }]}>
        <Text style={{ color: theme.textSecondary }}>{entry.reps}</Text>
      </View>
      <View style={[styles.entryCol, { borderLeftColor: theme.border }]}>
        <Text style={{ color: theme.textSecondary }}>
          {entry.weight ? `${entry.weight}${entry.weight_unit ? ` ${entry.weight_unit}` : ''}` : '—'}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderSplitItem = (item) => {
    const isExpanded = expandedId === item.id;
    const entries = item.raw.exercise_log_entries || [];

    // Group entries by their raw sub-category key (not the translated label,
    // so it can double as the value passed back to openAddEntry). Entries
    // with no sub-category (Full Body / a custom "Other" label) are listed
    // ungrouped.
    const grouped = {};
    const ungrouped = [];
    for (const entry of entries) {
      if (entry.sub_category && SUB_CATEGORY_KEYS.includes(entry.sub_category)) {
        if (!grouped[entry.sub_category]) grouped[entry.sub_category] = [];
        grouped[entry.sub_category].push(entry);
      } else {
        ungrouped.push(entry);
      }
    }

    // Sections come from what was originally selected on this log (so a
    // section the user forgot to log anything for still shows up, with
    // nothing but an Add button) -- falling back to whatever groups exist
    // for older logs saved before sub_categories was stored on the log itself.
    const sectionKeys = item.raw.sub_categories?.length
      ? item.raw.sub_categories.filter((key) => SUB_CATEGORY_KEYS.includes(key))
      : Object.keys(grouped);

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
            {sectionKeys.map((key) => (
              <View key={key} style={styles.detailGroup}>
                <Text style={[styles.detailGroupTitle, { color: theme.text }]}>
                  {formatSubCategory(key)}
                </Text>
                {(grouped[key] || []).length > 0 && renderColumnHeader(key)}
                {(grouped[key] || []).map((entry) => renderEntryRow(entry))}
                <TouchableOpacity onPress={() => openAddEntry(item.rawId, key)}>
                  <Text style={[styles.addEntryText, { color: theme.primary }]}>
                    + {t('exercise.splitFlow.addExercise')}
                  </Text>
                </TouchableOpacity>
              </View>
            ))}

            {/* Full Body / "Other" workouts have no sub-category sections --
                everything (existing entries and the add button) lives here. */}
            {sectionKeys.length === 0 && (
              <View style={styles.detailGroup}>
                {ungrouped.length > 0 && renderColumnHeader('ungrouped')}
                {ungrouped.map((entry) => renderEntryRow(entry))}
                <TouchableOpacity onPress={() => openAddEntry(item.rawId, null)}>
                  <Text style={[styles.addEntryText, { color: theme.primary }]}>
                    + {t('exercise.splitFlow.addExercise')}
                  </Text>
                </TouchableOpacity>
              </View>
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
        <View style={{ marginTop: 16 }}>
          <ExerciseButton
            theme={theme}
            navigation={navigation}
            startAnimation={false}
            iconStyle={{ marginTop: -8 }}
            labelStyle={{ marginTop: -28 }}
          />
        </View>
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

      <Modal
        visible={!!editingEntry}
        transparent
        animationType="fade"
        onRequestClose={() => setEditingEntry(null)}
      >
        <View style={styles.editModalOverlay}>
          <View style={[styles.editModalContent, { backgroundColor: theme.cardBackground }]}>
            <Text style={[styles.editModalTitle, { color: theme.text }]}>
              {editingEntry?.id ? t('exercise.splitFlow.exerciseName') : t('exercise.splitFlow.addExercise')}
            </Text>

            {editingEntry && (
              <>
                <TextInput
                  style={[styles.editInput, { color: theme.text, borderColor: theme.border }]}
                  value={editingEntry.name}
                  onChangeText={(v) => setEditingEntry({ ...editingEntry, name: v })}
                  placeholder={t('exercise.splitFlow.exerciseName')}
                  placeholderTextColor={theme.textSecondary}
                />

                <View style={styles.editRow}>
                  <View style={styles.editField}>
                    <Text style={[styles.editLabel, { color: theme.textSecondary }]}>
                      {t('exercise.splitFlow.sets')}
                    </Text>
                    <TextInput
                      style={[styles.editInput, { color: theme.text, borderColor: theme.border }]}
                      value={editingEntry.sets}
                      onChangeText={(v) => setEditingEntry({ ...editingEntry, sets: v })}
                      keyboardType="numeric"
                    />
                  </View>
                  <View style={styles.editField}>
                    <Text style={[styles.editLabel, { color: theme.textSecondary }]}>
                      {t('exercise.splitFlow.reps')}
                    </Text>
                    <TextInput
                      style={[styles.editInput, { color: theme.text, borderColor: theme.border }]}
                      value={editingEntry.reps}
                      onChangeText={(v) => setEditingEntry({ ...editingEntry, reps: v })}
                      keyboardType="numeric"
                    />
                  </View>
                </View>

                <Text style={[styles.editLabel, { color: theme.textSecondary, marginTop: 12 }]}>
                  {t('exercise.weight')}
                </Text>
                <View style={styles.editRow}>
                  <TextInput
                    style={[styles.editInput, { flex: 1, color: theme.text, borderColor: theme.border }]}
                    value={editingEntry.weight}
                    onChangeText={(v) => setEditingEntry({ ...editingEntry, weight: v })}
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor={theme.textSecondary}
                  />
                  {['kg', 'lb'].map((unit) => (
                    <TouchableOpacity
                      key={unit}
                      style={[
                        styles.unitButton,
                        { borderColor: theme.border },
                        editingEntry.weight_unit === unit && { backgroundColor: theme.primary, borderColor: theme.primary }
                      ]}
                      onPress={() => setEditingEntry({ ...editingEntry, weight_unit: unit })}
                    >
                      <Text style={[styles.unitButtonText, { color: theme.text }, editingEntry.weight_unit === unit && { color: '#fff' }]}>
                        {unit}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            <View style={styles.editModalButtons}>
              <TouchableOpacity
                style={[styles.editModalButton, { borderColor: theme.border }]}
                onPress={() => setEditingEntry(null)}
                disabled={savingEntry}
              >
                <Text style={[styles.editModalButtonText, { color: theme.primary }]}>
                  {t('common.cancel')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.editModalButton, styles.editModalSaveButton, { backgroundColor: theme.primary }]}
                onPress={saveEditedEntry}
                disabled={savingEntry}
              >
                {savingEntry ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={[styles.editModalButtonText, { color: '#fff' }]}>
                    {t('common.save')}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  detailRow: { fontSize: 14, marginBottom: 2 },
  entryRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4 },
  entryName: { flex: 1, fontSize: 14, paddingRight: 8 },
  entryCol: { width: 56, borderLeftWidth: 1, paddingLeft: 8, alignItems: 'flex-start' },
  columnHeaderRow: { paddingBottom: 4, marginBottom: 2, borderBottomWidth: 1 },
  columnHeaderText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  addEntryText: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 10,
  },
  editModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  editModalContent: {
    width: '88%',
    borderRadius: 20,
    padding: 24,
  },
  editModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  editInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontSize: 15,
    marginBottom: 12,
  },
  editRow: {
    flexDirection: 'row',
    gap: 10,
  },
  editField: {
    flex: 1,
  },
  editLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  unitButton: {
    paddingHorizontal: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    marginBottom: 12,
  },
  unitButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  editModalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  editModalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  editModalSaveButton: {
    borderWidth: 0,
  },
  editModalButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
