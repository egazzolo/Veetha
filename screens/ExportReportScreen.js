import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../utils/ThemeContext';
import { useLanguage } from '../utils/LanguageContext';
import { useUser } from '../utils/UserContext';
import { supabase } from '../utils/supabase';
import { usePremiumStatus } from '../utils/usePremiumStatus';
import BrandedAlert from '../components/BrandedAlert';

const SPLIT_KEYS = ['fullBody', 'upperLower', 'pushPullLegs', 'broSplit'];

// English-only for now -- this screen's existing "Nutrition Report" title
// keeps its full translation (via stats.exportReport.nutritionReportTitle)
// for the macros-only path, since that's the only one that predates this
// feature.
const REPORT_TYPE_LABELS = {
  macros: 'Macronutrient Report',
  exercise: 'Exercise Report',
  both: 'Macronutrient & Exercise Report',
};

// Report type and period are both chosen via the floating pickers on the
// Stats screen now (blurred overlays, no separate "Start Report" step) --
// this screen just receives both as params and immediately generates the
// report, handing off to ReportViewer. It's a brief processing screen, not
// an interactive one.
export default function ExportReportScreen({ navigation, route }) {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const { profile, loading: userLoading } = useUser();
  const { isPremium } = usePremiumStatus();

  const selectedReportType = route?.params?.reportType || null; // 'macros', 'exercise', or 'both'
  const selectedPeriod = route?.params?.period || null; // 'weekly' or 'monthly'
  const startedRef = useRef(false);
  const [errorInfo, setErrorInfo] = useState(null); // { title, message } or null

  const formatSplitType = (splitTypeValue) => splitTypeValue
    .split(',')
    .map((part) => (SPLIT_KEYS.includes(part) ? t(`exercise.splitFlow.splits.${part}`) : part))
    .join(', ');

  const getDateRange = () => {
    let startDate, endDate;
    if (selectedPeriod === 'weekly') {
      // Last 7 days
      startDate = new Date();
      startDate.setDate(startDate.getDate() - 6);
      startDate.setHours(0, 0, 0, 0);

      endDate = new Date();
      endDate.setHours(23, 59, 59, 999);
    } else {
      // Current month
      startDate = new Date();
      startDate.setDate(1);
      startDate.setHours(0, 0, 0, 0);

      endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 1, 0);
      endDate.setHours(23, 59, 59, 999);
    }
    return { startDate, endDate };
  };

  // Fetch exercise data (both legacy per-activity logs and split-based
  // logs with their per-exercise entries) for the selected period.
  const fetchExerciseData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { startDate, endDate } = getDateRange();

      const [legacyResult, splitResult] = await Promise.all([
        supabase
          .from('exercises')
          .select('*')
          .eq('user_id', user.id)
          .gte('logged_at', startDate.toISOString())
          .lte('logged_at', endDate.toISOString())
          .order('logged_at', { ascending: true }),
        supabase
          .from('exercise_logs')
          .select('*, exercise_log_entries(*)')
          .eq('user_id', user.id)
          .gte('logged_at', startDate.toISOString())
          .lte('logged_at', endDate.toISOString())
          .order('logged_at', { ascending: true })
      ]);

      if (legacyResult.error) throw legacyResult.error;
      if (splitResult.error) throw splitResult.error;

      const legacyItems = (legacyResult.data || []).map((item) => ({ type: 'legacy', logged_at: item.logged_at, calories_burned: item.calories_burned, raw: item }));
      const splitItems = (splitResult.data || []).map((item) => ({ type: 'split', logged_at: item.logged_at, calories_burned: item.calories_burned, raw: item }));

      return [...legacyItems, ...splitItems].sort((a, b) => new Date(a.logged_at) - new Date(b.logged_at));
    } catch (error) {
      console.error('Error fetching exercise data:', error);
      return null;
    }
  };

  // Fetch data based on period
  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { startDate, endDate } = getDateRange();

      // Fetch meals
      const [{ data: meals, error }, { data: stepsLogs, error: stepsError }] = await Promise.all([
        supabase
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
          .order('logged_at', { ascending: true }),
        supabase
          .from('steps_logs')
          .select('date, steps')
          .eq('user_id', user.id)
          .gte('date', startDate.toLocaleDateString('en-CA'))
          .lte('date', endDate.toLocaleDateString('en-CA')),
      ]);

      if (error) throw error;
      if (stepsError) throw stepsError;

      // Group by date
      const mealsByDate = {};
      meals.forEach(meal => {
        const date = new Date(meal.logged_at).toLocaleDateString('en-CA');
        if (!mealsByDate[date]) {
          mealsByDate[date] = { calories: 0, protein: 0, carbs: 0, fat: 0 };
        }
        mealsByDate[date].calories += meal.product?.calories || 0;
        mealsByDate[date].protein += meal.product?.protein || 0;
        mealsByDate[date].carbs += meal.product?.carbs || 0;
        mealsByDate[date].fat += meal.product?.fat || 0;
      });

      const stepsByDate = {};
      (stepsLogs || []).forEach(log => {
        stepsByDate[log.date] = log.steps || 0;
      });

      // Build daily data
      const days = [];
      const current = new Date(startDate);
      while (current <= endDate) {
        const dateStr = current.toLocaleDateString('en-CA');
        const dayData = mealsByDate[dateStr] || { calories: 0, protein: 0, carbs: 0, fat: 0 };

        days.push({
          date: new Date(current).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          calories: Math.round(dayData.calories),
          protein: Math.round(dayData.protein),
          carbs: Math.round(dayData.carbs),
          fat: Math.round(dayData.fat),
          goal: profile?.daily_calorie_goal || 2000,
          steps: stepsByDate[dateStr] || 0,
        });

        current.setDate(current.getDate() + 1);
      }

      return days;
    } catch (error) {
      console.error('Error fetching data:', error);
      return null;
    }
  };

  const buildMacroSectionHTML = (data) => {
    const totalCalories = data.reduce((sum, d) => sum + d.calories, 0);
    const avgCalories = Math.round(totalCalories / data.length);
    const totalProtein = data.reduce((sum, d) => sum + d.protein, 0);
    const totalCarbs = data.reduce((sum, d) => sum + d.carbs, 0);
    const totalFat = data.reduce((sum, d) => sum + d.fat, 0);
    const totalSteps = data.reduce((sum, d) => sum + (d.steps || 0), 0);
    const avgSteps = Math.round(totalSteps / data.length);

    return `
        <h2>${t('stats.exportReport.dailyTotals')}</h2>

        <table>
          <tr>
            <th>${t('stats.exportReport.date')}</th>
            <th>${t('stats.exportReport.calories')}</th>
            <th>${t('stats.exportReport.goal')}</th>
            <th>${t('stats.exportReport.protein')}</th>
            <th>${t('stats.exportReport.carbs')}</th>
            <th>${t('stats.exportReport.fat')}</th>
            <th>Steps</th>
          </tr>

          ${data.map(day => `
            <tr>
              <td>${day.date}</td>
              <td>${day.calories}</td>
              <td>${day.goal}</td>
              <td>${day.protein}</td>
              <td>${day.carbs}</td>
              <td>${day.fat}</td>
              <td>${(day.steps || 0).toLocaleString()}</td>
            </tr>
          `).join('')}
        </table>

        <div class="summary">
          <h2>${t('stats.exportReport.summary')}</h2>

          <div class="summary-item">
            <span>${t('stats.exportReport.totalCalories')}:</span>
            <strong>${totalCalories.toLocaleString()}</strong>
          </div>

          <div class="summary-item">
            <span>${t('stats.exportReport.avgDailyCalories')}:</span>
            <strong>${avgCalories}</strong>
          </div>

          <div class="summary-item">
            <span>${t('stats.exportReport.totalProtein')}:</span>
            <strong>${totalProtein}g</strong>
          </div>

          <div class="summary-item">
            <span>${t('stats.exportReport.totalCarbs')}:</span>
            <strong>${totalCarbs}g</strong>
          </div>

          <div class="summary-item">
            <span>Total Steps:</span>
            <strong>${totalSteps.toLocaleString()}</strong>
          </div>

          <div class="summary-item">
            <span>Average Daily Steps:</span>
            <strong>${avgSteps.toLocaleString()}</strong>
          </div>

          <div class="summary-item">
            <span>${t('stats.exportReport.totalFat')}:</span>
            <strong>${totalFat}g</strong>
          </div>

        </div>
    `;
  };

  // Split-log entries get a nested table per row (Exercise/Sets/Reps/Wt.)
  // instead of one flattened text line, so each field reads as its own
  // column rather than a run-on string. "Calories Burned (approx.)" is
  // labeled as such because it's a MET-formula estimate, not a measured value.
  const buildExerciseSectionHTML = (exerciseData) => {
    const totalCalories = exerciseData.reduce((sum, item) => sum + (item.calories_burned || 0), 0);

    const rows = exerciseData.map((item) => {
      const dateStr = new Date(item.logged_at).toLocaleDateString();
      const durationSuffix = item.raw.duration_minutes ? ` • ${item.raw.duration_minutes} min` : '';

      if (item.type === 'legacy') {
        return `
          <tr>
            <td>${dateStr}</td>
            <td>${t(`exercise.activities.${item.raw.activity_name}`)}</td>
            <td>${t(`exercise.intensities.${item.raw.intensity}`)}${item.raw.duration_minutes ? ` • ${item.raw.duration_minutes} min` : ''}</td>
            <td>-</td>
            <td>${item.calories_burned}</td>
          </tr>
        `;
      }

      const entries = item.raw.exercise_log_entries || [];
      const breakdown = entries.length > 0
        ? `
          <table class="breakdown">
            <tr><th>Exercise</th><th>Sets</th><th>Reps</th><th>Wt.</th></tr>
            ${entries.map((entry) => `
              <tr>
                <td>${entry.name}</td>
                <td>${entry.sets}</td>
                <td>${entry.reps}</td>
                <td>${entry.weight ? `${entry.weight}${entry.weight_unit || ''}` : '-'}</td>
              </tr>
            `).join('')}
          </table>
        `
        : '-';

      return `
        <tr>
          <td>${dateStr}</td>
          <td>${formatSplitType(item.raw.split_type)}</td>
          <td>${t(`exercise.intensities.${item.raw.intensity}`)}${durationSuffix}</td>
          <td${entries.length > 0 ? ' class="breakdown-cell"' : ''}>${breakdown}</td>
          <td>${item.calories_burned}</td>
        </tr>
      `;
    }).join('');

    return `
        <h2>Exercise Log</h2>

        <table>
          <tr>
            <th>Date</th>
            <th>Type</th>
            <th>Intensity / Duration</th>
            <th>Breakdown</th>
            <th>Calories Burned (approx.)</th>
          </tr>
          ${rows}
        </table>

        <div class="summary">
          <h2>${t('stats.exportReport.summary')}</h2>
          <div class="summary-item">
            <span>Total Calories Burned (approx.):</span>
            <strong>${totalCalories.toLocaleString()}</strong>
          </div>
        </div>
    `;
  };

  const buildReportHTML = (macroData, exerciseData) => {

    const periodLabel =
      selectedPeriod === 'weekly'
        ? t('stats.exportReport.weekly')
        : t('stats.exportReport.monthly');

    const userName = profile?.full_name || 'User';

    const reportTitle = selectedReportType === 'macros'
      ? t('stats.exportReport.nutritionReportTitle', { period: periodLabel })
      : `${periodLabel} ${REPORT_TYPE_LABELS[selectedReportType] || REPORT_TYPE_LABELS.both}`;

    return `
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { color: #4CAF50; text-align: center; }
          h2 { color: #333; margin-top: 30px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 12px; text-align: left; vertical-align: top; }
          th { background-color: #4CAF50; color: white; }
          tr:nth-child(even) { background-color: #f2f2f2; }
          .summary { background-color: #f9f9f9; padding: 15px; border-radius: 8px; margin: 20px 0; }
          .summary-item { display: flex; justify-content: space-between; margin: 10px 0; }
          table.breakdown { margin-top: 0; width: 100%; }
          table.breakdown th, table.breakdown td { padding: 6px 8px; font-size: 12px; }
          table.breakdown th { background-color: #81C784; }
          td.breakdown-cell { padding: 0; }
        </style>
      </head>

      <body>

        <h1>${reportTitle}</h1>

        <p><strong>${t('stats.exportReport.name')}:</strong> ${userName}</p>

        <p><strong>${t('stats.exportReport.generated')}:</strong>
          ${new Date().toLocaleDateString()}
        </p>

        ${macroData && macroData.length > 0 ? buildMacroSectionHTML(macroData) : ''}
        ${exerciseData && exerciseData.length > 0 ? buildExerciseSectionHTML(exerciseData) : ''}

      </body>
    </html>
    `;
  };

  const noDataMessage = () => {
    if (selectedReportType === 'exercise') {
      return 'No exercises logged for this period yet. Log a workout and try again!';
    }
    if (selectedReportType === 'macros') {
      return 'No meals logged for this period yet. Log a meal and try again!';
    }
    return 'Nothing logged for this period yet. Log a meal or a workout and try again!';
  };

  const generateReport = async () => {
    if (!isPremium) {
      navigation.replace('Paywall', { highlightFeature: 'PDF export' });
      return;
    }

    try {
      const macroData = selectedReportType !== 'exercise' ? await fetchData() : null;
      const exerciseData = selectedReportType !== 'macros' ? await fetchExerciseData() : null;

      const hasMacroData = macroData && macroData.length > 0;
      const hasExerciseData = exerciseData && exerciseData.length > 0;

      if (!hasMacroData && !hasExerciseData) {
        setErrorInfo({ title: 'Nothing to report yet', message: noDataMessage() });
        return;
      }

      const html = buildReportHTML(macroData, exerciseData);

      const periodLabel =
        selectedPeriod === 'weekly'
          ? t('stats.exportReport.weekly')
          : t('stats.exportReport.monthly');

      navigation.replace('ReportViewer', {
        reportHTML: html,
        reportType: selectedPeriod,
        exportFormat: 'pdf',
        rawData: macroData,
        periodLabel,
      });
    } catch (error) {
      console.error(error);
      setErrorInfo({
        title: 'Something went wrong',
        message: 'We couldn\'t generate your report. Please try again in a moment.',
      });
    }
  };

  useEffect(() => {
    if (startedRef.current) return;
    // Wait for the user/profile context to finish its initial load --
    // isPremium is derived from `profile`, and starting immediately on
    // mount (before that context has resolved) could read a still-null
    // profile as "not premium" and wrongly bounce a real premium user to
    // the paywall, or generate with a stale default goal.
    if (userLoading) return;
    startedRef.current = true;

    if (!selectedReportType || !selectedPeriod) {
      // Shouldn't happen -- this screen is only ever reached from the
      // Stats screen's own pickers, which always supply both. Bail out
      // safely if it's somehow missing either.
      navigation.goBack();
      return;
    }

    generateReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userLoading]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top', 'bottom']}>
      {!errorInfo && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
            Generating your report...
          </Text>
        </View>
      )}

      <BrandedAlert
        visible={!!errorInfo}
        theme={theme}
        title={errorInfo?.title}
        message={errorInfo?.message}
        onDismiss={() => {
          setErrorInfo(null);
          navigation.goBack();
        }}
      />
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
    marginTop: 16,
    fontSize: 15,
  },
});
