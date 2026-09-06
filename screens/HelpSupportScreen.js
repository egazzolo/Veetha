import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../utils/ThemeContext';
import { useLanguage } from '../utils/LanguageContext';
import { scale } from '../utils/responsive';

export default function HelpSupportScreen({ navigation }) {
  const { theme } = useTheme();
  const { t } = useLanguage();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={[styles.backBtn, { color: theme.text }]}>←</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>{t('profile.helpSupport')}</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={[styles.card, { backgroundColor: theme.cardBackground }]}>
        <TouchableOpacity style={styles.row} onPress={() => navigation.navigate('PhotoTips')}>
          <View style={styles.rowLeft}>
            <Text style={styles.rowIcon}>📸</Text>
            <Text style={[styles.rowLabel, { color: theme.text }]}>{t('progress.tipsTitle')}</Text>
          </View>
          <Text style={[styles.rowArrow, { color: theme.textTertiary }]}>›</Text>
        </TouchableOpacity>

        <View style={[styles.divider, { backgroundColor: theme.border }]} />

        <TouchableOpacity style={styles.row} onPress={() => Linking.openURL('mailto:support@veetha.com')}>
          <View style={styles.rowLeft}>
            <Text style={styles.rowIcon}>💬</Text>
            <Text style={[styles.rowLabel, { color: theme.text }]}>{t('profile.contactSupport')}</Text>
          </View>
          <Text style={[styles.rowArrow, { color: theme.textTertiary }]}>›</Text>
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
  card: { marginHorizontal: 20, borderRadius: 14, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowIcon: { fontSize: scale(18) },
  rowLabel: { fontSize: scale(14), fontWeight: '500' },
  rowArrow: { fontSize: scale(18) },
  divider: { height: 1, marginHorizontal: 16 },
});
