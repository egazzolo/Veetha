import StepsCard from '../components/StepsCard';
import React, { useState, useEffect, useRef, useContext } from 'react';
import * as Location from 'expo-location';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, RefreshControl, Alert, Modal, Platform, Animated, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GestureDetector, Gesture, GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSwipeNavigation } from '../utils/useSwipeNavigation';
import { Svg, Circle } from 'react-native-svg';
import { useFocusEffect } from '@react-navigation/native';
import { useTutorial } from '../utils/TutorialContext';
import { useTheme } from '../utils/ThemeContext';
import { useLanguage } from '../utils/LanguageContext';
import { useGreeting } from '../utils/GreetingContext';
import { useUser, UserContext } from '../utils/UserContext';
import { useLayout } from '../utils/LayoutContext';
import { supabase } from '../utils/supabase';
import { logScreen, logEvent } from '../utils/analytics';
import { getSuggestionsForMealTime, LOCAL_FOODS } from '../utils/localFoods';
import { Pedometer } from 'expo-sensors';
import AppTutorial from '../components/AppTutorial';
import AnimatedThemeWrapper from '../components/AnimatedThemeWrapper';
import DateTimePicker from '@react-native-community/datetimepicker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import GreetingBanner from '../components/GreetingBanner';
import BarsLayout from '../components/BarsLayout';
import CardsLayout from '../components/CardsLayout';
import MealsList from '../components/MealsList';
import BottomNav from '../components/BottomNav';
import CalorieWarningBanner from '../components/CalorieWarningBanner';
import FrameWarning from '../components/FrameWarning';
import TutorialArrow from '../components/TutorialArrow';
import MonthlyCalendar from '../components/MonthlyCalendar';
import ExerciseButton from '../components/ExerciseButton';
import WaterPitcher from '../components/WaterPitcher';

// Circular Progress Component
function CircularProgress({ percentage, size = 100, strokeWidth = 8, color = '#4CAF50', children }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const progress = Math.min(Math.max(percentage, 0), 100);
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <View style={{ width: size, height: size, position: 'relative' }}>
      <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
        <Circle
          stroke="#e0e0e0"
          fill="none"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
        />
        <Circle
          stroke={color}
          fill="none"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
        />
      </Svg>
      <View style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
      }}>
        {children}
      </View>
    </View>
  );
}

// Add quick log function
const handleQuickLog = async (food) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Create product if doesn't exist
    const { data: existingProduct } = await supabase
      .from('food_database')
      .select('id')
      .eq('name', food.name)
      .maybeSingle();

    let productId;

    if (existingProduct) {
      productId = existingProduct.id;
    } else {
      const { data: newProduct } = await supabase
        .from('food_database')
        .insert({
          name: food.name,
          calories: food.calories,
          protein: food.protein,
          carbs: food.carbs,
          fat: food.fat,
          source: 'local_suggestion',
        })
        .select('id')
        .single();
      
      productId = newProduct.id;
    }

    // Log meal
    await supabase.from('meals').insert({
      user_id: user.id,
      product_id: productId,
      serving_grams: 100,
      image_url: imageUrl, 
    });

    await refreshMeals();
    
    Alert.alert('Logged! ✅', `${food.emoji} ${food.name} added`);
    
  } catch (error) {
    console.error('Error quick logging:', error);
    Alert.alert('Error', 'Failed to log meal');
  }
};

// NUTRIENT MODAL COMPONENT
function NutrientModal({ visible, nutrient, onClose, theme, currentIntake, dailyGoal, t }) {
  const nutrientInfo = {
    calories: {
      icon: '🔥',
      title: t('home.nutrientModal.calories.title'),
      color: '#4CAF50',
      benefits: [
        { icon: '⚡', text: t('home.nutrientModal.calories.benefits.b1') },
        { icon: '🧠', text: t('home.nutrientModal.calories.benefits.b2') },
        { icon: '💓', text: t('home.nutrientModal.calories.benefits.b3') },
        { icon: '🏃', text: t('home.nutrientModal.calories.benefits.b4') },
      ],
      foundIn: t('home.nutrientModal.calories.foundIn'),
      unit: 'kcal'
    },
    protein: {
      icon: '💪',
      title: t('home.nutrientModal.protein.title'),
      color: '#2196F3',
      benefits: [
        { icon: '🦴', text: t('home.nutrientModal.protein.benefits.b1') },
        { icon: '🧬', text: t('home.nutrientModal.protein.benefits.b2') },
        { icon: '🛡️', text: t('home.nutrientModal.protein.benefits.b3') },
        { icon: '😊', text: t('home.nutrientModal.protein.benefits.b4') },
      ],
      foundIn: t('home.nutrientModal.protein.foundIn'),
      unit: 'g'
    },
    carbs: {
      icon: '🌾',
      title: t('home.nutrientModal.carbs.title'),
      color: '#FF9800',
      benefits: [
        { icon: '⚡', text: t('home.nutrientModal.carbs.benefits.b1') },
        { icon: '🧠', text: t('home.nutrientModal.carbs.benefits.b2') },
        { icon: '🏋️', text: t('home.nutrientModal.carbs.benefits.b3') },
        { icon: '🥬', text: t('home.nutrientModal.carbs.benefits.b4') },
      ],
      foundIn: t('home.nutrientModal.carbs.foundIn'),
      unit: 'g'
    },
    fat: {
      icon: '🥑',
      title: t('home.nutrientModal.fat.title'),
      color: '#9C27B0',
      benefits: [
        { icon: '💊', text: t('home.nutrientModal.fat.benefits.b1') },
        { icon: '🛡️', text: t('home.nutrientModal.fat.benefits.b2') },
        { icon: '🔋', text: t('home.nutrientModal.fat.benefits.b3') },
        { icon: '🧬', text: t('home.nutrientModal.fat.benefits.b4') },
      ],
      foundIn: t('home.nutrientModal.fat.foundIn'),
      unit: 'g'
    }
  };

  const info = nutrientInfo[nutrient] || {};
  const progressPercent = dailyGoal > 0 ? Math.min((currentIntake / dailyGoal) * 100, 100) : 0;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableOpacity 
        style={styles.nutrientModalOverlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity 
          activeOpacity={1}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={[styles.nutrientModalCard, { backgroundColor: theme.cardBackground }]}>
            {/* Header with colored banner */}
            <View style={[styles.nutrientModalHeader, { backgroundColor: info.color }]}>
              <Text style={styles.nutrientModalIcon}>{info.icon}</Text>
              <Text style={styles.nutrientModalTitle}>{info.title}</Text>
            </View>

            {/* Today's Progress */}
            <View style={styles.nutrientProgressSection}>
              <Text style={[styles.nutrientProgressLabel, { color: theme.text }]}>
                {t('home.nutrientModal.todaysIntake')}
              </Text>
              <View style={styles.nutrientProgressBar}>
                <View 
                  style={[
                    styles.nutrientProgressFill, 
                    { 
                      backgroundColor: info.color, 
                      width: `${progressPercent}%` 
                    }
                  ]} 
                />
              </View>
              <Text style={[styles.nutrientProgressText, { color: theme.textSecondary }]}>
                {Math.round(currentIntake)}{info.unit} / {Math.round(dailyGoal)}{info.unit} ({Math.round(progressPercent)}%)
              </Text>
            </View>

            {/* Benefits */}
            <View style={styles.nutrientBenefitsSection}>
              <Text style={[styles.nutrientSectionTitle, { color: theme.text }]}>
                {t('home.nutrientModal.whyYouNeed')}
              </Text>
              {info.benefits?.map((benefit, index) => (
                <View key={index} style={styles.nutrientBenefitItem}>
                  <Text style={styles.nutrientBenefitIcon}>{benefit.icon}</Text>
                  <Text style={[styles.nutrientBenefitText, { color: theme.textSecondary }]}>
                    {benefit.text}
                  </Text>
                </View>
              ))}
            </View>

            {/* Found In */}
            <View style={styles.nutrientFoundInSection}>
              <Text style={[styles.nutrientSectionTitle, { color: theme.text }]}>
                {t('home.nutrientModal.foundInLabel')}
              </Text>
              <Text style={[styles.nutrientFoundInText, { color: theme.textSecondary }]}>
                {info.foundIn}
              </Text>
            </View>

            {/* Daily Goal */}
            <View style={styles.nutrientGoalSection}>
              <Text style={[styles.nutrientGoalText, { color: info.color }]}>
                {t('home.nutrientModal.yourGoal')} {Math.round(dailyGoal)}{info.unit}{t('home.nutrientModal.perDay')}
              </Text>
            </View>
          </View>
            {/* Close Button */}
            <TouchableOpacity 
              style={[styles.nutrientModalButton, { backgroundColor: info.color }]}
              onPress={onClose}
            >
              <Text style={styles.nutrientModalButtonText}>{t('home.nutrientModal.gotIt')}</Text>
            </TouchableOpacity>
          
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

export default function HomeScreen({ navigation }) {
  const { theme, isDark } = useTheme();
  const { t } = useLanguage();
  const { user, profile, loading: userLoading, refreshProfile } = useUser();
  console.log("👤 USER FROM CONTEXT:", user);
  const { layout } = useLayout();
  const { startTutorial, tutorialCompleted } = useTutorial();
  const { freshDataLoaded } = useContext(UserContext);
  const tutorialStartedRef = useRef(false);
  
  // Date selection state (MOVED HERE - correct location!)
  const [showArrowToProfile, setShowArrowToProfile] = useState(false);
  const [profileCoords, setProfileCoords] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [monthlyData, setMonthlyData] = useState([]);
  const [waterIntake, setWaterIntake] = useState(0);
  const [updatingWater, setUpdatingWater] = useState(false);
  const [meals, setMeals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [copyingMeals, setCopyingMeals] = useState(false);
  const [showNutrientModal, setShowNutrientModal] = useState(false);
  const [selectedNutrient, setSelectedNutrient] = useState(null);
  const [toggledMeals, setToggledMeals] = useState(new Set());
  const [exerciseCaloriesBurned, setExerciseCaloriesBurned] = useState(0);
  const [stepCalories, setStepCalories] = useState(0);
  const { showGreeting, greetingText, checkAndShowGreeting, hideGreeting } = useGreeting();
  const [showArrowToScanner, setShowArrowToScanner] = useState(false);
  const [scannerCoords, setScannerCoords] = useState(null);
  const [checkingTutorial, setCheckingTutorial] = useState(true);
  const [quickSuggestions, setQuickSuggestions] = useState([]);
  const [userCountry, setUserCountry] = useState(null);

  // Tutorial refs
  const profileButtonRef = useRef(null);
  const caloriesCardRef = useRef(null);
  const macroCardsRef = useRef(null);
  const mealsListRef = useRef(null);
  const scannerButtonRef = useRef(null);
  const scrollViewRef = useRef(null);

  // Swipe navigation
  const swipeGesture = useSwipeNavigation(navigation, 'Home', tutorialCompleted);

  const [calendarMonth, setCalendarMonth] = useState({ 
    year: new Date().getFullYear(), 
    month: new Date().getMonth() 
  });

  const loadQuickSuggestions = async () => {
    try {
      // Get user location
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync({});
        const [geocode] = await Location.reverseGeocodeAsync({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
        
        const countryCode = geocode.isoCountryCode;
        setUserCountry(countryCode);
        
        const { suggestions, mealType, country } = getSuggestionsForMealTime(countryCode);
        setQuickSuggestions(suggestions);
        
        console.log(`🌍 Showing ${mealType} suggestions for ${country}`);
      } else {
        // Use default suggestions
        const hour = new Date().getHours();
        const mealType = hour < 11 ? 'breakfast' : hour < 16 ? 'lunch' : 'dinner';
        setQuickSuggestions(DEFAULT_FOODS[mealType]);
      }
    } catch (error) {
      console.error('Error loading suggestions:', error);
    }
  };

  const loadExerciseCalories = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const today = new Date(selectedDate);
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const { data: exerciseData, error } = await supabase
        .from('exercises')
        .select('calories_burned')
        .eq('user_id', user.id)
        .gte('logged_at', today.toISOString())
        .lt('logged_at', tomorrow.toISOString());

      if (error) throw error;

      const totalBurned = exerciseData?.reduce((sum, ex) => sum + (ex.calories_burned || 0), 0) || 0;
      setExerciseCaloriesBurned(totalBurned);
    } catch (error) {
      console.error('Error loading exercise calories:', error);
    }
  };

  const loadStepCalories = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser(); // ✅ Get user from auth
      if (!user) return;

      const today = selectedDate.toLocaleDateString('en-CA');
      
      const { data } = await supabase
        .from('steps_logs')
        .select('calories_burned')
        .eq('user_id', user.id)
        .eq('date', today)
        .single();
      
      setStepCalories(data?.calories_burned || 0);
    } catch (error) {
      console.log('No step data for today');
      setStepCalories(0);
    }
  };

  // Load water intake
  const loadWaterIntake = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    const dateStr = selectedDate.toLocaleDateString('en-CA');
    
    const { data } = await supabase
      .from('water_logs')
      .select('cups')
      .eq('user_id', user.id)
      .eq('date', dateStr)
      .single();
    
    setWaterIntake(data?.cups || 0);
  };

  const handleAddWater = async () => {

    if (updatingWater) return;

    try {

      setUpdatingWater(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('water_logs')
        .insert({
          user_id: user.id,
          created_at: new Date().toISOString(),
        });

      if (error) throw error;

      // 🔥 UPDATE UI IMMEDIATELY
      setWaterIntake(prev => prev + 1);

    } catch (e) {

      console.error(e);

    } finally {

      setUpdatingWater(false);

    }
  };

  const handleSubtractWater = async () => {

    if (updatingWater) return;

    try {

      setUpdatingWater(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const dateStr = selectedDate.toLocaleDateString('en-CA');

      const newAmount = waterIntake - 1;

      const { error } = await supabase.from('water_logs').upsert({
        user_id: user.id,
        date: dateStr,
        cups: newAmount,
      }, {
        onConflict: 'user_id,date'
      });

      if (error) {
        console.error('Error updating water:', error);
        return;
      }

      setWaterIntake(newAmount);

      // 🔥 get latest water log
      const { data, error: fetchError } = await supabase
        .from('water_logs')
        .select('id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (fetchError) throw fetchError;

      if (!data || data.length === 0) {
        setUpdatingWater(false);
        return;
      }

      // 🔥 delete last glass
      const { error: deleteError } = await supabase
        .from('water_logs')
        .delete()
        .eq('id', data[0].id);

      if (deleteError) throw deleteError;

      // 🔥 UPDATE UI IMMEDIATELY
      setWaterIntake(prev => Math.max(prev - 1, 0));

    } catch (e) {

      console.error(e);

    } finally {

      setUpdatingWater(false);

    }
  };

  useEffect(() => {
    logScreen('Home');
  }, []);
  
  // Call in useEffect
  useEffect(() => {
    loadQuickSuggestions();
  }, []);

  // Debug refs
  useEffect(() => {
    console.log('📌 Refs created:', {
      caloriesCard: caloriesCardRef.current,
      macroCards: macroCardsRef.current,
      mealsList: mealsListRef.current,
      scannerButton: scannerButtonRef.current,
    });
  }, []);

  // Calculate totals from meals (with safety check)
  const consumed = (meals || []).reduce((sum, meal) => {
    if (!meal.product) return sum;
    return sum + ((meal.product.calories * meal.serving_grams) / 100);
  }, 0);

  const consumedProtein = (meals || []).reduce((sum, meal) => {
    if (!meal.product) return sum;
    return sum + ((meal.product.protein * meal.serving_grams) / 100);
  }, 0);

  const consumedCarbs = (meals || []).reduce((sum, meal) => {
    if (!meal.product) return sum;
    return sum + ((meal.product.carbs * meal.serving_grams) / 100);
  }, 0);

  const consumedFat = (meals || []).reduce((sum, meal) => {
    if (!meal.product) return sum;
    return sum + ((meal.product.fat * meal.serving_grams) / 100);
  }, 0);

  // Get daily goals from profile
  const totalCalories = profile?.daily_calorie_goal || 2000;
  const totalProtein = profile?.daily_protein_goal || 150;
  const totalCarbs = profile?.daily_carbs_goal || 200;
  const totalFat = profile?.daily_fat_goal || 65;

  // Calculate remaining
  const remaining = totalCalories - consumed + exerciseCaloriesBurned + stepCalories;

  // Get user name for greeting
  const userName = profile?.display_name || profile?.full_name?.split(' ')[0] || 'there';

  // ↑↑↑ END OF CALCULATIONS ↑↑↑

  // Minimum date: November 1, 2025
  const MIN_DATE = new Date(2025, 10, 1); // Month is 0-indexed, so 10 = November

  // Measure scanner button for arrow
  const measureScannerButton = () => {
    if (scannerButtonRef.current) {
      scannerButtonRef.current.measureInWindow((x, y, w, h) => {
        console.log('📍 Scanner button coords:', { x, y, w, h });
        setScannerCoords({ top: y, left: x, width: w, height: h });
      });
    }
  };
  
  // Measure profile button for arrow
  const measureProfileButton = () => {
    if (profileButtonRef.current) {
      profileButtonRef.current.measureInWindow((x, y, w, h) => {
        console.log('📍 Profile button coords:', { x, y, w, h });
        setProfileCoords({ top: y, left: x, width: w, height: h });
      });
    }
  };

  // Calculate current logging streak
  const calculateStreak = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get ALL meals from MIN_DATE to today in ONE query
      const { data: mealsData, error } = await supabase
        .from('meals')
        .select('logged_at')
        .eq('user_id', user.id)
        .gte('logged_at', MIN_DATE.toISOString())
        .order('logged_at', { ascending: false });

      if (error) throw error;

      // Convert meals to set of dates (YYYY-MM-DD) IN LOCAL TIMEZONE
      const mealDates = new Set(
        mealsData.map(meal => {
          const mealDate = new Date(meal.logged_at);
          return mealDate.toLocaleDateString('en-CA'); // YYYY-MM-DD in local time
        })
      );

      // Check if TODAY has meals
      const today = new Date();
      const todayStr = today.toLocaleDateString('en-CA');
      const hasMealsToday = mealDates.has(todayStr);

      // Start from TODAY if meals exist, otherwise YESTERDAY
      let checkDate = new Date();
      if (!hasMealsToday) {
        checkDate.setDate(checkDate.getDate() - 1); // Start from yesterday if no meals today
      }
      checkDate.setHours(0, 0, 0, 0);

      // Calculate streak by checking backwards
      let streak = 0;
      while (checkDate >= MIN_DATE) {
        const dateStr = checkDate.toLocaleDateString('en-CA');
        
        if (mealDates.has(dateStr)) {
          streak++;
          checkDate.setDate(checkDate.getDate() - 1);
        } else {
          break;
        }
      }

      setCurrentStreak(streak);
      console.log('🔥 Streak check:', {
        todayStr,
        hasMealsToday,
        yesterdayStr: new Date(Date.now() - 86400000).toLocaleDateString('en-CA'),
        datesWithMeals: Array.from(mealDates).slice(0, 5),
        calculatedStreak: streak
      });
    } catch (error) {
      console.error('Error calculating streak:', error);
    }
  };

  // Load meals for selected date
  const loadMealsForDate = async (date) => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;

      // Format date to YYYY-MM-DD
      // Get user's timezone and format date properly
      const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const dateStr = date.toLocaleDateString('en-CA'); // YYYY-MM-DD format

      // Create start and end of day in user's timezone
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      
      const { data, error } = await supabase
        .from('meals')
        .select(`
          *,
          product:food_database (
            name,
            calories,
            protein,
            carbs,
            fat,
            fiber,
            sugar,
            sodium,
            serving_unit,
            image_url
          )
        `)
        .eq('user_id', user.id)
        .gte('logged_at', startOfDay.toISOString())
        .lte('logged_at', endOfDay.toISOString())
        .order('logged_at', { ascending: false });

      if (error) throw error;

      setMeals(data || []);
      console.log(`📅 Loaded ${data?.length || 0} meals for ${dateStr}`);
    } catch (error) {
      console.error('Error loading meals:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch monthly data for calendar
  const fetchMonthlyData = async (targetYear, targetMonth) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Use provided year/month or default to current
      const year = targetYear ?? new Date().getFullYear();
      const month = targetMonth ?? new Date().getMonth();
      
      const firstDay = new Date(year, month, 1);
      firstDay.setHours(0, 0, 0, 0);
      const lastDay = new Date(year, month + 1, 0);
      lastDay.setHours(23, 59, 59, 999);

      // Get ALL meals from selected month in ONE query
      const { data: meals, error } = await supabase
        .from('meals')
        .select(`
          logged_at,
          serving_grams,
          product:food_database (
            calories
          )
        `)
        .eq('user_id', user.id)
        .gte('logged_at', firstDay.toISOString())
        .lte('logged_at', lastDay.toISOString())
        .order('logged_at', { ascending: true });

      if (error) throw error;

      // Group meals by LOCAL date (not UTC!)
      const mealsByDate = {};
      meals.forEach(meal => {
        const mealDate = new Date(meal.logged_at);
        const dateStr = mealDate.toLocaleDateString('en-CA'); // YYYY-MM-DD in local time
        if (!mealsByDate[dateStr]) {
          mealsByDate[dateStr] = [];
        }
        mealsByDate[dateStr].push(meal);
      });

      // Build month data for ALL days in selected month
      const monthData = [];
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      
      for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day);
        const dateStr = date.toLocaleDateString('en-CA'); // YYYY-MM-DD in local time
        const dayMeals = mealsByDate[dateStr] || [];

        const totalCalories = dayMeals.reduce((sum, m) => {
          if (!m.product) return sum; // Skip if product was deleted
          const calculatedCalories = (m.product.calories * m.serving_grams) / 100;
          return sum + calculatedCalories;
        }, 0);

        monthData.push({
          date: dateStr,
          calories: Math.round(totalCalories),
          mealsCount: dayMeals.length,
          hasData: dayMeals.length > 0,
        });
      }

      setMonthlyData(monthData);
      console.log('📅 Loaded', monthData.length, 'days for', year, month);
    } catch (error) {
      console.error('Error fetching monthly data:', error);
    }
  };

  // Load meals when date changes
  useEffect(() => {
    loadMealsForDate(selectedDate);
    loadWaterIntake();
    loadExerciseCalories();
    loadStepCalories();
    calculateStreak();
    fetchMonthlyData(calendarMonth.year, calendarMonth.month);
  }, [selectedDate, calendarMonth]);

  // Check greeting only when needed (login or 5 hours later)
  useEffect(() => {
    const checkGreetingOnce = async () => {
      if (!profile || !userName || userName === 'there' || userLoading) return;
      
      // Check if we've already shown greeting in this app session
      const sessionKey = `greeting_shown_session_${new Date().toDateString()}`;
      const shownThisSession = await AsyncStorage.getItem(sessionKey);
      
      if (!shownThisSession) {
        console.log('👋 Checking greeting for:', userName);
        await checkAndShowGreeting(userName, t);
        await AsyncStorage.setItem(sessionKey, 'true');
      } else {
        console.log('👋 Greeting already shown this session');
      }
    };
    
    checkGreetingOnce();
  }, [profile, userLoading]);

    // Start tutorial on first load - WAIT for FRESH data AND layout
    useEffect(() => {
      if (!freshDataLoaded) {
        console.log('⏳ Waiting for fresh data...');
        return;
      }

      // Check if tutorial is already completed
      if (profile?.tutorial_completed) {
        console.log('✅ Tutorial already completed - unfreezing screen');
        setCheckingTutorial(false); // UNFREEZE
        return;
      }

      // Tutorial needs to start - UNFREEZE so user can interact with it
      if (!profile?.tutorial_completed && layout === 'cards' && profile?.id && !loading && !userLoading && !tutorialStartedRef.current) {
        
        let checkCount = 0;
        const MAX_CHECKS = 10;
        let timeoutId;
        
        const checkRefsReady = () => {
          checkCount++;
          
          if (checkCount > MAX_CHECKS) {
            console.log('⚠️ Refs check timeout - unfreezing anyway');
            setCheckingTutorial(false); // UNFREEZE even if refs not ready
            return;
          }
          
          const refsReady = 
            caloriesCardRef.current !== null &&
            macroCardsRef.current !== null &&
            mealsListRef.current !== null &&
            scannerButtonRef.current !== null;
          
          console.log('🎓 Refs ready check:', {
            caloriesCard: !!caloriesCardRef.current,
            macroCards: !!macroCardsRef.current,
            mealsList: !!mealsListRef.current,
            scannerButton: !!scannerButtonRef.current,
          });
          
          if (refsReady) {
            console.log('✅ All refs ready! Starting tutorial...');
            setCheckingTutorial(false); // UNFREEZE before tutorial starts
            setTimeout(() => {
              tutorialStartedRef.current = true;
              startTutorial('Home');
            }, 500); // Small delay to ensure unfreeze happens first
          } else {
            console.log('⏳ Refs not ready yet, checking again in 500ms...');
            timeoutId = setTimeout(checkRefsReady, 500);
          }
        };
        
        timeoutId = setTimeout(checkRefsReady, 1500);
        
        return () => {
          if (timeoutId) {
            clearTimeout(timeoutId);
            console.log('🧹 Cleaned up refs check timeout');
          }
        };
      } else {
        // If none of the above conditions are met, unfreeze anyway
        setCheckingTutorial(false);
      }
    }, [tutorialCompleted, layout, profile, loading, userLoading, freshDataLoaded]);

  // Refresh meals when screen focuses
  useFocusEffect(
    React.useCallback(() => {
      console.log('🔄 HomeScreen focused - refreshing meals');
      loadMealsForDate(selectedDate);
      calculateStreak();
      
      // Hide scanner arrow whenever we return to Home
      setShowArrowToScanner(false);
      
      // Refresh profile first to get latest tutorial flags
      const checkArrows = async () => {
        console.log('🔄 Refreshing profile from database...');
        const freshProfile = await refreshProfile();
        
        console.log('📊 Fresh tutorial flags:', {
          home: freshProfile?.home_tutorial_completed,
          scanner: freshProfile?.scanner_tutorial_completed,
          profileTut: freshProfile?.profile_tutorial_completed,
        });
        
        // GUARD: Only proceed if Home tutorial is done
        if (!freshProfile?.home_tutorial_completed) {
          console.log('⏸️ Home tutorial not done yet, skipping arrow check');
          return;
        }
        
        console.log('✅ Home tutorial done, checking for profile arrow...');
        
        // Check if we should show Profile arrow
        if (freshProfile?.scanner_tutorial_completed && !freshProfile?.profile_tutorial_completed) {
          console.log('✅ CONDITIONS MET - Showing arrow to Profile');
          
          // Small delay for layout to settle
          setTimeout(() => {
            measureProfileButton();
            setShowArrowToProfile(true);
          }, 100);
        } else {
          console.log('❌ Not showing arrow - conditions not met');
          console.log('  scanner_completed:', freshProfile?.scanner_tutorial_completed);
          console.log('  profile_completed:', freshProfile?.profile_tutorial_completed);
          setShowArrowToProfile(false);
        }
      };
      
      checkArrows();
    }, [selectedDate])
  );

  // Date navigation functions
  const goToPreviousDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() - 1);
    
    // Don't allow going before November 1, 2025
    if (newDate >= MIN_DATE) {
      setSelectedDate(newDate);
    }
  };

  const goToNextDay = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Don't allow going beyond tomorrow
    if (selectedDate < new Date()) {
      const newDate = new Date(selectedDate);
      newDate.setDate(newDate.getDate() + 1);
      setSelectedDate(newDate);
    }
  };

  const goToToday = () => {
    setSelectedDate(new Date());
  };

  const goToStartOfWeek = () => {
    const date = new Date(selectedDate);
    const day = date.getDay();
    const diff = day === 0 ? -6 : 1 - day; // Monday as first day
    date.setDate(date.getDate() + diff);
    
    // Check if before minimum date
    if (date >= MIN_DATE) {
      setSelectedDate(date);
    } else {
      setSelectedDate(new Date(MIN_DATE));
    }
  };

  const goToStartOfMonth = () => {
    const date = new Date(selectedDate);
    date.setDate(1);
    
    // Check if before minimum date
    if (date >= MIN_DATE) {
      setSelectedDate(date);
    } else {
      setSelectedDate(new Date(MIN_DATE));
    }
  };

  const canGoBack = () => {
    const yesterday = new Date(selectedDate);
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday >= MIN_DATE;
  };

  // Format date for display
  const getDateLabel = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selected = new Date(selectedDate);
    selected.setHours(0, 0, 0, 0);
    
    const diffTime = selected - today;
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return t('home.today');
    if (diffDays === -1) return t('home.yesterday');
    if (diffDays === 1) return t('home.tomorrow');
    
    // Format as "Mon, Jan 15"
    return selected.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const isToday = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selected = new Date(selectedDate);
    selected.setHours(0, 0, 0, 0);
    return today.getTime() === selected.getTime();
  };

  const handleMealLongPress = (meal) => {
    Alert.alert(
      meal.product_name,
      t('home.whatToDo'),
      [
        {
          text: t('home.cancel'),
          style: 'cancel',
        },
        {
          text: t('home.edit'),
          onPress: () => {
            navigation.navigate('EditMeal', { meal });
          },
        },
        {
          text: t('home.delete'),
          style: 'destructive',
          onPress: () => handleDeleteMeal(meal),
        },
      ]
    );
  };

  const handleMealToggle = (mealId) => {
    setToggledMeals(prev => {
      const newSet = new Set(prev);
      if (newSet.has(mealId)) {
        newSet.delete(mealId);
      } else {
        newSet.add(mealId);
      }
      return newSet;
    });
  };

  const handleDeleteMeal = (meal) => {
    Alert.alert(
      t('home.deleteMeal'),
      `${t('home.deleteMealConfirm')} "${meal.product_name}"?`,
      [
        {
          text: t('home.cancel'),
          style: 'cancel',
        },
        {
          text: t('home.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('meals')
                .delete()
                .eq('id', meal.id);

              if (error) throw error;

              await loadMealsForDate(selectedDate);
              await calculateStreak(); // ← ADD THIS LINE

              Alert.alert(t('home.success'), t('home.mealDeleted'));
            } catch (error) {
              console.error('Error deleting meal:', error);
              Alert.alert(t('home.error'), t('home.failedToDelete'));
            }
          },
        },
      ]
    );
  };

  // Pull to refresh
  const onRefresh = async () => {
    setRefreshing(true);
    await loadMealsForDate(selectedDate);
    await calculateStreak();
    setRefreshing(false);
  };

  const copyYesterdaysMeals = async () => {
    try {
      setCopyingMeals(true);

      if (userLoading) {
        console.log("⏳ User still loading, blocking copy");
        return;
      }

      if (!user) {
        console.log("❌ No user after loading completed");
        Alert.alert(t('home.error'), "Authentication error. Please restart the app.");
        return;
      }
      
      // Get yesterday's date in LOCAL time
      const yesterday = new Date(selectedDate);
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);
      
      const endOfYesterday = new Date(yesterday);
      endOfYesterday.setHours(23, 59, 59, 999);

      console.log('📋 Copying meals from:', yesterday.toISOString(), 'to', endOfYesterday.toISOString());

      const { data: yesterdayMeals, error } = await supabase
        .from('meals')
        .select(`
          *,
          product:food_database (*)
        `)
        .eq('user_id', user.id)
        .gte('logged_at', yesterday.toISOString())
        .lte('logged_at', endOfYesterday.toISOString());

        if (error) throw error;

        if (yesterdayMeals && yesterdayMeals.length > 0) {
          const copiedMeals = yesterdayMeals.map(meal => ({

            user_id: user.id,
            product_id: meal.product_id,
            barcode: meal.barcode,
            serving_grams: meal.serving_grams,
            serving_unit: meal.serving_unit,
            meal_type: meal.meal_type,
            image_url: meal.image_url,
            logged_at: new Date().toISOString(),

          }));

          const { error: insertError } = await supabase
            .from('meals')
            .insert(copiedMeals); // ✅ CORRECT VARIABLE

          if (insertError) throw insertError;

          // Refresh meals
          await loadMealsForDate(selectedDate);
          await calculateStreak();

          Alert.alert(
            t('home.successCopy'),
            `${t('home.copiedMealsPrefix')} ${yesterdayMeals.length} ${t('home.copiedMeals')}`
          );
        } else {
          Alert.alert(
            t('home.noMeals'),
            t('home.noMealsYesterday')
          );
        }
      } catch (error) {
        console.error('Error copying meals:', error);
        Alert.alert(t('home.error'), t('home.failedToCopy'));
      } finally {
        setCopyingMeals(false);
      }
    };

  return (
    <FrameWarning theme={theme}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <GestureDetector gesture={swipeGesture}>
          <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top', 'bottom']}>
            <AppTutorial 
                screen="Home" 
                scrollViewRef={scrollViewRef}
                  onComplete={() => {
                  console.log('🏠 Home tutorial complete');
                  measureScannerButton();
                  setShowArrowToScanner(true);
                }}
                onProfileRefresh={refreshProfile}
                tutorialRefs={{
                  caloriesCard: caloriesCardRef,
                  macroCards: macroCardsRef,
                  mealsList: mealsListRef,
                  scannerButton: scannerButtonRef,
                }}
              />

              {scannerCoords && (
                <TutorialArrow
                  visible={showArrowToScanner}
                  targetCoords={scannerCoords}
                  onSkip={() => setShowArrowToScanner(false)}
                  message={t('tutorial.tapToScan')}
                />
              )}

              {profileCoords && (
                <TutorialArrow
                  visible={showArrowToProfile}
                  targetCoords={profileCoords}
                  onSkip={() => setShowArrowToProfile(false)}
                  message={t('tutorial.tapToProfile')}
                />
              )}
            <AnimatedThemeWrapper>
              {/* ScrollView with content */}
              <ScrollView
                ref={scrollViewRef} 
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                scrollEnabled={tutorialCompleted}
                refreshControl={
                  <RefreshControl
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                    tintColor={theme.text}
                  />
                }
                showsVerticalScrollIndicator={false}
              >
                {/* Greeting Banner */}
                <GreetingBanner
                  visible={showGreeting}
                  greeting={greetingText}
                  onComplete={hideGreeting}
                />

                {/* Streak Badge - Always visible */}
                <View style={styles.streakBadgeWrapper}>
                  <View style={[styles.streakBadge, { backgroundColor: '#FF6B35' }]}>
                    <Text style={styles.streakEmoji}>🔥</Text>
                    <Text style={styles.streakNumber}>{currentStreak}</Text>
                    <Text style={styles.streakLabel}>
                      {currentStreak === 1 ? t('home.dayStreak') : t('home.daysStreak')}
                    </Text>
                  </View>
                </View>

                {/* Date Navigation */}
                <View style={styles.dateNavigation}>
                  <View style={[styles.datePicker, { backgroundColor: theme.cardBackground }]}>
                    <TouchableOpacity 
                      style={[styles.dateArrow, { opacity: canGoBack() ? 1 : 0.3 }]}
                      onPress={goToPreviousDay}
                      disabled={!canGoBack()}
                    >
                      <Text style={[styles.dateArrowText, { color: theme.text }]}>‹</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                      style={styles.dateLabel} 
                      onPress={() => tutorialCompleted && setShowCalendar(true)}
                      disabled={!tutorialCompleted}
                    >
                      <Text style={[styles.dateLabelText, { color: theme.text }]}>{getDateLabel()}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                      style={[styles.dateArrow, { opacity: isToday() ? 0.3 : 1 }]}
                      onPress={goToNextDay}
                      disabled={isToday()}
                    >
                      <Text style={[styles.dateArrowText, { color: theme.text }]}>›</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Quick Jump Buttons */}
                <View style={styles.quickJumpContainer}>
                  <TouchableOpacity 
                    style={[styles.quickJumpButton, { backgroundColor: theme.cardBackground }]}
                    onPress={goToToday}
                  >
                    <Text style={[styles.quickJumpText, { color: theme.primary }]}>{t('home.today')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.quickJumpButton, { backgroundColor: theme.cardBackground }]}
                    onPress={goToStartOfWeek}
                  >
                    <Text style={[styles.quickJumpText, { color: theme.text }]}>{t('home.startOfWeek')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.quickJumpButton, { backgroundColor: theme.cardBackground }]}
                    onPress={goToStartOfMonth}
                  >
                    <Text style={[styles.quickJumpText, { color: theme.text }]}>{t('home.startOfMonth')}</Text>
                  </TouchableOpacity>
                </View>

                {/* Layout (Bars or Cards) */}
                {layout === 'bars' ? (
                  <BarsLayout
                    theme={theme}
                    t={t}
                    loading={loading}
                    refreshing={refreshing}
                    consumed={consumed}
                    protein={consumedProtein}
                    carbs={consumedCarbs}
                    fat={consumedFat}
                    dailyGoal={totalCalories}
                    remaining={remaining}
                    proteinPercent={(consumedProtein / totalProtein) * 100}
                    carbsPercent={(consumedCarbs / totalCarbs) * 100}
                    fatPercent={(consumedFat / totalFat) * 100}
                    meals={meals}
                    isToday={isToday}
                    getDateLabel={getDateLabel}
                    copyYesterdaysMeals={copyYesterdaysMeals}
                    copyingMeals={copyingMeals}
                    handleMealToggle={handleMealToggle}
                    handleMealLongPress={handleMealLongPress}
                    toggledMeals={toggledMeals}
                    setSelectedNutrient={setSelectedNutrient}
                    setShowNutrientModal={setShowNutrientModal}
                    navigation={navigation}
                    exerciseCaloriesBurned={exerciseCaloriesBurned}
                  />
                ) : (
                  <CardsLayout
                    theme={theme}
                    t={t}
                    loading={loading}
                    refreshing={refreshing}
                    consumed={consumed}
                    protein={consumedProtein}
                    carbs={consumedCarbs}
                    fat={consumedFat}
                    dailyGoal={totalCalories}
                    remaining={remaining}
                    caloriePercent={(consumed / totalCalories) * 100}
                    proteinPercent={(consumedProtein / totalProtein) * 100}
                    carbsPercent={(consumedCarbs / totalCarbs) * 100}
                    fatPercent={(consumedFat / totalFat) * 100}
                    meals={meals}
                    isToday={isToday}
                    getDateLabel={getDateLabel}
                    copyYesterdaysMeals={copyYesterdaysMeals}
                    copyingMeals={copyingMeals}
                    handleMealToggle={handleMealToggle}
                    handleMealLongPress={handleMealLongPress}
                    toggledMeals={toggledMeals}
                    setSelectedNutrient={setSelectedNutrient}
                    setShowNutrientModal={setShowNutrientModal}
                    navigation={navigation}
                    caloriesCardRef={caloriesCardRef}
                    macroCardsRef={macroCardsRef}
                    exerciseCaloriesBurned={exerciseCaloriesBurned}
                  />
                )}

                {/* Warning Banner */}
                <CalorieWarningBanner theme={theme} t={t} />

                {/* Exercise & Water Cards - SIDE BY SIDE */}
                <View style={styles.activityCardsRow}>
                  {/* Exercise Card - LEFT SIDE */}
                  <ExerciseButton theme={theme} navigation={navigation} />

                  {/* Water Intake with Animated Pitcher */}
                  <View style={[styles.activityCard, { backgroundColor: theme.cardBackground }]}>
                    <WaterPitcher 
                      cups={waterIntake} 
                      maxCups={profile?.daily_water_goal_cups || 8}
                      theme={theme}
                    />
                    
                    {/* Water Control Buttons */}
                    {updatingWater && (
                      <ActivityIndicator size="small" color={theme.primary} />
                    )}
                    <View style={styles.waterButtons}>
                      <TouchableOpacity
                        style={[styles.waterButton, { backgroundColor: theme.border }, updatingWater && { opacity: 0.5 }]}
                        onPress={handleSubtractWater}
                        disabled={waterIntake <= 0 || updatingWater}
                      >
                        {updatingWater
                          ? <ActivityIndicator color={theme.text} />
                          : <Text style={[styles.waterButtonText, { color: theme.text }]}>−</Text>
                        }
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.waterButton, { backgroundColor: theme.primary }, updatingWater && { opacity: 0.5 }]}
                        onPress={handleAddWater}
                        disabled={updatingWater}
                      >
                        {updatingWater
                          ? <ActivityIndicator color="#fff" />
                          : <Text style={styles.waterButtonText}>+</Text>
                        }
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>

                {/*<StepsCard />*/}

                {/* Meals List */}
                <MealsList
                  theme={theme}
                  t={t}
                  loading={loading}
                  meals={meals}
                  isToday={isToday}
                  getDateLabel={getDateLabel}
                  copyYesterdaysMeals={copyYesterdaysMeals}
                  copyingMeals={copyingMeals}
                  handleMealToggle={handleMealToggle}
                  handleMealLongPress={handleMealLongPress}
                  toggledMeals={toggledMeals}
                  navigation={navigation}
                  mealsListRef={mealsListRef}
                />
              </ScrollView>

              {/* Bottom Navigation */}
              <BottomNav 
                theme={theme} 
                t={t} 
                navigation={navigation} 
                activeScreen="Home" 
                scannerButtonRef={scannerButtonRef} 
                profileButtonRef={profileButtonRef} 
              />

              {/* Calendar Modal */}
              {showCalendar && (
                <Modal
                  transparent
                  visible={showCalendar}
                  animationType="slide"
                  onRequestClose={() => setShowCalendar(false)}
                >
                  <TouchableOpacity 
                    style={styles.calendarModalOverlay}
                    activeOpacity={1}
                    onPress={() => setShowCalendar(false)}
                  >
                    <TouchableOpacity 
                      activeOpacity={1}
                      onPress={(e) => e.stopPropagation()}
                    >
                      <View style={[styles.calendarModalContent, { backgroundColor: theme.cardBackground }]}>
                        <MonthlyCalendar
                          monthlyData={monthlyData}
                          theme={theme}
                          t={t}
                          selectedDate={`${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`}
                          currentMonth={calendarMonth}
                          onMonthChange={(newMonth) => {
                            setCalendarMonth(newMonth);
                            fetchMonthlyData(newMonth.year, newMonth.month);
                          }}
                          onDateSelect={(dateStr) => {
                            const [year, month, day] = dateStr.split('-').map(Number);
                            const newDate = new Date(year, month - 1, day);
                            newDate.setHours(0, 0, 0, 0);
                            setSelectedDate(newDate);
                            setShowCalendar(false);
                          }}
                        />
                        
                        <TouchableOpacity
                          style={[styles.calendarDoneButton, { backgroundColor: theme.primary, marginTop: 15 }]}
                          onPress={() => setShowCalendar(false)}
                        >
                          <Text style={styles.calendarDoneText}>{t('home.done')}</Text>
                        </TouchableOpacity>
                      </View>
                    </TouchableOpacity>
                  </TouchableOpacity>
                </Modal>
              )}

              {/* Nutrient Modal */}
              <NutrientModal
                visible={showNutrientModal}
                nutrient={selectedNutrient}
                onClose={() => setShowNutrientModal(false)}
                theme={theme}
                currentIntake={
                  selectedNutrient === 'calories' ? consumed :
                  selectedNutrient === 'protein' ? consumedProtein :
                  selectedNutrient === 'carbs' ? consumedCarbs :
                  consumedFat
                }
                dailyGoal={
                  selectedNutrient === 'calories' ? totalCalories :
                  selectedNutrient === 'protein' ? totalProtein :
                  selectedNutrient === 'carbs' ? totalCarbs :
                  totalFat
                }
                t={t}
              />
            </AnimatedThemeWrapper>
          </SafeAreaView>
        </GestureDetector>
      </GestureHandlerRootView>
    </FrameWarning>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 20,
    paddingTop: 10,
  },
  streakBadgeWrapper: {
    alignItems: 'center',
    marginTop: 15,
  },
  streakBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  streakEmoji: {
    fontSize: 24,
    marginBottom: 2,
  },
  streakNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  streakLabel: {
    fontSize: 10,
    color: '#fff',
    marginTop: 2,
    opacity: 0.9,
  },
  greeting: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 14,
    marginTop: 5,
  },
  dateArrow: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateArrowText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  dateLabel: {
    flex: 1,
    alignItems: 'center',
  },
  dateLabelText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  dateSubtext: {
    fontSize: 11,
    marginTop: 2,
  },
  calendarButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  calendarIcon: {
    fontSize: 20,
  },
  quickJumpContainer: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 15,
    gap: 10,
  },
  quickJumpButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  quickJumpText: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  caloriesCard: {
    marginHorizontal: 20,
    marginBottom: 15,
    padding: 20,
    borderRadius: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  caloriesContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  caloriesCenter: {
    alignItems: 'center',
  },
  consumedText: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  goalText: {
    fontSize: 16,
  },
  caloriesInfo: {
    alignItems: 'center',
  },
  caloriesStat: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 14,
    marginTop: 5,
  },
  macrosCard: {
    marginHorizontal: 20,
    marginBottom: 15,
    padding: 20,
    borderRadius: 16,
  },
  macrosGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  macroItem: {
    alignItems: 'center',
  },
  macroValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#a89d9dff',
  },
  macroLabel: {
    fontSize: 12,
    marginTop: 8,
  },
  mealsCard: {
    marginHorizontal: 20,
    marginBottom: 15,
    padding: 20,
    borderRadius: 16,
  },
  mealsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  copyMealsButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  copyMealsButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 16,
    marginBottom: 5,
  },
  emptyHint: {
    fontSize: 13,
    textAlign: 'center',
  },
  mealItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
  },
  mealInfo: {
    flex: 1,
  },
  mealName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  macrosRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 4,
  },
  mealGrams: {
    fontSize: 12,
    color: '#c4b2b2ff',
  },
  macroDot: {
    fontSize: 12,
    color: '#999',
  },
  proteinText: {
    fontSize: 12,
    color: '#2196F3',
    fontWeight: '600',
  },
  carbsText: {
    fontSize: 12,
    color: '#FF9800',
    fontWeight: '600',
  },
  fatText: {
    fontSize: 12,
    color: '#9C27B0',
    fontWeight: '600',
  },
  mealCalories: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  photosGrid: {

    marginTop: 10,
  },
  photoPlaceholder: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  photoPlaceholderIcon: {
    fontSize: 48,
    marginBottom: 10,
    opacity: 0.3,
  },
  photoPlaceholderText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 5,
  },
  photoPlaceholderHint: {
    fontSize: 13,
    textAlign: 'center',
  },
  calendarModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  calendarModalContent: {
    width: '90%',
    maxWidth: 400,
    padding: 20,
    borderRadius: 20,
    alignItems: 'center',
  },
  calendarModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  calendarModalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  calendarCancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  calendarCancelText: {
    fontSize: 16,
    fontWeight: '600',
  },
  calendarDoneButton: {
    paddingVertical: 10,
    paddingHorizontal: 50,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 140,
  },
  calendarDoneText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Visual Calendar Styles
  visualCalendarCard: {
    marginHorizontal: 20,
    marginVertical: 40,
    borderRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  calendarNavHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  calendarNavButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  calendarNavText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  calendarHeaderCenter: {
    flex: 1,
    alignItems: 'center',
  },
  calendarMonthYear: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  calendarSelectLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  visualCalendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 10,
  },
  visualCalendarHeaderText: {
    width: 40,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
  },
  visualCalendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  visualCalendarCell: {
    flexBasis: '14.2857%',
    aspectRatio: 1,
    padding: '1%',
  },
  visualCalendarCellInner: {
    flex: 1,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  visualCalendarDayNumber: {
    fontSize: 14,
    fontWeight: '600',
  },
  mealDot: {
    position: 'absolute',
    bottom: 4,
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  calendarCloseButton: {
    marginTop: 20,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  calendarCloseText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  infoIcon: {
    fontSize: 16,
    color: '#2196F3',
    marginLeft: 5,
  },
  nutrientModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  nutrientModalCard: {
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingBottom: 40,
    maxHeight: '85%',
  },
  nutrientModalHeader: {
    paddingVertical: 20,
    paddingHorizontal: 30,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    alignItems: 'center',
  },
  nutrientModalIcon: {
    fontSize: 50,
    marginBottom: 8,
  },
  nutrientModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    letterSpacing: 1,
  },
  nutrientProgressSection: {
    paddingHorizontal: 30,
    paddingTop: 25,
    paddingBottom: 20,
  },
  nutrientProgressLabel: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  nutrientProgressBar: {
    height: 12,
    backgroundColor: '#e0e0e0',
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 8,
  },
  nutrientProgressFill: {
    height: '100%',
    borderRadius: 10,
  },
  nutrientProgressText: {
    fontSize: 13,
    fontWeight: '600',
  },
  nutrientBenefitsSection: {
    paddingHorizontal: 30,
    paddingVertical: 15,
  },
  nutrientSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  nutrientBenefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  nutrientBenefitIcon: {
    fontSize: 20,
    marginRight: 12,
    width: 28,
  },
  nutrientBenefitText: {
    fontSize: 14,
    flex: 1,
    lineHeight: 20,
  },
  nutrientFoundInSection: {
    paddingHorizontal: 30,
    paddingVertical: 15,
  },
  nutrientFoundInText: {
    fontSize: 14,
    lineHeight: 22,
  },
  nutrientGoalSection: {
    paddingHorizontal: 30,
    paddingTop: 10,
    paddingBottom: 20,
    alignItems: 'center',
  },
  nutrientGoalText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  nutrientModalButton: {
    marginHorizontal: 30,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  nutrientModalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  sodiumText: {
    fontSize: 12,
    color: '#E91E63',
  },
  sugarText: {
    fontSize: 12,
    color: '#00BCD4',
  },
  fiberText: {
    fontSize: 12,
    color: '#4CAF50',
  },
  dateNavigation: {
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: 10,
  },
  datePicker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 15,
    padding: 12,
    borderRadius: 12,
  },
  activityCardsRow: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 15,
    gap: 10,
  },
  activityCard: {
    flex: 1,
    padding: 10,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityCardTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 10,
  },
  waterProgress: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  waterButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  waterButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  waterButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 18,
    fontWeight: '600',
  },
  quickEntrySection: {
    marginHorizontal: 20,
    marginBottom: 20,
  },
  quickEntryHeader: {
    marginBottom: 12,
  },
  quickEntryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  quickEntrySubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  quickEntryScroll: {
    marginHorizontal: -5,
  },
  quickEntryCard: {
    width: 90,
    padding: 12,
    borderRadius: 12,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  quickEntryEmoji: {
    fontSize: 32,
    marginBottom: 6,
  },
  quickEntryName: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 4,
  },
  quickEntryCals: {
    fontSize: 10,
  },
  waterCard: {
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
    alignItems: 'center',
    flex: 1,
  },
  waterButtonsContainer: {
    flexDirection: 'row',
    marginTop: 15,
    gap: 10,
  },
  waterButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    flex: 1,
  },
  waterButtonText: {
    color: '#fff',
    fontWeight: '600',
    textAlign: 'center',
    fontSize: 14,
  },
});