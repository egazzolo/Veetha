import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LanguageSwitcher from '../../components/LanguageSwitcher';
import { useLanguage } from '../../utils/LanguageContext';

export default function LandingScreen({ navigation }) {
  const { t } = useLanguage();

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.content}>

        {/* Language Switcher - Top Right */}
        <View style={styles.languageSwitcherContainer}>
          <LanguageSwitcher />
        </View>

        {/* Logo placeholder - replace with your actual logo */}
        <View style={styles.logoContainer}>
          <Text style={styles.logoText}>Veetha</Text>
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
    backgroundColor: '#fff',
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