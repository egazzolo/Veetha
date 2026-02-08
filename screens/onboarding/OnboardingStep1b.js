import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../utils/ThemeContext';
import { useLanguage } from '../../utils/LanguageContext';

export default function OnboardingStep1b({ navigation }) {
  const { theme } = useTheme();
  const { t } = useLanguage();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Main Icon */}
        <Text style={styles.mainEmoji}>📊</Text>
        
        {/* Title */}
        <Text style={[styles.title, { color: theme.text }]}>
          {t('onboarding.step1bTitle')}
        </Text>
        
        {/* Statistics Cards */}
        <View style={styles.statsContainer}>
          {/* Stat 1 */}
          <View style={[styles.statCard, { backgroundColor: theme.cardBackground }]}>
            <Text style={styles.statNumber}>2.7x</Text>
            <Text style={[styles.statText, { color: theme.textSecondary }]}>
              {t('onboarding.step1bStat1')}
            </Text>
          </View>

          {/* Stat 2 */}
          <View style={[styles.statCard, { backgroundColor: theme.cardBackground }]}>
            <Text style={styles.statNumber}>71%</Text>
            <Text style={[styles.statText, { color: theme.textSecondary }]}>
              {t('onboarding.step1bStat2')}
            </Text>
          </View>

          {/* Stat 3 */}
          <View style={[styles.statCard, { backgroundColor: theme.cardBackground }]}>
            <Text style={styles.statNumber}>14 days</Text>
            <Text style={[styles.statText, { color: theme.textSecondary }]}>
              {t('onboarding.step1bStat3')}
            </Text>
          </View>
        </View>

        {/* Bottom Message */}
        <Text style={[styles.message, { color: theme.textSecondary }]}>
          {t('onboarding.step1bMessage')}
        </Text>
      </ScrollView>

      {/* Next Button */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: '#4CAF50' }]}
          onPress={() => navigation.navigate('OnboardingStep2')}
        >
          <Text style={styles.buttonText}>{t('onboarding.step1bButton')}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 130,
  },
  mainEmoji: {
    fontSize: 72,
    textAlign: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 36,
  },
  statsContainer: {
    gap: 16,
    marginBottom: 32,
  },
  statCard: {
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statNumber: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 8,
  },
  statText: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
    color: '#333',
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    fontStyle: 'italic',
    color: '#333',
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 60,
    left: 24,
    right: 24,
  },
  button: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
});