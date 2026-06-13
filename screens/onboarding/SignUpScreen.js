import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Alert, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase, createSessionFromUrl } from '../../utils/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getDeviceId, checkSignupAbuse, recordSignup } from '../../utils/trialAndAbuse';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import * as AppleAuthentication from 'expo-apple-authentication';
import { Svg, Path } from 'react-native-svg';
import { useLanguage } from '../../utils/LanguageContext';
import { useUserMode } from '../../utils/UserModeContext';
import { posthog } from '../../utils/posthog';

WebBrowser.maybeCompleteAuthSession();

export default function SignUpScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [emailExists, setEmailExists] = useState(false);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const { t } = useLanguage();
  const { setUserMode } = useUserMode();

  // Real-time email validation
  const checkEmailExists = async (emailToCheck) => {
    if (!emailToCheck || !emailToCheck.includes('@')) {
      setEmailExists(false);
      setError('');
      return;
    }

    setCheckingEmail(true);

    try {
      const trimmedEmail = emailToCheck.trim().toLowerCase();
      console.log('🔍 Checking:', trimmedEmail);

      const { data, error } = await supabase.rpc('check_email_exists', {
        email_to_check: trimmedEmail
      });

      console.log('📊 Result:', data);

      if (data === true) {
        setEmailExists(true);
        setError(t('signup.emailInUse'));
      } else {
        setEmailExists(false);
        setError('');
      }
    } catch (error) {
      console.error('Error checking email:', error);
      setEmailExists(false);
      setError('');
    } finally {
      setCheckingEmail(false);
    }
  };

  // Debounced email checking on text change
  useEffect(() => {
    // Only check if email looks valid
    if (email && email.includes('@')) {
      const timeoutId = setTimeout(() => {
        checkEmailExists(email);
      }, 500); // Wait 500ms after user stops typing

      return () => clearTimeout(timeoutId);
    } else {
      // Clear error if email is cleared or invalid
      setEmailExists(false);
      setError('');
    }
  }, [email]);

  const handleSignUp = async () => {
    // Clear previous errors
    setError('');

    // Validation
    if (!email || !password || !confirmPassword) {
      setError(t('signup.fillAllFields'));
      return;
    }

    if (!email.includes('@')) {
      setError(t('signup.validEmail'));
      return;
    }

    if (password.length < 8) {
      setError(t('signup.passwordLength'));
      return;
    }

    if (password !== confirmPassword) {
      setError(t('signup.passwordsMatch'));
      return;
    }

    if (!agreeToTerms) {
      setError(t('signup.agreeToTerms'));
      return;
    }

    // Check if email exists (final check)
    if (emailExists) {
      Alert.alert(
        t('signup.error'),
        'This email is already registered. Please sign in instead.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Go to Login',
            onPress: () => navigation.navigate('Login')
          }
        ]
      );
      return;
    }

    setLoading(true);

    try {
      // Capture guest session before it's replaced
      const { data: { session: guestSession } } = await supabase.auth.getSession();
      const guestUserId = guestSession?.user?.is_anonymous ? guestSession.user.id : null;
      const guestToken = guestSession?.access_token || null;
      console.log('👤 Guest user to delete after signup:', guestUserId);
      console.log('🚀 Creating account for:', email.trim().toLowerCase());

      // Create the user account
      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password: password,
        options: {
          emailRedirectTo: undefined, // We'll handle verification in-app
        }
      });

      if (!error && data?.user) {
        posthog.identify(data.user.id, { email: data.user.email, signup_date: new Date().toISOString() });
        posthog.capture('signup', { method: 'email' });
      }

      if (error) {
        // Check for rate limit
        if (error.message.toLowerCase().includes('rate limit')) {
          setError(t('signup.rateLimitError'));
          setLoading(false);
          return;
        }
        // Check if email already exists
        if (error.message.includes('already') || error.message.includes('exist')) {
          Alert.alert( t('signup.emailInUse'));
          setLoading(false);
          return;
        }
        throw error;
      }

      if (data?.user) {
        const userCreatedAt = new Date(data.user.created_at);
        const now = new Date();
        const secondsAgo = (now - userCreatedAt) / 1000;

        console.log(`⏰ User created ${secondsAgo.toFixed(1)} seconds ago`);

        // If user was created more than 5 seconds ago, it's an existing user
        if (secondsAgo > 3) {
          console.log('❌ Email already registered (existing auth user)');
          Alert.alert(
            t('signup.error'),
            'This email is already registered. Please sign in instead.',
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Go to Login',
                onPress: () => navigation.navigate('Login')
              }
            ]
          );
          setLoading(false);
          return;
        }

        console.log('✅ New user created successfully!');
        console.log('📧 Confirmation email sent to:', email);

        // Set authenticated mode
        await setUserMode('authenticated');

        // Delete the anonymous guest user
        if (guestUserId && guestToken) {
          try {
            await supabase.functions.invoke('delete-user', {
              headers: { Authorization: `Bearer ${guestToken}` }
            });
            console.log('🗑️ Guest user deleted:', guestUserId);
          } catch (deleteError) {
            // Non-fatal — guest cleanup failed but signup succeeded
            console.warn('⚠️ Could not delete guest user:', deleteError);
          }
        }

        // Abuse check + record signup for trial gating
          try {
            const cleanEmail = email.trim().toLowerCase();
            const deviceId = await getDeviceId();
            const { grantTrial, abuseLevel, blocked } = await checkSignupAbuse(cleanEmail, deviceId);
            await recordSignup(cleanEmail, deviceId, grantTrial, abuseLevel);

            // Set trial_ends_at on profile
            const trialEndsAt = grantTrial 
              ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
              : new Date(0).toISOString();
            await supabase
              .from('profiles')
              .update({ trial_ends_at: trialEndsAt, is_premium: false })
              .eq('id', data.user.id);

            console.log(`🎁 Trial granted: ${grantTrial}, abuse level: ${abuseLevel}, blocked: ${blocked}`);
          } catch (abuseErr) {
            console.error('Abuse check failed (non-fatal):', abuseErr);
            // On error, don't block signup — user gets default free tier
          }

          // Save credentials temporarily for later verification
          await AsyncStorage.setItem('pendingUserEmail', email.trim().toLowerCase());
          await AsyncStorage.setItem('pendingUserPassword', password);

        console.log('💾 Credentials saved for verification step');

        // After successful signup, navigate directly to OnboardingStep1
        Alert.alert(
          t('signup.success'),t('signup.accountCreated'),
          [{
            text: 'Continue',
            onPress: () => navigation.navigate('OnboardingStep1')
          }]
        );
      }

    } catch (err) {
      console.error('❌ Sign up error:', err);

      // Handle email rate limit error
      if (err.message.toLowerCase().includes('rate limit') ||
          err.message.toLowerCase().includes('email rate limit')) {
        setError(t('signup.rateLimitError'));
        return;
      }

      // Handle duplicate email errors
      if (err.message.includes('already registered') ||
          err.message.includes('User already registered') ||
          err.message.includes('email address is already in use') ||
          err.code === 'user_already_exists') {
        Alert.alert(
          t('signup.error'),
          'This email is already registered. Please sign in instead.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Go to Login',
              onPress: () => navigation.navigate('Login')
            }
          ]
        );
        setError('Email already exists');
        setEmailExists(true);
      } else {
        setError(err.message || t('signup.signupFailed'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePostSignUp = async (user) => {
    const { data: profileData } = await supabase
      .from('profiles')
      .select('daily_calorie_goal')
      .eq('id', user.id)
      .single();

    if (profileData?.daily_calorie_goal) {
      navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
    } else {
      navigation.reset({ index: 0, routes: [{ name: 'OnboardingStep1' }] });
    }
  };

  const handleGoogleSignUp = async () => {
    setLoading(true);
    setError('');

    try {
      const redirectTo = AuthSession.makeRedirectUri({ scheme: 'veetha', path: 'auth/callback' });
      console.log('🔗 Google SignUp redirect URL:', redirectTo);

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
          posthog.identify(sessionData.session.user.id, { email: sessionData.session.user.email, signup_date: new Date().toISOString() });
          posthog.capture('signup', { method: 'google' });
          await setUserMode('authenticated');
          await handlePostSignUp(sessionData.session.user);
          return;
        }
      }

      // Browser was dismissed — check if OAuth completed via deep link handler
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user && !session.user.is_anonymous) {
        console.log('✅ Session found after browser dismiss');
        posthog.identify(session.user.id, { email: session.user.email, signup_date: new Date().toISOString() });
        posthog.capture('signup', { method: 'google' });
        await setUserMode('authenticated');
        await handlePostSignUp(session.user);
        return;
      }
    } catch (err) {
      console.error('Google sign-up error:', err);
      setError(err.message || t('signup.signupFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleAppleSignUp = async () => {
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

      posthog.identify(data.user.id, { email: data.user.email, signup_date: new Date().toISOString() });
      posthog.capture('signup', { method: 'apple' });
      await setUserMode('authenticated');
      await handlePostSignUp(data.user);
    } catch (err) {
      if (err.code !== 'ERR_REQUEST_CANCELED') {
        console.error('Apple sign-up error:', err);
        setError(err.message || t('signup.signupFailed'));
      }
    } finally {
      setLoading(false);
    }
  };

  // Determine if button should be disabled
  const isButtonDisabled = loading || emailExists || checkingEmail || !agreeToTerms;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.content}>

            {/* Logo */}
            <View style={styles.logoContainer}>
              <Image source={require('../../assets/LogoB.png')} style={styles.logo} />
            </View>
            <Text style={styles.welcomeText}>{t('signup.createAccount')}</Text>

            {/* Error Message */}
            {error ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
                {emailExists && (
                  <TouchableOpacity
                    onPress={() => navigation.navigate('Login')}
                    style={styles.goToLoginButton}
                  >
                    <Text style={styles.goToLoginText}>Go to Login →</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : null}

            {/* Email Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>{t('signup.email')}</Text>
              <View style={styles.emailInputWrapper}>
                <TextInput
                  style={[
                    styles.input,
                    emailExists && styles.inputError,
                  ]}
                  placeholder={t('signup.emailPlaceholder')}
                  placeholderTextColor="#999"
                  value={email}
                  onChangeText={setEmail}
                  onBlur={() => checkEmailExists(email)}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!loading}
                />
                {checkingEmail && (
                  <View style={styles.checkingIndicator}>
                    <ActivityIndicator size="small" color="#4CAF50" />
                  </View>
                )}
              </View>
            </View>

            {/* Password Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>{t('signup.password')}</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder={t('signup.passwordPlaceholder')}
                  placeholderTextColor="#999"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  textContentType="password"
                  importantForAutofill="yes"
                  editable={!loading}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeButton}
                >
                  <Text style={styles.eyeIcon}>{showPassword ? '👁️' : '👁️‍🗨️'}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Confirm Password Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>{t('signup.confirmPassword')}</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder={t('signup.confirmPasswordPlaceholder')}
                  placeholderTextColor="#999"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                  editable={!loading}
                />
                <TouchableOpacity
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={styles.eyeButton}
                >
                  <Text style={styles.eyeIcon}>{showConfirmPassword ? '👁️' : '👁️‍🗨️'}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Terms Checkbox */}
            <TouchableOpacity style={styles.checkboxContainer} onPress={() => setAgreeToTerms(!agreeToTerms)} disabled={loading} >
              <View style={[styles.checkbox, agreeToTerms && styles.checkboxChecked]}>
                {agreeToTerms && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <View style={styles.checkboxLabelContainer}>
                <Text style={styles.checkboxLabel}>{t('signup.bySigningUp')} </Text>
                <TouchableOpacity onPress={() => { navigation.navigate('PrivacyPolicy'); }}>
                  <Text style={styles.link}>{t('signup.termsOfService')}</Text>
                </TouchableOpacity>
                <Text style={styles.checkboxLabel}> {t('common.and')} </Text>
                <TouchableOpacity onPress={() => navigation.navigate('PrivacyPolicy')}>
                  <Text style={styles.link}>{t('signup.privacyPolicy')}</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>

            {/* Create Account Button */}
            <TouchableOpacity
              style={[
                styles.createButton,
                isButtonDisabled && styles.buttonDisabled
              ]}
              onPress={handleSignUp}
              disabled={isButtonDisabled}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.createButtonText}>
                  {checkingEmail ? 'Checking...' : t('signup.createAccount')}
                </Text>
              )}
            </TouchableOpacity>

            {/* Helper text for disabled button */}
            {emailExists && !loading && (
              <Text style={styles.helperText}>
                This email is already registered. Please use a different email or sign in.
              </Text>
            )}

            {/* Divider */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>{t('signup.or')}</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Google Button */}
            <TouchableOpacity
              style={styles.googleButton}
              onPress={handleGoogleSignUp}
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
                buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_UP}
                buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
                cornerRadius={4}
                style={{ width: '100%', height: 44, marginBottom: 12 }}
                onPress={handleAppleSignUp}
              />
            )}

            {/* Login Link */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>{t('signup.haveAccount')}</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                <Text style={styles.footerLink}>{t('signup.signInLink')}</Text>
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
    marginBottom: 8,
  },
  goToLoginButton: {
    alignItems: 'center',
    paddingTop: 8,
  },
  goToLoginText: {
    color: '#c62828',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  emailInputWrapper: {
    position: 'relative',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    color: '#842',
  },
  inputError: {
    borderColor: '#c62828',
    borderWidth: 2,
  },
  checkingIndicator: {
    position: 'absolute',
    right: 15,
    top: 15,
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
    color: '#900',
  },
  eyeButton: {
    padding: 15,
  },
  eyeIcon: {
    fontSize: 20,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 30,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#4CAF50',
    borderRadius: 4,
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#4CAF50',
  },
  checkmark: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  checkboxLabelContainer: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  checkboxLabel: {
    color: '#666',
    fontSize: 14,
  },
  link: {
    color: '#4CAF50',
    textDecorationLine: 'underline',
  },
  createButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
    backgroundColor: '#ccc',
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  helperText: {
    fontSize: 12,
    color: '#c62828',
    textAlign: 'center',
    marginTop: 8,
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
    marginBottom: 20,
  },
  footerText: {
    color: '#666',
  },
  footerLink: {
    color: '#4CAF50',
    fontWeight: '600',
  },
});
