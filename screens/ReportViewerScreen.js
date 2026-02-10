import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../utils/ThemeContext';
import { useLanguage } from '../utils/LanguageContext';

export default function ReportViewerScreen({ route, navigation }) {

  const { theme } = useTheme();
  const { t } = useLanguage();

  // data passed from ExportReportScreen
  const reportData = route?.params?.reportData || null;
  console.log("REPORT DATA:", reportData);
  const reportType = route?.params?.reportType || null;


  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>

      <ScrollView>

        {/* HEADER */}
        <View style={styles.section}>
          <Text style={[styles.title, { color: theme.text }]}>
            {t('stats.exportReport.title')}
          </Text>
        </View>

        {/* NUTRITION SECTION */}
        {reportData?.nutrition?.length > 0 && (
          <View style={styles.section}>
            <Text style={{ color: theme.text, fontWeight: 'bold' }}>
              Nutrition
            </Text>

            {reportData.nutrition.map((day, index) => (
              <View key={index} style={{ marginVertical: 8 }}>
                <Text style={{ color: theme.text }}>
                  {day.date}
                </Text>
                <Text style={{ color: theme.text }}>
                  Calories: {day.calories}
                </Text>
                <Text style={{ color: theme.text }}>
                  Protein: {day.protein}
                </Text>
              </View>
            ))}

          </View>
        )}

        {/* EXERCISE SECTION */}
        {reportData?.exercise && (
          <View style={styles.section}>
            <Text style={{ color: theme.text }}>
              Exercise section here
            </Text>
          </View>
        )}

        {/* WATER SECTION */}
        {reportData?.water && (
          <View style={styles.section}>
            <Text style={{ color: theme.text }}>
              Water section here
            </Text>
          </View>
        )}

        {/* ACTION BUTTONS */}
        <TouchableOpacity>
          <Text>Share</Text>
        </TouchableOpacity>

        <TouchableOpacity>
          <Text>Download</Text>
        </TouchableOpacity>

      </ScrollView>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex:1 },
  section: { padding:20 },
  title: { fontSize:24, fontWeight:'bold' }
});
