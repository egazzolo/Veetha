//import * as Updates from 'expo-updates';
import React, { useState, useEffect, useRef } from 'react';
//import Purchases from 'react-native-purchases';
import { View, ActivityIndicator, Platform, StatusBar } from 'react-native';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { useTheme } from './utils/ThemeContext';
import { LayoutProvider } from './utils/LayoutContext';
import { TutorialProvider } from './utils/TutorialContext';

// Import screens
import LandingScreen from './screens/onboarding/LandingScreen';
import LoginScreen from './screens/onboarding/LoginScreen';
import SignUpScreen from './screens/onboarding/SignUpScreen';
import OnboardingStep1 from './screens/onboarding/OnboardingStep1';
import OnboardingStep1b from './screens/onboarding/OnboardingStep1b';
import OnboardingStep2 from './screens/onboarding/OnboardingStep2';
import OnboardingStep3 from './screens/onboarding/OnboardingStep3';
import OnboardingStep4 from './screens/onboarding/OnboardingStep4';
import OnboardingStep4b from './screens/onboarding/OnboardingStep4b';
import OnboardingStep5 from './screens/onboarding/OnboardingStep5';
import OnboardingStep6 from './screens/onboarding/OnboardingStep6';
import OnboardingStep7 from './screens/onboarding/OnboardingStep7';
import OnboardingComplete from './screens/onboarding/OnboardingComplete';
import HomeScreen from './screens/HomeScreen';
import EditMealScreen from './screens/EditMealScreen';
import ScannerScreen from './screens/ScannerScreen';
import ResultScreen from './screens/ResultScreen';
import SubmitProductScreen from './screens/SubmitProductScreen';
import ManualEntryScreen from './screens/ManualEntryScreen';
import StatsScreen from './screens/StatsScreen';
import ExportReportScreen from './screens/ExportReportScreen';
import ProfileScreen from './screens/ProfileScreen';
import EditProfileScreen from './screens/EditProfileScreen';
import DisplaySettingsScreen from './screens/DisplaySettingsScreen';
import GoalsPreferencesScreen from './screens/GoalsPreferencesScreen';
import DietaryRestrictionsScreen from './screens/DietaryRestrictionsScreen';
import QuickEntryScreen from './screens/QuickEntryScreen';
import GlobalTutorialOverlay from './components/GlobalTutorialOverlay';
import { VeethaToastRoot } from './components/VeethaToast';
import MealRecommendationsScreen from './screens/MealRecommendationsScreen';
import AdminDashboardScreen from './screens/AdminDashboardScreen';
import TermsOfServiceScreen from './screens/TermsOfServiceScreen';
import PrivacyPolicyScreen from './screens/PrivacyPolicyScreen';
import WeeklyReportScreen from './screens/WeeklyReportScreen';
import TestScreen from './screens/TestScreen';
import ExerciseCategoryScreen from './screens/ExerciseFlow/ExerciseCategoryScreen';
import ExerciseActivityScreen from './screens/ExerciseFlow/ExerciseActivityScreen';
import ExerciseIntensityScreen from './screens/ExerciseFlow/ExerciseIntensityScreen';
import ExerciseLogModal from './screens/ExerciseFlow/ExerciseLogModal';
import ReportViewerScreen from './screens/ReportViewerScreen';
import ForgotPasswordScreen from './screens/auth/ForgotPasswordScreen';

// Import contexts and utilities
import { OnboardingProvider } from './utils/OnboardingContext';
import { ThemeProvider } from './utils/ThemeContext';
import { LanguageProvider } from './utils/LanguageContext';
import { GreetingProvider } from './utils/GreetingContext';
import { UserProvider } from './utils/UserContext';
import { UserModeProvider, useUserMode } from './utils/UserModeContext';
import { supabase, createSessionFromUrl } from './utils/supabase';

WebBrowser.maybeCompleteAuthSession();

const Stack = createNativeStackNavigator();

// Inner component that has access to theme
function AppNavigator() {
  const { isDark } = useTheme();
  const { userMode, setUserMode } = useUserMode();
  const [initialRoute, setInitialRoute] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigationRef = useRef(null);
  const isInitialLoad = useRef(true);
  const oauthNavigating = useRef(false);

  useEffect(() => {
    checkAuthState();
  }, []);

  // Listen for OAuth callbacks while the app is already running
  useEffect(() => {
    const subscription = Linking.addEventListener('url', async ({ url }) => {
      console.log('🔗 Deep link received while app is running:', url);
      if (url && (url.includes('access_token') || url.includes('refresh_token'))) {
        // Only handle if no active session yet
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          console.log('🔗 No session yet, creating from URL...');
          await createSessionFromUrl(url);
        } else {
          console.log('🔗 Session already exists, skipping deep link handling');
        }
      }
    });
    return () => subscription.remove();
  }, []);

  // React to auth state changes (e.g. after OAuth session is set)
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔐 Auth state changed:', event);

        if (event === 'SIGNED_IN' && session) {
          if (oauthNavigating.current) return;

          const provider = session.user?.app_metadata?.provider;
          console.log('🔐 SIGNED_IN detected, provider:', provider);

          // Only handle OAuth logins here
          if (provider === 'email') {
            console.log('📧 Email login - skipping OAuth handler');
            return;
          }

          oauthNavigating.current = true;

          // Anonymous/guest users never go to onboarding
          if (session.user?.is_anonymous) {
            console.log('👤 Anonymous user - navigating to Home');
            const tryNavigate = () => {
              if (navigationRef.current?.isReady()) {
                navigationRef.current.reset({ index: 0, routes: [{ name: 'Home' }] });
              } else {
                setTimeout(tryNavigate, 100);
              }
            };
            tryNavigate();
            return;
          }

          await setUserMode('authenticated');
          console.log('🧭 OAuth login - navigating to OnboardingStep1');

          const tryNavigate = () => {
            if (navigationRef.current?.isReady()) {
              navigationRef.current.reset({ 
                index: 0, 
                routes: [{ name: 'OnboardingStep1' }] 
              });
            } else {
              setTimeout(tryNavigate, 100);
            }
          };
          tryNavigate();
        }
      }
    );
    return () => subscription.unsubscribe();
  }, []);

  const checkAuthState = async () => {
    try {
      console.log('🔍 Checking auth state on app start...');

      // 0) Handle OAuth deep link if app was cold-started via redirect URL
      const initialUrl = await Linking.getInitialURL();
      if (initialUrl && (initialUrl.includes('access_token') || initialUrl.includes('refresh_token'))) {
        console.log('🔗 OAuth deep link detected on cold start:', initialUrl);
        await createSessionFromUrl(initialUrl);
      }

      // 1) Restore userMode FIRST — this is the single source of truth
      const storedMode = await AsyncStorage.getItem('veetha_user_mode');
      console.log('📱 Stored userMode:', storedMode);

      // 2) Guest mode → always Home, never onboarding
      if (storedMode === 'guest') {
        // Validate the anonymous session still exists
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          console.log('✅ Guest session valid → Home');
          setInitialRoute('Home');
        } else {
          // Session expired — re-create anonymous session silently
          console.log('⚠️ Guest session expired → Landing');
          await setUserMode(null);
          setInitialRoute('Landing');
        }
        setLoading(false);
        return;
      }

      // 3) Authenticated or unknown mode — check session + profile
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error) {
        console.log('Auth error:', error);
        setInitialRoute('Landing');
        setLoading(false);
        return;
      }

      if (session?.user) {
        // Validate session with server
        const { data: { user: validUser }, error: userError } =
          await supabase.auth.getUser();

        if (userError || !validUser) {
          console.log('⚠️ Invalid cached session — forcing logout');
          await supabase.auth.signOut();
          await setUserMode(null);
          setInitialRoute('Landing');
          setLoading(false);
          return;
        }

        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('daily_calorie_goal')
          .eq('id', validUser.id)
          .maybeSingle();

        if (profileError && profileError.code !== 'PGRST116') {
          setInitialRoute('Landing');
        } else if (profile?.daily_calorie_goal) {
          // Profile complete → Home
          setInitialRoute('Home');
        } else if (validUser.is_anonymous) {
          // Anonymous/guest user with no goal → Home, never onboarding
          setInitialRoute('Home');
        } else {
          // Authenticated but no profile yet → onboarding
          setInitialRoute('OnboardingStep1');
        }
      } else {
        console.log('❌ No active session - showing Landing');
        setInitialRoute('Landing');
      }
    } catch (error) {
      console.error('❌ Error in auth check:', error);
      setInitialRoute('Landing');
    } finally {
      isInitialLoad.current = false;
      setLoading(false);
    }
  };

  if (loading || !initialRoute) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: isDark ? '#121212' : '#fff' }}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  const navTheme = isDark
    ? {
        ...DarkTheme,
        colors: {
          ...DarkTheme.colors,
          primary: '#4CAF50',
          background: '#121212',
          card: '#1E1E1E',
          text: '#fff',
          border: '#2C2C2C',
          notification: '#4CAF50',
        },
      }
    : {
        ...DefaultTheme,
        colors: {
          ...DefaultTheme.colors,
          primary: '#4CAF50',
          background: '#fff',
          card: '#fff',
          text: '#000',
          border: '#e0e0e0',
          notification: '#4CAF50',
        },
      };

  return (
    <View style={{ flex: 1, backgroundColor: isDark ? '#121212' : '#fff' }}>
      <NavigationContainer ref={navigationRef} theme={navTheme}>
        <Stack.Navigator
          initialRouteName={initialRoute}
          screenOptions={({ route }) => ({
            headerShown: false,
            animation: route.params?.animationDirection === 'left' ? 'slide_from_left' : 'slide_from_right',
            contentStyle: { backgroundColor: isDark ? '#121212' : '#fff' },
          })}
        >
          {/* Onboarding Screens */}
          <Stack.Screen name="Landing" component={LandingScreen} />
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="SignUp" component={SignUpScreen} />
          <Stack.Screen name="OnboardingStep1" component={OnboardingStep1} />
          <Stack.Screen name="OnboardingStep1b" component={OnboardingStep1b} options={{ headerShown: false }} />
          <Stack.Screen name="OnboardingStep2" component={OnboardingStep2} />
          <Stack.Screen name="OnboardingStep3" component={OnboardingStep3} />
          <Stack.Screen name="OnboardingStep4" component={OnboardingStep4} />
          <Stack.Screen name="OnboardingStep4b" component={OnboardingStep4b} />
          <Stack.Screen name="OnboardingStep5" component={OnboardingStep5} />
          <Stack.Screen name="OnboardingStep6" component={OnboardingStep6} />
          <Stack.Screen name="OnboardingStep7" component={OnboardingStep7} />
          <Stack.Screen name="OnboardingComplete" component={OnboardingComplete} />

          {/* Main App Screens */}
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="ExerciseCategoryScreen" component={ExerciseCategoryScreen} options={{ headerShown: false }}/>
          <Stack.Screen name="ExerciseActivityScreen" component={ExerciseActivityScreen} options={{ headerShown: false }}/>
          <Stack.Screen name="ExerciseIntensityScreen" component={ExerciseIntensityScreen} options={{ headerShown: false }}/>
          <Stack.Screen name="ExerciseLogModal" component={ExerciseLogModal} options={{ headerShown: false }}/>
          <Stack.Screen name="Scanner" component={ScannerScreen} />
          <Stack.Screen name="Result" component={ResultScreen} />
          <Stack.Screen name="ManualEntry" component={ManualEntryScreen} />
          <Stack.Screen name="EditMeal" component={EditMealScreen} />
          <Stack.Screen name="SubmitProduct" component={SubmitProductScreen} />
          <Stack.Screen name="Stats" component={StatsScreen} />
          <Stack.Screen name="ExportReport" component={ExportReportScreen} options={{ headerShown: false }} />
          <Stack.Screen name="Profile" component={ProfileScreen} />
          <Stack.Screen name="EditProfile" component={EditProfileScreen} />
          <Stack.Screen name="AdminDashboard" component={AdminDashboardScreen} options={{ title: 'Admin Dashboard' }} />
          <Stack.Screen name="DisplaySettings" component={DisplaySettingsScreen} />
          <Stack.Screen name="GoalsPreferences" component={GoalsPreferencesScreen} />
          <Stack.Screen name="DietaryRestrictions" component={DietaryRestrictionsScreen} />
          <Stack.Screen name="QuickEntry" component={QuickEntryScreen} options={{ headerShown: false }} />
          <Stack.Screen name="MealRecommendations" component={MealRecommendationsScreen} options={{ headerShown: false }} />
          <Stack.Screen name="WeeklyReport" component={WeeklyReportScreen} options={{ headerShown: false }} />
          <Stack.Screen name="TestScreen" component={TestScreen} options={{ headerShown: false }} />
          <Stack.Screen name="TermsOfService" component={TermsOfServiceScreen} options={{ title: 'Terms of Service', headerShown: true, headerStyle: { backgroundColor: '#4CAF50' }, headerTintColor: '#fff', headerTitleStyle: { fontWeight: 'bold' }, }} />
          <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} options={{ title: 'Privacy Policy', headerShown: true, headerStyle: { backgroundColor: '#4CAF50' }, headerTintColor: '#fff', headerTitleStyle: { fontWeight: 'bold' }, }} />
          <Stack.Screen name="ReportViewer" component={ReportViewerScreen}/>
          <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
        </Stack.Navigator>
        {/* <GlobalTutorialOverlay /> */}
      </NavigationContainer>
      <VeethaToastRoot />
    </View>
  );
}

export default function App() {
    //useEffect(() => {
    //  // Initialize RevenueCat
    //  Purchases.configure({
    //    apiKey: 'your_revenuecat_public_key_here'  // Get from RevenueCat dashboard
    //  });
    //}, []);

  return (
    <SafeAreaProvider>
      <LanguageProvider>
        <TutorialProvider>
          <GreetingProvider>
            <ThemeProvider>
              <LayoutProvider>
                <UserModeProvider>
                  <UserProvider>
                    <OnboardingProvider>
                      <AppNavigator />
                    </OnboardingProvider>
                  </UserProvider>
                </UserModeProvider>
              </LayoutProvider>
            </ThemeProvider>
          </GreetingProvider>
        </TutorialProvider>
      </LanguageProvider>
    </SafeAreaProvider>
  );
}
