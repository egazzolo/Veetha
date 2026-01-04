//import * as Updates from 'expo-updates';
import React, { useState, useEffect } from 'react';
//import Purchases from 'react-native-purchases';
import { View, ActivityIndicator, Platform, StatusBar } from 'react-native';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
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
import MealRecommendationsScreen from './screens/MealRecommendationsScreen';
import AdminDashboardScreen from './screens/AdminDashboardScreen';
import TermsOfServiceScreen from './screens/TermsOfServiceScreen';
import PrivacyPolicyScreen from './screens/PrivacyPolicyScreen';
import WeeklyReportScreen from './screens/WeeklyReportScreen';
import TestScreen from './screens/TestScreen'; 

// Import contexts and utilities
import { OnboardingProvider } from './utils/OnboardingContext';
import { ThemeProvider } from './utils/ThemeContext';
import { LanguageProvider } from './utils/LanguageContext';
import { GreetingProvider } from './utils/GreetingContext';
import { UserProvider } from './utils/UserContext';
import { supabase } from './utils/supabase';

const Stack = createNativeStackNavigator();

// Inner component that has access to theme
function AppNavigator() {
  const { isDark } = useTheme();
  const [initialRoute, setInitialRoute] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuthState();
  }, []);

  const checkAuthState = async () => {
    try {
      console.log('🔍 Checking auth state on app start...');
      
      if (__DEV__) {
        console.log('🔧 Development mode detected - starting at Landing');
        setInitialRoute('Landing');
        setLoading(false);
        return;
      }
      
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('❌ Error checking auth:', error);
        setInitialRoute('Landing');
        setLoading(false);
        return;
      }
      
      if (session?.user) {
        console.log('✅ User is logged in:', session.user.email);
        
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('daily_calorie_goal')
          .eq('id', session.user.id)
          .maybeSingle();

        if (profileError && profileError.code !== 'PGRST116') {
          console.error('❌ Error fetching profile:', profileError);
          setInitialRoute('Landing');
        } else if (profile?.daily_calorie_goal) {
          console.log('✅ Onboarding complete, going to Home');
          setInitialRoute('Home');
        } else {
          console.log('⚠️ Session exists but onboarding incomplete');
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
      <NavigationContainer theme={navTheme}>
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
          <Stack.Screen name="OnboardingStep5" component={OnboardingStep5} />
          <Stack.Screen name="OnboardingStep6" component={OnboardingStep6} />
          <Stack.Screen name="OnboardingStep7" component={OnboardingStep7} />
          <Stack.Screen name="OnboardingComplete" component={OnboardingComplete} />

          {/* Main App Screens */}
          <Stack.Screen name="Home" component={HomeScreen} />
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
        </Stack.Navigator>
        <GlobalTutorialOverlay />
      </NavigationContainer>
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
                <UserProvider>
                  <OnboardingProvider>
                    <AppNavigator />
                  </OnboardingProvider>
                </UserProvider>
              </LayoutProvider>
            </ThemeProvider>
          </GreetingProvider>
        </TutorialProvider>
      </LanguageProvider>
    </SafeAreaProvider>
  );
}