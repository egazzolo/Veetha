import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Switch, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../utils/ThemeContext';
import { useLanguage } from '../utils/LanguageContext';
import { useUser } from '../utils/UserContext';
import { useUserMode } from '../utils/UserModeContext';
import { supabase } from '../utils/supabase';
import { getMealReminderPrefs, setMealReminderPref, rescheduleMealReminders } from '../utils/mealReminders';

const LANGUAGES = [
  { code: 'en', label: '🇬🇧 English' },
  { code: 'es', label: '🇪🇸 Español' },
  { code: 'fr', label: '🇫🇷 Français' },
  { code: 'tl', label: '🇵🇭 Filipino' },
  { code: 'pt', label: '🇧🇷 Português' },
];

export default function PreferencesScreen({ navigation }) {
  const { theme } = useTheme();
  const { language, t, setLanguage } = useLanguage();
  const { profile, loading: profileLoading, refreshProfile } = useUser();
  const { isGuest: isGuestMode } = useUserMode();

  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);
  const [savingUnit, setSavingUnit] = useState(false);
  const [defaultStatsTab, setDefaultStatsTab] = useState('week');
  const [invertSwipe, setInvertSwipe] = useState(false);
  const [mealPrefs, setMealPrefs] = useState({ breakfast: true, lunch: true, dinner: true });
  // Local AsyncStorage-backed prefs resolve a beat after first render --
  // without this, the screen briefly shows defaults (e.g. Metric, Week)
  // before flipping to the real saved values, which read as "took a
  // second to load." Gate the real content behind this instead.
  const [prefsLoaded, setPrefsLoaded] = useState(false);

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem('default_stats_tab').then((val) => {
        if (val === 'month' || val === 'exercise') setDefaultStatsTab(val);
      }),
      AsyncStorage.getItem('statsInvertSwipeDirection').then((val) => {
        setInvertSwipe(val === 'true');
      }),
      getMealReminderPrefs().then(setMealPrefs),
    ]).then(() => setPrefsLoaded(true));
  }, []);

  const unitSystem = profile?.unit_preference === 'imperial' ? 'imperial' : 'metric';

  const changeUnitSystem = async (next) => {
    if (isGuestMode || savingUnit || unitSystem === next) return;
    setSavingUnit(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from('profiles').update({ unit_preference: next }).eq('id', user.id);
      await refreshProfile();
    } catch (error) {
      console.error('Error updating unit preference:', error);
    } finally {
      setSavingUnit(false);
    }
  };

  const changeDefaultStatsTab = async (tab) => {
    setDefaultStatsTab(tab);
    await AsyncStorage.setItem('default_stats_tab', tab);
  };

  const toggleInvertSwipe = async (value) => {
    setInvertSwipe(value);
    await AsyncStorage.setItem('statsInvertSwipeDirection', String(value));
  };

  const toggleMealReminder = async (meal, value) => {
    setMealPrefs((prev) => ({ ...prev, [meal]: value }));
    await setMealReminderPref(meal, value);
    await rescheduleMealReminders(t);
  };

  const currentLanguageLabel = LANGUAGES.find((l) => l.code === language)?.label || '';

  if (profileLoading || !prefsLoaded) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top', 'bottom']}>
        <View style={[styles.header, { backgroundColor: theme.cardBackground, borderBottomColor: theme.border }]}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Text style={[styles.backArrow, { color: theme.text }]}>←</Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>{t('preferences.title')}</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top', 'bottom']}>
      <View style={[styles.header, { backgroundColor: theme.cardBackground, borderBottomColor: theme.border }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={[styles.backArrow, { color: theme.text }]}>←</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>{t('preferences.title')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content}>
        {/* Language */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>{t('preferences.language')}</Text>
          <TouchableOpacity
            style={[styles.dropdown, { backgroundColor: theme.inputBackground || theme.cardBackground, borderColor: theme.border }]}
            onPress={() => setShowLanguageDropdown(!showLanguageDropdown)}
          >
            <Text style={[styles.dropdownText, { color: theme.text }]}>{currentLanguageLabel}</Text>
            <Text style={[styles.dropdownArrow, { color: theme.textSecondary }]}>{showLanguageDropdown ? '▲' : '▼'}</Text>
          </TouchableOpacity>
          {showLanguageDropdown && (
            <View style={[styles.dropdownMenu, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
              {LANGUAGES.map((l) => (
                <TouchableOpacity
                  key={l.code}
                  style={[styles.dropdownItem, language === l.code && { backgroundColor: theme.primary + '20' }]}
                  onPress={async () => {
                    setShowLanguageDropdown(false);
                    if (l.code !== language) await setLanguage(l.code);
                  }}
                >
                  <Text style={[styles.dropdownItemText, { color: theme.text }]}>{l.label}</Text>
                  {language === l.code && <Text style={{ color: theme.primary }}>✓</Text>}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Unit System */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>{t('preferences.unitSystem')}</Text>
          <View style={styles.segmentedControl}>
            <TouchableOpacity
              style={[styles.segment, unitSystem === 'metric' && [styles.segmentActive, { backgroundColor: theme.primary }]]}
              onPress={() => changeUnitSystem('metric')}
            >
              <Text style={[styles.segmentText, { color: theme.textSecondary }, unitSystem === 'metric' && styles.segmentTextActive]}>
                {t('editProfile.metric')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.segment, unitSystem === 'imperial' && [styles.segmentActive, { backgroundColor: theme.primary }]]}
              onPress={() => changeUnitSystem('imperial')}
            >
              <Text style={[styles.segmentText, { color: theme.textSecondary }, unitSystem === 'imperial' && styles.segmentTextActive]}>
                {t('editProfile.imperial')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Default Stats View */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>{t('preferences.defaultView')}</Text>
          <Text style={[styles.sectionDesc, { color: theme.textSecondary }]}>{t('preferences.defaultViewDesc')}</Text>
          <View style={styles.segmentedControl}>
            {['week', 'month', 'exercise'].map((tab) => (
              <TouchableOpacity
                key={tab}
                style={[styles.segment, defaultStatsTab === tab && [styles.segmentActive, { backgroundColor: theme.primary }]]}
                onPress={() => changeDefaultStatsTab(tab)}
              >
                <Text style={[styles.segmentText, { color: theme.textSecondary }, defaultStatsTab === tab && styles.segmentTextActive]}>
                  {t(`stats.${tab}`)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Meal Reminders */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>{t('preferences.mealReminders')}</Text>
          <Text style={[styles.sectionDesc, { color: theme.textSecondary }]}>{t('preferences.mealRemindersDesc')}</Text>

          {['breakfast', 'lunch', 'dinner'].map((meal) => (
            <View key={meal} style={[styles.row, { borderBottomColor: theme.border }]}>
              <Text style={[styles.rowLabel, { color: theme.text }]}>{t(`preferences.${meal}`)}</Text>
              <Switch
                value={mealPrefs[meal]}
                onValueChange={(value) => toggleMealReminder(meal, value)}
                trackColor={{ false: theme.border, true: theme.primary }}
              />
            </View>
          ))}
        </View>

        {/* Swipe Direction */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>{t('preferences.swipeDirection')}</Text>
          <Text style={[styles.sectionDesc, { color: theme.textSecondary }]}>{t('preferences.swipeDirectionDesc')}</Text>
          <View style={[styles.row, { borderBottomColor: theme.border }]}>
            <Text style={[styles.rowLabel, { color: theme.text }]}>{t('preferences.invertSwipe')}</Text>
            <Switch
              value={invertSwipe}
              onValueChange={toggleInvertSwipe}
              trackColor={{ false: theme.border, true: theme.primary }}
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
  },
  backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  backArrow: { fontSize: 24 },
  headerTitle: { fontSize: 20, fontWeight: 'bold' },
  content: { flex: 1 },
  section: { padding: 20 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  sectionDesc: { fontSize: 13, lineHeight: 18, marginBottom: 15 },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  dropdownText: { fontSize: 15, fontWeight: '600' },
  dropdownArrow: { fontSize: 12 },
  dropdownMenu: { marginTop: 8, borderWidth: 1, borderRadius: 12, overflow: 'hidden' },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  dropdownItemText: { fontSize: 15 },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: 'rgba(128,128,128,0.15)',
    borderRadius: 12,
    padding: 4,
  },
  segment: { flex: 1, paddingVertical: 12, paddingHorizontal: 10, borderRadius: 8, alignItems: 'center' },
  segmentActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  segmentText: { fontSize: 13, fontWeight: '600' },
  segmentTextActive: { color: '#fff', fontWeight: 'bold' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  rowLabel: { fontSize: 15, fontWeight: '500' },
});
