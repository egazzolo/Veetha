import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Pedometer } from 'expo-sensors';
import AppIcon from './AppIcon';
import { supabase } from '../utils/supabase';
import { useUser } from '../utils/UserContext';

// Flat third tile alongside ExerciseButton/WaterPitcher in Home's activity
// row -- same sizing/weight as those, no card background or shadow.
// Reuses the pedometer + steps_logs sync logic from the old boxed
// StepsCard.js (kept, just restyled to match the de-carded Home look).
export default function StepsButton({ theme }) {
  const { user } = useUser();
  const [steps, setSteps] = useState(0);
  const [isAvailable, setIsAvailable] = useState(true);
  const subscriptionRef = useRef(null);

  useEffect(() => {
    checkAndStartPedometer();
    loadStepsFromDB();

    return () => {
      subscriptionRef.current?.remove();
    };
  }, []);

  const checkAndStartPedometer = async () => {
    try {
      const available = await Pedometer.isAvailableAsync();
      setIsAvailable(available);
      if (!available) return;

      // isAvailableAsync() only checks hardware capability -- it doesn't
      // request the actual motion/activity-recognition permission, so
      // without this call watchStepCount() below silently never fires and
      // no system permission dialog ever appears to the user.
      const { status } = await Pedometer.requestPermissionsAsync();
      if (status !== 'granted') {
        setIsAvailable(false);
        return;
      }

      startStepCounter();
    } catch (err) {
      console.error('Pedometer error:', err);
      setIsAvailable(false);
    }
  };

  const startStepCounter = () => {
    subscriptionRef.current = Pedometer.watchStepCount((result) => {
      setSteps((prev) => {
        const next = prev + result.steps;
        if (next % 10 === 0) saveStepsToDatabase(next);
        return next;
      });
    });
  };

  const loadStepsFromDB = async () => {
    if (!user?.id) return;
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data } = await supabase
        .from('steps_logs')
        .select('steps')
        .eq('user_id', user.id)
        .eq('date', today)
        .single();

      if (data) setSteps(data.steps || 0);
    } catch (err) {
      // No steps logged yet today -- fine, stays at 0.
    }
  };

  const saveStepsToDatabase = async (stepCount) => {
    if (!user?.id) return;
    try {
      const today = new Date().toISOString().split('T')[0];
      const calories = Math.round(stepCount * 0.04);

      await supabase
        .from('steps_logs')
        .upsert({
          user_id: user.id,
          date: today,
          steps: stepCount,
          calories_burned: calories,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id,date' });
    } catch (err) {
      console.error('Steps save error:', err);
    }
  };

  return (
    <View style={styles.button}>
      <AppIcon name="walking" size={104} tintColor={theme.primary} style={{ marginBottom: 8 }} />
      <Text style={[styles.stepsCount, { color: theme.text }]}>
        {isAvailable ? steps.toLocaleString() : '--'}
      </Text>
      <Text style={[styles.label, { color: theme.textSecondary }]}>
        {isAvailable ? 'Steps' : 'Not available'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepsCount: {
    fontSize: 16,
    fontWeight: '700',
  },
  label: {
    fontSize: 12,
    marginTop: 2,
  },
});
