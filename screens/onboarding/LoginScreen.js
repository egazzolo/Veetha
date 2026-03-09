import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase, createSessionFromUrl } from '../../utils/supabase';
import { Svg, Path } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { useGreeting } from '../../utils/GreetingContext';
import { useLanguage } from '../../utils/LanguageContext';
import { useUserMode } from '../../utils/UserModeContext';

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { triggerGreeting } = useGreeting();
  const { t } = useLanguage();
  const { setUserMode } = useUserMode();

  const handleLogin = async () => {
    // Clear previous errors
    setError('');

    // Basic validation
    if (!email || !password) {
      setError(t('login.enterBoth'));
      return;
    }

    if (!email.includes('@')) {
      setError(t('login.validEmail'));
      return;
    }

    setLoading(true);

    try {
      console.log('🔐 Attempting login...');
      console.log('📧 Email:', email);

      // Sign in with Supabase
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password: password,
      });

      console.log('📊 Login response:', data);
      console.log('❌ Login error:', error);

      if (error) throw error;

      if (data?.user) {
        console.log('Login successful!', data.user);

        // Fetch profile to get display name AND check onboarding status
        const { data: profileData } = await supabase
          .from('profiles')
          .select('display_name, full_name, daily_calorie_goal')
          .eq('id', data.user.id)
          .maybeSingle();

        const userName = profileData?.display_name ||
                profileData?.full_name ||
                data.user.email?.split('@')[0] ||
                'User';

        // Set authenticated mode
        await setUserMode('authenticated');

        // Trigger greeting BEFORE navigation
        await triggerGreeting(userName, t);

        // Clear greeting timestamp so it shows on login
        await AsyncStorage.removeItem('last_app_open');

        // Navigate based on onboarding status
        if (profileData?.daily_calorie_goal) {
          console.log('✅ Onboarding complete - navigating to Home');
          navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
        } else {
          console.log('⚠️ Onboarding incomplete - navigating to OnboardingStep1');
          navigation.reset({ index: 0, routes: [{ name: 'OnboardingStep1' }] });
        }
      }

    } catch (err) {
      console.error('Login error:', err);
      if (err.message.includes('Invalid login credentials')) {
        setError(t('login.invalidCredentials'));
      } else if (err.message.includes('Email not confirmed')) {
        setError(t('login.verifyEmail'));
      } else {
        setError(err.message || t('login.loginFailed'));
      }
    } finally {
      setLoading(false);
    }
  }

  const handlePostLogin = async (user) => {
    // Wait for profile trigger to complete
    await new Promise(resolve => setTimeout(resolve, 1500));

    const { data: profileData } = await supabase
      .from('profiles')
      .select('display_name, full_name, daily_calorie_goal')
      .eq('id', user.id)
      .maybeSingle();

    const userName = profileData?.display_name ||
      profileData?.full_name ||
      user.email?.split('@')[0] ||
      'User';

    await triggerGreeting(userName, t);
    await AsyncStorage.removeItem('last_app_open');

    if (profileData?.daily_calorie_goal) {
      navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
    } else {
      navigation.reset({ index: 0, routes: [{ name: 'OnboardingStep1' }] });
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');

    try {
      const redirectTo = AuthSession.makeRedirectUri({ scheme: 'veetha', path: 'auth/callback' });
      console.log('🔗 Google Login redirect URL:', redirectTo);

      const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          skipBrowserRedirect: true,
        },
      });

      if (oauthError) throw oauthError;
      if (!data?.url) throw new Error('No OAuth URL returned');

      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
      console.log('🌐 Browser result:', result.type);

      if (result.type === 'success' && result.url) {
        const { data: sessionData, error: sessionError } = await createSessionFromUrl(result.url);
        if (sessionError) throw sessionError;

        if (sessionData?.session?.user) {
          await setUserMode('authenticated');
          await handlePostLogin(sessionData.session.user);
          return;
        }
      }

      // Browser was dismissed — check if OAuth completed via deep link handler
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user && !session.user.is_anonymous) {
        console.log('✅ Session found after browser dismiss');
        await setUserMode('authenticated');
        await handlePostLogin(session.user);
        return;
      }
    } catch (err) {
      console.error('Google login error:', err);
      setError(err.message || t('login.loginFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.content}>

            {/* Logo */}
            <View style={styles.logoContainer}>
              <Image source={require('../../assets/LogoB.png')} style={styles.logo} />
            </View>
            <Text style={styles.welcomeText}>{t('login.welcomeBack')}</Text>

            {/* Error Message */}
            {error ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {/* Email Input */}
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
              />
            </View>

            {/* Password Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>{t('login.password')}</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder={t('login.password')}
                  placeholderTextColor="#999"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  textContentType="password"
                  importantForAutofill="yes"
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeButton}
                >
                  <Text style={styles.eyeIcon}>{showPassword ? '👁️' : '👁️‍🗨️'}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Forgot Password */}
            <TouchableOpacity onPress={() => console.log('Forgot password')}>
              <Text style={styles.forgotPassword}>{t('login.forgotPassword')}</Text>
            </TouchableOpacity>

            {/* Sign In Button */}
            <TouchableOpacity
              style={[styles.signInButton, loading && styles.buttonDisabled]}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.signInButtonText}>{t('login.signIn')}</Text>
              )}
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>{t('login.or')}</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Google Button */}
            <TouchableOpacity
              style={styles.googleButton}
              onPress={handleGoogleLogin}
              disabled={loading}
            >
              <View style={styles.socialButtonInner}>
                <Svg width={20} height={20} viewBox="0 0 48 48">
                  <Path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                  <Path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                  <Path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                  <Path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                </Svg>
                <Text style={styles.googleButtonText}>{t('login.continueWithGoogle')}</Text>
              </View>
            </TouchableOpacity>

            {/* Sign Up Link */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>{t('login.noAccount')}</Text>
              <TouchableOpacity onPress={() => navigation.navigate('SignUp')}>
                <Text style={styles.footerLink}>{t('login.signUpLink')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EAE0C8',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
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
  welcomeText: {
    fontSize: 20,
    color: '#333',
    textAlign: 'center',
    marginBottom: 40,
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
    color: '#650',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
  },
  passwordInput: {
    flex: 1,
    padding: 15,
    fontSize: 16,
    color: '#800',
  },
  eyeButton: {
    padding: 15,
  },
  eyeIcon: {
    fontSize: 20,
  },
  forgotPassword: {
    color: '#4CAF50',
    textAlign: 'right',
    marginBottom: 30,
  },
  signInButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  signInButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 30,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#ddd',
  },
  dividerText: {
    marginHorizontal: 10,
    color: '#999',
  },
  googleButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#dadce0',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 4,
    marginBottom: 12,
  },
  googleButtonText: {
    color: '#3c4043',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 12,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
  },
  socialButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 30,
  },
  footerText: {
    color: '#666',
  },
  footerLink: {
    color: '#4CAF50',
    fontWeight: '600',
  },
});
