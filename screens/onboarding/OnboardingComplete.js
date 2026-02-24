import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { useUser } from '../../utils/UserContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useOnboarding } from '../../utils/OnboardingContext';
import { supabase } from '../../utils/supabase';
import { useLanguage } from '../../utils/LanguageContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function OnboardingComplete({ navigation }) {
  const { onboardingData, clearOnboardingData } = useOnboarding();
  const { t } = useLanguage(); 
  const [calculatedCalories, setCalculatedCalories] = useState(null);
  const [processing, setProcessing] = useState(false);
  const { refreshProfile } = useUser();

  useEffect(() => {
    console.log('📋 OnboardingComplete - Data received:', onboardingData);
    
    // Calculate calories when component loads
    if (onboardingData.weight && onboardingData.age && onboardingData.gender && onboardingData.activityLevel) {
      try {
        const calories = calculateDailyCalories(onboardingData);
        setCalculatedCalories(calories);
        console.log('📊 Calculated calories:', calories);
      } catch (error) {
        console.error('Error calculating calories:', error);
        setCalculatedCalories(1650); // fallback
      }
    }
  }, [onboardingData]);

  // Helper function to calculate calories
  const calculateDailyCalories = (data) => {
    const weight = data.unit === 'imperial' 
      ? data.weight * 0.453592
      : parseFloat(data.weight);
    
    const height = data.unit === 'imperial'
      ? (parseInt(data.heightFeet) * 30.48) + (parseInt(data.heightInches) * 2.54)
      : parseInt(data.heightCm);
    
    const age = parseInt(data.age);
    const isMale = data.gender === 'male';

    // Calculate BMR using Mifflin-St Jeor Equation
    let bmr = isMale
      ? 10 * weight + 6.25 * height - 5 * age + 5
      : 10 * weight + 6.25 * height - 5 * age - 161;

    // Apply activity multiplier
    const activityMultipliers = {
      'sedentary': 1.2,
      'lightly_active': 1.375,
      'moderately_active': 1.55,
      'very_active': 1.725,
      'extremely_active': 1.9,
    };
    const multiplier = activityMultipliers[data.activityLevel] || 1.2;
    const tdee = Math.round(bmr * multiplier);

    // Adjust based on goal
    let dailyCalorieGoal;
    if (data.goal === 'lose') dailyCalorieGoal = tdee - 500;
    else if (data.goal === 'gain') dailyCalorieGoal = tdee + 300;
    else dailyCalorieGoal = tdee;

    return dailyCalorieGoal;
  };

  const handleStartTracking = async () => {
    if (processing) return;
    
    try {
      setProcessing(true);
      console.log('🚀 User clicked START TRACKING...');

      // Get saved credentials
      const savedEmail = await AsyncStorage.getItem('pendingUserEmail');
      const savedPassword = await AsyncStorage.getItem('pendingUserPassword');

      const { data: { user } } = await supabase.auth.getUser();

      if (!savedEmail || !savedPassword) {
        // If anonymous user already has a valid session, continue
        if (user) {
          console.log('✅ Anonymous user detected — continuing without email login');
        } else {
          console.log('❌ No saved credentials and no active session');
          Alert.alert(
            t('onboarding.error'),
            'Session expired. Please log in again.',
            [{ text: 'OK', onPress: () => navigation.navigate('Login') }]
          );
          return;
        }
      }

      // Try to sign in - this will only work if email is verified
      let authUser = null;

      // If we have email credentials, use password login
      if (savedEmail && savedPassword) {
        const response = await supabase.auth.signInWithPassword({
          email: savedEmail,
          password: savedPassword,
        });

        if (response.error) {
          console.error('❌ Email login failed:', response.error);
          Alert.alert('Error', response.error.message);
          return;
        }

        authUser = response.data?.user;
      } else {
        // Anonymous user already signed in
        const { data: { user } } = await supabase.auth.getUser();
        authUser = user;
      }

      if (!authUser) {
        console.error('❌ No authenticated user found');
        Alert.alert('Error', 'Authentication failed.');
        return;
      }

      // Success! Email was verified
      if (authUser) {
        console.log('✅ Email verified! User signed in:', authUser.email);
        
        // Check if profile was auto-created by trigger
        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', authUser.id)
          .maybeSingle();
        
        if (existingProfile) {
          console.log('📝 Profile already exists (auto-created by trigger), updating with onboarding data...');
          
          // Calculate daily calorie goal
          const dailyCalorieGoal = calculateDailyCalories(onboardingData);
          
          // Update the existing profile with onboarding data
          const profileData = {
            full_name: authUser.email ? authUser.email.split('@')[0] : null,
            gender: onboardingData.gender,
            age: parseInt(onboardingData.age),
            height_ft: onboardingData.unit === 'imperial' ? parseInt(onboardingData.heightFeet) : null,
            height_in: onboardingData.unit === 'imperial' ? parseInt(onboardingData.heightInches) : null,
            height_cm: onboardingData.unit === 'metric' ? parseInt(onboardingData.heightCm) : null,
            weight_lbs: onboardingData.unit === 'imperial' ? parseFloat(onboardingData.weight) : null,
            weight_kg: onboardingData.unit === 'metric' ? parseFloat(onboardingData.weight) : null,
            unit_preference: onboardingData.unit,
            goal: onboardingData.goal,
            target_weight_lbs: onboardingData.unit === 'imperial' && onboardingData.targetWeight 
              ? parseFloat(onboardingData.targetWeight) 
              : null,
            target_weight_kg: onboardingData.unit === 'metric' && onboardingData.targetWeight 
              ? parseFloat(onboardingData.targetWeight) 
              : null,
            activity_level: onboardingData.activityLevel,
            dietary_restrictions: onboardingData.dietaryRestrictions || [],
            daily_calorie_goal: dailyCalorieGoal,
            referral_source: onboardingData.referralSource || null,
          };
          
          const { error: updateError } = await supabase
            .from('profiles')
            .update(profileData)
            .eq('id', authUser.id);
          
          if (updateError) throw updateError;
          
          console.log('✅ Profile updated with onboarding data');
        } else {
          console.log('📝 No profile exists, creating new one...');
          await saveProfileAndNavigate(authUser);
          return;
        }
        
        // Clear temporary credentials
        await AsyncStorage.removeItem('pendingUserEmail');
        await AsyncStorage.removeItem('pendingUserPassword');
        await AsyncStorage.removeItem('greeting_shown');
        await AsyncStorage.removeItem('last_app_open');
        
        // Refresh UserContext
        await refreshProfile();
        
        // Clear onboarding data
        clearOnboardingData();
        
        // Navigate to Home
        console.log('🏠 Navigating to Home...');

        // ✅ START tutorial freeze immediately
        await AsyncStorage.setItem('tutorial_loading', 'true');

        navigation.reset({
          index: 0,
          routes: [{ name: 'Home' }],
        });
      }

    } catch (error) {
      console.error('❌ Error in handleStartTracking:', error);
      Alert.alert('Error', error.message || 'Something went wrong');
    } finally {
      setProcessing(false);
    }
  };

  // Recheck verification after user confirms they clicked the link
  const recheckVerification = async (email, password) => {
    try {
      console.log('🔄 Rechecking verification status...');

      const response = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });

      if (response.error) {
        if (response.error.message.includes('Email not confirmed')) {
          console.log('❌ Still not verified');
          Alert.alert(
            'Not Verified Yet',
            'Your email is still not verified. Please check your inbox and click the verification link, then try again.',
            [{ text: 'OK' }]
          );
        } else {
          Alert.alert('Error', response.error.message);
        }
        return;
      }

      // Success! They verified it
      if (response.data.session && response.data.user) {
        console.log('✅ Email verified! Proceeding...');
        await saveProfileAndNavigate(authUser);
      }

    } catch (error) {
      console.error('❌ Error rechecking verification:', error);
      Alert.alert('Error', 'Something went wrong. Please try logging in manually.');
      navigation.navigate('Login');
    }
  };

  // Save profile to Supabase and navigate to Home
  const saveProfileAndNavigate = async (user) => {
    try {
      console.log('💾 Saving profile for user:', user.email);

      // Clear temporary credentials
      await AsyncStorage.removeItem('pendingUserEmail');
      await AsyncStorage.removeItem('pendingUserPassword');

      // Clear greeting cache for new user
      await AsyncStorage.removeItem('greeting_shown');
      await AsyncStorage.removeItem('last_app_open');

      // Calculate daily calorie goal
      const dailyCalorieGoal = calculateDailyCalories(onboardingData);
      console.log('📊 Daily Calorie Goal:', dailyCalorieGoal);

      // Build profile data object
      const profileData = {
        id: user.id,
        email: user.email,
        full_name: user.email.split('@')[0], // Default display name
        gender: onboardingData.gender,
        age: parseInt(onboardingData.age),
        height_ft: onboardingData.unit === 'imperial' ? parseInt(onboardingData.heightFeet) : null,
        height_in: onboardingData.unit === 'imperial' ? parseInt(onboardingData.heightInches) : null,
        height_cm: onboardingData.unit === 'metric' ? parseInt(onboardingData.heightCm) : null,
        weight_lbs: onboardingData.unit === 'imperial' ? parseFloat(onboardingData.weight) : null,
        weight_kg: onboardingData.unit === 'metric' ? parseFloat(onboardingData.weight) : null,
        unit_preference: onboardingData.unit,
        goal: onboardingData.goal,
        target_weight_lbs: onboardingData.unit === 'imperial' && onboardingData.targetWeight 
          ? parseFloat(onboardingData.targetWeight) 
          : null,
        target_weight_kg: onboardingData.unit === 'metric' && onboardingData.targetWeight 
          ? parseFloat(onboardingData.targetWeight) 
          : null,
        activity_level: onboardingData.activityLevel,
        dietary_restrictions: onboardingData.dietaryRestrictions || [],
        daily_calorie_goal: dailyCalorieGoal,
        referral_source: onboardingData.referralSource || null,
        created_at: new Date().toISOString(),
      };

      console.log('💾 Profile data to save:', profileData);

      // Insert profile into database
      const { error: insertError } = await supabase
        .from('profiles')
        .insert([profileData]);

      if (insertError) {
        // If profile already exists (shouldn't happen, but handle it)
        if (insertError.code === '23505') {
          console.log('📝 Profile exists, updating instead...');
          const { error: updateError } = await supabase
            .from('profiles')
            .update(profileData)
            .eq('id', user.id);
          
          if (updateError) throw updateError;
        } else {
          throw insertError;
        }
      }

      console.log('✅ Profile saved successfully!');

      // Refresh UserContext to load the new profile
      console.log('🔄 Refreshing UserContext...');
      await refreshProfile();
      console.log('✅ UserContext refreshed!');

      // Clear onboarding data from context
      clearOnboardingData();

      // Navigate to Home
      console.log('🏠 Navigating to Home...');
      await AsyncStorage.setItem('tutorial_loading', 'true');
      navigation.reset({
        index: 0,
        routes: [{ name: 'Home' }],
      });

    } catch (error) {
      console.error('❌ Error saving profile:', error);
      Alert.alert(
        'Save Error',
        `Failed to save your profile: ${error.message}. Please try again or contact support.`,
        [
          { text: 'Try Again', onPress: () => saveProfileAndNavigate(user) },
          { text: 'Cancel' }
        ]
      );
    }
  };

  const handleResendConfirmation = async (emailToResend) => {
    try {
      console.log('📧 Resending confirmation email to:', emailToResend);

      const email = emailToResend || await AsyncStorage.getItem('pendingUserEmail');
      
      if (!email) {
        Alert.alert('Error', 'No email found. Please try signing up again.');
        return;
      }

      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
      });

      if (error) throw error;

      console.log('✅ Email resent successfully');
      Alert.alert(
        'Email Sent! 📧',
        `A new confirmation email has been sent to ${email}. Please check your inbox.`,
        [{ text: 'OK' }]
      );

    } catch (error) {
      console.error('Error resending confirmation:', error);
      Alert.alert('Error', error.message || 'Failed to resend email. Please try again.');
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          {/* Progress Indicator */}
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: '100%' }]} />
            </View>
            <Text style={styles.progressText}>{t('onboarding.complete')}</Text>
          </View>

          {/* Success Icon */}
          <View style={styles.iconContainer}>
            <Text style={styles.icon}>🎉</Text>
          </View>

          {/* Title */}
          <Text style={styles.title}>{t('onboarding.allSet')}</Text>

          {/* Calorie Goal Display */}
          <View style={styles.goalCard}>
            <Text style={styles.goalLabel}>{t('onboarding.dailyCalorieGoal')}</Text>
            <Text style={styles.goalValue}>
              {calculatedCalories ? calculatedCalories.toLocaleString() : '...'} kcal
            </Text>
            <Text style={styles.goalDescription}>
              {onboardingData.goal === 'lose' 
                ? t('onboarding.goalLose')
                : onboardingData.goal === 'gain'
                ? t('onboarding.goalGain')
                : t('onboarding.goalMaintain')}
            </Text>
          </View>

          {/* Info Text */}
          <Text style={styles.infoText}>
            {t('onboarding.planReady')}
          </Text>

          {/* Important Note about Email Verification */}
          <View style={styles.noteCard}>
            <Text style={styles.noteIcon}>📧</Text>
            <Text style={styles.noteText}>
              {t('onboarding.checkInboxToVerify')}
            </Text>
          </View>

          {/* Spacer */}
          <View style={{ flex: 1, minHeight: 20 }} />

          {/* Start Button */}
          <TouchableOpacity
            style={[styles.startButton, processing && styles.buttonDisabled]}
            onPress={handleStartTracking}
            disabled={processing}
          >
            <Text style={styles.startButtonText}>
              {processing ? 'Processing...' : t('onboarding.startTracking')}
            </Text>
          </TouchableOpacity>

          {/* Resend Confirmation Link */}
          <TouchableOpacity
            style={styles.resendButton}
            onPress={() => handleResendConfirmation()}
            disabled={processing}
          >
            <Text style={styles.resendText}>{t('onboarding.noConfirmationEmail')}</Text>
          </TouchableOpacity>

          {/* Footer Note */}
          <Text style={styles.footerNote}>
            {t('onboarding.adjustGoals')}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EAE0C8',
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 30,
    paddingTop: 20,
    paddingBottom: 20,
  },
  progressContainer: {
    marginBottom: 40,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#e0e0e0',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
  },
  progressText: {
    fontSize: 14,
    color: '#4CAF50',
    marginTop: 8,
    textAlign: 'center',
    fontWeight: '600',
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  icon: {
    fontSize: 80,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 40,
  },
  goalCard: {
    backgroundColor: '#e8f5e9',
    borderRadius: 16,
    padding: 30,
    alignItems: 'center',
    marginBottom: 30,
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  goalLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  goalValue: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 8,
  },
  goalDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  infoText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 20,
  },
  noteCard: {
    flexDirection: 'row',
    backgroundColor: '#fff3cd',
    borderLeftWidth: 4,
    borderLeftColor: '#ffc107',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  noteIcon: {
    fontSize: 24,
    marginRight: 10,
  },
  noteText: {
    flex: 1,
    fontSize: 14,
    color: '#856404',
    lineHeight: 20,
  },
  startButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 15,
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  startButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  footerNote: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginBottom: 10,
  },
  resendButton: {
    paddingVertical: 10,
    alignItems: 'center',
    marginBottom: 10,
  },
  resendText: {
    fontSize: 14,
    color: '#4CAF50',
    textDecorationLine: 'underline',
  },
});