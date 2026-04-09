import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../utils/ThemeContext';
import { useLanguage } from '../../utils/LanguageContext';
import { scale } from '../../utils/responsive';

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
    paddingTop: scale(35),
    paddingBottom: 100,
  },
  mainEmoji: {
    fontSize: scale(60),
    textAlign: 'center',
    marginBottom: scale(16),
  },
  title: {
    fontSize: scale(26),
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: scale(28),
    lineHeight: scale(32),
  },
  statsContainer: {
    gap: scale(14),
    marginBottom: scale(28),
  },
  statCard: {
    padding: scale(18),
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statNumber: {
    fontSize: scale(42),
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 8,
  },
  statText: {
    fontSize: scale(15),
    textAlign: 'center',
    lineHeight: scale(20),
    color: '#333',
  },
  message: {
    fontSize: scale(15),
    textAlign: 'center',
    lineHeight: scale(22),
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
    paddingVertical: scale(14),
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: scale(17),
    fontWeight: '600',
  },
});