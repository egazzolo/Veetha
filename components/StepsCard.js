import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Pedometer } from 'expo-sensors';
import { useTheme } from '../utils/ThemeContext';
import { supabase } from '../utils/supabase';
import { useUser } from '../utils/UserContext';

export default function StepsCard() {
  const { theme } = useTheme();
  const { user } = useUser();
  const [steps, setSteps] = useState(0);
  const [status, setStatus] = useState('Checking...');
  const [isAvailable, setIsAvailable] = useState(false);

  useEffect(() => {
    checkAndStartPedometer();
    loadStepsFromDB();

    return () => {
      // Cleanup listener on unmount
      if (subscription) {
        subscription.remove();
      }
    };
  }, []);

  let subscription = null;

  const checkAndStartPedometer = async () => {
    try {
      console.log('🏃 Checking pedometer...');
      const available = await Pedometer.isAvailableAsync();
      console.log('🏃 Pedometer available:', available);
      
      setIsAvailable(available);
      
      if (available) {
        setStatus('Tracking steps...');
        startStepCounter();
      } else {
        setStatus('Not supported');
      }
    } catch (error) {
      console.error('❌ Pedometer error:', error);
      setStatus('Error checking sensor');
    }
  };

  const startStepCounter = () => {
    // Subscribe to step updates (Android compatible)
    subscription = Pedometer.watchStepCount(result => {
      console.log('📊 Step update:', result.steps);
      setSteps(prevSteps => prevSteps + result.steps);
      setStatus('Active');
      
      // Save to DB every 10 steps
      if (result.steps % 10 === 0) {
        saveStepsToDatabase(steps + result.steps);
      }
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
      
      if (data) {
        setSteps(data.steps || 0);
        console.log('📊 Loaded steps from DB:', data.steps);
      }
    } catch (error) {
      console.log('No previous steps data');
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
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,date'
        });

      console.log('✅ Steps saved:', stepCount);
    } catch (error) {
      console.error('❌ Save error:', error);
    }
  };

  const manualSync = () => {
    saveStepsToDatabase(steps);
    setStatus('Synced!');
    setTimeout(() => setStatus('Active'), 2000);
  };

  return (
    <View style={[styles.card, { backgroundColor: theme.cardBackground }]}>
      <View style={styles.header}>
        <Text style={[styles.emoji, { color: theme.text }]}>👟</Text>
        <Text style={[styles.title, { color: theme.text }]}>Steps Today</Text>
      </View>
      
      <Text style={[styles.stepsCount, { color: theme.primary }]}>
        {steps.toLocaleString()}
      </Text>
      
      <Text style={[styles.calories, { color: theme.textSecondary }]}>
        {Math.round(steps * 0.04)} cal burned
      </Text>

      <Text style={[styles.status, { color: theme.textSecondary }]}>
        {status}
      </Text>

      {isAvailable && (
        <TouchableOpacity 
          onPress={manualSync}
          style={[styles.refreshButton, { backgroundColor: theme.primary + '20' }]}
        >
          <Text style={[styles.refreshText, { color: theme.primary }]}>
            💾 Sync Now
          </Text>
        </TouchableOpacity>
      )}

      {!isAvailable && (
        <Text style={[styles.errorText, { color: theme.error }]}>
          Pedometer not available on this device
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  emoji: {
    fontSize: 24,
    marginRight: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  stepsCount: {
    fontSize: 36,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  calories: {
    fontSize: 14,
    marginBottom: 8,
  },
  status: {
    fontSize: 12,
    marginBottom: 12,
  },
  refreshButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  refreshText: {
    fontSize: 14,
    fontWeight: '600',
  },
  errorText: {
    fontSize: 12,
    textAlign: 'center',
  },
});