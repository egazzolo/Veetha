import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Image, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import { useTheme } from '../utils/ThemeContext';
import { useLanguage } from '../utils/LanguageContext';
import { scale } from '../utils/responsive';

export default function AboutScreen({ navigation }) {
  const { theme } = useTheme();
  const { t } = useLanguage();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={[styles.backBtn, { color: theme.text }]}>←</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>{t('profile.aboutVeetha')}</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.body}>
        <Image source={require('../assets/LogoAppStore.png')} style={styles.logo} resizeMode="contain" />
        <Text style={[styles.appName, { color: theme.text }]}>Meal Break</Text>
        <Text style={[styles.version, { color: theme.textTertiary }]}>
          {t('profile.version')} {Constants.expoConfig.version}
        </Text>

        <Text style={[styles.description, { color: theme.textSecondary }]}>
          {t('profile.aboutDescription')}
        </Text>

        <TouchableOpacity
          style={[styles.websiteBtn, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}
          onPress={() => Linking.openURL('https://mealbreak.fit')}
        >
          <Text style={[styles.websiteBtnText, { color: theme.primary }]}>{t('profile.visitWebsite')}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
  },
  backBtn: { fontSize: scale(22), fontWeight: '600' },
  headerTitle: { fontSize: scale(17), fontWeight: '700' },
  body: { alignItems: 'center', paddingHorizontal: 28, paddingTop: 20 },
  logo: { width: scale(84), height: scale(84), borderRadius: scale(20), marginBottom: 14 },
  appName: { fontSize: scale(22), fontWeight: '800', marginBottom: 4 },
  version: { fontSize: scale(12.5), marginBottom: 20 },
  description: {
    fontSize: scale(14), lineHeight: scale(21), textAlign: 'center', marginBottom: 28,
  },
  websiteBtn: {
    borderWidth: 1, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 28,
  },
  websiteBtnText: { fontSize: scale(15), fontWeight: '700' },
});
