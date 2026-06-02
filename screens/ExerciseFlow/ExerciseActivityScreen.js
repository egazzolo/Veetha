import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLanguage } from '../../utils/LanguageContext';
import AppIcon from '../../components/AppIcon';

const ACTIVITIES = {
  cardio: [
    { id: 'walking', iconName: 'walking_clr', key: 'walking' },
    { id: 'running', iconName: 'running_clr', key: 'running' },
    { id: 'cycling', iconName: 'cycling_clr', key: 'cycling' },
    { id: 'swimming', iconName: 'swimming_clr', key: 'swimming' },
    { id: 'stairs', iconName: 'stairs_clr', key: 'stairClimbing' },
    { id: 'jumprope', iconName: 'jumprope_clr', key: 'jumpRope' },
    { id: 'elliptical', iconName: 'elliptical_clr', key: 'elliptical' },
    { id: 'rowing', iconName: 'rowing_clr', key: 'rowing' }
  ],
  strength: [
    { id: 'strength', iconName: 'strength_clr', key: 'strengthTraining' },
    { id: 'bodyweight', iconName: 'bodyweight_clr', key: 'bodyweightWorkout' },
    { id: 'hiit', iconName: 'hiit_clr', key: 'hiit' },
    { id: 'crosstrain', iconName: 'crosstrain_clr', key: 'crossTraining' }
  ],
  lifestyle: [
    { id: 'yoga', iconName: 'yoga_clr', key: 'yoga' },
    { id: 'pilates', iconName: 'pilates_clr', key: 'pilates' },
    { id: 'stretching', iconName: 'stretching_clr', key: 'stretching' },
    { id: 'dancing', iconName: 'dancing_clr', key: 'dancing' },
    { id: 'housework', iconName: 'housework_clr', key: 'housework' }
  ],
  sports: [
    { id: 'basketball', iconName: 'basketball_clr', key: 'basketball' },
    { id: 'soccer', iconName: 'soccer_clr', key: 'soccer' },
    { id: 'tennis', iconName: 'tennis_clr', key: 'tennis' },
    { id: 'volleyball', iconName: 'volleyball_clr', key: 'volleyball' }
  ]
};

export default function ExerciseActivityScreen({ navigation, route }) {
  const { t } = useLanguage();
  const { category, weight, theme } = route.params;
  const activities = ACTIVITIES[category] || [];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top', 'bottom']}>
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
            <AppIcon name={activity.iconName} size={36} style={styles.activityIcon} />
            <Text style={[styles.activityName, { color: theme.text }]}>
              {t(`exercise.activities.${activity.key}`)}
            </Text>
            <Text style={styles.chevron}>›</Text>
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
  activityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 12,
    marginBottom: 12
  },
  activityIcon: { marginRight: 16 },
  activityName: { flex: 1, fontSize: 17, fontWeight: '500' },
  chevron: { fontSize: 24, color: '#C7C7CC' }
});

