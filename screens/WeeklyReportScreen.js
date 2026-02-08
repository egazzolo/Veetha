import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
//port { VictoryBar, VictoryChart, VictoryAxis, VictoryTheme, VictoryGroup } from 'victory';
import { useTheme } from '../utils/ThemeContext';
import { useLanguage } from '../utils/LanguageContext';
import { useUser } from '../utils/UserContext';
import { supabase } from '../utils/supabase';

export default function WeeklyReportScreen({ navigation }) {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const { profile } = useUser();
  
  const [loading, setLoading] = useState(true);
  const [weeklyData, setWeeklyData] = useState([]);
  const [waterData, setWaterData] = useState([]); 
  const [exerciseData, setExerciseData] = useState([]);
  
  // Get last 7 days
  const getLast7Days = () => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      days.push(date);
    }
    return days;
  };

  // Format date based on unit system
  const formatDate = (date) => {
    const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
    const month = date.getMonth() + 1;
    const day = date.getDate();
    
    // Imperial: MM/DD, Metric: DD/MM
    const dateStr = profile?.unit_system === 'imperial' 
      ? `${month}/${day}`
      : `${day}/${month}`;
    
    return `${dayName} ${dateStr}`;
  };

  useEffect(() => {
    loadWeeklyData();
  }, []);

  const loadWeeklyData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const last7Days = getLast7Days();
      const startDate = last7Days[0];
      const endDate = new Date();
      endDate.setHours(23, 59, 59, 999);

      // Fetch all meals from last 7 days
      const { data: meals, error } = await supabase
        .from('meals')
        .select('calories, protein, carbs, fat, logged_at')
        .eq('user_id', user.id)
        .gte('logged_at', startDate.toISOString())
        .lte('logged_at', endDate.toISOString())
        .order('logged_at', { ascending: true });

      if (error) throw error;

      // Fetch water logs for last 7 days
      const { data: waterLogs, error: waterError } = await supabase
        .from('water_logs')
        .select('date, cups')
        .eq('user_id', user.id)
        .gte('date', startDate.toLocaleDateString('en-CA'))
        .lte('date', endDate.toLocaleDateString('en-CA'))
        .order('date', { ascending: true });

      if (waterError) throw waterError;

      // Fetch exercise logs for last 7 days
      const { data: exerciseLogs, error: exerciseError } = await supabase
        .from('exercises')
        .select('logged_at, calories_burned, activity_name, duration_minutes')
        .eq('user_id', user.id)
        .gte('logged_at', startDate.toISOString())
        .lte('logged_at', endDate.toISOString())
        .order('logged_at', { ascending: true });

      if (exerciseError) throw exerciseError;

      // Group exercise by date (ADD THIS)
      const exerciseByDate = {};
      exerciseLogs?.forEach(log => {
        const exerciseDate = new Date(log.logged_at);
        const dateStr = exerciseDate.toLocaleDateString('en-CA');
        if (!exerciseByDate[dateStr]) {
          exerciseByDate[dateStr] = {
            totalBurned: 0,
            count: 0
          };
        }
        exerciseByDate[dateStr].totalBurned += log.calories_burned || 0;
        exerciseByDate[dateStr].count += 1;
      });

      // Group meals by date
      const mealsByDate = {};
      meals.forEach(meal => {
        const mealDate = new Date(meal.logged_at);
        const dateStr = mealDate.toLocaleDateString('en-CA'); // YYYY-MM-DD
        
        if (!mealsByDate[dateStr]) {
          mealsByDate[dateStr] = {
            calories: 0,
            protein: 0,
            carbs: 0,
            fat: 0,
          };
        }
        
        mealsByDate[dateStr].calories += meal.calories || 0;
        mealsByDate[dateStr].protein += meal.protein || 0;
        mealsByDate[dateStr].carbs += meal.carbs || 0;
        mealsByDate[dateStr].fat += meal.fat || 0;
      });

      // Group water by date
      const waterByDate = {};
      waterLogs?.forEach(log => {
        waterByDate[log.date] = log.cups || 0;
      });

      // Build data for each day
      const weekData = last7Days.map(date => {
        const dateStr = date.toLocaleDateString('en-CA');
        const dayData = mealsByDate[dateStr] || {
          calories: 0,
          protein: 0,
          carbs: 0,
          fat: 0,
        };

        return {
          date: date,
          dateStr: formatDate(date),
          calories: Math.round(dayData.calories),
          protein: Math.round(dayData.protein),
          carbs: Math.round(dayData.carbs),
          fat: Math.round(dayData.fat),
          goal: profile?.daily_calorie_goal || 2000,
        };
      });

      // Build water data
      const weekWaterData = last7Days.map(date => {
        const dateStr = date.toLocaleDateString('en-CA');
        return {
          dateStr: formatDate(date),
          cups: waterByDate[dateStr] || 0,
          goal: profile?.daily_water_goal_cups || 8,
        };
      });
      
      // Build exercise data
      const weekExerciseData = last7Days.map(date => {
        const dateStr = date.toLocaleDateString('en-CA');
        return {
          dateStr: formatDate(date),
          burned: exerciseByDate[dateStr]?.totalBurned || 0,
          count: exerciseByDate[dateStr]?.count || 0,
        };
      });

      setExerciseData(weekExerciseData);

      setWeeklyData(weekData);
      setWaterData(weekWaterData);
    } catch (error) {
      console.error('Error loading weekly data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top', 'bottom']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
            {t('stats.wreport.loadingReport')}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Prepare chart data
  const chartData = weeklyData.map((day, index) => ({
    x: index + 1,
    y: day.calories,
    goal: day.goal,
    label: day.dateStr.split(' ')[0], // Just day name
  }));

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top', 'bottom']}>
      <ScrollView style={styles.scrollView}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: theme.cardBackground }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={[styles.backButtonText, { color: theme.primary }]}>{t('stats.wreport.back')}</Text>
          </TouchableOpacity>
          <Text style={[styles.title, { color: theme.text }]}>{t('stats.wreport.weeklyReport')}</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            {t('stats.wreport.subtitle')}
          </Text>
        </View>

        {/* Calorie Chart */}
        <View style={[styles.card, { backgroundColor: theme.cardBackground }]}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>{t('stats.wreport.card1Title')}</Text>
          <Text style={[styles.cardSubtitle, { color: theme.textSecondary }]}>
            {t('stats.wreport.card1Subtitle')}
          </Text>
          
          {/* Table Header */}
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, styles.dayColumn, { color: theme.text }]}>Day</Text>
            <Text style={[styles.tableHeaderCell, styles.macroColumn, { color: '#4CAF50' }]}>Consumed</Text>
            <Text style={[styles.tableHeaderCell, styles.macroColumn, { color: '#FF9800' }]}>Goal</Text>
          </View>

          {/* Table Rows */}
          {weeklyData.map((day, index) => (
            <View 
              key={index} 
              style={[
                styles.tableRow,
                { backgroundColor: index % 2 === 0 ? theme.background : theme.cardBackground }
              ]}
            >
              <Text style={[styles.tableCell, styles.dayColumn, { color: theme.text }]}>
                {day.dateStr}
              </Text>
              <Text style={[styles.tableCell, styles.macroColumn, { color: '#4CAF50' }]}>
                {day.calories}
              </Text>
              <Text style={[styles.tableCell, styles.macroColumn, { color: '#FF9800' }]}>
                {day.goal}
              </Text>
            </View>
          ))}

{/*           <VictoryChart
            theme={VictoryTheme.material}
            domainPadding={{ x: 20 }}
            height={250}
          >
            <VictoryAxis
              tickValues={[1, 2, 3, 4, 5, 6, 7]}
              tickFormat={(t) => chartData[t - 1]?.label || ''}
              style={{
                tickLabels: { fill: theme.text, fontSize: 10 },
              }}
            />
            <VictoryAxis
              dependentAxis
              tickFormat={(x) => `${x}`}
              style={{
                tickLabels: { fill: theme.text, fontSize: 10 },
                grid: { stroke: theme.border, strokeWidth: 0.5 },
              }}
            />
            <VictoryGroup offset={15}>
              <VictoryBar
                data={chartData}
                x="x"
                y="y"
                style={{
                  data: { fill: '#4CAF50', width: 12 }
                }}
              />
              <VictoryBar
                data={chartData}
                x="x"
                y="goal"
                style={{
                  data: { fill: '#FF9800', width: 12, opacity: 0.5 }
                }}
              />
            </VictoryGroup>
          </VictoryChart> */}

          {/* Legend */}
          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendBox, { backgroundColor: '#4CAF50' }]} />
              <Text style={[styles.legendText, { color: theme.text }]}>{t('stats.wreport.consumed')}</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendBox, { backgroundColor: '#FF9800', opacity: 0.5 }]} />
              <Text style={[styles.legendText, { color: theme.text }]}>{t('stats.wreport.goal')}</Text>
            </View>
          </View>
        </View>

        {/* Macro Breakdown Table */}
        <View style={[styles.card, { backgroundColor: theme.cardBackground }]}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>{t('stats.wreport.card2Title')}</Text>
          <Text style={[styles.cardSubtitle, { color: theme.textSecondary }]}>
            {t('stats.wreport.card2Subtitle')}
          </Text>

          {/* Table Header */}
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, styles.dayColumn, { color: theme.text }]}>Day</Text>
            <Text style={[styles.tableHeaderCell, styles.macroColumn, { color: '#2196F3' }]}>{t('stats.wreport.protein')}</Text>
            <Text style={[styles.tableHeaderCell, styles.macroColumn, { color: '#FF9800' }]}>{t('stats.wreport.carbs')}</Text>
            <Text style={[styles.tableHeaderCell, styles.macroColumn, { color: '#9C27B0' }]}>{t('stats.wreport.fat')}</Text>
          </View>

          {/* Table Rows */}
          {weeklyData.map((day, index) => (
            <View 
              key={index} 
              style={[
                styles.tableRow,
                { backgroundColor: index % 2 === 0 ? theme.background : theme.cardBackground }
              ]}
            >
              <Text style={[styles.tableCell, styles.dayColumn, { color: theme.text }]}>
                {day.dateStr}
              </Text>
              <Text style={[styles.tableCell, styles.macroColumn, { color: '#2196F3' }]}>
                {day.protein}g
              </Text>
              <Text style={[styles.tableCell, styles.macroColumn, { color: '#FF9800' }]}>
                {day.carbs}g
              </Text>
              <Text style={[styles.tableCell, styles.macroColumn, { color: '#9C27B0' }]}>
                {day.fat}g
              </Text>
            </View>
          ))}
        </View>

        {/* Water Intake */}
        <View style={[styles.card, { backgroundColor: theme.cardBackground }]}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>💧 Water Intake</Text>
          <Text style={[styles.cardSubtitle, { color: theme.textSecondary }]}>
            Daily water consumption
          </Text>

          {/* Exercise Activity */}
          <View style={[styles.card, { backgroundColor: theme.cardBackground }]}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>💪 {t('stats.wreport.exerciseActivity')}</Text>
            <Text style={[styles.cardSubtitle, { color: theme.textSecondary }]}>
              {t('stats.wreport.exerciseSubtitle')}
            </Text>

            {/* Table Header */}
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderCell, styles.dayColumn, { color: theme.text }]}>{t('stats.wreport.day')}</Text>
              <Text style={[styles.tableHeaderCell, styles.macroColumn, { color: '#4CAF50' }]}>{t('stats.wreport.burned')}</Text>
              <Text style={[styles.tableHeaderCell, styles.macroColumn, { color: '#2196F3' }]}>{t('stats.wreport.sessions')}</Text>
            </View>

            {/* Table Rows */}
            {exerciseData.map((day, index) => (
              <View 
                key={index} 
                style={[
                  styles.tableRow,
                  { backgroundColor: index % 2 === 0 ? theme.background : theme.cardBackground }
                ]}
              >
                <Text style={[styles.tableCell, styles.dayColumn, { color: theme.text }]}>
                  {day.dateStr}
                </Text>
                <Text style={[styles.tableCell, styles.macroColumn, { color: '#4CAF50' }]}>
                  {day.burned} {t('common.kcal')}
                </Text>
                <Text style={[styles.tableCell, styles.macroColumn, { color: '#2196F3' }]}>
                  {day.count}
                </Text>
              </View>
            ))}
          </View>

          {/* Table Header */}
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, styles.dayColumn, { color: theme.text }]}>Day</Text>
            <Text style={[styles.tableHeaderCell, styles.macroColumn, { color: '#2196F3' }]}>Consumed</Text>
            <Text style={[styles.tableHeaderCell, styles.macroColumn, { color: '#FF9800' }]}>Goal</Text>
          </View>

          {/* Table Rows */}
          {waterData.map((day, index) => (
            <View 
              key={index} 
              style={[
                styles.tableRow,
                { backgroundColor: index % 2 === 0 ? theme.background : theme.cardBackground }
              ]}
            >
              <Text style={[styles.tableCell, styles.dayColumn, { color: theme.text }]}>
                {day.dateStr}
              </Text>
              <Text style={[styles.tableCell, styles.macroColumn, { color: '#2196F3' }]}>
                {day.cups} {profile?.water_unit_preference || 'cups'}
              </Text>
              <Text style={[styles.tableCell, styles.macroColumn, { color: '#FF9800' }]}>
                {day.goal} {profile?.water_unit_preference || 'cups'}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 20,
    paddingTop: 10,
  },
  backButton: {
    marginBottom: 10,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 14,
  },
  card: {
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 20,
    borderRadius: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  cardSubtitle: {
    fontSize: 13,
    marginBottom: 15,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginTop: 10,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendBox: {
    width: 16,
    height: 16,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 12,
  },
  tableHeader: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: '#e0e0e0',
  },
  tableHeaderCell: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  tableCell: {
    fontSize: 13,
  },
  dayColumn: {
    flex: 2,
  },
  macroColumn: {
    flex: 1,
    textAlign: 'center',
  },
  totalsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 15,
  },
  totalItem: {
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
  },
  totalLabel: {
    fontSize: 12,
    marginBottom: 5,
  },
  totalValue: {
    fontSize: 20,
    fontWeight: 'bold',
  },
});