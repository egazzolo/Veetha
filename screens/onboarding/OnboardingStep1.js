import React, { useState, useEffect } from 'react';
import { useCameraPermissions } from 'expo-camera';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useOnboarding } from '../../utils/OnboardingContext';
import { useLanguage } from '../../utils/LanguageContext';
import LanguageSwitcher from '../../components/LanguageSwitcher';

function DOBPicker({ value, onChange, t, language }) {
  const LOCALE_MAP = { en: 'en-US', es: 'es-ES', fr: 'fr-FR', tl: 'fil-PH' };
  const locale = LOCALE_MAP[language] || 'en-US';
  const today = new Date();
  const initial = value || new Date(1990, 0, 1);

  const [viewYear, setViewYear] = useState(initial.getFullYear());
  const [viewMonth, setViewMonth] = useState(initial.getMonth());
  const [mode, setMode] = useState('day'); // 'day' | 'year'

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  let firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();
  firstDayOfWeek = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;

  const cells = [];
  for (let i = 0; i < firstDayOfWeek; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const goPrevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };

  const goNextMonth = () => {
    const isCurrentMonth = viewYear === today.getFullYear() && viewMonth === today.getMonth();
    if (isCurrentMonth) return;
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  const selectDay = (day) => {
    const selected = new Date(viewYear, viewMonth, day);
    if (selected > today) return;
    onChange(selected);
  };

  const selectedDay = value
    ? (value.getFullYear() === viewYear && value.getMonth() === viewMonth ? value.getDate() : null)
    : null;

  const currentYear = today.getFullYear();
  const years = [];
  for (let y = currentYear; y >= 1930; y--) years.push(y);

  if (mode === 'year') {
    return (
      <View style={styles.dobContainer}>
        <Text style={styles.yearPickerTitle}>Select Year</Text>
        <ScrollView style={{ maxHeight: 260 }} showsVerticalScrollIndicator={false}>
          <View style={styles.yearGrid}>
            {years.map(y => (
              <TouchableOpacity
                key={y}
                style={[styles.yearCell, y === viewYear && styles.yearCellSelected]}
                onPress={() => { setViewYear(y); setMode('day'); }}
              >
                <Text style={[styles.yearText, y === viewYear && styles.yearTextSelected]}>
                  {y}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.dobContainer}>
      <View style={styles.dobHeader}>
        <TouchableOpacity onPress={goPrevMonth} style={styles.navBtn}>
          <Text style={styles.navText}>‹</Text>
        </TouchableOpacity>

        <View style={{ flexDirection: 'row', gap: 6 }}>
          <Text style={styles.monthLabel}>
            {new Date(viewYear, viewMonth).toLocaleDateString(locale, { month: 'long' })}
          </Text>
          <TouchableOpacity onPress={() => setMode('year')}>
            <Text style={[styles.monthLabel, { textDecorationLine: 'underline', color: '#4CAF50' }]}>
              {viewYear}
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={goNextMonth} style={styles.navBtn}>
          <Text style={styles.navText}>›</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.weekRow}>
        {t('stats.weekdays').map((d, i) => (
          <Text key={i} style={styles.weekDay}>{d}</Text>
        ))}
      </View>

      <View style={styles.dayGrid}>
        {cells.map((day, i) => {
          if (!day) return <View key={`e-${i}`} style={styles.dayCell} />;
          const isFuture = new Date(viewYear, viewMonth, day) > today;
          const isSelected = day === selectedDay;
          return (
            <TouchableOpacity
              key={day}
              style={styles.dayCell}
              onPress={() => !isFuture && selectDay(day)}
              disabled={isFuture}
              activeOpacity={0.7}
            >
              <View style={[
                styles.dayCellInner,
                isSelected && { backgroundColor: '#4CAF50' },
                isFuture && { opacity: 0.3 },
              ]}>
                <Text style={[styles.dayText, isSelected && { color: '#fff', fontWeight: 'bold' }]}>
                  {day}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

//*** GENDER AND DOB SCREEN ***
export default function OnboardingStep1({ navigation }) {
  const [permission, requestPermission] = useCameraPermissions();
  const { updateOnboardingData } = useOnboarding();
  const [gender, setGender] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState(null);
  const [error, setError] = useState('');
  const { t, language } = useLanguage();

  const LOCALE_MAP = { en: 'en-US', es: 'es-ES', fr: 'fr-FR', tl: 'fil-PH' };

  useEffect(() => {
    const requestCameraIfNeeded = async () => {
      const alreadyRequested = await AsyncStorage.getItem('camera_permission_requested');
      if (!permission?.granted && !alreadyRequested) {
        await requestPermission();
        await AsyncStorage.setItem('camera_permission_requested', 'true');
      }
    };
    requestCameraIfNeeded();
  }, []);

  const calculateAge = (dateOfBirth) => {
    if (!dateOfBirth) return null;
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  };

  const handleContinue = () => {
    setError('');
    if (!gender) {
      setError(t('onboarding.selectGender'));
      return;
    }
    if (!dateOfBirth) {
      setError(t('onboarding.selectDOBError'));
      return;
    }
    const age = calculateAge(dateOfBirth);
    if (age < 13 || age > 120) {
      setError(t('onboarding.ageRange'));
      return;
    }
    updateOnboardingData({
      gender,
      dateOfBirth: dateOfBirth.toISOString(), // Save as ISO string
      age,
    });
    console.log('✅ Step 1 saved:', { gender, dateOfBirth, age });
    navigation.navigate('OnboardingStep1b');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.content}>
        <View style={styles.languageSwitcherContainer}>
          <LanguageSwitcher />
        </View>

        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: '12.5%' }]} />
          </View>
          <Text style={styles.progressText}>{t('onboarding.step')} 1 {t('onboarding.of')} 8</Text>
        </View>

        {/* Title */}
        <Text style={styles.title}>{t('onboarding.step1Title')}</Text>

        {/* Error Message */}
        {error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* Gender Selection */}
        <View style={styles.section}>
          <Text style={styles.label}>{t('onboarding.gender')}</Text>
          <View style={styles.optionsRow}>
            <TouchableOpacity
              style={[styles.optionButton, gender === 'male' && styles.optionButtonSelected]}
              onPress={() => setGender('male')}
            >
              <Text style={[styles.optionText, gender === 'male' && styles.optionTextSelected]}>
                {t('onboarding.male')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.optionButton, gender === 'female' && styles.optionButtonSelected]}
              onPress={() => setGender('female')}
            >
              <Text style={[styles.optionText, gender === 'female' && styles.optionTextSelected]}>
                {t('onboarding.female')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>{t('onboarding.dateOfBirth')}</Text>
          {dateOfBirth && (
            <Text style={{ color: '#4CAF50', marginBottom: 8, fontWeight: '600' }}>
              {dateOfBirth.toLocaleDateString(LOCALE_MAP[language] || 'en-US')}
            </Text>
          )}
          <DOBPicker
            value={dateOfBirth}
            onChange={(date) => setDateOfBirth(date)}
            t={t}
            language={language}
          />
        </View>

        {/* Spacer */}
        <View style={{ flex: 1 }} />

        {/* Continue Button */}
        <View style={styles.navigationButtons}>
          <TouchableOpacity
            style={styles.continueButton}
            onPress={handleContinue}
          >
            <Text style={styles.continueButtonText}>{t('onboarding.continue')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EAE0C8',
  },
  content: {
    flex: 1,
    paddingHorizontal: 30,
    paddingTop: 20,
  },
  progressContainer: {
    marginBottom: 30,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#e0e0e0',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
  },
  progressText: {
    fontSize: 12,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 30,
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  errorText: {
    color: '#c62828',
    textAlign: 'center',
  },
  section: {
    marginBottom: 30,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  optionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  optionButton: {
    flex: 1,
    minWidth: '30%',
    paddingVertical: 15,
    paddingHorizontal: 10,
    borderWidth: 2,
    borderColor: '#6B5B45',
    borderRadius: 10,
    alignItems: 'center',
  },
  optionButtonSelected: {
    borderColor: '#4CAF50',
    backgroundColor: '#e8f5e9',
  },
  optionText: {
    fontSize: 14,
    color: '#666',
  },
  optionTextSelected: {
    color: '#4CAF50',
    fontWeight: '600',
  },
  navigationButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
    marginBottom: 20,
  },
  continueButton: {
    flex: 1,
    backgroundColor: '#4CAF50',
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  continueButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  languageSwitcherContainer: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 10,
  },
  dobContainer: { 
    borderWidth: 2, 
    borderColor: '#6B5B45', 
    borderRadius: 10, 
    padding: 12, 
  },
  dobHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 12 
  },
  navBtn: { 
    padding: 8 
  },
  navText: { 
    fontSize: 22, 
    fontWeight: 'bold', 
    color: '#333' 
  },
  monthLabel: { 
    fontSize: 15, 
    fontWeight: '600', 
    color: '#333' 
  },
  weekRow: { 
    flexDirection: 'row', 
    marginBottom: 6 
  },
  weekDay: { 
    flexBasis: '14.2857%', 
    textAlign: 'center', 
    fontSize: 11, 
    color: '#999', 
    fontWeight: '600' 
  },
  dayGrid: { 
    flexDirection: 'row', 
    flexWrap: 'wrap' 
  },
  dayCell: { 
    flexBasis: '14.2857%', 
    aspectRatio: 1, 
    padding: 2 
  },
  dayCellInner: { 
    flex: 1, 
    borderRadius: 6, 
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: '#f0ece4' 
  },
  dayText: { 
    fontSize: 12, 
    color: '#333' 
  },
  yearPickerTitle: { 
    fontSize: 15, 
    fontWeight: '600', 
    color: '#333', 
    textAlign: 'center', 
    marginBottom: 12 
  },
  yearGrid: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    width: '100%',
    gap: 8, 
    paddingBottom: 8 
  },
  yearCell: { 
    width: '28%', 
    paddingVertical: 10, 
    borderRadius: 8, 
    alignItems: 'center', 
    backgroundColor: '#f0ece4' 
  },
  yearCellSelected: { 
    backgroundColor: '#4CAF50' 
  },
  yearText: { 
    fontSize: 14, 
    color: '#333' 
  },
  yearTextSelected: { 
    color: '#fff', 
    fontWeight: 'bold' 
  },
});