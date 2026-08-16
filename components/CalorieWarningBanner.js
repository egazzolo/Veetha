import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

// Derives its warning state from the same `consumed`/`totalCalories` HomeScreen
// already keeps current -- previously this polled Supabase directly on its own
// 5-second timer (duplicated in FrameWarning below), which meant two separate
// components each firing 3 network requests every 5 seconds for as long as the
// app was open. That constant, ever-growing request volume was the real cause
// of the app eventually hanging and needing a force-close.
export default function CalorieWarningBanner({ theme, t, consumed = 0, totalCalories }) {
  const dailyGoal = totalCalories || 2000;
  const percentage = Math.round((consumed / dailyGoal) * 100);
  const remaining = Math.round(dailyGoal - consumed);

  let warningState = null;
  if (consumed > dailyGoal) {
    warningState = 'over';
  } else if (percentage >= 90) {
    warningState = 'warning';
  }

  // Don't show banner if under 90%
  if (!warningState) {
    return null;
  }

  return (
    <View style={[
      styles.banner,
      { backgroundColor: warningState === 'over' 
        ? 'rgba(255, 59, 48, 0.1)' 
        : 'rgba(255, 149, 0, 0.1)' 
      },
      { borderColor: warningState === 'over' ? '#FF3B30' : '#FF9500' }
    ]}>
      <Text style={styles.emoji}>
        {warningState === 'over' ? '🚨' : '⚠️'}
      </Text>
      <View style={styles.textContainer}>
        <Text style={[styles.title, { color: theme.text }]}>
          {warningState === 'over' 
            ? t('Over Daily Goal!') 
            : t('Approaching Goal')
          }
        </Text>
        <Text style={[styles.subtitle, { color: theme.secondaryText }]}>
          {warningState === 'over'
            ? `${Math.abs(remaining)} ${t('cal over')}`
            : `${percentage}% ${t('of daily goal')} • ${remaining} ${t('cal remaining')}`
          }
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  emoji: {
    fontSize: 28,
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 13,
  },
});