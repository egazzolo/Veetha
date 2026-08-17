import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Modal, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../utils/ThemeContext';
import { useLanguage } from '../utils/LanguageContext';
import { useUser } from '../utils/UserContext';
import { supabase } from '../utils/supabase';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import * as XLSX from 'xlsx';
import * as MediaLibrary from 'expo-media-library';
import * as IntentLauncher from 'expo-intent-launcher';
import AppIcon from '../components/AppIcon';
import { usePremiumStatus } from '../utils/usePremiumStatus';

const SPLIT_KEYS = ['fullBody', 'upperLower', 'pushPullLegs', 'broSplit'];

// English-only for now, same as the report-type modal below -- this screen's
// existing "Nutrition Report" title keeps its full translation (via
// stats.exportReport.nutritionReportTitle) for the macros-only path, since
// that's the only one that predates this feature.
const REPORT_TYPE_LABELS = {
  macros: 'Macronutrient Report',
  exercise: 'Exercise Report',
  both: 'Macronutrient & Exercise Report',
};

export default function ExportReportScreen({ navigation }) {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const { profile } = useUser();
  const { isPremium } = usePremiumStatus();

  const [showReportTypeModal, setShowReportTypeModal] = useState(false);
  const [showPeriodModal, setShowPeriodModal] = useState(false);
  const [showFormatModal, setShowFormatModal] = useState(false);
  const [selectedReportType, setSelectedReportType] = useState(null); // 'macros', 'exercise', or 'both'
  const [selectedPeriod, setSelectedPeriod] = useState(null); // 'weekly' or 'monthly'
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [exporting, setExporting] = useState(false);

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

  // Handle report type selection
  const handleReportTypeSelect = (reportType) => {
    setSelectedReportType(reportType);
    setShowReportTypeModal(false);
    setShowPeriodModal(true);
  };

  // Handle period selection
  const handlePeriodSelect = (period) => {
    setSelectedPeriod(period);
    setShowPeriodModal(false);
    setShowFormatModal(true); // Go to format selection
  };

  // Handle format selection
  const handleFormatSelect = async (format) => {

    setShowFormatModal(false);

    try {

      setExporting(true);

      const macroData = selectedReportType !== 'exercise' ? await fetchData() : null;
      const exerciseData = selectedReportType !== 'macros' ? await fetchExerciseData() : null;

      const hasMacroData = macroData && macroData.length > 0;
      const hasExerciseData = exerciseData && exerciseData.length > 0;

      if (!hasMacroData && !hasExerciseData) {
        Alert.alert(t('common.error'), t('stats.exportReport.fetchFailed'));
        return;
      }

      // ✅ PDF → go to preview screen
      if (format === 'pdf') {

        const html = buildReportHTML(macroData, exerciseData);

        const periodLabel =
          selectedPeriod === 'weekly'
            ? t('stats.exportReport.weekly')
            : t('stats.exportReport.monthly');

        navigation.navigate('ReportViewer', {
          reportHTML: html,
          reportType: selectedPeriod,
          exportFormat: format,
          rawData: macroData,
          periodLabel: periodLabel   // 👈 ADD THIS
        });

        return;
      }

      // ✅ EXCEL → export using full layout (same as PDF)
      if (format === 'excel') {

        await exportExcel(macroData, exerciseData);

        return;
      }

    } catch (error) {

      console.error(error);

    } finally {

      setExporting(false);

    }
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
          </tr>

          ${data.map(day => `
            <tr>
              <td>${day.date}</td>
              <td>${day.calories}</td>
              <td>${day.goal}</td>
              <td>${day.protein}</td>
              <td>${day.carbs}</td>
              <td>${day.fat}</td>
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

  // Export as Excel
  const exportExcel = async (macroData, exerciseData) => {

    try {

      setExporting(true);

      const periodLabel =
        selectedPeriod === 'weekly'
          ? t('stats.exportReport.weekly')
          : t('stats.exportReport.monthly');

      const userName = profile?.full_name || 'User';

      const wb = XLSX.utils.book_new();

      if (macroData && macroData.length > 0) {
        const totalCalories = macroData.reduce((sum,d)=>sum+d.calories,0);
        const avgCalories = Math.round(totalCalories / macroData.length);
        const totalProtein = macroData.reduce((sum,d)=>sum+d.protein,0);
        const totalCarbs = macroData.reduce((sum,d)=>sum+d.carbs,0);
        const totalFat = macroData.reduce((sum,d)=>sum+d.fat,0);

        const macroExcelData = [

          { A: t('stats.exportReport.nutritionReportTitle',{period:periodLabel}) },

          {},

          { A: t('stats.exportReport.name'), B: userName },
          { A: t('stats.exportReport.generated'), B: new Date().toLocaleDateString() },

          {},

          { A: t('stats.exportReport.dailyTotals') },

          {},

          {
            A: t('stats.exportReport.date'),
            B: t('stats.exportReport.calories'),
            C: t('stats.exportReport.goal'),
            D: t('stats.exportReport.protein'),
            E: t('stats.exportReport.carbs'),
            F: t('stats.exportReport.fat'),
          },

          ...macroData.map(day => ({
            A: day.date,
            B: day.calories,
            C: day.goal,
            D: day.protein,
            E: day.carbs,
            F: day.fat,
          })),

          {},

          { A: t('stats.exportReport.summary') },

          { A: t('stats.exportReport.totalCalories'), B: totalCalories },
          { A: t('stats.exportReport.avgDailyCalories'), B: avgCalories },
          { A: t('stats.exportReport.totalProtein'), B: `${totalProtein}g` },
          { A: t('stats.exportReport.totalCarbs'), B: `${totalCarbs}g` },
          { A: t('stats.exportReport.totalFat'), B: `${totalFat}g` },

        ];

        const macroWs = XLSX.utils.json_to_sheet(macroExcelData);
        XLSX.utils.book_append_sheet(wb, macroWs, 'Nutrition');
      }

      if (exerciseData && exerciseData.length > 0) {
        // Each individual exercise gets its own row (rather than nesting,
        // which doesn't translate to a spreadsheet) so Sets/Reps/Weight are
        // real columns -- Date/Type/Intensity repeat per row for clarity.
        const exerciseRows = [];
        exerciseData.forEach((item) => {
          const dateStr = new Date(item.logged_at).toLocaleDateString();
          const type = item.type === 'legacy'
            ? t(`exercise.activities.${item.raw.activity_name}`)
            : formatSplitType(item.raw.split_type);
          const intensityDuration = `${t(`exercise.intensities.${item.raw.intensity}`)}${item.raw.duration_minutes ? ` • ${item.raw.duration_minutes} min` : ''}`;

          const entries = item.type === 'split' ? (item.raw.exercise_log_entries || []) : [];

          if (entries.length === 0) {
            exerciseRows.push({
              A: dateStr,
              B: type,
              C: intensityDuration,
              D: '-',
              E: '-',
              F: '-',
              G: '-',
              H: item.calories_burned,
            });
          } else {
            entries.forEach((entry) => {
              exerciseRows.push({
                A: dateStr,
                B: type,
                C: intensityDuration,
                D: entry.name,
                E: entry.sets,
                F: entry.reps,
                G: entry.weight ? `${entry.weight}${entry.weight_unit || ''}` : '-',
                H: item.calories_burned,
              });
            });
          }
        });

        const totalExerciseCalories = exerciseData.reduce((sum, item) => sum + (item.calories_burned || 0), 0);

        const exerciseExcelData = [
          { A: `${periodLabel} Exercise Report` },
          {},
          { A: t('stats.exportReport.name'), B: userName },
          { A: t('stats.exportReport.generated'), B: new Date().toLocaleDateString() },
          {},
          {
            A: 'Date',
            B: 'Type',
            C: 'Intensity / Duration',
            D: 'Exercise',
            E: 'Sets',
            F: 'Reps',
            G: 'Wt.',
            H: 'Calories Burned (approx.)',
          },
          ...exerciseRows,
          {},
          { A: t('stats.exportReport.summary') },
          { A: 'Total Calories Burned (approx.)', B: totalExerciseCalories },
        ];

        const exerciseWs = XLSX.utils.json_to_sheet(exerciseExcelData);
        XLSX.utils.book_append_sheet(wb, exerciseWs, 'Exercise');
      }

      const wbout = XLSX.write(wb, { type:'base64', bookType:'xlsx' });

      const fileUri =
        FileSystem.cacheDirectory +
        `Veetha_${periodLabel}_Report_${new Date().toLocaleDateString('en-CA')}.xlsx`;

      await FileSystem.writeAsStringAsync(fileUri, wbout, {
        encoding:'base64'
      });

      await Sharing.shareAsync(fileUri, {
        mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });

    } catch(error) {

      console.error(error);

    } finally {

      setExporting(false);

    }

  };

  if (!isPremium) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top', 'bottom']}>
        <View style={[styles.header, { backgroundColor: theme.cardBackground }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={[styles.backButtonText, { color: theme.primary }]}>
              {t('stats.wreport.back')}
            </Text>
          </TouchableOpacity>
        </View>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 }}>
          <Text style={{ fontSize: 64, marginBottom: 20 }}>🔒</Text>
          <Text style={{ color: theme.text, fontSize: 18, fontWeight: '600', textAlign: 'center', marginBottom: 24 }}>
            Export reports are a Premium feature
          </Text>
          <TouchableOpacity
            style={{ backgroundColor: theme.primary, paddingHorizontal: 28, paddingVertical: 14, borderRadius: 12 }}
            onPress={() => navigation.navigate('Paywall', { highlightFeature: 'PDF & Excel exports' })}
          >
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>Go Premium</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top', 'bottom']}>
      <View style={[styles.header, { backgroundColor: theme.cardBackground }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={[styles.backButtonText, { color: theme.primary }]}>
            {t('stats.wreport.back')}
          </Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.text }]}>
          {t('stats.exportReport.title')}
        </Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          {t('stats.exportReport.subtitle')}
        </Text>
      </View>

      <ScrollView style={styles.content}>
        <TouchableOpacity
          style={[styles.bigButton, { backgroundColor: theme.primary }]}
          onPress={() => setShowReportTypeModal(true)}
          disabled={exporting}
        >
          {exporting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <AppIcon name="export" size={48} style={{ marginBottom: 10 }} />
              <Text style={styles.bigButtonText}>
                {t('stats.exportReport.startExport')}
              </Text>
            </>
          )}
        </TouchableOpacity>

        <View style={[styles.infoCard, { backgroundColor: theme.cardBackground }]}>
          <Text style={[styles.infoTitle, { color: theme.text }]}>
            {t('stats.exportReport.whatsIncluded')}
          </Text>
          <Text style={[styles.infoText, { color: theme.textSecondary }]}>
            • {t('stats.exportReport.dailyCalories')}{'\n'}
            • {t('stats.exportReport.macroBreakdown')}{'\n'}
            • {t('stats.exportReport.goalComparison')}{'\n'}
            • {t('stats.exportReport.summaryStats')}{'\n'}
            • Exercise history & breakdown (sets, reps, weight)
          </Text>
        </View>
      </ScrollView>

      {/* Report Type Selection Modal */}
      <Modal
        visible={showReportTypeModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowReportTypeModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowReportTypeModal(false)}
        >
          <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
            <View style={[styles.modalContent, { backgroundColor: theme.cardBackground }]}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>
                What would you like to export?
              </Text>

              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: theme.primary }]}
                onPress={() => handleReportTypeSelect('macros')}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                  <AppIcon name="chart" size={20} style={{ marginRight: 8 }} />
                  <Text style={styles.modalButtonText}>{REPORT_TYPE_LABELS.macros}</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: theme.primary }]}
                onPress={() => handleReportTypeSelect('exercise')}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                  <AppIcon name="muscle" size={20} style={{ marginRight: 8 }} />
                  <Text style={styles.modalButtonText}>{REPORT_TYPE_LABELS.exercise}</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: theme.primary }]}
                onPress={() => handleReportTypeSelect('both')}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                  <AppIcon name="document" size={20} style={{ marginRight: 8 }} />
                  <Text style={styles.modalButtonText}>Both</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalCancelButton, { borderColor: theme.border }]}
                onPress={() => setShowReportTypeModal(false)}
              >
                <Text style={[styles.modalCancelText, { color: theme.text }]}>
                  {t('common.cancel')}
                </Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Period Selection Modal */}
      <Modal
        visible={showPeriodModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPeriodModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowPeriodModal(false)}
        >
          <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
            <View style={[styles.modalContent, { backgroundColor: theme.cardBackground }]}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>
                {t('stats.exportReport.selectPeriod')}
              </Text>
              
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: theme.primary }]}
                onPress={() => handlePeriodSelect('weekly')}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                  <AppIcon name="chart" size={20} style={{ marginRight: 8 }} />
                  <Text style={styles.modalButtonText}>{t('stats.exportReport.last7Days')}</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: theme.primary }]}
                onPress={() => handlePeriodSelect('monthly')}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                  <AppIcon name="chart" size={20} style={{ marginRight: 8 }} />
                  <Text style={styles.modalButtonText}>{t('stats.exportReport.currentMonth')}</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalCancelButton, { borderColor: theme.border }]}
                onPress={() => setShowPeriodModal(false)}
              >
                <Text style={[styles.modalCancelText, { color: theme.text }]}>
                  {t('common.cancel')}
                </Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Format Selection Modal */}
      <Modal
        visible={showFormatModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowFormatModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowFormatModal(false)}
        >
          <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
            <View style={[styles.modalContent, { backgroundColor: theme.cardBackground }]}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>
                {t('stats.exportReport.selectFormat')}
              </Text>
              
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: '#E53935' }]}
                onPress={() => handleFormatSelect('pdf')}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                  <AppIcon name="document" size={20} style={{ marginRight: 8 }} />
                  <Text style={styles.modalButtonText}>{t('stats.exportReport.pdfReport')}</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: '#43A047' }]}
                onPress={() => handleFormatSelect('excel')}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                  <AppIcon name="chart" size={20} style={{ marginRight: 8 }} />
                  <Text style={styles.modalButtonText}>{t('stats.exportReport.excelSpreadsheet')}</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalCancelButton, { borderColor: theme.border }]}
                onPress={() => setShowFormatModal(false)}
              >
                <Text style={[styles.modalCancelText, { color: theme.text }]}>
                  {t('common.cancel')}
                </Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
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
  content: {
    flex: 1,
    padding: 20,
  },
  bigButton: {
    padding: 30,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  bigButtonIcon: {
    fontSize: 48,
    marginBottom: 10,
  },
  bigButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  infoCard: {
    padding: 20,
    borderRadius: 12,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  infoText: {
    fontSize: 14,
    lineHeight: 24,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '85%',
    padding: 24,
    borderRadius: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalButton: {
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalCancelButton: {
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    marginTop: 8,
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: '600',
  },
});