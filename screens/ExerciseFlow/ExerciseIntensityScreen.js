import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useLanguage } from '../../utils/LanguageContext';

const INTENSITIES = {
  walking: [
    { level: 'light', met: 2.5, descKey: 'casualStroll' },
    { level: 'moderate', met: 3.5, descKey: 'normalSpeed' },
    { level: 'brisk', met: 4.5, descKey: 'powerWalking' }
  ],
  running: [
    { level: 'light', met: 8.0, descKey: 'easyPace' },
    { level: 'moderate', met: 9.8, descKey: 'steadyPace' },
    { level: 'fast', met: 11.5, descKey: 'sprintTraining' }
  ],
  cycling: [
    { level: 'light', met: 4.0, descKey: 'leisureCycling' },
    { level: 'moderate', met: 6.8, descKey: 'commutingPace' },
    { level: 'vigorous', met: 8.5, descKey: 'hillClimbing' }
  ],
  swimming: [
    { level: 'light', met: 6.0, descKey: 'leisurelyLaps' },
    { level: 'moderate', met: 8.0, descKey: 'steadyFreestyle' },
    { level: 'vigorous', met: 10.0, descKey: 'fastLaps' }
  ],
  stairs: [
    { level: 'slow', met: 4.0, descKey: 'walkingStairs' },
    { level: 'moderate', met: 8.0, descKey: 'steadyClimbing' },
    { level: 'fast', met: 15.0, descKey: 'runningStairs' }
  ],
  jumprope: [
    { level: 'slow', met: 8.0, descKey: 'learningWarmup' },
    { level: 'moderate', met: 10.0, descKey: 'steadyRhythm' },
    { level: 'fast', met: 12.0, descKey: 'highIntensity' }
  ],
  elliptical: [
    { level: 'light', met: 5.0, descKey: 'lowResistance' },
    { level: 'moderate', met: 7.0, descKey: 'mediumResistance' },
    { level: 'vigorous', met: 9.0, descKey: 'highResistance' }
  ],
  rowing: [
    { level: 'light', met: 4.8, descKey: 'easyPace' },
    { level: 'moderate', met: 7.0, descKey: 'steadyRowing' },
    { level: 'vigorous', met: 10.0, descKey: 'racePace' }
  ],
  strength: [
    { level: 'light', met: 3.5, descKey: 'lightWeights' },
    { level: 'moderate', met: 6.0, descKey: 'generalWeightlifting' },
    { level: 'vigorous', met: 8.0, descKey: 'heavyLifts' }
  ],
  bodyweight: [
    { level: 'light', met: 3.8, descKey: 'basicExercises' },
    { level: 'moderate', met: 5.0, descKey: 'standardRoutine' },
    { level: 'vigorous', met: 7.0, descKey: 'advancedCalisthenics' }
  ],
  hiit: [
    { level: 'moderate', met: 8.0, descKey: 'standardCircuits' },
    { level: 'vigorous', met: 10.0, descKey: 'highIntensity' },
    { level: 'extreme', met: 12.0, descKey: 'competitionLevel' }
  ],
  crosstrain: [
    { level: 'light', met: 5.0, descKey: 'mixedLowImpact' },
    { level: 'moderate', met: 7.0, descKey: 'variedActivities' },
    { level: 'vigorous', met: 9.0, descKey: 'intenseMixed' }
  ],
  yoga: [
    { level: 'gentle', met: 2.5, descKey: 'stretchingFocus' },
    { level: 'flow', met: 4.0, descKey: 'moderatePace' },
    { level: 'power', met: 5.5, descKey: 'intensePractice' }
  ],
  pilates: [
    { level: 'beginner', met: 3.0, descKey: 'basicMat' },
    { level: 'intermediate', met: 4.5, descKey: 'standardClass' },
    { level: 'advanced', met: 6.0, descKey: 'reformerIntense' }
  ],
  stretching: [
    { level: 'light', met: 2.0, descKey: 'passiveStretching' },
    { level: 'moderate', met: 2.5, descKey: 'activeMobility' }
  ],
  dancing: [
    { level: 'light', met: 3.0, descKey: 'slowDancing' },
    { level: 'moderate', met: 4.5, descKey: 'socialDancing' },
    { level: 'vigorous', met: 7.0, descKey: 'aerobicZumba' }
  ],
  housework: [
    { level: 'light', met: 2.5, descKey: 'generalCleaning' },
    { level: 'moderate', met: 3.5, descKey: 'vacuumingMopping' },
    { level: 'vigorous', met: 4.5, descKey: 'heavyCleaning' }
  ],
  basketball: [
    { level: 'light', met: 4.5, descKey: 'shootingAround' },
    { level: 'moderate', met: 6.5, descKey: 'halfCourt' },
    { level: 'vigorous', met: 8.0, descKey: 'fullCourtCompetitive' }
  ],
  soccer: [
    { level: 'light', met: 5.0, descKey: 'casualPlay' },
    { level: 'moderate', met: 7.0, descKey: 'recreationalGame' },
    { level: 'vigorous', met: 10.0, descKey: 'competitiveMatch' }
  ],
  tennis: [
    { level: 'light', met: 5.0, descKey: 'doublesCasual' },
    { level: 'moderate', met: 7.3, descKey: 'singlesRecreational' },
    { level: 'vigorous', met: 10.0, descKey: 'competitiveSingles' }
  ],
  volleyball: [
    { level: 'light', met: 3.0, descKey: 'recreational' },
    { level: 'moderate', met: 4.0, descKey: 'casualGame' },
    { level: 'vigorous', met: 6.0, descKey: 'competitive' }
  ]
};

export default function ExerciseIntensityScreen({ navigation, route }) {
  const { t } = useLanguage();
  const { activity, activityKey, weight, theme } = route.params;
  const intensities = INTENSITIES[activity] || [];

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.text }]}>
          {t(`exercise.activities.${activityKey}`)}
        </Text>
        <TouchableOpacity onPress={() => navigation.navigate('Home')} style={styles.cancelButton}>
          <Text style={[styles.cancelText, { color: theme.primary }]}>
            {t('common.cancel')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Subtitle */}
      <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
        {t('exercise.selectIntensity')}
      </Text>

      {/* Intensities */}
      <ScrollView style={styles.scrollView}>
        {intensities.map((intensity, idx) => (
          <TouchableOpacity
            key={idx}
            style={[styles.intensityCard, { backgroundColor: theme.cardBackground }]}
            onPress={() => navigation.navigate('ExerciseLogModal', {
              activity: activityKey,
              intensity: intensity.level,
              met: intensity.met,
              weight,
              theme
            })}
          >
            <View style={styles.intensityInfo}>
              <Text style={[styles.intensityLevel, { color: theme.text }]}>
                {t(`exercise.intensities.${intensity.level}`)}
              </Text>
              <Text style={[styles.intensityDesc, { color: theme.textSecondary }]}>
                {t(`exercise.descriptions.${intensity.descKey}`)}
              </Text>
            </View>
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
    paddingBottom: 10
  },
  backButton: { padding: 8 },
  backArrow: { fontSize: 28, color: '#007AFF' },
  title: { fontSize: 18, fontWeight: '600' },
  cancelButton: { padding: 8 },
  cancelText: { fontSize: 16 },
  subtitle: {
    fontSize: 15,
    paddingHorizontal: 20,
    paddingBottom: 16
  },
  scrollView: { flex: 1, paddingHorizontal: 20 },
  intensityCard: {
    padding: 20,
    borderRadius: 12,
    marginBottom: 12
  },
  intensityInfo: {},
  intensityLevel: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 4
  },
  intensityDesc: { fontSize: 15 }
});
