import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Switch, ActivityIndicator, Platform, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../utils/ThemeContext';
import { useLanguage } from '../utils/LanguageContext';
import { useUser } from '../utils/UserContext';
import { useUserMode } from '../utils/UserModeContext';
import { usePremiumStatus } from '../utils/usePremiumStatus';
import { supabase } from '../utils/supabase';
import { showToast } from '../components/VeethaToast';
import {
  getMealReminderPrefs,
  setMealReminderPref,
  getMealReminderTimes,
  setMealReminderTime,
  rescheduleMealReminders,
} from '../utils/mealReminders';

function formatTime(hour, minute) {
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function timeToDate(hour, minute) {
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  return d;
}

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
  const { isPremium } = usePremiumStatus();

  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);
  const [savingUnit, setSavingUnit] = useState(false);
  const [defaultStatsTab, setDefaultStatsTab] = useState('week');
  const [invertSwipe, setInvertSwipe] = useState(false);
  const [mealPrefs, setMealPrefs] = useState({ breakfast: true, lunch: true, dinner: true });
  const [mealTimes, setMealTimes] = useState({
    breakfast: { hour: 8, minute: 0 },
    lunch: { hour: 13, minute: 0 },
    dinner: { hour: 19, minute: 0 },
  });
  const [activeTimePicker, setActiveTimePicker] = useState(null);
  // Local AsyncStorage-backed prefs resolve a beat after first render --
  // without this, the screen briefly shows defaults (e.g. Metric, Week)
  // before flipping to the real saved values, which read as "took a
  // second to load." Gate the real content behind this instead.
  const [prefsLoaded, setPrefsLoaded] = useState(false);

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem('default_stats_tab').then((val) => {
        if (val === 'month' || val === 'exercise' || val === 'progress') setDefaultStatsTab(val);
      }),
      AsyncStorage.getItem('statsInvertSwipeDirection').then((val) => {
        setInvertSwipe(val === 'true');
      }),
      getMealReminderPrefs().then(setMealPrefs),
      getMealReminderTimes().then(setMealTimes),
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
    await rescheduleMealReminders(t, isPremium);
  };

  // Reminders repeat daily at a fixed clock time -- if that time already
  // passed today, the next firing is tomorrow, not "in a few minutes."
  // Surfacing which one it is here head off the confusing "I set it and
  // nothing happened" report when someone tests with a near time that's
  // already behind the current clock.
  const confirmReminderSet = (hour, minute) => {
    const now = new Date();
    let target = timeToDate(hour, minute);
    const firesToday = target > now;
    if (!firesToday) target = new Date(target.getTime() + 24 * 60 * 60 * 1000);
    const day = firesToday ? t('common.today') : t('common.tomorrow');

    const totalMinutes = Math.max(0, Math.round((target - now) / 60000));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    const relative = hours === 0
      ? t('common.inMinutes', { minutes })
      : minutes === 0
        ? t('common.inHours', { hours })
        : t('common.inHoursMinutes', { hours, minutes });

    showToast(
      'info',
      t('preferences.mealReminders'),
      `${t('preferences.reminderTimeSet', { day, time: formatTime(hour, minute) })} (${relative})`
    );
  };

  const handleTimeChange = async (event, selectedDate) => {
    const meal = activeTimePicker;
    // Android's dialog dismisses itself and reports the outcome via
    // event.type; iOS's inline spinner has no dismiss event and keeps
    // firing onChange as the user scrolls, so it stays open until Done.
    if (Platform.OS === 'android') {
      setActiveTimePicker(null);
      if (event.type !== 'set' || !selectedDate || !meal) return;
    } else if (!selectedDate || !meal) {
      return;
    }

    const hour = selectedDate.getHours();
    const minute = selectedDate.getMinutes();
    setMealTimes((prev) => ({ ...prev, [meal]: { hour, minute } }));
    await setMealReminderTime(meal, hour, minute);
    await rescheduleMealReminders(t, isPremium);
    if (Platform.OS === 'android') confirmReminderSet(hour, minute);
  };

  const closeTimePicker = () => {
    if (activeTimePicker) {
      const { hour, minute } = mealTimes[activeTimePicker];
      confirmReminderSet(hour, minute);
    }
    setActiveTimePicker(null);
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
        {/* Language + Unit System -- side by side */}
        <View style={styles.sideBySideRow}>
          <View style={styles.sideBySideCard}>
            <Text style={[styles.sideBySideTitle, { color: theme.text }]}>{t('preferences.language')}</Text>
            <Text style={styles.sideBySideDesc}> </Text>
            <TouchableOpacity
              style={[styles.dropdown, { backgroundColor: theme.inputBackground || theme.cardBackground, borderColor: theme.border }]}
              onPress={() => setShowLanguageDropdown(!showLanguageDropdown)}
            >
              <Text style={[styles.dropdownText, { color: theme.text }]} numberOfLines={1}>{currentLanguageLabel}</Text>
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

          <View style={styles.sideBySideCard}>
            <Text style={[styles.sideBySideTitle, { color: theme.text }]}>{t('preferences.unitSystem')}</Text>
            <Text style={styles.sideBySideDesc}> </Text>
            <View style={styles.segmentedControl}>
              <TouchableOpacity
                style={[styles.segment, unitSystem === 'metric' && [styles.segmentActive, { backgroundColor: theme.primary }]]}
                onPress={() => changeUnitSystem('metric')}
              >
                <Text
                  style={[styles.segmentText, { color: theme.textSecondary }, unitSystem === 'metric' && styles.segmentTextActive]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                >
                  {t('editProfile.metric')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.segment, unitSystem === 'imperial' && [styles.segmentActive, { backgroundColor: theme.primary }]]}
                onPress={() => changeUnitSystem('imperial')}
              >
                <Text
                  style={[styles.segmentText, { color: theme.textSecondary }, unitSystem === 'imperial' && styles.segmentTextActive]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                >
                  {t('editProfile.imperial')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Swipe Direction + Default Stats View -- side by side */}
        <View style={styles.sideBySideRow}>
          <View style={styles.sideBySideCard}>
            <Text style={[styles.sideBySideTitle, { color: theme.text }]}>{t('preferences.swipeDirection')}</Text>
            <Text style={[styles.sideBySideDesc, { color: theme.textSecondary }]} numberOfLines={2}>
              {t('preferences.swipeDirectionDesc')}
            </Text>
            <View style={styles.sideBySideToggleRow}>
              <Text style={[styles.rowLabel, styles.sideBySideToggleLabel, { color: theme.text }]} numberOfLines={1}>
                {t('preferences.invertSwipe')}
              </Text>
              <Switch
                value={invertSwipe}
                onValueChange={toggleInvertSwipe}
                trackColor={{ false: theme.border, true: theme.primary }}
              />
            </View>
          </View>

          <View style={styles.sideBySideCard}>
            <Text style={[styles.sideBySideTitle, { color: theme.text }]}>{t('preferences.defaultView')}</Text>
            <Text style={[styles.sideBySideDesc, { color: theme.textSecondary }]} numberOfLines={2}>
              {t('preferences.defaultViewDesc')}
            </Text>
            <View style={[styles.segmentedControl, styles.segmentedControlWrap]}>
              {['week', 'month', 'exercise', 'progress'].map((tab) => (
                <TouchableOpacity
                  key={tab}
                  style={[styles.segment, styles.segmentQuad, defaultStatsTab === tab && [styles.segmentActive, { backgroundColor: theme.primary }]]}
                  onPress={() => changeDefaultStatsTab(tab)}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      styles.defaultViewSegmentText,
                      { color: theme.textSecondary },
                      defaultStatsTab === tab && styles.segmentTextActive,
                    ]}
                    numberOfLines={1}
                  >
                    {t(`stats.${tab}`)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Meal Reminders */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>{t('preferences.mealReminders')}</Text>
          <Text style={[styles.sectionDesc, { color: theme.textSecondary }]}>{t('preferences.mealRemindersDesc')}</Text>

          {['breakfast', 'lunch', 'dinner'].map((meal) => (
            <View key={meal} style={[styles.row, { borderBottomColor: theme.border }]}>
              <Text style={[styles.rowLabel, { color: theme.text }]}>{t(`preferences.${meal}`)}</Text>
              <TouchableOpacity
                style={[styles.timeChip, { borderColor: theme.border }]}
                onPress={() => (isPremium
                  ? setActiveTimePicker(meal)
                  : navigation.navigate('Paywall', { highlightFeature: 'Custom reminder times' }))}
              >
                <Text style={[styles.timeChipText, { color: mealPrefs[meal] ? theme.primary : theme.textTertiary }]}>
                  {formatTime(mealTimes[meal].hour, mealTimes[meal].minute)}
                </Text>
                {!isPremium && <Text style={styles.timeChipLock}>🔒</Text>}
              </TouchableOpacity>
              <Switch
                value={mealPrefs[meal]}
                onValueChange={(value) => toggleMealReminder(meal, value)}
                trackColor={{ false: theme.border, true: theme.primary }}
              />
            </View>
          ))}
        </View>

        {activeTimePicker && Platform.OS === 'android' && (
          <DateTimePicker
            value={timeToDate(mealTimes[activeTimePicker].hour, mealTimes[activeTimePicker].minute)}
            mode="time"
            display="default"
            onChange={handleTimeChange}
          />
        )}

        {activeTimePicker && Platform.OS === 'ios' && (
          <Modal transparent animationType="fade" visible onRequestClose={closeTimePicker}>
            <View style={styles.timePickerOverlay}>
              <View style={[styles.timePickerSheet, { backgroundColor: theme.cardBackground }]}>
                <DateTimePicker
                  value={timeToDate(mealTimes[activeTimePicker].hour, mealTimes[activeTimePicker].minute)}
                  mode="time"
                  display="spinner"
                  onChange={handleTimeChange}
                />
                <TouchableOpacity
                  style={[styles.timePickerDoneBtn, { backgroundColor: theme.primary }]}
                  onPress={closeTimePicker}
                >
                  <Text style={styles.timePickerDoneBtnText}>{t('common.done')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        )}
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
  sideBySideRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 20,
    gap: 12,
  },
  sideBySideCard: { flex: 1 },
  // A fixed 1px dark-translucent line rather than theme.border -- theme.border
  // (#e0e0e0) is nearly the same lightness as this screen's beige background,
  // so it was rendering but effectively invisible. Matches the hairline-divider
  // color already used elsewhere (e.g. ExerciseHistoryScreen.js).
  divider: {
    height: 1,
    backgroundColor: '#00000022',
    marginVertical: 18,
  },
  sideBySideTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  // Reserves the same vertical space whether a card has real helper text
  // (Swipe Direction, Default View) or none (Language, Unit System) -- so
  // the control below it (dropdown / segmented / toggle) starts at the same
  // Y in every card in the row instead of drifting with text length.
  sideBySideDesc: {
    fontSize: 11,
    lineHeight: 14,
    minHeight: 28,
    marginBottom: 8,
  },
  sideBySideToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sideBySideToggleLabel: { flex: 1, marginRight: 8, fontSize: 13 },
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
  // Default Stats View has 4 options (Week/Month/Exercise/Progress) inside a
  // half-width card -- a single row would squeeze every label unreadably, so
  // this variant wraps them into a 2x2 grid instead.
  segmentedControlWrap: { flexWrap: 'wrap' },
  segmentQuad: { flexBasis: '48%', marginVertical: 3 },
  segmentActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  segmentText: { fontSize: 13, fontWeight: '600' },
  segmentTextActive: { color: '#fff', fontWeight: 'bold' },
  // Fixed (not auto-shrinking) so Week/Month/Exercise render at one matching
  // size -- adjustsFontSizeToFit sized each label independently off its own
  // text width, so the short "Week" stayed near the base size while the
  // long "Exercise" shrank much further, leaving all three visibly mismatched.
  defaultViewSegmentText: { fontSize: 11.5 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  rowLabel: { fontSize: 15, fontWeight: '500' },
  timeChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, marginRight: 12,
  },
  timeChipText: { fontSize: 14, fontWeight: '700' },
  timeChipLock: { fontSize: 11 },
  timePickerOverlay: {
    flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)',
  },
  timePickerSheet: {
    borderTopLeftRadius: 16, borderTopRightRadius: 16, paddingTop: 8, paddingBottom: 24, paddingHorizontal: 16,
  },
  timePickerDoneBtn: {
    borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 8,
  },
  timePickerDoneBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
