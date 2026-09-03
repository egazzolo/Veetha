import React, { useState, useEffect, useRef } from 'react';
import { useCameraPermissions } from 'expo-camera';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Dimensions, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useOnboarding } from '../../utils/OnboardingContext';
import { useLanguage } from '../../utils/LanguageContext';
import LanguageSwitcher from '../../components/LanguageSwitcher';
import { scale } from '../../utils/responsive';
import { posthog } from '../../utils/posthog';

function DOBPicker({ value, onChange, t, language }) {
  const LOCALE_MAP = { en: 'en-US', es: 'es-ES', fr: 'fr-FR', tl: 'fil-PH' };
  const locale = LOCALE_MAP[language] || 'en-US';
  const today = new Date();
  const initial = value || new Date(1990, 0, 1);

  const { width } = Dimensions.get('window');
  const calendarWidth = width * 0.9;
  const scaleFactor = Math.min(width / 390, 1);
  const calFontSize = (size) => Math.max(Math.round(size * scaleFactor), 8);

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
      <View style={[styles.dobContainer, { width: calendarWidth, alignSelf: 'center', padding: calendarWidth * 0.03 }]}>
        <Text style={[styles.yearPickerTitle, { fontSize: calFontSize(14) }]}>Select Year</Text>
        <ScrollView style={{ maxHeight: 260 }} showsVerticalScrollIndicator={false}>
          <View style={styles.yearGrid}>
            {years.map(y => (
              <TouchableOpacity
                key={y}
                style={[styles.yearCell, { width: calendarWidth * 0.27, paddingVertical: calendarWidth * 0.025, paddingHorizontal: 4 }, y === viewYear && styles.yearCellSelected]}
                onPress={() => { setViewYear(y); setMode('day'); }}
              >
                <Text style={[styles.yearText, { fontSize: calFontSize(13) }, y === viewYear && styles.yearTextSelected]} numberOfLines={1} adjustsFontSizeToFit>
                  {y}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>
    );
  }

  const dayCellSize = calendarWidth * 0.127;

  return (
    <View style={[styles.dobContainer, { width: calendarWidth, alignSelf: 'center', padding: calendarWidth * 0.03 }]}>
      <View style={styles.dobHeader}>
        <TouchableOpacity onPress={goPrevMonth} style={styles.navBtn}>
          <Text style={[styles.navText, { fontSize: calFontSize(20) }]}>‹</Text>
        </TouchableOpacity>

        <View style={{ flexDirection: 'row', gap: 6 }}>
          <Text style={[styles.monthLabel, { fontSize: calFontSize(14) }]} numberOfLines={1} adjustsFontSizeToFit>
            {new Date(viewYear, viewMonth).toLocaleDateString(locale, { month: 'long' })}
          </Text>
          <TouchableOpacity onPress={() => setMode('year')}>
            <Text style={[styles.monthLabel, { fontSize: calFontSize(14), textDecorationLine: 'underline', color: '#4CAF50' }]} numberOfLines={1} adjustsFontSizeToFit>
              {viewYear}
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={goNextMonth} style={styles.navBtn}>
          <Text style={[styles.navText, { fontSize: calFontSize(20) }]}>›</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.weekRow}>
        {t('stats.weekdays').map((d, i) => (
          <Text key={i} style={[styles.weekDay, { fontSize: calFontSize(10) }]}>{d}</Text>
        ))}
      </View>

      <View style={styles.dayGrid}>
        {cells.map((day, i) => {
          if (!day) return <View key={`e-${i}`} style={[styles.dayCell, { width: dayCellSize, height: dayCellSize }]} />;
          const isFuture = new Date(viewYear, viewMonth, day) > today;
          const isSelected = day === selectedDay;
          return (
            <TouchableOpacity
              key={day}
              style={[styles.dayCell, { width: dayCellSize, height: dayCellSize }]}
              onPress={() => !isFuture && selectDay(day)}
              disabled={isFuture}
              activeOpacity={0.7}
            >
              <View style={[
                styles.dayCellInner,
                isSelected && { backgroundColor: '#4CAF50' },
                isFuture && { opacity: 0.3 },
              ]}>
                <Text style={[styles.dayText, { fontSize: calFontSize(11) }, isSelected && { color: '#fff', fontWeight: 'bold' }]} numberOfLines={1} adjustsFontSizeToFit>
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

//*** GENDER, DOB, HEIGHT & WEIGHT SCREEN ***
export default function OnboardingStep1({ navigation }) {
  const [permission, requestPermission] = useCameraPermissions();
  const { updateOnboardingData } = useOnboarding();
  const [gender, setGender] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState(null);
  const [unit, setUnit] = useState('imperial'); // 'imperial' or 'metric'
  const [heightFeet, setHeightFeet] = useState('');
  const [heightInches, setHeightInches] = useState('');
  const [heightCm, setHeightCm] = useState('');
  const [weight, setWeight] = useState('');
  const [error, setError] = useState('');
  const { t, language } = useLanguage();

  const heightInchesRef = useRef(null);
  const heightCmWeightRef = useRef(null);
  const weightRef = useRef(null);
  const scrollRef = useRef(null);
  const statsY = useRef(0);
  const hasAutoScrolled = useRef(false);

  useEffect(() => { posthog.capture('onboarding_step_viewed', { step: 'basics' }); }, []);

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

  // Once gender + DOB are both picked, reveal the rest of the screen by
  // scrolling down to height/weight -- only the first time, so re-picking
  // either field afterward doesn't keep yanking the scroll position.
  useEffect(() => {
    if (gender && dateOfBirth && !hasAutoScrolled.current) {
      hasAutoScrolled.current = true;
      setTimeout(() => {
        scrollRef.current?.scrollTo({ y: statsY.current, animated: true });
      }, 300);
    }
  }, [gender, dateOfBirth]);

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

    if (unit === 'imperial') {
      if (!heightFeet || !heightInches) {
        setError(t('onboarding.enterHeight'));
        return;
      }
      const feet = parseInt(heightFeet);
      const inches = parseInt(heightInches);
      if (isNaN(feet) || isNaN(inches) || feet < 3 || feet > 8 || inches < 0 || inches >= 12) {
        setError(t('onboarding.validHeightImperial'));
        return;
      }
    } else {
      if (!heightCm) {
        setError(t('onboarding.enterHeight'));
        return;
      }
      const cm = parseInt(heightCm);
      if (isNaN(cm) || cm < 100 || cm > 250) {
        setError(t('onboarding.validHeightMetric'));
        return;
      }
    }

    if (!weight) {
      setError(t('onboarding.enterWeight'));
      return;
    }

    const weightNum = parseFloat(weight);
    if (isNaN(weightNum) || weightNum <= 0) {
      setError('Please enter a valid weight');
      return;
    }

    if (unit === 'imperial' && (weightNum < 50 || weightNum > 700)) {
      setError(t('onboarding.validWeightImperial'));
      return;
    }

    if (unit === 'metric' && (weightNum < 20 || weightNum > 300)) {
      setError(t('onboarding.validWeightMetric'));
      return;
    }

    updateOnboardingData({
      gender,
      dateOfBirth: dateOfBirth.toISOString(), // Save as ISO string
      age,
      heightFeet: unit === 'imperial' ? heightFeet : '',
      heightInches: unit === 'imperial' ? heightInches : '',
      heightCm: unit === 'metric' ? heightCm : '',
      weight: weight,
      unit: unit,
    });
    console.log('✅ Step 1 saved:', { gender, dateOfBirth, age, heightFeet, heightInches, heightCm, weight, unit });
    navigation.navigate('OnboardingStep1b');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.languageSwitcherContainer}>
        <LanguageSwitcher />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: '16.67%' }]} />
            </View>
            <Text style={styles.progressText}>{t('onboarding.step')} 1 {t('onboarding.of')} 6</Text>
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
                <Text style={[styles.optionText, gender === 'male' && styles.optionTextSelected]} numberOfLines={1} adjustsFontSizeToFit>
                  {t('onboarding.male')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.optionButton, gender === 'female' && styles.optionButtonSelected]}
                onPress={() => setGender('female')}
              >
                <Text style={[styles.optionText, gender === 'female' && styles.optionTextSelected]} numberOfLines={1} adjustsFontSizeToFit>
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

          {/* Height & Weight */}
          <View style={styles.section} onLayout={(e) => { statsY.current = e.nativeEvent.layout.y; }}>
            <Text style={styles.sectionTitle}>{t('onboarding.step2Title')}</Text>

            {/* Unit Toggle */}
            <View style={styles.unitToggle}>
              <TouchableOpacity
                style={[styles.unitButton, unit === 'imperial' && styles.unitButtonSelected]}
                onPress={() => setUnit('imperial')}
              >
                <Text
                  style={[styles.unitText, unit === 'imperial' && styles.unitTextSelected]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.7}
                >
                  {t('onboarding.imperial')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.unitButton, unit === 'metric' && styles.unitButtonSelected]}
                onPress={() => setUnit('metric')}
              >
                <Text
                  style={[styles.unitText, unit === 'metric' && styles.unitTextSelected]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.7}
                >
                  {t('onboarding.metric')}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Height Input */}
            <View style={styles.section}>
              <Text style={styles.label}>{t('onboarding.height')}</Text>
              {unit === 'imperial' ? (
                <View style={styles.heightRow}>
                  <View style={styles.heightInput}>
                    <TextInput
                      style={styles.input}
                      placeholder="5"
                      placeholderTextColor="#999"
                      value={heightFeet}
                      onChangeText={setHeightFeet}
                      keyboardType="number-pad"
                      maxLength={1}
                      returnKeyType="next"
                      onSubmitEditing={() => heightInchesRef.current?.focus()}
                    />
                    <Text style={styles.unitLabel}>ft</Text>
                  </View>
                  <View style={styles.heightInput}>
                    <TextInput
                      ref={heightInchesRef}
                      style={styles.input}
                      placeholder="7"
                      placeholderTextColor="#999"
                      value={heightInches}
                      onChangeText={setHeightInches}
                      keyboardType="number-pad"
                      maxLength={2}
                      returnKeyType="next"
                      onSubmitEditing={() => weightRef.current?.focus()}
                    />
                    <Text style={styles.unitLabel}>in</Text>
                  </View>
                </View>
              ) : (
                <View style={styles.singleInput}>
                  <TextInput
                    ref={heightCmWeightRef}
                    style={styles.input}
                    placeholder="170"
                    placeholderTextColor="#999"
                    value={heightCm}
                    onChangeText={setHeightCm}
                    keyboardType="number-pad"
                    maxLength={3}
                    returnKeyType="next"
                    onSubmitEditing={() => weightRef.current?.focus()}
                  />
                  <Text style={styles.unitLabel}>cm</Text>
                </View>
              )}
            </View>

            {/* Weight Input */}
            <View style={styles.section}>
              <Text style={styles.label}>{t('onboarding.weight')}</Text>
              <View style={styles.singleInput}>
                <TextInput
                  ref={weightRef}
                  style={styles.input}
                  placeholder={unit === 'imperial' ? '165' : '75'}
                  placeholderTextColor="#999"
                  value={weight}
                  onChangeText={setWeight}
                  keyboardType="decimal-pad"
                  returnKeyType="done"
                  onSubmitEditing={handleContinue}
                />
                <Text style={styles.unitLabel}>{unit === 'imperial' ? 'lbs' : 'kg'}</Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Continue Button - fixed at bottom */}
      <View style={styles.navigationButtons}>
        <TouchableOpacity
          style={styles.continueButton}
          onPress={handleContinue}
        >
          <Text style={styles.continueButtonText}>{t('onboarding.continue')}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EAE0C8',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 30,
    paddingTop: 20,
    paddingBottom: 20,
  },
  progressContainer: {
    marginBottom: scale(25),
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
    fontSize: scale(12),
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
  title: {
    fontSize: scale(26),
    fontWeight: 'bold',
    color: '#333',
    marginBottom: scale(25),
  },
  sectionTitle: {
    fontSize: scale(19),
    fontWeight: 'bold',
    color: '#333',
    marginBottom: scale(16),
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
    fontSize: scale(14),
  },
  section: {
    marginBottom: scale(20),
  },
  label: {
    fontSize: scale(15),
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
    paddingVertical: scale(13),
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
    fontSize: scale(14),
    color: '#666',
  },
  optionTextSelected: {
    color: '#4CAF50',
    fontWeight: '600',
  },
  unitToggle: {
    flexDirection: 'row',
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    padding: 4,
    marginBottom: scale(25),
  },
  unitButton: {
    flex: 1,
    paddingVertical: scale(10),
    alignItems: 'center',
    borderRadius: 8,
  },
  unitButtonSelected: {
    backgroundColor: '#fff',
  },
  unitText: {
    fontSize: scale(14),
    color: '#999',
    flexShrink: 1,
  },
  unitTextSelected: {
    color: '#4CAF50',
    fontWeight: '600',
  },
  heightRow: {
    flexDirection: 'row',
    gap: 15,
  },
  heightInput: {
    flex: 1,
    position: 'relative',
  },
  singleInput: {
    position: 'relative',
  },
  input: {
    borderWidth: 2,
    borderColor: '#6B5B45',
    borderRadius: 10,
    padding: scale(14),
    fontSize: scale(15),
    paddingRight: 50,
    color: '#333',
  },
  unitLabel: {
    position: 'absolute',
    right: 15,
    top: scale(14),
    fontSize: scale(15),
    color: '#999',
  },
  navigationButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
    paddingHorizontal: 30,
    paddingVertical: 12,
  },
  continueButton: {
    flex: 1,
    backgroundColor: '#4CAF50',
    paddingVertical: scale(14),
    borderRadius: 10,
    alignItems: 'center',
  },
  continueButtonText: {
    color: '#fff',
    fontSize: scale(16),
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
    fontWeight: 'bold',
    color: '#333'
  },
  monthLabel: {
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
    color: '#999',
    fontWeight: '600'
  },
  dayGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap'
  },
  dayCell: {
    padding: 1,
  },
  dayCellInner: {
    flex: 1,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0ece4'
  },
  dayText: {
    color: '#333'
  },
  yearPickerTitle: {
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
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#f0ece4'
  },
  yearCellSelected: {
    backgroundColor: '#4CAF50'
  },
  yearText: {
    color: '#333'
  },
  yearTextSelected: {
    color: '#fff',
    fontWeight: 'bold'
  },
});
