import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase, createSessionFromUrl } from '../../utils/supabase';
import { Svg, Path } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import * as AppleAuthentication from 'expo-apple-authentication';
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

      const { data: { session: anonSession } } = await supabase.auth.getSession();
      if (anonSession?.user?.is_anonymous) {
        console.log('🗑️ Anon user detected, deleting:', anonSession.user.id);
        await AsyncStorage.removeItem('veetha_user_mode');
        try {
          await supabase.functions.invoke('delete-user', {
            headers: { Authorization: `Bearer ${anonSession.access_token}` }
          });
          console.log('🗑️ Delete anon result:', JSON.stringify(result));
        } catch (e) {
          console.warn('⚠️ Could not delete anon user:', e);
        }
        await supabase.auth.signOut();
      } else {
        console.log('ℹ️ No anon session found, user is_anonymous:', anonSession?.user?.is_anonymous);
      }

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

  const handleAppleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      const { data, error: signInError } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: credential.identityToken,
      });

      if (signInError) throw signInError;

      await setUserMode('authenticated');
      await handlePostLogin(data.user);
    } catch (err) {
      if (err.code !== 'ERR_REQUEST_CANCELED') {
        console.error('Apple login error:', err);
        setError(err.message || t('login.loginFailed'));
      }
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
            <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')}>
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
                <Image source={require('../../assets/google-icon.png')} style={{ width: 20, height: 20, resizeMode: 'contain' }} />
                <Text style={styles.googleButtonText}>{t('login.continueWithGoogle')}</Text>
              </View>
            </TouchableOpacity>

            {/* Apple Button - iOS only */}
            {Platform.OS === 'ios' && (
              <AppleAuthentication.AppleAuthenticationButton
                buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
                buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
                cornerRadius={4}
                style={{ width: '100%', height: 44, marginBottom: 12 }}
                onPress={handleAppleLogin}
              />
            )}

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
