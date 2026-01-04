import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSwipeNavigation } from '../utils/useSwipeNavigation';
import { useTheme } from '../utils/ThemeContext';
import { useLanguage } from '../utils/LanguageContext';
import { supabase } from '../utils/supabase';
import { useFocusEffect } from '@react-navigation/native';
import { logScreen, logEvent, logMealLogged } from '../utils/analytics';
import AnimatedThemeWrapper from '../components/AnimatedThemeWrapper';
import BottomNav from '../components/BottomNav';

const { width } = Dimensions.get('window');

export default function StatsScreen({ navigation }) {
  const { theme, isDark } = useTheme();
  const { t } = useLanguage();
  const [selectedPeriod, setSelectedPeriod] = useState('week');
  const [weeklyData, setWeeklyData] = useState([]);
  const [monthlyData, setMonthlyData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState(null);

  // Swipe navigation
  const swipeGesture = useSwipeNavigation(navigation, 'Stats');

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
        .select('logged_at, calories, protein, carbs, fat')
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

        const totalCalories = dayMeals.reduce((sum, m) => sum + (m.calories || 0), 0);
        const totalProtein = dayMeals.reduce((sum, m) => sum + (m.protein || 0), 0);
        const totalCarbs = dayMeals.reduce((sum, m) => sum + (m.carbs || 0), 0);
        const totalFat = dayMeals.reduce((sum, m) => sum + (m.fat || 0), 0);

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
        .select('logged_at, calories')
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

        const totalCalories = dayMeals.reduce((sum, m) => sum + (m.calories || 0), 0);

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

  // Calculate streak (same logic as HomeScreen)
  const calculateStreak = () => {
    if (monthlyData.length === 0) return 0;
    
    // Check if TODAY has any meals
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];
    const todayData = monthlyData.find(d => d.date === todayStr);
    const hasMealsToday = todayData?.hasData || false;
    
    // Create a Set of dates with meals for fast lookup
    const datesWithMeals = new Set(
      monthlyData.filter(d => d.hasData).map(d => d.date)
    );
    
    // Start from yesterday if no meals today, or today if meals exist
    let checkDate = new Date();
    if (!hasMealsToday) {
      checkDate.setDate(checkDate.getDate() - 1);
    }
    checkDate.setHours(0, 0, 0, 0);
    
    // Calculate streak by checking backwards
    let streak = 0;
    const MIN_DATE = new Date(2025, 10, 1); // November 1, 2025
    
    while (checkDate >= MIN_DATE) {
      const dateStr = checkDate.toISOString().split('T')[0];
      
      if (datesWithMeals.has(dateStr)) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break; // Streak broken
      }
    }
    
    return streak;
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
  }, []);

  // Initial load
  useEffect(() => {
    fetchAllData();
  }, []);

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

  // Calculate statistics
  const daysWithData = selectedPeriod === 'week'
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

  // Monthly streak
  const currentStreak = calculateStreak();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <GestureDetector gesture={swipeGesture}>
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top', 'bottom']}>
          <AnimatedThemeWrapper>
            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
              {/* Header */}
              <View style={[styles.header, { backgroundColor: theme.cardBackground }]}>
                <Text style={[styles.headerTitle, { color: theme.text }]}>{t('stats.title')}</Text>
                <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>
                  {t('stats.subtitle')}
                </Text>
              </View>

              {/* Period Selector */}
              <View style={[styles.periodSelector, { backgroundColor: theme.cardBackground }]}>
                <TouchableOpacity
                  style={[styles.periodButton, selectedPeriod === 'week' && { backgroundColor: theme.primary }]}
                  onPress={() => setSelectedPeriod('week')}
                >
                  <Text style={[styles.periodText, { color: selectedPeriod === 'week' ? '#fff' : theme.textSecondary }]}>
                    {t('stats.week')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.periodButton, selectedPeriod === 'month' && { backgroundColor: theme.primary }]}
                  onPress={() => setSelectedPeriod('month')}
                >
                  <Text style={[styles.periodText, { color: selectedPeriod === 'month' ? '#fff' : theme.textSecondary }]}>
                    {t('stats.month')}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Quick Stats Summary */}
              <View style={styles.summaryContainer}>
                <View style={[styles.summaryCard, { backgroundColor: theme.cardBackground }]}>
                  <Text style={[styles.summaryValue, { color: theme.primary }]}>{avgCalories}</Text>
                  <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>{t('stats.avgDaily')}</Text>
                  <Text style={[styles.summaryUnit, { color: theme.textTertiary }]}>{t('stats.kcal')}</Text>
                </View>

                <View style={[styles.summaryCard, { backgroundColor: theme.cardBackground }]}>
                  <Text style={[styles.summaryValue, { color: theme.success }]}>{daysWithData.length}</Text>
                  <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>{t('stats.daysLogged')}</Text>
                  <Text style={[styles.summaryUnit, { color: theme.textTertiary }]}>
                    {selectedPeriod === 'week' 
                      ? (t('stats.thisWeek') || 'this week')
                      : (t('stats.thisMonth') || 'this month')
                    }
                  </Text>
                </View>

                <View style={[styles.summaryCard, { backgroundColor: theme.cardBackground }]}>
                  <Text style={[styles.summaryValue, { color: theme.warning }]}>{currentStreak}</Text>
                  <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>{t('stats.streak')}</Text>
                  <Text style={[styles.summaryUnit, { color: theme.textTertiary }]}>{t('stats.days')} {t('stats.fire')}</Text>
                </View>
              </View>

              {selectedPeriod === 'week' && (
                <>
                  {/* Weekly Bar Chart */}
                  <View style={[styles.chartCard, { backgroundColor: theme.cardBackground }]}>
                    <Text style={[styles.cardTitle, { color: theme.text }]}>{t('stats.weeklyCals')}</Text>
                    
                    {loading ? (
                      <Text style={[styles.loadingText, { color: theme.textSecondary }]}>{t('stats.loading')}</Text>
                    ) : (
                      <>
                        <View style={styles.chart}>
                          {weeklyData.map((day, index) => {
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
                                      <View
                                        style={[
                                          styles.bar,
                                          {
                                            height: barHeight,
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
                                <Text style={[styles.barLabel, { color: theme.textSecondary }]}>
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

                  {/* Weekly Summary */}
                  <View style={[styles.detailCard, { backgroundColor: theme.cardBackground }]}>
                    <Text style={[styles.cardTitle, { color: theme.text }]}>{t('stats.weeklySummary')}</Text>
                    
                    <View style={styles.detailRow}>
                      <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>
                        {t('stats.avgCalories')}
                      </Text>
                      <Text style={[styles.detailValue, { color: theme.text }]}>
                        {avgCalories} kcal
                      </Text>
                    </View>

                    <View style={styles.detailRow}>
                      <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>
                        {t('stats.avgProtein')}
                      </Text>
                      <Text style={[styles.detailValue, { color: theme.text }]}>
                        {avgProtein}g
                      </Text>
                    </View>

                    <View style={styles.detailRow}>
                      <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>
                        {t('stats.avgCarbs')}
                      </Text>
                      <Text style={[styles.detailValue, { color: theme.text }]}>
                        {avgCarbs}g
                      </Text>
                    </View>

                    <View style={styles.detailRow}>
                      <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>
                        {t('stats.avgFat')}
                      </Text>
                      <Text style={[styles.detailValue, { color: theme.text }]}>
                        {avgFat}g
                      </Text>
                    </View>

                  </View>
                  
                  {/* REPORTS SECTION */}
                  <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
                      {t('stats.reports')}
                    </Text>
                    
                    <TouchableOpacity 
                      style={[styles.settingItem, { backgroundColor: theme.cardBackground }]}
                      onPress={() => navigation.navigate('WeeklyReport')}
                    >
                      <View style={styles.settingLeft}>
                        <Text style={styles.settingIcon}>📊</Text>
                        <Text style={[styles.settingLabel, { color: theme.text }]}>
                          {t('stats.weeklyReport')}
                        </Text>
                      </View>
                      <Text style={styles.settingArrow}>›</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.settingItem, { backgroundColor: theme.cardBackground }]}
                      onPress={() => navigation.navigate('ExportReport')}
                    >
                      <View style={styles.settingLeft}>
                        <Text style={styles.settingIcon}>📥</Text>
                        <Text style={[styles.settingLabel, { color: theme.text }]}>
                          Export Report
                        </Text>
                      </View>
                      <Text style={styles.settingArrow}>›</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}

              {selectedPeriod === 'month' && (
                <>
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
                    <View style={styles.calendarGrid}>
                      {(() => {
                        // Get first day of current month
                        const now = new Date();
                        const year = now.getFullYear();
                        const month = now.getMonth();
                        const firstDay = new Date(year, month, 1);
                        const lastDay = new Date(year, month + 1, 0);
                        const daysInMonth = lastDay.getDate();
                        
                        // Get day of week (0 = Sunday, convert to 0 = Monday)
                        let firstDayOfWeek = firstDay.getDay();
                        firstDayOfWeek = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1; // Convert to Mon=0, Sun=6
                        
                        // Create array of all days
                        const days = [];
                        
                        // Add empty cells for days before month starts
                        for (let i = 0; i < firstDayOfWeek; i++) {
                          days.push(null);
                        }
                        
                        // Add actual days
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
                            // Empty cell
                            return <View key={`empty-${index}`} style={styles.calendarCell} />;
                          }
                          
                          // Calculate intensity
                          let intensity = 0;
                          if (dayData.mealsCount >= 3) intensity = 1;
                          else if (dayData.mealsCount >= 1) intensity = 0.6;
                          
                          const bgColor = dayData.mealsCount > 0
                            ? `${theme.primary}${Math.round(intensity * 255).toString(16).padStart(2, '0')}`
                            : theme.border;
                          
                          // Check if it's today (LOCAL timezone)
                          const today = new Date();
                          today.setHours(0, 0, 0, 0);
                          const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
                          const isToday = dayData.date === todayStr;
                          
                        return (
                          <View
                            key={dayData.date}
                            style={styles.calendarCell}
                          >
                            <View
                              style={[
                                styles.calendarCellInner,
                                { backgroundColor: bgColor },
                                isToday && { borderWidth: 2, borderColor: theme.primary },
                              ]}
                            >
                              <Text style={[
                                styles.calendarDayNumber,
                                { color: dayData.mealsCount > 0 ? '#fff' : theme.textTertiary }
                              ]}>
                                {dayData.day}
                              </Text>
                            </View>
                          </View>
                        );
                        });
                      })()}
                    </View>

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

                  {/* Monthly Stats */}
                  <View style={[styles.detailCard, { backgroundColor: theme.cardBackground }]}>
                    <Text style={[styles.cardTitle, { color: theme.text }]}>{t('stats.thirtyDayStats')}</Text>
                    
                    <View style={styles.detailRow}>
                      <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>
                        {t('stats.daysWithMeals')}
                      </Text>
                      <Text style={[styles.detailValue, { color: theme.text }]}>
                        {monthlyData.filter(d => d.hasData).length} / {monthlyData.length}
                      </Text>
                    </View>

                    <View style={styles.detailRow}>
                      <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>
                        {t('stats.currentStreak')}
                      </Text>
                      <Text style={[styles.detailValue, { color: theme.text }]}>
                        {currentStreak} {currentStreak === 1 ? t('stats.day') : t('stats.days')} {t('stats.fire')}
                      </Text>
                    </View>

                    <View style={styles.detailRow}>
                      <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>
                        {t('stats.consistency')}
                      </Text>
                      <Text style={[styles.detailValue, { color: theme.primary }]}>
                        {monthlyData.length > 0 ? Math.round((monthlyData.filter(d => d.hasData).length / monthlyData.length) * 100) : 0}%
                      </Text>
                    </View>
                  </View>
                </>
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
          />
        </SafeAreaView>
      </GestureDetector>
    </GestureHandlerRootView>
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
    fontSize: 24,
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
});