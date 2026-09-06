import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../utils/ThemeContext';
import { useLanguage } from '../utils/LanguageContext';
import { scale } from '../utils/responsive';

const TIP_KEYS = ['sameTime', 'sameSpot', 'clothing', 'angles'];

export default function PhotoTipsScreen({ navigation }) {
  const { theme } = useTheme();
  const { t } = useLanguage();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={[styles.backBtn, { color: theme.text }]}>←</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>{t('progress.tipsTitle')}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={[styles.intro, { color: theme.textSecondary }]}>{t('progress.tipsIntro')}</Text>

        {TIP_KEYS.map((key, i) => (
          <View key={key} style={[styles.tipCard, { backgroundColor: theme.cardBackground }]}>
            <View style={styles.tipNum}><Text style={styles.tipNumText}>{i + 1}</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.tipTitle, { color: theme.text }]}>{t(`progress.tip_${key}_title`)}</Text>
              <Text style={[styles.tipDesc, { color: theme.textSecondary }]}>{t(`progress.tip_${key}_desc`)}</Text>
            </View>
          </View>
        ))}

        <TouchableOpacity
          style={[styles.gotItBtn, { backgroundColor: theme.primary }]}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.gotItBtnText}>{t('progress.tipsGotIt')}</Text>
        </TouchableOpacity>
      </ScrollView>
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
  scroll: { padding: 20, paddingTop: 4 },
  intro: { fontSize: scale(13), lineHeight: scale(19), marginBottom: 18 },
  tipCard: { flexDirection: 'row', gap: 12, borderRadius: 12, padding: 14, marginBottom: 10, alignItems: 'flex-start' },
  tipNum: {
    width: 26, height: 26, borderRadius: 13, backgroundColor: '#4CAF50',
    justifyContent: 'center', alignItems: 'center', flexShrink: 0,
  },
  tipNumText: { color: '#fff', fontSize: scale(13), fontWeight: '800' },
  tipTitle: { fontSize: scale(13.5), fontWeight: '700', marginBottom: 2 },
  tipDesc: { fontSize: scale(12), lineHeight: scale(16) },
  gotItBtn: { borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 14 },
  gotItBtnText: { color: '#fff', fontWeight: '700', fontSize: scale(14.5) },
});
