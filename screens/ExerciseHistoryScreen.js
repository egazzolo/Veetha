import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { useLanguage } from '../utils/LanguageContext';
import { supabase } from '../utils/supabase';

export default function ExerciseHistoryScreen({ route, nestedInScrollView }) {
  const { t } = useLanguage();
  const { theme, isPremium } = route.params || {};

  const isNested = nestedInScrollView === true;
  
  const [exercises, setExercises] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchExercises();
  }, []);

  const fetchExercises = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let query = supabase
        .from('exercises')
        .select('*')
        .eq('user_id', user.id)
        .order('logged_at', { ascending: false });

      // Free users: only last 3 days
      if (!isPremium) {
        const threeDaysAgo = new Date();
        threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
        query = query.gte('logged_at', threeDaysAgo.toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;

      setExercises(data || []);
    } catch (error) {
      console.error('Error fetching exercises:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    Alert.alert(
      t('common.confirm'),
      t('exercise.deleteConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('exercises')
                .delete()
                .eq('id', id);

              if (error) throw error;
              fetchExercises();
            } catch (error) {
              console.error('Error deleting exercise:', error);
              Alert.alert(t('common.error'), t('exercise.deleteFailed'));
            }
          }
        }
      ]
    );
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

  const renderExerciseItem = ({ item }) => (
    <View style={[styles.exerciseCard, { backgroundColor: theme.cardBackground }]}>
      <View style={styles.exerciseInfo}>
        <Text style={[styles.activityName, { color: theme.text }]}>
          {t(`exercise.activities.${item.activity_name}`)}
        </Text>
        <Text style={[styles.activityDetails, { color: theme.textSecondary }]}>
          {t(`exercise.intensities.${item.intensity}`)} • {item.duration_minutes} min
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

      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => handleDelete(item.id)}
      >
        <Text style={styles.deleteIcon}>🗑️</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  if (exercises.length === 0) {
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
      {!isPremium && (
        <View style={[styles.limitBanner, { backgroundColor: theme.warningLight || '#FFF3E0' }]}>
          <Text style={[styles.limitText, { color: theme.warning || '#F57C00' }]}>
            {t('exercise.freeUserLimit')}
          </Text>
        </View>
      )}
      
      <FlatList
        data={exercises}
        renderItem={renderExerciseItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        scrollEnabled={nestedInScrollView !== true}
        nestedScrollEnabled={true} 
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
  }
});