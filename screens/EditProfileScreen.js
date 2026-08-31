import React, { useState, useEffect } from 'react';
import GuestUpsellSheet from '../components/GuestUpsellSheet';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, Alert, KeyboardAvoidingView, Platform, ActivityIndicator, Keyboard } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../utils/ThemeContext';
import { supabase } from '../utils/supabase';
import { useUser } from '../utils/UserContext';
import { useLanguage } from '../utils/LanguageContext';
import { useUserMode } from '../utils/UserModeContext';
import { blockIfGuest } from '../utils/guestBlock';
import { logScreen, logEvent } from '../utils/analytics';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { showToast } from '../components/VeethaToast';

export default function EditProfileScreen({ navigation }) {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const [showGuestSheet, setShowGuestSheet] = useState(false);
  const { profile, refreshProfile } = useUser();
  const { isGuest: isGuestMode } = useUserMode();

  const guestCheck = (action) => {
    if (isGuestMode) { 
      Keyboard.dismiss();
      setShowGuestSheet(true); 
      return; 
    }
    action();
  };

  const [displayName, setDisplayName] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [weight, setWeight] = useState('');
  const [heightCm, setHeightCm] = useState('');
  const [heightFeet, setHeightFeet] = useState('');
  const [heightInches, setHeightInches] = useState('');
  const [unitSystem, setUnitSystem] = useState('metric');
  const [showSuccessAfterSave, setShowSuccessAfterSave] = useState(false);

  useEffect(() => {
    logScreen('EditProfile');
  }, []);

  // Load current profile data
  useEffect(() => {
    loadProfile();
  }, []);

  useEffect(() => {
    if (showSuccessAfterSave) {
      showToast('success', t('editProfile.success'), t('editProfile.profileUpdated'));
      navigation.goBack();

      setShowSuccessAfterSave(false);
    }
  }, [showSuccessAfterSave]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigation.navigate('Login');
        return;
      }

      // Small delay to let UI render first
      await new Promise(resolve => setTimeout(resolve, 100));

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      setDisplayName(data.display_name || '');
      setFullName(data.full_name || '');
      setEmail(user.email || '');
      // unit_preference (not unit_system) is the field Preferences/Goals &
      // Preferences/onboarding actually read and write -- this screen only
      // displays it now (changing it moved to Preferences).
      setUnitSystem(data.unit_preference || 'metric');

      // Load weight
      if (data.weight_kg) {
        if (data.unit_preference === 'imperial') {
          setWeight((data.weight_kg * 2.20462).toFixed(1));
        } else {
          setWeight(data.weight_kg.toString());
        }
      }

      // Load height
      if (data.height_cm) {
        if (data.unit_preference === 'imperial') {
          const totalInches = data.height_cm / 2.54;
          setHeightFeet(Math.floor(totalInches / 12).toString());
          setHeightInches((totalInches % 12).toFixed(0));
        } else {
          setHeightCm(data.height_cm.toString());
        }
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      Alert.alert(t('editProfile.error'), t('editProfile.failedToLoad'));
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    // Guests have nothing editable on this screen (every field is
    // guestCheck-gated) -- send them to the same sign-up prompt every other
    // field already shows instead of silently no-op'ing on Save.
    if (isGuestMode) {
      setShowGuestSheet(true);
      return;
    }
    // Validation
    if (!fullName.trim()) {
      Alert.alert(t('editProfile.missingInfo'), t('editProfile.enterFullName'));
      return;
    }

    // Validate weight
    if (weight && (isNaN(parseFloat(weight)) || parseFloat(weight) <= 0)) {
      Alert.alert(t('editProfile.error'), 'Please enter a valid weight');
      return;
    }

    // Validate height
    if (unitSystem === 'metric') {
      if (heightCm && (isNaN(parseFloat(heightCm)) || parseFloat(heightCm) < 100 || parseFloat(heightCm) > 250)) {
        Alert.alert(t('editProfile.error'), 'Please enter a valid height (100-250 cm)');
        return;
      }
    } else {
      if (heightFeet && (isNaN(parseInt(heightFeet)) || parseInt(heightFeet) < 3 || parseInt(heightFeet) > 8)) {
        Alert.alert(t('editProfile.error'), 'Please enter a valid height (3-8 feet)');
        return;
      }
    }

    setSaving(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigation.navigate('Login');
        return;
      }

      // Convert measurements to metric for storage
      let weightKg = null;
      let heightCmValue = null;

      if (weight) {
        weightKg = unitSystem === 'imperial' 
          ? parseFloat(weight) / 2.20462
          : parseFloat(weight);
      }

      if (unitSystem === 'metric' && heightCm) {
        heightCmValue = parseFloat(heightCm);
      } else if (unitSystem === 'imperial' && heightFeet) {
        const totalInches = (parseInt(heightFeet) * 12) + (parseInt(heightInches) || 0);
        heightCmValue = totalInches * 2.54;
      }

      // Update profile
      const { error } = await supabase
        .from('profiles')
        .update({
          display_name: displayName.trim() || null,
          full_name: fullName.trim(),
          weight_kg: weightKg,
          height_cm: heightCmValue,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) throw error;

      // ADD THE logEvent RIGHT HERE (before Alert.alert)
      await logEvent('profile_updated');

      // Recalculate TDEE if weight or height changed
      if (weightKg && heightCmValue && profile?.age && profile?.gender && profile?.activity_level) {
        const ACTIVITY_MULTIPLIERS = {
          sedentary: 1.2,
          lightly_active: 1.375,
          moderately_active: 1.55,
          active: 1.725,
          very_active: 1.9,
        };
        let bmr;
        if (profile.gender === 'male') {
          bmr = (10 * weightKg) + (6.25 * heightCmValue) - (5 * profile.age) + 5;
        } else {
          bmr = (10 * weightKg) + (6.25 * heightCmValue) - (5 * profile.age) - 161;
        }
        const newTdee = Math.round(bmr * (ACTIVITY_MULTIPLIERS[profile.activity_level] || 1.55));
        await supabase
          .from('profiles')
          .update({ daily_calorie_goal: newTdee })
          .eq('id', user.id);
      }
      // Refresh profile context
      await refreshProfile();

      setShowSuccessAfterSave(true);

    } catch (error) {
      console.error('Error saving profile:', error);
      Alert.alert(t('editProfile.error'), t('editProfile.failedToSave'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top', 'bottom']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>{t('editProfile.loadingProfile')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top', 'bottom']}>
      <View style={{ flex: 1 }}>

          <KeyboardAwareScrollView
            style={styles.scrollView}
            contentContainerStyle={{ paddingBottom: 40 }}
            enableOnAndroid={true}
            extraScrollHeight={30}
            keyboardShouldPersistTaps="handled"
          >
            {/* Header */}
            <View style={[styles.header, { backgroundColor: theme.cardBackground }]}>
              <Text style={[styles.title, { color: theme.text }]}>{t('editProfile.title')}</Text>
              <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                {t('editProfile.subtitle')}
              </Text>
            </View>

            {/* Form */}
            <View style={styles.form}>
              {/* Display Name */}
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.text }]}>{t('editProfile.displayName')}</Text>
                <Text style={[styles.helper, { color: theme.textTertiary }]}>
                  {t('editProfile.displayNameHelper')}
                </Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.cardBackground, color: theme.text, borderColor: theme.border }]}
                  placeholder={t('editProfile.displayNamePlaceholder')}
                  placeholderTextColor={theme.textTertiary}
                  value={displayName}
                  onChangeText={(v) => guestCheck(() => setDisplayName(v))}
                  maxLength={30}
                />
              </View>

              {/* Full Name */}
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.text }]}>{t('editProfile.fullName')}</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.cardBackground, color: theme.text, borderColor: theme.border }]}
                  placeholder={t('editProfile.fullNamePlaceholder')}
                  placeholderTextColor={theme.textTertiary}
                  value={fullName}
                  onChangeText={(v) => guestCheck(() => setFullName(v))}
                  maxLength={50}
                />
              </View>

              {/* Email (Read-Only) */}
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.text }]}>{t('editProfile.email')}</Text>
                <Text style={[styles.helper, { color: theme.textTertiary }]}>
                  {t('editProfile.emailHelper')}
                </Text>
                <View style={[styles.input, styles.readOnlyInput, { backgroundColor: theme.background, borderColor: theme.border }]}>
                  <Text style={[styles.readOnlyText, { color: theme.textSecondary }]}>
                    {email}
                  </Text>
                </View>
              </View>

              {/* Unit System -- view-only here now; change it in Profile > Preferences */}
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.text }]}>Unit System</Text>
                <Text style={[styles.helper, { color: theme.textTertiary }]}>
                  {unitSystem === 'metric' ? 'Metric' : 'Imperial'} — change this in Preferences
                </Text>
              </View>

              {/* Weight */}
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.text }]}>
                  Weight {unitSystem === 'metric' ? '(kg)' : '(lbs)'}
                </Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.cardBackground, color: theme.text, borderColor: theme.border }]}
                  placeholder={unitSystem === 'metric' ? '70' : '154'}
                  placeholderTextColor={theme.textTertiary}
                  value={weight}
                  onChangeText={(v) => guestCheck(() => setWeight(v))}
                  keyboardType="decimal-pad"
                />
              </View>

              {/* Height */}
              {unitSystem === 'metric' ? (
                <View style={styles.inputGroup}>
                  <Text style={[styles.label, { color: theme.text }]}>Height (cm)</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: theme.cardBackground, color: theme.text, borderColor: theme.border }]}
                    placeholder="170"
                    placeholderTextColor={theme.textTertiary}
                    value={heightCm}
                    onChangeText={(v) => guestCheck(() => setHeightCm(v))}
                    keyboardType="decimal-pad"
                  />
                </View>
              ) : (
                <View style={styles.inputGroup}>
                  <Text style={[styles.label, { color: theme.text }]}>Height</Text>
                  <View style={styles.heightRow}>
                    <TextInput
                      style={[styles.heightInput, { backgroundColor: theme.cardBackground, color: theme.text, borderColor: theme.border }]}
                      placeholder="5"
                      placeholderTextColor={theme.textTertiary}
                      value={heightFeet}
                      onChangeText={(v) => guestCheck(() => setHeightFeet(v))}
                      keyboardType="number-pad"
                    />
                    <Text style={[styles.heightLabel, { color: theme.text }]}>ft</Text>
                    
                    <TextInput
                      style={[styles.heightInput, { backgroundColor: theme.cardBackground, color: theme.text, borderColor: theme.border }]}
                      placeholder="8"
                      placeholderTextColor={theme.textTertiary}
                      value={heightInches}
                      onChangeText={(v) => guestCheck(() => setHeightInches(v))}
                      keyboardType="number-pad"
                    />
                    <Text style={[styles.heightLabel, { color: theme.text }]}>in</Text>
                  </View>
                </View>
              )}

              {/* Save Button */}
              <TouchableOpacity 
                style={[styles.saveButton, { backgroundColor: theme.primary }, saving && { opacity: 0.6 }]}
                onPress={handleSave}
                disabled={saving}
              >
                <Text style={styles.saveButtonText}>
                  {saving ? t('editProfile.saving') : t('editProfile.saveChanges')}
                </Text>
              </TouchableOpacity>

              {/* Cancel Button */}
              <TouchableOpacity 
                style={[styles.cancelButton, { borderColor: theme.border }]}
                onPress={() => navigation.goBack()}
              >
                <Text style={[styles.cancelButtonText, { color: theme.textSecondary }]}>{t('editProfile.cancel')}</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAwareScrollView>

      </View>
      <GuestUpsellSheet
        visible={showGuestSheet}
        onClose={() => setShowGuestSheet(false)}
        message={t('guestSheet.defaultMessage')}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 20,
    paddingTop: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 14,
  },
  form: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 25,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 5,
  },
  helper: {
    fontSize: 12,
    marginBottom: 8,
    fontStyle: 'italic',
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 15,
    fontSize: 16,
  },
  readOnlyInput: {
    justifyContent: 'center',
  },
  readOnlyText: {
    fontSize: 16,
  },
  saveButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cancelButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
    borderWidth: 1,
  },
  cancelButtonText: {
    fontSize: 16,
  },
  dropdown: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 8,
  },
  dropdownText: {
    fontSize: 16,
  },
  dropdownArrow: {
    fontSize: 12,
  },
  dropdownMenu: {
    marginTop: 8,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  dropdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  dropdownItemText: {
    fontSize: 16,
  },
  unitToggle: {
    flexDirection: 'row',
    gap: 10,
  },
  unitButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  unitButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  heightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  heightInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    padding: 15,
    fontSize: 16,
  },
  heightLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
});