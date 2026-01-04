import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet, Alert } from 'react-native';
import Purchases from 'react-native-purchases';
import { supabase } from '../utils/supabase';

export default function SubscriptionScreen({ navigation }) {
  const [promoCode, setPromoCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubscribe = async (isMonthly = true) => {
    setLoading(true);
    
    try {
      // 1. Get available packages from RevenueCat
      const offerings = await Purchases.getOfferings();
      const package = isMonthly 
        ? offerings.current.monthly 
        : offerings.current.annual;
      
      // 2. Purchase the package
      const { customerInfo } = await Purchases.purchasePackage(package);
      
      // 3. If promo code was used, track the conversion
      if (promoCode.trim()) {
        await trackPromoCodeConversion(
          promoCode.trim().toUpperCase(),
          isMonthly ? 3.99 : 39.99
        );
      }
      
      // 4. Update user profile to premium
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from('profiles').update({
        subscription_status: 'premium',
        subscription_type: isMonthly ? 'monthly' : 'annual'
      }).eq('id', user.id);
      
      Alert.alert('Success!', 'Welcome to Veetha Premium! 🎉');
      navigation.goBack();
      
    } catch (error) {
      if (error.userCancelled) {
        console.log('User cancelled purchase');
      } else {
        Alert.alert('Error', 'Could not complete purchase. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const trackPromoCodeConversion = async (code, value) => {
    try {
      // Find the campaign for this promo code
      const { data: campaign } = await supabase
        .from('influencer_campaigns')
        .select('id')
        .eq('promo_code', code)
        .single();
      
      if (campaign) {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        
        // Log the conversion
        await supabase.from('influencer_conversions').insert({
          user_id: user.id,
          campaign_id: campaign.id,
          promo_code: code,
          subscription_value: value
        });
        
        console.log(`✅ Tracked conversion for promo code: ${code}`);
      } else {
        console.log(`⚠️ Invalid promo code: ${code}`);
      }
    } catch (error) {
      console.error('Error tracking promo code:', error);
      // Don't block purchase if tracking fails
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Upgrade to Premium</Text>
      
      {/* Promo Code Input */}
      <View style={styles.promoContainer}>
        <Text style={styles.label}>Have a promo code?</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter code (e.g., MARIA10)"
          value={promoCode}
          onChangeText={setPromoCode}
          autoCapitalize="characters"
        />
      </View>
      
      {/* Monthly Option */}
      <TouchableOpacity 
        style={styles.optionCard}
        onPress={() => handleSubscribe(true)}
        disabled={loading}
      >
        <Text style={styles.optionTitle}>Monthly</Text>
        <Text style={styles.optionPrice}>$3.99/month</Text>
        <Text style={styles.optionDetail}>Cancel anytime</Text>
      </TouchableOpacity>
      
      {/* Annual Option */}
      <TouchableOpacity 
        style={styles.optionCard}
        onPress={() => handleSubscribe(false)}
        disabled={loading}
      >
        <Text style={styles.optionTitle}>Annual</Text>
        <Text style={styles.optionPrice}>$39.99/year</Text>
        <Text style={styles.optionDetail}>Save 17% • Best Value!</Text>
      </TouchableOpacity>
      
      <Text style={styles.disclaimer}>
        Premium features: Unlimited AI photo scans, advanced analytics, meal recommendations
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 30,
    textAlign: 'center',
  },
  promoContainer: {
    marginBottom: 30,
  },
  label: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
  },
  optionCard: {
    backgroundColor: '#f5f5f5',
    padding: 20,
    borderRadius: 15,
    marginBottom: 15,
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  optionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  optionPrice: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 5,
  },
  optionDetail: {
    fontSize: 14,
    color: '#666',
  },
  disclaimer: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginTop: 20,
  },
});