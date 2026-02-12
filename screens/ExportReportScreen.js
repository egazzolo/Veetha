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

export default function ExportReportScreen({ navigation }) {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const { profile } = useUser();

  const [showPeriodModal, setShowPeriodModal] = useState(false);
  const [showFormatModal, setShowFormatModal] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState(null); // 'weekly' or 'monthly'
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [exporting, setExporting] = useState(false);

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

      const data = await fetchData();

      if (!data || data.length === 0) {
        Alert.alert(t('common.error'), t('stats.exportReport.fetchFailed'));
        return;
      }

      // ✅ PDF → go to preview screen
      if (format === 'pdf') {

        const html = buildReportHTML(data);

        const periodLabel =
          selectedPeriod === 'weekly'
            ? t('stats.exportReport.weekly')
            : t('stats.exportReport.monthly');

        navigation.navigate('ReportViewer', {
          reportHTML: html,
          reportType: selectedPeriod,
          exportFormat: format,
          rawData: data,
          periodLabel: periodLabel   // 👈 ADD THIS
        });

        return;
      }

      // ✅ EXCEL → export using full layout (same as PDF)
      if (format === 'excel') {

        await exportExcel();

        return;
      }

    } catch (error) {

      console.error(error);

    } finally {

      setExporting(false);

    }
  };

  // Fetch data based on period
  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

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

      // Fetch meals
      const { data: meals, error } = await supabase
        .from('meals')
        .select(`
          logged_at,
          food_database (
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
        mealsByDate[date].calories += meal.food_database?.calories || 0;
        mealsByDate[date].protein += meal.food_database?.protein || 0;
        mealsByDate[date].carbs += meal.food_database?.carbs || 0;
        mealsByDate[date].fat += meal.food_database?.fat || 0;
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

  const buildReportHTML = (data) => {

    const periodLabel =
      selectedPeriod === 'weekly'
        ? t('stats.exportReport.weekly')
        : t('stats.exportReport.monthly');

    const userName = profile?.full_name || 'User';

    const totalCalories = data.reduce((sum, d) => sum + d.calories, 0);
    const avgCalories = Math.round(totalCalories / data.length);
    const totalProtein = data.reduce((sum, d) => sum + d.protein, 0);
    const totalCarbs = data.reduce((sum, d) => sum + d.carbs, 0);
    const totalFat = data.reduce((sum, d) => sum + d.fat, 0);

    return `
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { color: #4CAF50; text-align: center; }
          h2 { color: #333; margin-top: 30px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
          th { background-color: #4CAF50; color: white; }
          tr:nth-child(even) { background-color: #f2f2f2; }
          .summary { background-color: #f9f9f9; padding: 15px; border-radius: 8px; margin: 20px 0; }
          .summary-item { display: flex; justify-content: space-between; margin: 10px 0; }
        </style>
      </head>

      <body>

        <h1>${t('stats.exportReport.nutritionReportTitle', { period: periodLabel })}</h1>

        <p><strong>${t('stats.exportReport.name')}:</strong> ${userName}</p>

        <p><strong>${t('stats.exportReport.generated')}:</strong>
          ${new Date().toLocaleDateString()}
        </p>

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

      </body>
    </html>
    `;
  };

  // Export as PDF
  const exportPDF = async () => {
    try {
      setExporting(true);
      console.log('🔍 Starting PDF export...');
      
      const data = await fetchData();
      console.log('🔍 Data fetched:', data?.length, 'days');
      
      if (!data) {
        Alert.alert(t('common.error'), t('stats.exportReport.fetchFailed'));
        return;
      }

      const html = buildReportHTML(data);


      console.log('🔍 Creating PDF...');
      const { uri } = await Print.printToFileAsync({ html });
      console.log('✅ PDF created at:', uri);
      
      // Just share it
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: t('stats.exportReport.savePdf')
      });

    } catch (error) {
      console.error('❌ PDF ERROR:', error);
      Alert.alert('Error', `Failed to export PDF: ${error.message}`);
    } finally {
      setExporting(false);
    }
  };

  // Export as Excel
  const exportExcel = async () => {

    try {

      setExporting(true);

      const data = await fetchData();

      if (!data) {
        Alert.alert(t('common.error'), t('stats.exportReport.fetchFailed'));
        return;
      }

      // SAME calculations as PDF
      const periodLabel =
        selectedPeriod === 'weekly'
          ? t('stats.exportReport.weekly')
          : t('stats.exportReport.monthly');

      const userName = profile?.full_name || 'User';

      const totalCalories = data.reduce((sum,d)=>sum+d.calories,0);
      const avgCalories = Math.round(totalCalories / data.length);
      const totalProtein = data.reduce((sum,d)=>sum+d.protein,0);
      const totalCarbs = data.reduce((sum,d)=>sum+d.carbs,0);
      const totalFat = data.reduce((sum,d)=>sum+d.fat,0);

      // FULL STRUCTURE (MATCHES PDF)
      const excelData = [

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

        ...data.map(day => ({
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

      const ws = XLSX.utils.json_to_sheet(excelData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Nutrition');

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
          onPress={() => setShowPeriodModal(true)}
          disabled={exporting}
        >
          {exporting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Text style={styles.bigButtonIcon}>📥</Text>
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
            • {t('stats.exportReport.summaryStats')}
          </Text>
        </View>
      </ScrollView>

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
                <Text style={styles.modalButtonText}>
                  📅 {t('stats.exportReport.last7Days')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: theme.primary }]}
                onPress={() => handlePeriodSelect('monthly')}
              >
                <Text style={styles.modalButtonText}>
                  📆 {t('stats.exportReport.currentMonth')}
                </Text>
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
                <Text style={styles.modalButtonText}>
                  📄 {t('stats.exportReport.pdfReport')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: '#43A047' }]}
                onPress={() => handleFormatSelect('excel')}
              >
                <Text style={styles.modalButtonText}>
                  📊 {t('stats.exportReport.excelSpreadsheet')}
                </Text>
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