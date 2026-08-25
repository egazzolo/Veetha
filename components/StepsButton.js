import React, { useEffect, useRef, useState } from 'react';
import { Text, StyleSheet, TouchableOpacity, Alert, AppState } from 'react-native';
import { Pedometer } from 'expo-sensors';
import AppIcon from './AppIcon';
import { supabase } from '../utils/supabase';
import { useUser } from '../utils/UserContext';

// LOCAL calendar date (matches how the rest of the app dates things --
// HomeScreen's own steps lookup, the report's date-range queries, etc.).
// toISOString() gives the UTC date instead, which in any timezone behind
// UTC can already read as "tomorrow" in the evening -- steps saved under
// that shifted date fell outside a report query scoped to local "today",
// which is why the report kept showing 0 despite Home showing real steps.
const todayString = () => new Date().toLocaleDateString('en-CA');

// Flat third tile alongside ExerciseButton/WaterPitcher in Home's activity
// row -- same sizing/weight as those, no card background or shadow.
// Reuses the pedometer + steps_logs sync logic from the old boxed
// StepsCard.js (kept, just restyled to match the de-carded Home look).
export default function StepsButton({ theme }) {
  const { user } = useUser();
  const [steps, setSteps] = useState(0);
  const [isAvailable, setIsAvailable] = useState(true);
  const [isTracking, setIsTracking] = useState(true);
  const subscriptionRef = useRef(null);
  // Steps already logged today before this watch session started -- the
  // fixed offset watchStepCount's cumulative counts get added to.
  const baselineStepsRef = useRef(0);
  // Mirrors `steps` for the unmount cleanup below, which needs the latest
  // count but runs inside a closure from the mount-time effect (empty dep
  // array), so reading `steps` directly there would always see 0.
  const stepsRef = useRef(0);
  // The date the current baseline/session belongs to -- checked whenever
  // the app returns to the foreground so a day boundary crossed while the
  // app was left open (not force-quit/reopened) still re-baselines to 0
  // instead of silently carrying yesterday's count into today.
  const trackedDateRef = useRef(todayString());

  useEffect(() => {
    (async () => {
      await loadStepsFromDB();
      await checkAndStartPedometer();
    })();

    return () => {
      subscriptionRef.current?.remove();
      // Flush the latest count on unmount (e.g. navigating away to Stats
      // to generate a report) -- the %10 throttle below otherwise means a
      // count like 2 or 7 never makes it to the DB at all before you leave.
      saveStepsToDatabase(stepsRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    stepsRef.current = steps;
  }, [steps]);

  // Steps don't reset when the calendar day changes while the app stays
  // open -- loadStepsFromDB only ever ran once on mount, so the pedometer
  // just kept counting on top of the old baseline forever. Catch the
  // rollover whenever the app comes back to the foreground instead.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState !== 'active') return;
      const today = todayString();
      if (today === trackedDateRef.current) return;

      trackedDateRef.current = today;
      subscriptionRef.current?.remove();
      subscriptionRef.current = null;
      baselineStepsRef.current = 0;
      setSteps(0);
      loadStepsFromDB();
      if (isTracking) startStepCounter();
    });
    return () => subscription.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTracking]);

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

  // Tapping the icon pauses/resumes counting. watchStepCount's `result.steps`
  // is cumulative from whenever the *current* watch session started (see
  // note above), so resuming needs to re-baseline off the steps already
  // shown -- otherwise the next callback would jump the total back down to
  // wherever the new session's own count picks up from.
  const toggleTracking = () => {
    if (!isAvailable) return;
    if (isTracking) {
      subscriptionRef.current?.remove();
      subscriptionRef.current = null;
      saveStepsToDatabase(steps);
    } else {
      baselineStepsRef.current = steps;
      startStepCounter();
    }
    setIsTracking(!isTracking);
  };

  // Long-press to manually zero out today's count -- e.g. the pedometer
  // picked up steps that weren't the user's (car ride, phone handed off).
  const confirmResetSteps = () => {
    if (!isAvailable) return;
    Alert.alert(
      'Reset Steps',
      "Reset today's step count to 0?",
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            baselineStepsRef.current = 0;
            setSteps(0);
            saveStepsToDatabase(0);
          },
        },
      ]
    );
  };

  const loadStepsFromDB = async () => {
    if (!user?.id) return;
    try {
      const today = todayString();
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
      const today = todayString();
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

  const activeColor = isTracking ? theme.primary : theme.textTertiary;

  return (
    <TouchableOpacity
      style={styles.button}
      onPress={toggleTracking}
      onLongPress={confirmResetSteps}
      activeOpacity={0.7}
    >
      <AppIcon name="walking" size={104} tintColor={activeColor} style={{ marginBottom: 8 }} />
      <Text style={[styles.stepsCount, { color: isTracking ? theme.text : theme.textTertiary }]}>
        {isAvailable ? steps.toLocaleString() : '--'}
      </Text>
      <Text style={[styles.label, { color: theme.textSecondary }]}>
        {isAvailable ? 'Steps' : 'Not available'}
      </Text>
    </TouchableOpacity>
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
