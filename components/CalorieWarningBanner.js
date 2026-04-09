import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { supabase } from '../utils/supabase';

export default function CalorieWarningBanner({ theme, t }) {
  const [warningState, setWarningState] = useState(null); // null, 'warning', or 'over'
  const [percentage, setPercentage] = useState(0);
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    checkCalorieStatus();
  }, []);

  // Re-check every 30 seconds
  useEffect(() => {
    const interval = setInterval(checkCalorieStatus, 5000);
    return () => clearInterval(interval);
  }, [warningState, percentage]);

  const checkCalorieStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setWarningState(null);
        return;
      }

      // Get daily goal
      const { data: profile } = await supabase
        .from('profiles')
        .select('daily_calorie_goal')
        .eq('id', user.id)
        .single();

      const dailyGoal = profile?.daily_calorie_goal || 2000;

      // Get TODAY's meals
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStr = today.toISOString().split('T')[0];

      const { data: meals } = await supabase
        .from('meals')
        .select('calories')
        .eq('user_id', user.id)
        .gte('logged_at', `${todayStr}T00:00:00`)
        .lte('logged_at', `${todayStr}T23:59:59`);

      const consumed = meals?.reduce((sum, meal) => sum + (meal.calories || 0), 0) || 0;
      const pct = (consumed / dailyGoal) * 100;
      const rem = dailyGoal - consumed;

      setPercentage(Math.round(pct));
      setRemaining(Math.round(rem));

      // Determine warning state (only update if changed)
      let newState = null;
      if (consumed > dailyGoal) {
        newState = 'over';
      } else if (pct >= 90) {
        newState = 'warning';
      }

      // Only update state if it actually changed
      setWarningState(prev => prev !== newState ? newState : prev);
      setPercentage(prev => Math.round(pct) !== prev ? Math.round(pct) : prev);
      setRemaining(prev => Math.round(rem) !== prev ? Math.round(rem) : prev);

    } catch (error) {
      console.error('Error checking calorie status:', error);
      setWarningState(null);
    }
  };

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