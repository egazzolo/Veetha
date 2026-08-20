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
  // Steps already logged today before this watch session started -- the
  // fixed offset watchStepCount's cumulative counts get added to.
  const baselineStepsRef = useRef(0);

  useEffect(() => {
    (async () => {
      await loadStepsFromDB();
      await checkAndStartPedometer();
    })();

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
      // result.steps is CUMULATIVE since this watch session started (that's
      // how CMPedometer.startUpdates reports on every callback, confirmed in
      // expo-sensors' own native module) -- not a delta since the last
      // callback. Adding it to the running `steps` state on every firing
      // compounded it every time (36 real steps was showing as 238); it
      // only ever needs to be added once, to the fixed pre-watch baseline.
      const next = baselineStepsRef.current + result.steps;
      setSteps(next);
      if (next % 10 === 0) saveStepsToDatabase(next);
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

      const baseline = data?.steps || 0;
      baselineStepsRef.current = baseline;
      setSteps(baseline);
    } catch (err) {
      // No steps logged yet today -- fine, baseline stays 0.
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
