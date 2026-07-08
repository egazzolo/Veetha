import React, { useState, useEffect } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../utils/supabase';
import { useNavigation } from '@react-navigation/native';
import { PAYWALL_ENABLED } from '../utils/paywallConfig';

const WARNING_DAYS = [30, 15, 7, 3, 1];

export default function GracePeriodAlert() {
  const [visible, setVisible] = useState(false);
  const [daysLeft, setDaysLeft] = useState(null);
  const navigation = useNavigation();

  useEffect(() => {
    if (!PAYWALL_ENABLED) return;
    checkGracePeriod();
  }, []);

  const checkGracePeriod = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('grace_period_ends_at, is_premium, subscription_expires_at')
        .eq('id', user.id)
        .single();

      if (!profile?.grace_period_ends_at) return;
      if (profile.is_premium || profile.subscription_expires_at) return;

      const now = new Date();
      const end = new Date(profile.grace_period_ends_at);
      const msLeft = end - now;
      if (msLeft <= 0) return;

      const daysRemaining = Math.ceil(msLeft / (1000 * 60 * 60 * 24));

      // Find which warning day we're on or just passed
      const warningDay = WARNING_DAYS.find(d => daysRemaining <= d);
      if (!warningDay) return;

      // Check if already shown today for this warning day
      const key = `grace_warning_${warningDay}_shown`;
      const today = new Date().toISOString().split('T')[0];
      const lastShown = await AsyncStorage.getItem(key);
      if (lastShown === today) return;

      await AsyncStorage.setItem(key, today);
      setDaysLeft(daysRemaining);
      setVisible(true);
    } catch (e) {
      console.log('GracePeriodAlert error:', e);
    }
  };

  const handleCompare = () => {
    setVisible(false);
    navigation.navigate('Paywall');
  };

  if (!visible || daysLeft === null) return null;

  return (
    <Modal transparent animationType="fade" visible={visible}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.emoji}>🌟</Text>
          <Text style={styles.title}>Your free access ends in {daysLeft} {daysLeft === 1 ? 'day' : 'days'}</Text>
          <Text style={styles.body}>
            You have {daysLeft} {daysLeft === 1 ? 'day' : 'days'} of full Veetha access remaining. After that, features will split into free and premium tiers. Make the most of it — and consider upgrading to keep everything you love.
          </Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={handleCompare}>
            <Text style={styles.primaryBtnText}>Compare Free vs Premium</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryBtn} onPress={() => setVisible(false)}>
            <Text style={styles.secondaryBtnText}>Got it</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    width: '100%',
    maxWidth: 360,
  },
  emoji: {
    fontSize: 40,
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1B1B1B',
    textAlign: 'center',
    marginBottom: 12,
  },
  body: {
    fontSize: 14,
    color: '#555',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  primaryBtn: {
    backgroundColor: '#1F9B39',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    width: '100%',
    alignItems: 'center',
    marginBottom: 10,
  },
  primaryBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  secondaryBtn: {
    paddingVertical: 10,
  },
  secondaryBtnText: {
    color: '#888',
    fontSize: 14,
  },
});