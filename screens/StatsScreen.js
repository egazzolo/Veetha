import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Dimensions, Animated, Alert, ActivityIndicator, Modal } from 'react-native';
import { BlurView } from 'expo-blur';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSwipeNavigation } from '../utils/useSwipeNavigation';
import { useTheme } from '../utils/ThemeContext';
import { useLanguage } from '../utils/LanguageContext';
import { supabase } from '../utils/supabase';
import { useFocusEffect } from '@react-navigation/native';
import { logScreen, logEvent, logMealLogged } from '../utils/analytics';
import { useUserMode } from '../utils/UserModeContext';
import AnimatedThemeWrapper from '../components/AnimatedThemeWrapper';
import ThemedScreenBackground from '../components/ThemedScreenBackground';
import BottomNav from '../components/BottomNav';
import ExerciseHistoryScreen from './ExerciseHistoryScreen';
import ProgressPanel from './ProgressPanel';
import AppIcon from '../components/AppIcon';
import { usePremiumStatus } from '../utils/usePremiumStatus';
import AppTutorial from '../components/AppTutorial';
import TutorialArrow from '../components/TutorialArrow';
import BrandedAlert from '../components/BrandedAlert';
import { useTutorial } from '../utils/TutorialContext';

const { width } = Dimensions.get('window');

// Darkens a 6-digit hex color by the given amount (0-1) -- used to derive
// the report-picker button color from the current theme's own background
// instead of a hardcoded shade, so it works across every theme.
const darkenColor = (hex, amount = 0.25) => {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.max(0, Math.round(((num >> 16) & 0xff) * (1 - amount)));
  const g = Math.max(0, Math.round(((num >> 8) & 0xff) * (1 - amount)));
  const b = Math.max(0, Math.round((num & 0xff) * (1 - amount)));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
};

// Rapidly counts up/down to `value` on every change, like a slot-machine
// reel settling on a number, rather than just snapping to the new digits.
function SlotNumber({ value, style }) {
  const anim = useRef(new Animated.Value(value)).current;
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    const listenerId = anim.addListener(({ value: v }) => {
      setDisplay(Math.round(v));
    });
    Animated.timing(anim, {
      toValue: value,
      duration: 700,
      useNativeDriver: false,
    }).start();
    return () => anim.removeListener(listenerId);
  }, [value]);

  return <Text style={style}>{display}</Text>;
}

export default function StatsScreen({ navigation }) {
  const { theme, isDark } = useTheme();
  const { t } = useLanguage();
  const { isGuest: isGuestMode } = useUserMode();
  const [weeklyData, setWeeklyData] = useState([]);
  const [monthlyData, setMonthlyData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState(null);
  const [activeTab, setActiveTab] = useState('week');
  const periodIndicatorAnim = useRef(new Animated.Value(0)).current;
  const pushAnim = useRef(new Animated.Value(0)).current;
  const [pushState, setPushState] = useState(null); // { from, to, direction } while a tab-switch push transition is playing
  const [panelWidth, setPanelWidth] = useState(width);
  // Which way the panel slides in on a tab switch -- flipped via the
  // long-press "Invert Swipe" prompt on the period selector, persisted so it
  // sticks across app restarts like the other display prefs (theme, etc).
  const [invertSwipeDirection, setInvertSwipeDirection] = useState(false);
  const weekBarsAnim = useRef(new Animated.Value(0)).current;
  const weekBarsAnimatedRef = useRef(false);
  const calendarScaleAnim = useRef(new Animated.Value(0.3)).current;
  const calendarWipeAnim = useRef(new Animated.Value(0)).current;
  const calendarAnimatedRef = useRef(false);
  const { isPremium } = usePremiumStatus();
  const [currentStreak, setCurrentStreak] = useState(0);
  const MIN_DATE = new Date(2025, 10, 1); // November 1, 2025

  // Tutorial
  const { startTutorial } = useTutorial();
  const scrollViewRef = useRef(null);
  const toggleRef = useRef(null);
  const chartRef = useRef(null);
  const summaryRef = useRef(null);
  const reportsRef = useRef(null);
  const tutorialStartedRef = useRef(false);
  const [checkingTutorial, setCheckingTutorial] = useState(true);
  // Once the Stats tutorial finishes, point the hand at the Profile tab next
  const profileButtonRef = useRef(null);
  const [profileCoords, setProfileCoords] = useState(null);
  const [showArrowToProfile, setShowArrowToProfile] = useState(false);

  // Swipe navigation -- disabled during the tutorial's freeze/arrow phases,
  // which are plain View overlays (not a native Modal), so unlike the
  // coach-mark steps themselves they don't stop this Pan gesture from
  // reaching the screen underneath and swiping the user away mid-tutorial.
  const swipeGesture = useSwipeNavigation(navigation, 'Stats', !checkingTutorial && !showArrowToProfile);

  // Report type + period pickers -- both float over the (blurred) Stats
  // screen itself, one after the other, as soon as "Reports" is tapped.
  // Only once both are chosen does it navigate into ExportReportScreen,
  // which now just generates the report immediately (no "Start Report"
  // step, no UI of its own).
  const [showReportTypeModal, setShowReportTypeModal] = useState(false);
  const [showReportPeriodModal, setShowReportPeriodModal] = useState(false);
  const [pendingReportType, setPendingReportType] = useState(null);
  const REPORT_TYPE_LABELS = {
    macros: 'Macronutrient Report',
    exercise: 'Exercise Report',
    both: 'Macronutrient & Exercise Report',
  };
  const selectReportType = (reportType) => {
    setPendingReportType(reportType);
    setShowReportTypeModal(false);
    setShowReportPeriodModal(true);
  };
  const selectReportPeriod = (period) => {
    setShowReportPeriodModal(false);
    navigation.navigate('ExportReport', { reportType: pendingReportType, period });
  };
  const [showWhatsIncludedModal, setShowWhatsIncludedModal] = useState(false);
  const whatsIncludedMessage = `• ${t('stats.exportReport.dailyCalories')}\n• ${t('stats.exportReport.macroBreakdown')}\n• ${t('stats.exportReport.goalComparison')}\n• ${t('stats.exportReport.summaryStats')}\n• Exercise history & breakdown (sets, reps, weight)`;

  const measureProfileButton = () => {
    if (profileButtonRef.current) {
      profileButtonRef.current.measureInWindow((x, y, w, h) => {
        setProfileCoords({ top: y, left: x, width: w, height: h });
        // Re-freezing (below, in onComplete) closes the gap between
        // AppTutorial's Modal closing and TutorialArrow actually rendering
        // (it's gated on profileCoords, which only exists after this async
        // measureInWindow round-trip) -- release it now that TutorialArrow
        // has what it needs to render and block taps itself.
        setCheckingTutorial(false);
      });
    } else {
      setCheckingTutorial(false);
    }
  };

  // Re-read on every focus (not just mount) so a change made in Preferences
  // takes effect on returning to Stats without needing an app restart.
  useFocusEffect(
    React.useCallback(() => {
      AsyncStorage.getItem('statsInvertSwipeDirection').then((val) => {
        setInvertSwipeDirection(val === 'true');
      });
    }, [])
  );

  // Fetch user profile
  const fetchProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  // Fetch weekly data (current week: Monday-Sunday)
  const fetchWeeklyData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const dailyGoal = profile?.daily_calorie_goal || 1650;

      // Get start of current week (Monday) - LOCAL TIME
      const today = new Date();
      const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
      const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // If Sunday, go back 6 days
      
      const startDate = new Date(today);
      startDate.setDate(today.getDate() - daysFromMonday);
      startDate.setHours(0, 0, 0, 0);

      // Get end of current week (Sunday)
      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);
      endDate.setHours(23, 59, 59, 999);

      console.log('📅 Week range:', startDate.toLocaleDateString(), 'to', endDate.toLocaleDateString());

      // Get ALL meals from current week in ONE query
      const { data: meals, error } = await supabase
        .from('meals')
        .select(`
          logged_at,
          product:food_database!meals_product_fk (
            calories,
            protein,
            carbs,
            fat
          )
        `)
        .eq('user_id', user.id)
        .gte('logged_at', startDate.toISOString())
        .lte('logged_at', endDate.toISOString())
        .order('logged_at', { ascending: true });

      if (error) throw error;

      // Group meals by LOCAL date (not UTC!)
      const mealsByDate = {};
      meals.forEach(meal => {
        // Convert to local date string
        const mealDate = new Date(meal.logged_at);
        const dateStr = mealDate.toLocaleDateString('en-CA'); // YYYY-MM-DD in local time
        if (!mealsByDate[dateStr]) {
          mealsByDate[dateStr] = [];
        }
        mealsByDate[dateStr].push(meal);
      });

      // Build week data for Monday-Sunday
      const weekData = [];
      for (let i = 0; i < 7; i++) {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + i);
        const dateStr = date.toLocaleDateString('en-CA'); // YYYY-MM-DD in local time
        const dayMeals = mealsByDate[dateStr] || [];

        const totalCalories = dayMeals.reduce((sum, m) => sum + (m.product?.calories || 0), 0);
        const totalProtein = dayMeals.reduce((sum, m) => sum + (m.product?.protein || 0), 0);
        const totalCarbs = dayMeals.reduce((sum, m) => sum + (m.product?.carbs || 0), 0);
        const totalFat = dayMeals.reduce((sum, m) => sum + (m.product?.fat || 0), 0);

        weekData.push({
          day: date.toLocaleDateString('en-US', { weekday: 'short' }),
          date: dateStr,
          calories: Math.round(totalCalories),
          protein: Math.round(totalProtein),
          carbs: Math.round(totalCarbs),
          fat: Math.round(totalFat),
          goal: dailyGoal,
          mealsCount: dayMeals.length,
        });
      }

      console.log('📊 Weekly data (Mon-Sun):', weekData);
      setWeeklyData(weekData);
    } catch (error) {
      console.error('Error fetching weekly data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch monthly data (current month)
  const fetchMonthlyData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get first and last day of CURRENT MONTH (local time)
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth();
      const firstDay = new Date(year, month, 1);
      firstDay.setHours(0, 0, 0, 0);
      const lastDay = new Date(year, month + 1, 0);
      lastDay.setHours(23, 59, 59, 999);

      // Get ALL meals from current month in ONE query
      const { data: meals, error } = await supabase
        .from('meals')
        .select(`
          logged_at,
          product:food_database!meals_product_fk (
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

      // Build month data for ALL days in current month
      const monthData = [];
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      
      for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day);
        const dateStr = date.toLocaleDateString('en-CA'); // YYYY-MM-DD in local time
        const dayMeals = mealsByDate[dateStr] || [];

        const totalCalories = dayMeals.reduce((sum, m) => sum + (m.product?.calories || 0), 0);

        monthData.push({
          date: dateStr,
          calories: Math.round(totalCalories),
          mealsCount: dayMeals.length,
          hasData: dayMeals.length > 0,
        });
      }

      setMonthlyData(monthData);
      console.log('📅 Loaded', monthData.length, 'days for current month');
    } catch (error) {
      console.error('Error fetching monthly data:', error);
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
      console.error('Error calculating streak:', error?.message || error);
    }
  };

  // Fetch all data in parallel
  const fetchAllData = async () => {
    try {
      console.log('📊 Stats: Starting data fetch...');
      const startTime = Date.now();
      
      setLoading(true);
      
      // Run ALL queries in PARALLEL
      await Promise.all([
        fetchProfile(),
        fetchWeeklyData(),
        fetchMonthlyData(),
      ]);
      
      const elapsed = Date.now() - startTime;
      console.log(`✅ Stats: Data loaded in ${elapsed}ms`);
    } catch (error) {
      console.error('❌ Stats: Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    logScreen('Stats');
    calculateStreak();
  }, []);

  // Initial load
  useEffect(() => {
    fetchAllData();
  }, []);

  // Apply the user's default-landing-view preference (Preferences screen) on
  // first mount only -- a direct setActiveTab (not changeTab) just moves the
  // small pill indicator, it doesn't trigger the full panel-push transition.
  useEffect(() => {
    AsyncStorage.getItem('default_stats_tab').then((val) => {
      if (val === 'month' || val === 'exercise') {
        setActiveTab(val);
      }
    });
  }, []);

  useEffect(() => {
    const index = activeTab === 'week' ? 0 : activeTab === 'month' ? 1 : activeTab === 'exercise' ? 2 : 3;
    Animated.spring(periodIndicatorAnim, {
      toValue: index,
      friction: 8,
      tension: 60,
      useNativeDriver: false,
    }).start();
  }, [activeTab]);

  useEffect(() => {
    if (!weekBarsAnimatedRef.current && weeklyData.length > 0) {
      weekBarsAnimatedRef.current = true;
      Animated.timing(weekBarsAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: false,
      }).start();
    }
  }, [weeklyData]);

  useEffect(() => {
    if (!calendarAnimatedRef.current && activeTab === 'month' && monthlyData.length > 0) {
      calendarAnimatedRef.current = true;
      Animated.sequence([
        Animated.timing(calendarScaleAnim, {
          toValue: 1,
          duration: 450,
          useNativeDriver: true,
        }),
        Animated.timing(calendarWipeAnim, {
          toValue: 42, // upper bound on grid cells (6 rows x 7 cols); extra headroom is harmless
          duration: 1400,
          useNativeDriver: false,
        }),
      ]).start();
    }
  }, [activeTab, monthlyData]);

  const tabIndexOf = (tab) => (tab === 'week' ? 0 : tab === 'month' ? 1 : tab === 'exercise' ? 2 : 3);
  const changeTab = (newTab) => {
    if (newTab === activeTab) return;
    let direction = tabIndexOf(newTab) > tabIndexOf(activeTab) ? -1 : 1;
    if (invertSwipeDirection) direction *= -1;
    setPushState({ from: activeTab, to: newTab, direction });
    setActiveTab(newTab);
    pushAnim.setValue(0);
    Animated.timing(pushAnim, {
      toValue: 1,
      duration: 420,
      useNativeDriver: true,
    }).start(() => {
      setPushState(null);
    });
  };

  // Refresh on screen focus (with throttling)
  const lastFetchTime = useRef(0);
  useFocusEffect(
    React.useCallback(() => {
      const now = Date.now();
      const timeSinceLastFetch = now - lastFetchTime.current;
      
      // Only refetch if more than 5 seconds since last fetch
      if (timeSinceLastFetch > 5000) {
        console.log('🔄 Stats: Refetching data (screen focused)');
        lastFetchTime.current = now;
        fetchAllData();
      } else {
        console.log('⏭️ Stats: Skipping refetch (too recent)');
      }
    }, [])
  );

  // Start the Stats tutorial once data has loaded and the panel (toggle,
  // chart, summary, reports) has actually rendered -- mirrors HomeScreen's
  // ref-readiness polling, since the week panel's content (chart/summary)
  // doesn't exist until `loading` resolves.
  useEffect(() => {
    if (isGuestMode) {
      setCheckingTutorial(false);
      return;
    }
    if (loading || tutorialStartedRef.current) return;

    let cancelled = false;
    let checkCount = 0;
    const MAX_CHECKS = 10;

    const checkRefsReady = () => {
      if (cancelled) return;
      checkCount++;
      const refsReady =
        toggleRef.current !== null &&
        chartRef.current !== null &&
        summaryRef.current !== null &&
        reportsRef.current !== null;

      if (refsReady || checkCount > MAX_CHECKS) {
        if (refsReady) {
          tutorialStartedRef.current = true;
          startTutorial('Stats');
          // AppTutorial's own onVisible fires once its coach-mark overlay
          // actually becomes visible, which is the real release signal --
          // but startTutorial() can also decide NOT to start (e.g. this
          // user already completed the Stats tutorial), in which case
          // AppTutorial never measures anything and onVisible never fires.
          // This fallback covers that case. Deliberately NOT gated on
          // `cancelled`: once tutorialStartedRef is true, every later
          // re-run of this effect (e.g. `loading` flipping again from an
          // unrelated focus refetch) exits immediately via the guard above
          // and never retries releasing the freeze -- so once committed,
          // always release regardless, or the screen stays frozen forever.
          setTimeout(() => {
            setCheckingTutorial(false);
          }, 800);
        } else {
          setCheckingTutorial(false);
        }
        return;
      }
      setTimeout(checkRefsReady, 150);
    };

    checkRefsReady();

    // Failsafe: never leave the screen frozen more than 6s
    const failsafeId = setTimeout(() => {
      setCheckingTutorial(false);
    }, 6000);

    return () => {
      cancelled = true;
      clearTimeout(failsafeId);
    };
  }, [loading, isGuestMode]);

  // Calculate statistics
  const daysWithData = activeTab === 'week'
    ? weeklyData.filter(d => d.mealsCount > 0)
    : monthlyData.filter(d => d.hasData);
  const avgCalories = daysWithData.length > 0
    ? Math.round(daysWithData.reduce((sum, d) => sum + d.calories, 0) / daysWithData.length)
    : 0;
  
  const avgProtein = daysWithData.length > 0
    ? Math.round(daysWithData.reduce((sum, d) => sum + d.protein, 0) / daysWithData.length)
    : 0;
  
  const avgCarbs = daysWithData.length > 0
    ? Math.round(daysWithData.reduce((sum, d) => sum + d.carbs, 0) / daysWithData.length)
    : 0;
  
  const avgFat = daysWithData.length > 0
    ? Math.round(daysWithData.reduce((sum, d) => sum + d.fat, 0) / daysWithData.length)
    : 0;

  const dailyGoal = profile?.daily_calorie_goal || 1650;
  const maxCalories = Math.max(...weeklyData.map(d => d.calories), dailyGoal, 100);

  // Goal achievement
  const daysOverGoal = weeklyData.filter(d => d.calories > dailyGoal).length;
  const daysUnderGoal = weeklyData.filter(d => d.calories > 0 && d.calories <= dailyGoal).length;
  const goalAchievement = daysWithData.length > 0 
    ? Math.round((daysUnderGoal / daysWithData.length) * 100)
    : 0;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <GestureDetector gesture={swipeGesture}>
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
          <ThemedScreenBackground />
          <AppTutorial
            screen="Stats"
            scrollViewRef={scrollViewRef}
            onVisible={() => setCheckingTutorial(false)}
            onComplete={() => {
              console.log('📊 Stats tutorial complete');
              // Re-freeze through the gap between AppTutorial's Modal
              // closing and TutorialArrow actually rendering (it needs
              // profileCoords, set asynchronously below) -- otherwise
              // the real Profile tab is briefly tappable in between.
              setCheckingTutorial(true);
              measureProfileButton();
              setShowArrowToProfile(true);
            }}
            tutorialRefs={{
              toggle: toggleRef,
              chart: chartRef,
              summary: summaryRef,
              reports: reportsRef,
            }}
          />
          {profileCoords && (
            <TutorialArrow
              visible={showArrowToProfile}
              targetCoords={profileCoords}
              onSkip={() => setShowArrowToProfile(false)}
              onTargetPress={() => {
                setShowArrowToProfile(false);
                navigation.navigate('Profile', { animationDirection: 'right' });
              }}
              message={t('tutorial.tapToProfile')}
              offsetX={-6}
            />
          )}
          <AnimatedThemeWrapper>
            <ScrollView ref={scrollViewRef} style={styles.scrollView} showsVerticalScrollIndicator={false} scrollEnabled={!checkingTutorial}>
              {/* Header */}
              <View style={styles.header}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={[styles.headerTitle, { color: theme.text }]}>{t('stats.title')}</Text>
                    <AppIcon name="chart" size={42} style={{ marginLeft: 8 }} />
                  </View>
              </View>

              {/* Period Selector */}
              <View ref={toggleRef} style={[styles.periodSelector, { backgroundColor: `${theme.cardBackground}80` }]}>
                <Animated.View
                  style={[
                    styles.periodIndicator,
                    {
                      backgroundColor: theme.primary,
                      left: periodIndicatorAnim.interpolate({
                        inputRange: [0, 1, 2, 3],
                        outputRange: ['0%', '25%', '50%', '75%'],
                      }),
                    },
                  ]}
                />
                <TouchableOpacity
                  style={styles.periodButton}
                  onPress={() => changeTab('week')}
                >
                  <Text style={[styles.periodText, { color: activeTab === 'week' ? '#fff' : theme.textSecondary }]}>
                    {t('stats.week')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.periodButton}
                  onPress={() => changeTab('month')}
                >
                  <Text style={[styles.periodText, { color: activeTab === 'month' ? '#fff' : theme.textSecondary }]}>
                    {t('stats.month')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.periodButton}
                  onPress={() => changeTab('exercise')}
                >
                  <Text style={[ styles.periodText, { color: activeTab === 'exercise' ? '#fff' : theme.textSecondary }]}>
                    {t('stats.exercise')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.periodButton}
                  onPress={() => changeTab('progress')}
                >
                  <Text style={[ styles.periodText, { color: activeTab === 'progress' ? '#fff' : theme.textSecondary }]}>
                    {t('stats.progress')}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Quick Stats Summary */}
              <View style={styles.summaryContainer}>
                <View style={styles.summaryCard}>
                  <SlotNumber value={avgCalories} style={[styles.summaryValue, { color: theme.primary }]} />
                  <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>
                    {activeTab === 'month' ? 'Avg Monthly' : t('stats.avgDaily')}
                  </Text>
                  <Text style={[styles.summaryUnit, { color: theme.textTertiary }]}>{t('stats.kcal')}</Text>
                </View>

                <View style={styles.summaryCard}>
                  <SlotNumber value={daysWithData.length} style={[styles.summaryValue, { color: theme.success }]} />
                  <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>{t('stats.daysLogged')}</Text>
                  <Text style={[styles.summaryUnit, { color: theme.textTertiary }]}>
                    {activeTab === 'week'
                      ? (t('stats.thisWeek') || 'this week')
                      : (t('stats.thisMonth') || 'this month')
                    }
                  </Text>
                </View>

                <View style={styles.summaryCard}>
                  <SlotNumber value={currentStreak} style={[styles.summaryValue, { color: theme.warning }]} />
                  <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>{t('stats.streak')}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={[styles.summaryUnit, { color: theme.textTertiary }]}>{t('stats.days')}</Text>
                      <AppIcon name="streak" size={14} tintColor="#FF6B35" style={{ marginLeft: 4 }} />
                    </View>
                </View>
              </View>

              {(() => {
                const weekPanel = (
                <>
                  {isGuestMode && (
                    <View style={[styles.guestBanner, { backgroundColor: theme.cardBackground, borderColor: theme.primary }]}>
                      <Text style={[styles.guestBannerText, { color: theme.text }]}>
                        {t('guest.weeklyProgress')}
                      </Text>
                      <TouchableOpacity
                        style={[styles.guestBannerBtn, { backgroundColor: theme.primary }]}
                        onPress={() => navigation.reset({ index: 0, routes: [{ name: 'Landing' }] })}
                      >
                        <Text style={styles.guestBannerBtnText}>{t('guest.signUpLogIn')}</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                  {/* Weekly Bar Chart */}
                  <View ref={chartRef} style={[styles.chartCard, { backgroundColor: theme.cardBackground }]}>
                    <Text style={[styles.cardTitle, { color: theme.text }]}>{t('stats.weeklyCals')}</Text>
                    
                    {loading ? (
                      <Text style={[styles.loadingText, { color: theme.textSecondary }]}>{t('stats.loading')}</Text>
                    ) : (
                      <>
                        <View style={styles.chart}>
                          {weeklyData.map((day, index) => {
                            const isToday = day.date === new Date().toLocaleDateString('en-CA');
                            const barHeight = (day.calories / maxCalories) * 150;
                            const isOverGoal = day.calories > dailyGoal;
                            const hasData = day.calories > 0;

                            return (
                              <View key={index} style={styles.barContainer}>
                                <View style={styles.barWrapper}>
                                  {hasData && (
                                    <>
                                      <Text style={[styles.barValue, { color: theme.text }]}>
                                        {day.calories}
                                      </Text>
                                      <Animated.View
                                        style={[
                                          styles.bar,
                                          {
                                            height: weekBarsAnim.interpolate({
                                              inputRange: [0, 1],
                                              outputRange: [0, barHeight],
                                            }),
                                            backgroundColor: isOverGoal ? theme.warning : theme.primary,
                                          },
                                        ]}
                                      />
                                    </>
                                  )}
                                  {!hasData && (
                                    <View style={[styles.emptyBar, { backgroundColor: theme.border }]} />
                                  )}
                                </View>
                                <Text style={[
                                  styles.barLabel,
                                  { color: isToday ? theme.primary : theme.textSecondary }
                                ]}>
                                  {day.day}
                                </Text>
                              </View>
                            );
                          })}
                        </View>

                        {/* Goal Line Legend */}
                        <View style={styles.legend}>
                          <View style={styles.legendItem}>
                            <View style={[styles.legendDot, { backgroundColor: theme.primary }]} />
                            <Text style={[styles.legendText, { color: theme.textSecondary }]}>
                              {t('stats.atUnderGoal')}
                            </Text>
                          </View>
                          <View style={styles.legendItem}>
                            <View style={[styles.legendDot, { backgroundColor: theme.warning }]} />
                            <Text style={[styles.legendText, { color: theme.textSecondary }]}>
                              {t('stats.overGoal')}
                            </Text>
                          </View>
                        </View>
                      </>
                    )}
                  </View>

                  {/* Weekly Summary -- styled like a loose-leaf notebook
                      page instead of a filled card: no background fill,
                      punched holes and a red margin rule down the left, and
                      pale blue ruled lines under each row. */}
                  <View ref={summaryRef} style={styles.notebookCard}>
                    <View style={styles.notebookHolesColumn} pointerEvents="none">
                      <View style={[styles.notebookHole, { backgroundColor: theme.background, borderColor: 'rgba(150, 120, 80, 0.4)' }]} />
                      <View style={[styles.notebookHole, { backgroundColor: theme.background, borderColor: 'rgba(150, 120, 80, 0.4)' }]} />
                      <View style={[styles.notebookHole, { backgroundColor: theme.background, borderColor: 'rgba(150, 120, 80, 0.4)' }]} />
                    </View>
                    <View style={[styles.notebookMarginLine, { backgroundColor: theme.notebookMargin || 'rgba(214, 80, 80, 0.45)' }]} />
                    <Text style={[styles.cardTitle, styles.notebookTitle, { color: theme.text, borderBottomColor: theme.notebookRule || 'rgba(90, 130, 190, 0.4)' }]}>
                      {t('stats.weeklySummary')}
                    </Text>

                    <View style={[styles.notebookRow, { borderBottomColor: theme.notebookRule || 'rgba(90, 130, 190, 0.4)' }]}>
                      <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>
                        {t('stats.avgCalories')}
                      </Text>
                      <Text style={[styles.detailValue, { color: theme.text }]}>
                        {avgCalories} kcal
                      </Text>
                    </View>

                    <View style={[styles.notebookRow, { borderBottomColor: theme.notebookRule || 'rgba(90, 130, 190, 0.4)' }]}>
                      <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>
                        {t('stats.avgProtein')}
                      </Text>
                      <Text style={[styles.detailValue, { color: theme.text }]}>
                        {avgProtein}g
                      </Text>
                    </View>

                    <View style={[styles.notebookRow, { borderBottomColor: theme.notebookRule || 'rgba(90, 130, 190, 0.4)' }]}>
                      <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>
                        {t('stats.avgCarbs')}
                      </Text>
                      <Text style={[styles.detailValue, { color: theme.text }]}>
                        {avgCarbs}g
                      </Text>
                    </View>

                    <View style={[styles.notebookRow, styles.notebookRowLast]}>
                      <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>
                        {t('stats.avgFat')}
                      </Text>
                      <Text style={[styles.detailValue, { color: theme.text }]}>
                        {avgFat}g
                      </Text>
                    </View>

                  </View>
                </>
                );

                const monthPanel = (
                  <>
                    {!isPremium ? (
                      <View style={[styles.chartCard, { backgroundColor: theme.cardBackground, alignItems: 'center', paddingVertical: 40 }]}>
                        <Text style={{ fontSize: 48, marginBottom: 16 }}>🔒</Text>
                        <Text style={[styles.cardTitle, { color: theme.text, textAlign: 'center', marginBottom: 20 }]}>
                          Monthly analytics is a Premium feature
                        </Text>
                        <TouchableOpacity
                          style={{ backgroundColor: theme.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10 }}
                          onPress={() => navigation.navigate('Paywall', { highlightFeature: 'Historical monthly stats' })}
                        >
                          <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>Go Premium</Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <>
                        {isGuestMode && (
                          <View style={[styles.guestBanner, { backgroundColor: theme.cardBackground, borderColor: theme.primary }]}>
                            <Text style={[styles.guestBannerText, { color: theme.text }]}>
                              {t('guest.monthlyProgress')}
                            </Text>
                            <TouchableOpacity
                              style={[styles.guestBannerBtn, { backgroundColor: theme.primary }]}
                              onPress={() => navigation.reset({ index: 0, routes: [{ name: 'Landing' }] })}
                            >
                              <Text style={styles.guestBannerBtnText}>{t('guest.signUpLogIn')}</Text>
                            </TouchableOpacity>
                          </View>
                        )}
                        {/* Monthly Calendar */}
                        <View style={[styles.chartCard, { backgroundColor: theme.cardBackground }]}>
                          <Text style={[styles.cardTitle, { color: theme.text }]}>{t('stats.monthlyActivity')}</Text>
                          <Text style={[styles.cardSubtitle, { color: theme.textTertiary }]}>
                            {t('stats.currentMonth')}
                          </Text>

                          {/* Weekday Headers */}
                          <View style={styles.calendarHeader}>
                            {t('stats.weekdays').map((day, index) => (
                              <Text key={index} style={[styles.calendarHeaderText, { color: theme.textTertiary }]}>
                                {day}
                              </Text>
                            ))}
                          </View>

                          {/* Calendar Grid */}
                          <Animated.View style={[styles.calendarGrid, { transform: [{ scale: calendarScaleAnim }] }]}>
                            {(() => {
                              const now = new Date();
                              const year = now.getFullYear();
                              const month = now.getMonth();
                              const firstDay = new Date(year, month, 1);
                              const lastDay = new Date(year, month + 1, 0);
                              const daysInMonth = lastDay.getDate();

                              let firstDayOfWeek = firstDay.getDay();
                              firstDayOfWeek = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;

                              const days = [];

                              for (let i = 0; i < firstDayOfWeek; i++) {
                                days.push(null);
                              }

                              for (let day = 1; day <= daysInMonth; day++) {
                                const dateStr = new Date(year, month, day).toISOString().split('T')[0];
                                const dayData = monthlyData.find(d => d.date === dateStr);
                                days.push({
                                  day,
                                  date: dateStr,
                                  mealsCount: dayData?.mealsCount || 0,
                                  hasData: dayData?.hasData || false,
                                });
                              }

                              return days.map((dayData, index) => {
                                if (!dayData) {
                                  return <View key={`empty-${index}`} style={styles.calendarCell} />;
                                }

                                let intensity = 0;
                                if (dayData.mealsCount >= 3) intensity = 1;
                                else if (dayData.mealsCount >= 1) intensity = 0.6;

                                const bgColor = dayData.mealsCount > 0
                                  ? `${theme.primary}${Math.round(intensity * 255).toString(16).padStart(2, '0')}`
                                  : theme.border;

                                const today = new Date();
                                today.setHours(0, 0, 0, 0);
                                const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
                                const isToday = dayData.date === todayStr;

                                const hasMeals = dayData.mealsCount > 0;

                                return (
                                  <View key={dayData.date} style={styles.calendarCell}>
                                    <View
                                      style={[
                                        styles.calendarCellInner,
                                        { backgroundColor: hasMeals ? theme.border : bgColor },
                                        isToday && { borderWidth: 2, borderColor: theme.primary },
                                      ]}
                                    >
                                      {hasMeals && (
                                        <Animated.View
                                          pointerEvents="none"
                                          style={[
                                            StyleSheet.absoluteFill,
                                            {
                                              backgroundColor: bgColor,
                                              borderRadius: 6,
                                              opacity: calendarWipeAnim.interpolate({
                                                inputRange: [index, index + 1],
                                                outputRange: [0, 1],
                                                extrapolate: 'clamp',
                                              }),
                                            },
                                          ]}
                                        />
                                      )}
                                      <Text style={[
                                        styles.calendarDayNumber,
                                        { color: hasMeals ? '#fff' : theme.textTertiary }
                                      ]}>
                                        {dayData.day}
                                      </Text>
                                    </View>
                                  </View>
                                );
                              });
                            })()}
                          </Animated.View>

                          <View style={styles.heatmapLegend}>
                            <View style={styles.heatmapLegendItem}>
                              <View style={[styles.heatmapLegendBox, { backgroundColor: theme.border }]} />
                              <Text style={[styles.heatmapLegendText, { color: theme.textTertiary }]}>
                                {t('stats.noMeals')}
                              </Text>
                            </View>
                            <View style={styles.heatmapLegendItem}>
                              <View style={[styles.heatmapLegendBox, { backgroundColor: `${theme.primary}99` }]} />
                              <Text style={[styles.heatmapLegendText, { color: theme.textTertiary }]}>
                                {t('stats.oneTwoMeals')}
                              </Text>
                            </View>
                            <View style={styles.heatmapLegendItem}>
                              <View style={[styles.heatmapLegendBox, { backgroundColor: theme.primary }]} />
                              <Text style={[styles.heatmapLegendText, { color: theme.textTertiary }]}>
                                {t('stats.threePlusMeals')}
                              </Text>
                            </View>
                          </View>
                        </View>

                        {/* Monthly Stats -- same torn notebook-sheet
                            treatment as Weekly Summary: no background fill,
                            punched holes and a red margin rule down the
                            left, pale blue ruled lines under each row. */}
                        <View style={styles.notebookCard}>
                          <View style={styles.notebookHolesColumn} pointerEvents="none">
                            <View style={[styles.notebookHole, { backgroundColor: theme.background, borderColor: 'rgba(150, 120, 80, 0.4)' }]} />
                            <View style={[styles.notebookHole, { backgroundColor: theme.background, borderColor: 'rgba(150, 120, 80, 0.4)' }]} />
                            <View style={[styles.notebookHole, { backgroundColor: theme.background, borderColor: 'rgba(150, 120, 80, 0.4)' }]} />
                          </View>
                          <View style={[styles.notebookMarginLine, { backgroundColor: theme.notebookMargin || 'rgba(214, 80, 80, 0.45)' }]} />
                          <Text style={[styles.cardTitle, styles.notebookTitle, { color: theme.text, borderBottomColor: theme.notebookRule || 'rgba(90, 130, 190, 0.4)' }]}>
                            {t('stats.thirtyDayStats')}
                          </Text>

                          <View style={[styles.notebookRow, { borderBottomColor: theme.notebookRule || 'rgba(90, 130, 190, 0.4)' }]}>
                            <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>
                              {t('stats.daysWithMeals')}
                            </Text>
                            <Text style={[styles.detailValue, { color: theme.text }]}>
                              {monthlyData.filter(d => d.hasData).length} / {monthlyData.length}
                            </Text>
                          </View>

                          <View style={[styles.notebookRow, { borderBottomColor: theme.notebookRule || 'rgba(90, 130, 190, 0.4)' }]}>
                            <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>
                              {t('stats.currentStreak')}
                            </Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                              <Text style={[styles.detailValue, { color: theme.text }]}>
                                {currentStreak} {currentStreak === 1 ? t('stats.day') : t('stats.days')}
                              </Text>
                              <AppIcon name="streak" size={14} tintColor="#FF6B35" style={{ marginLeft: 4 }} />
                            </View>
                          </View>

                          <View style={[styles.notebookRow, styles.notebookRowLast]}>
                            <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>
                              {t('stats.consistency')}
                            </Text>
                            <Text style={[styles.detailValue, { color: theme.text }]}>
                              {monthlyData.length > 0 ? Math.round((monthlyData.filter(d => d.hasData).length / monthlyData.length) * 100) : 0}%
                            </Text>
                          </View>
                        </View>
                      </>
                    )}
                  </>
                );

                const exercisePanel = (
                <>
                  {isGuestMode && (
                    <View style={[styles.guestBanner, { backgroundColor: theme.cardBackground, borderColor: theme.primary }]}>
                      <Text style={[styles.guestBannerText, { color: theme.text }]}>
                        {t('guest.exerciseHistory')}
                      </Text>
                      <TouchableOpacity
                        style={[styles.guestBannerBtn, { backgroundColor: theme.primary }]}
                        onPress={() => navigation.reset({ index: 0, routes: [{ name: 'Landing' }] })}
                      >
                        <Text style={styles.guestBannerBtnText}>{t('guest.signUpLogIn')}</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                  <ExerciseHistoryScreen
                    navigation={navigation}
                    route={{ params: { theme, isPremium } }}
                    nestedInScrollView={true}
                  />
                </>
                );

                const progressPanel = (
                <>
                  {isGuestMode && (
                    <View style={[styles.guestBanner, { backgroundColor: theme.cardBackground, borderColor: theme.primary }]}>
                      <Text style={[styles.guestBannerText, { color: theme.text }]}>
                        {t('guest.progress')}
                      </Text>
                      <TouchableOpacity
                        style={[styles.guestBannerBtn, { backgroundColor: theme.primary }]}
                        onPress={() => navigation.reset({ index: 0, routes: [{ name: 'Landing' }] })}
                      >
                        <Text style={styles.guestBannerBtnText}>{t('guest.signUpLogIn')}</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                  <ProgressPanel
                    navigation={navigation}
                    route={{ params: { theme, isPremium } }}
                  />
                </>
                );

                const panelFor = (tab) => (tab === 'week' ? weekPanel : tab === 'month' ? monthPanel : tab === 'exercise' ? exercisePanel : progressPanel);

                if (pushState) {
                  const { from, to, direction } = pushState;
                  const leftTab = direction === 1 ? from : to;
                  const rightTab = direction === 1 ? to : from;
                  return (
                    <View
                      style={{ overflow: 'hidden' }}
                      onLayout={(e) => setPanelWidth(e.nativeEvent.layout.width)}
                    >
                      <Animated.View
                        style={{
                          flexDirection: 'row',
                          width: panelWidth * 2,
                          transform: [{
                            translateX: direction === 1
                              ? pushAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -panelWidth] })
                              : pushAnim.interpolate({ inputRange: [0, 1], outputRange: [-panelWidth, 0] }),
                          }],
                        }}
                      >
                        <View style={{ width: panelWidth }}>{panelFor(leftTab)}</View>
                        <View style={{ width: panelWidth }}>{panelFor(rightTab)}</View>
                      </Animated.View>
                    </View>
                  );
                }

                return (
                  <View onLayout={(e) => setPanelWidth(e.nativeEvent.layout.width)}>
                    {panelFor(activeTab)}
                  </View>
                );
              })()}

              {/* REPORTS SECTION — hidden for guests */}
              {!isGuestMode && (
              <View ref={reportsRef} style={[
                styles.section,
                activeTab === 'exercise' && { marginTop: -20 },
                activeTab === 'progress' && { marginTop: -20 },
                activeTab === 'week' && { marginTop: -10 },
              ]}>
                <View style={[styles.settingItem, { backgroundColor: 'transparent' }]}>
                  <TouchableOpacity
                    style={styles.settingLeft}
                    activeOpacity={0.7}
                    onPress={() => setShowReportTypeModal(true)}
                  >
                    <AppIcon name="document" size={24} style={{ marginRight: 15 }} />
                    <Text style={[styles.settingLabel, { color: theme.text }]}>
                      {t('stats.reports')}
                    </Text>
                  </TouchableOpacity>

                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <TouchableOpacity
                      onPress={() => setShowWhatsIncludedModal(true)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      style={{ marginRight: 12 }}
                    >
                      <AppIcon name="info" size={18} tintColor={theme.textSecondary} />
                    </TouchableOpacity>
                    <Text style={styles.settingArrow} onPress={() => setShowReportTypeModal(true)}>›</Text>
                  </View>
                </View>
              </View>
              )}

              {/* Bottom Padding */}
              <View style={{ height: 100 }} />
            </ScrollView>
          </AnimatedThemeWrapper>

          {/* Bottom Navigation */}
          <BottomNav
            theme={theme}
            t={t}
            navigation={navigation}
            activeScreen="Stats"
            profileButtonRef={profileButtonRef}
          />

          {/* Report-type picker -- floats over this (blurred) Stats screen
              as soon as "Reports" is tapped, no Cancel button, tap outside
              to dismiss. */}
          <Modal
            visible={showReportTypeModal}
            transparent
            animationType="fade"
            onRequestClose={() => setShowReportTypeModal(false)}
          >
            <TouchableOpacity
              style={styles.reportPickerOverlay}
              activeOpacity={1}
              onPress={() => setShowReportTypeModal(false)}
            >
              <BlurView
                intensity={80}
                tint={isDark ? 'dark' : 'light'}
                style={StyleSheet.absoluteFill}
              />
              <View style={styles.reportPickerOptions} pointerEvents="box-none">
                <Text style={[styles.reportPickerTitle, { color: theme.text }]}>
                  What would you like to export?
                </Text>

                <TouchableOpacity
                  style={[styles.reportPickerButton, { backgroundColor: darkenColor(theme.background, 0.25) }]}
                  onPress={() => selectReportType('macros')}
                >
                  <Text style={styles.reportPickerButtonText}>{REPORT_TYPE_LABELS.macros}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.reportPickerButton, { backgroundColor: darkenColor(theme.background, 0.25) }]}
                  onPress={() => selectReportType('exercise')}
                >
                  <Text style={styles.reportPickerButtonText}>{REPORT_TYPE_LABELS.exercise}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.reportPickerButton, { backgroundColor: darkenColor(theme.background, 0.25) }]}
                  onPress={() => selectReportType('both')}
                >
                  <Text style={styles.reportPickerButtonText}>Both</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </Modal>

          {/* Period picker -- shown right after a report type is chosen
              above, same floating/blurred treatment, still on Stats. */}
          <Modal
            visible={showReportPeriodModal}
            transparent
            animationType="fade"
            onRequestClose={() => setShowReportPeriodModal(false)}
          >
            <TouchableOpacity
              style={styles.reportPickerOverlay}
              activeOpacity={1}
              onPress={() => setShowReportPeriodModal(false)}
            >
              <BlurView
                intensity={80}
                tint={isDark ? 'dark' : 'light'}
                style={StyleSheet.absoluteFill}
              />
              <View style={styles.reportPickerOptions} pointerEvents="box-none">
                <Text style={[styles.reportPickerTitle, { color: theme.text }]}>
                  {t('stats.exportReport.selectPeriod')}
                </Text>

                <TouchableOpacity
                  style={[styles.reportPickerButton, { backgroundColor: darkenColor(theme.background, 0.25) }]}
                  onPress={() => selectReportPeriod('weekly')}
                >
                  <Text style={styles.reportPickerButtonText}>{t('stats.exportReport.last7Days')}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.reportPickerButton, { backgroundColor: darkenColor(theme.background, 0.25) }]}
                  onPress={() => selectReportPeriod('monthly')}
                >
                  <Text style={styles.reportPickerButtonText}>{t('stats.exportReport.currentMonth')}</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </Modal>

          <BrandedAlert
            visible={showWhatsIncludedModal}
            theme={theme}
            title={t('stats.exportReport.whatsIncluded')}
            message={whatsIncludedMessage}
            messageAlign="left"
            onDismiss={() => setShowWhatsIncludedModal(false)}
          />

          {/* Freeze overlay during tutorial check -- MUST be last child to cover everything */}
          {checkingTutorial && (
            <View
              pointerEvents="auto"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0,0,0,0.5)',
                justifyContent: 'center',
                alignItems: 'center',
                zIndex: 9999,
                elevation: 9999,
              }}
            >
              <ActivityIndicator size="large" color={theme.primary} />
            </View>
          )}
        </SafeAreaView>
      </GestureDetector>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  reportPickerOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reportPickerOptions: {
    width: '80%',
    alignItems: 'center',
  },
  reportPickerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 24,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.25)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  reportPickerButton: {
    width: '60%',
    paddingVertical: 18,
    paddingHorizontal: 14,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  reportPickerButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 20,
    paddingTop: 10,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    fontSize: 14,
    marginTop: 5,
  },
  periodSelector: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginVertical: 15,
    padding: 4,
    borderRadius: 12,
    position: 'relative',
  },
  periodIndicator: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: '25%',
    borderRadius: 10,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  periodText: {
    fontSize: 14,
    fontWeight: '600',
  },
  summaryContainer: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 15,
    gap: 10,
  },
  summaryCard: {
    flex: 1,
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 30,
    fontWeight: 'bold',
  },
  summaryLabel: {
    fontSize: 12,
    marginTop: 5,
    textAlign: 'center',
  },
  summaryUnit: {
    fontSize: 10,
    marginTop: 2,
  },
  chartCard: {
    marginHorizontal: 20,
    marginBottom: 15,
    padding: 20,
    borderRadius: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  cardSubtitle: {
    fontSize: 12,
    marginBottom: 15,
  },
  loadingText: {
    textAlign: 'center',
    paddingVertical: 40,
  },
  chart: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: 180,
    marginTop: 10,
  },
  barContainer: {
    alignItems: 'center',
    flex: 1,
  },
  barWrapper: {
    height: 160,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  bar: {
    width: 30,
    borderRadius: 6,
    marginTop: 5,
  },
  emptyBar: {
    width: 30,
    height: 10,
    borderRadius: 6,
  },
  barValue: {
    fontSize: 10,
    fontWeight: '600',
    marginBottom: 4,
  },
  barLabel: {
    fontSize: 11,
    marginTop: 8,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 15,
    gap: 15,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 6,
  },
  legendText: {
    fontSize: 12,
  },
  detailCard: {
    marginHorizontal: 20,
    marginBottom: 15,
    padding: 20,
    borderRadius: 16,
  },
  notebookCard: {
    marginHorizontal: 20,
    marginBottom: 15,
    paddingVertical: 18,
    paddingLeft: 34,
    paddingRight: 16,
    backgroundColor: 'transparent',
    position: 'relative',
    borderWidth: 1.5,
    borderColor: 'rgba(150, 120, 80, 0.4)',
  },
  notebookMarginLine: {
    position: 'absolute',
    top: 4,
    bottom: 4,
    left: 22,
    width: 1.5,
  },
  notebookHolesColumn: {
    position: 'absolute',
    left: 6,
    top: 14,
    bottom: 14,
    width: 10,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  notebookHole: {
    width: 9,
    height: 9,
    borderRadius: 5,
    borderWidth: 1,
  },
  notebookTitle: {
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
  },
  notebookRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 11,
    borderBottomWidth: 1,
  },
  notebookRowLast: {
    borderBottomWidth: 0,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 14,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    marginVertical: 15,
  },
  heatmap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginVertical: 15,
  },
  heatmapCell: {
    width: (width - 80) / 10,
    height: (width - 80) / 10,
    borderRadius: 4,
  },
  heatmapLegend: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    gap: 8,
  },
  heatmapLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginHorizontal: 8,
  },
  heatmapLegendText: {
    fontSize: 11,
  },
  heatmapLegendBox: {
    width: 16,
    height: 16,
    borderRadius: 4,
  },
  calendarHeader: {
    flexDirection: 'row',
    marginTop: 15,
    marginBottom: 10,
    paddingHorizontal: '2%',
  },
  calendarHeaderText: {
    flexBasis: '14.2857%',  // 100% / 7 = 14.2857%
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: '2%',
  },
  calendarCell: {
    flexBasis: '14.2857%',
    aspectRatio: 1,
    padding: '1%',
  },
  calendarCellInner: {
    flex: 1,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  calendarDayNumber: {
    fontSize: 12,
    fontWeight: '600',
  },
  section: {
    padding: 20,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 10,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIcon: {
    fontSize: 24,
    marginRight: 15,
  },
  settingLabel: {
    fontSize: 16,
    color: '#333',
  },
  settingArrow: {
    fontSize: 24,
    color: '#ccc',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  guestBanner: {
    marginHorizontal: 20,
    marginBottom: 15,
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  guestBannerText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 15,
  },
  guestBannerBtn: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
  },
  guestBannerBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});