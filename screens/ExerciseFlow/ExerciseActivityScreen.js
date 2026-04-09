import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useLanguage } from '../../utils/LanguageContext';

const ACTIVITIES = {
  cardio: [
    { id: 'walking', icon: '🚶', key: 'walking' },
    { id: 'running', icon: '🏃', key: 'running' },
    { id: 'cycling', icon: '🚴', key: 'cycling' },
    { id: 'swimming', icon: '🏊', key: 'swimming' },
    { id: 'stairs', icon: '🪜', key: 'stairClimbing' },
    { id: 'jumprope', icon: '🪢', key: 'jumpRope' },
    { id: 'elliptical', icon: '🌀', key: 'elliptical' },
    { id: 'rowing', icon: '🚣', key: 'rowing' }
  ],
  strength: [
    { id: 'strength', icon: '🏋️', key: 'strengthTraining' },
    { id: 'bodyweight', icon: '🤸', key: 'bodyweightWorkout' },
    { id: 'hiit', icon: '⚡', key: 'hiit' },
    { id: 'crosstrain', icon: '🔄', key: 'crossTraining' }
  ],
  lifestyle: [
    { id: 'yoga', icon: '🧘', key: 'yoga' },
    { id: 'pilates', icon: '🤸', key: 'pilates' },
    { id: 'stretching', icon: '🙆', key: 'stretching' },
    { id: 'dancing', icon: '🕺', key: 'dancing' },
    { id: 'housework', icon: '🏠', key: 'housework' }
  ],
  sports: [
    { id: 'basketball', icon: '🏀', key: 'basketball' },
    { id: 'soccer', icon: '⚽', key: 'soccer' },
    { id: 'tennis', icon: '🎾', key: 'tennis' },
    { id: 'volleyball', icon: '🏐', key: 'volleyball' }
  ]
};

export default function ExerciseActivityScreen({ navigation, route }) {
  const { t } = useLanguage();
  const { category, weight, theme } = route.params;
  const activities = ACTIVITIES[category] || [];

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.text }]}>
          {t(`exercise.categories.${category}`)}
        </Text>
        <TouchableOpacity onPress={() => navigation.navigate('Home')} style={styles.cancelButton}>
          <Text style={[styles.cancelText, { color: theme.primary }]}>
            {t('common.cancel')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Activities */}
      <ScrollView style={styles.scrollView}>
        {activities.map(activity => (
          <TouchableOpacity
            key={activity.id}
            style={[styles.activityCard, { backgroundColor: theme.cardBackground }]}
            onPress={() => navigation.navigate('ExerciseIntensityScreen', {
              activity: activity.id,
              activityKey: activity.key,
              weight,
              theme
            })}
          >
            <Text style={styles.activityIcon}>{activity.icon}</Text>
            <Text style={[styles.activityName, { color: theme.text }]}>
              {t(`exercise.activities.${activity.key}`)}
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
  activityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 12,
    marginBottom: 12
  },
  activityIcon: { fontSize: 28, marginRight: 16 },
  activityName: { flex: 1, fontSize: 17, fontWeight: '500' },
  chevron: { fontSize: 24, color: '#C7C7CC' }
});

