import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../utils/supabase';
import { useLanguage } from '../../utils/LanguageContext';

export default function ForgotPasswordScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const { t } = useLanguage();

  const handleReset = async () => {
    setError('');
    if (!email || !email.includes('@')) {
      setError(t('login.validEmail'));
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo: 'veetha://auth/reset-password',
      });
      if (error) throw error;
      setSent(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.content}>

        <View style={styles.logoContainer}>
          <Image source={require('../../assets/LogoB.png')} style={styles.logo} />
        </View>

        <Text style={styles.title}>Reset Password</Text>

        {sent ? (
          <View style={styles.successContainer}>
            <Text style={styles.successText}>✅ Check your email for a password reset link.</Text>
            <TouchableOpacity style={styles.backButton} onPress={() => navigation.navigate('Login')}>
              <Text style={styles.backButtonText}>Back to Login</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <Text style={styles.subtitle}>Enter your email and we'll send you a reset link.</Text>

            {error ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <View style={styles.inputContainer}>
              <Text style={styles.label}>{t('login.email')}</Text>
              <TextInput
                style={styles.input}
                placeholder={t('login.emailPlaceholder')}
                placeholderTextColor="#999"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoFocus
              />
            </View>

            <TouchableOpacity
              style={[styles.resetButton, loading && { opacity: 0.6 }]}
              onPress={handleReset}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.resetButtonText}>Send Reset Link</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={{ marginTop: 20, alignItems: 'center' }} onPress={() => navigation.goBack()}>
              <Text style={{ color: '#4CAF50', fontWeight: '600' }}>← Back to Login</Text>
            </TouchableOpacity>
          </>
        )}
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
    paddingHorizontal: 30,
    paddingTop: 40,
  },
  logoContainer: {
    marginBottom: 30,
    alignItems: 'center',
  },
  logo: {
    width: 200,
    height: 100,
    resizeMode: 'contain',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  errorText: {
    color: '#c62828',
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    color: '#121111',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    color: '#333',
    backgroundColor: '#fff',
  },
  resetButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  resetButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  successContainer: {
    alignItems: 'center',
    marginTop: 40,
  },
  successText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    marginBottom: 30,
  },
  backButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 10,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});