import React, { useState } from 'react';
import * as Crypto from 'expo-crypto';
import { StyleSheet, Text, View, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LanguageSwitcher from '../../components/LanguageSwitcher';
import { useLanguage } from '../../utils/LanguageContext';
import { useUserMode } from '../../utils/UserModeContext';
import { supabase } from '../../utils/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function LandingScreen({ navigation }) {
  const { t } = useLanguage();
  const { setUserMode } = useUserMode();
  const [guestLoading, setGuestLoading] = useState(false);

  if (guestLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.content}>
          <ActivityIndicator size="large" color="#4CAF50" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.content}>

        {/* Language Switcher - Top Right */}
        <View style={styles.languageSwitcherContainer}>
          <LanguageSwitcher />
        </View>

        {/* Logo */}
        <View style={styles.logoContainer}>
          <Image source={require('../../assets/LogoB.png')} style={styles.logo} />
        </View>

        {/* Tagline */}
        <Text style={styles.tagline}>{t('landing.tagline1')}</Text>
        <Text style={styles.tagline}>{t('landing.tagline2')}</Text>

        {/* Buttons */}
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => navigation.navigate('Login')}
        >
          <Text style={styles.primaryButtonText}>{t('landing.login')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => navigation.navigate('SignUp')}
        >
          <Text style={styles.secondaryButtonText}>{t('landing.signup')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={async () => {
            try {
              setGuestLoading(true);
              const { data, error } = await supabase.auth.signInAnonymously();

              if (error) {
                console.error('Anonymous sign-in error:', error);
                return;
              }

              console.log('✅ Anonymous user created:', data?.user?.id);

              // 🔐 CHECK IF RECOVERY CODE EXISTS
              const { data: existingCode } = await supabase
                .from('recovery_codes')
                .select('id')
                .eq('user_id', data.user.id)
                .maybeSingle();

              if (!existingCode) {

                const rawCode = Crypto.randomUUID()
                  .replace(/-/g,'')
                  .slice(0,12)
                  .toUpperCase();

                const codeHash = await Crypto.digestStringAsync(
                  Crypto.CryptoDigestAlgorithm.SHA256,
                  rawCode
                );

                await supabase
                  .from('recovery_codes')
                  .insert({
                    user_id: data.user.id,
                    code_hash: codeHash
                  });

                // TEMP DEBUG — REMOVE LATER
                console.log('🔑 RECOVERY CODE:', rawCode);
              }

              // Set guest mode — go straight to Home, skip onboarding
              await setUserMode('guest');

              navigation.replace('Home');
            } catch (e) {
              console.error('Anonymous sign-in failed:', e);
              setGuestLoading(false);
            }
          }}
        >
          <Text style={styles.secondaryButtonText}>
            {t('landing.continue')}
          </Text>
        </TouchableOpacity>

        {/* Google Sign-In (we'll implement this later) */}
        {/* 
        <TouchableOpacity
          style={styles.googleButton}
          onPress={() => {
            // TODO: Implement Google Sign-In
            console.log('Google Sign-In pressed');
          }}
        >
          <Text style={styles.googleButtonText}>{t('landing.continueWithGoogle')}</Text>
        </TouchableOpacity>
        */}

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EAE0C8',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  logoContainer: {
    marginBottom: 40,
  },
  logoText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  logo: {
    width: 200,
    height: 100,
    resizeMode: 'contain',
  },
  tagline: {
    fontSize: 20,
    color: '#333',
    textAlign: 'center',
    marginBottom: 5,
  },
  primaryButton: {
    width: '100%',
    backgroundColor: '#4CAF50',
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 40,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    width: '100%',
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#4CAF50',
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 15,
  },
  secondaryButtonText: {
    color: '#4CAF50',
    fontSize: 16,
    fontWeight: '600',
  },
  googleButton: {
    width: '100%',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
  },
  googleButtonText: {
    color: '#333',
    fontSize: 16,
  },
    languageSwitcherContainer: {
      position: 'absolute',
      top: 10,
      right: 10,
      zIndex: 10,
    },
});