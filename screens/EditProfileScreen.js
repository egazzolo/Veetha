import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, Alert, KeyboardAvoidingView, Platform, ActivityIndicator, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../utils/ThemeContext';
import { supabase } from '../utils/supabase';
import { useUser } from '../utils/UserContext';
import { useLanguage } from '../utils/LanguageContext';
import { logScreen, logEvent } from '../utils/analytics';

export default function EditProfileScreen({ navigation }) {
  const { theme } = useTheme();
  const { language, t, setLanguage } = useLanguage();
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);
  const { profile, refreshProfile } = useUser();
  
  const [displayName, setDisplayName] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [tempLanguage, setTempLanguage] = useState(language);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [weight, setWeight] = useState('');
  const [heightCm, setHeightCm] = useState('');
  const [heightFeet, setHeightFeet] = useState('');
  const [heightInches, setHeightInches] = useState('');
  const [unitSystem, setUnitSystem] = useState('metric');

  useEffect(() => {
    logScreen('EditProfile');
  }, []);

  // Load current profile data
  useEffect(() => {
    loadProfile();
  }, []);

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
      setUnitSystem(data.unit_system || 'metric');

      // Load weight
      if (data.weight_kg) {
        if (data.unit_system === 'imperial') {
          setWeight((data.weight_kg * 2.20462).toFixed(1));
        } else {
          setWeight(data.weight_kg.toString());
        }
      }

      // Load height
      if (data.height_cm) {
        if (data.unit_system === 'imperial') {
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

      // Apply language change NOW (on save)
      if (tempLanguage !== language) {
        setLanguage(tempLanguage);
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

      // Refresh profile context
      await refreshProfile();

      Alert.alert(
        t('editProfile.success'),
        t('editProfile.profileUpdated'),
        [
          {
            text: t('editProfile.ok'),
            onPress: () => navigation.goBack(),
          },
        ]
      );
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
      <Pressable style={{ flex: 1 }} onPress={() => setShowLanguageDropdown(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
          <ScrollView 
            style={styles.scrollView}
            contentContainerStyle={{ paddingBottom: 40 }}
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
                  onChangeText={setDisplayName}
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
                  onChangeText={setFullName}
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

              {/* Language */}
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.text }]}>{t('editProfile.language')}</Text>
                <TouchableOpacity
                  style={[styles.dropdown, { backgroundColor: theme.inputBackground, borderColor: theme.border }]}
                  onPress={() => setShowLanguageDropdown(!showLanguageDropdown)}
                >
                  <Text style={[styles.dropdownText, { color: theme.text }]}>
                    {
                      tempLanguage === 'en' ? '🇬🇧 English' :
                      tempLanguage === 'es' ? '🇪🇸 Español' :
                      tempLanguage === 'fr' ? '🇫🇷 Français' :
                      tempLanguage === 'fil' ? '🇵🇭 Filipino' :
                      ''
                    }
                  </Text>
                  <Text style={[styles.dropdownArrow, { color: theme.textSecondary }]}>
                    {showLanguageDropdown ? '▲' : '▼'}
                  </Text>
                </TouchableOpacity>
                
                {showLanguageDropdown && (
                  <View style={[styles.dropdownMenu, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
                    <TouchableOpacity
                      style={[styles.dropdownItem, tempLanguage === 'en' && { backgroundColor: theme.primary + '20' }]}
                      onPress={() => {
                        setTempLanguage('en');
                        setShowLanguageDropdown(false);
                      }}
                    >
                      <Text style={[styles.dropdownItemText, { color: theme.text }]}>
                        🇬🇧 English
                      </Text>
                      {tempLanguage === 'en' && <Text style={{ color: theme.primary }}>✓</Text>}
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={[styles.dropdownItem, tempLanguage === 'es' && { backgroundColor: theme.primary + '20' }]}
                      onPress={() => {
                        setTempLanguage('es');
                        setShowLanguageDropdown(false);
                      }}
                    >
                      <Text style={[styles.dropdownItemText, { color: theme.text }]}>
                        🇪🇸 Español
                      </Text>
                      {tempLanguage === 'es' && <Text style={{ color: theme.primary }}>✓</Text>}
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.dropdownItem, tempLanguage === 'fr' && { backgroundColor: theme.primary + '20' }]}
                      onPress={() => {
                        setTempLanguage('fr');
                        setShowLanguageDropdown(false);
                      }}
                    >
                      <Text style={[styles.dropdownItemText, { color: theme.text }]}>
                        🇫🇷 French
                      </Text>
                      {tempLanguage === 'fr' && <Text style={{ color: theme.primary }}>✓</Text>}
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.dropdownItem, tempLanguage === 'tl' && { backgroundColor: theme.primary + '20' }]}
                      onPress={() => {
                        setTempLanguage('tl');
                        setShowLanguageDropdown(false);
                      }}
                    >
                      <Text style={[styles.dropdownItemText, { color: theme.text }]}>
                        🇵🇭 Filipino
                      </Text>
                      {tempLanguage === 'tl' && <Text style={{ color: theme.primary }}>✓</Text>}
                    </TouchableOpacity>

                    {/* Ready for future languages */}
                    {/* 
                    <TouchableOpacity style={styles.dropdownItem}>
                      <Text style={[styles.dropdownItemText, { color: theme.text }]}>
                        🇫🇷 Français
                      </Text>
                    </TouchableOpacity>
                    */}
                  </View>
                )}
              </View>

              {/* Unit System */}
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.text }]}>Unit System</Text>
                <View style={styles.unitToggle}>
                  <TouchableOpacity
                    style={[
                      styles.unitButton,
                      { 
                        borderColor: theme.border, 
                        backgroundColor: unitSystem === 'metric' ? theme.primary : theme.cardBackground 
                      }
                    ]}
                    onPress={() => setUnitSystem('metric')}
                  >
                    <Text style={[styles.unitButtonText, { color: unitSystem === 'metric' ? '#fff' : theme.text }]}>
                      Metric
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[
                      styles.unitButton,
                      { 
                        borderColor: theme.border, 
                        backgroundColor: unitSystem === 'imperial' ? theme.primary : theme.cardBackground 
                      }
                    ]}
                    onPress={() => setUnitSystem('imperial')}
                  >
                    <Text style={[styles.unitButtonText, { color: unitSystem === 'imperial' ? '#fff' : theme.text }]}>
                      Imperial
                    </Text>
                  </TouchableOpacity>
                </View>
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
                  onChangeText={setWeight}
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
                    onChangeText={setHeightCm}
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
                      onChangeText={setHeightFeet}
                      keyboardType="number-pad"
                    />
                    <Text style={[styles.heightLabel, { color: theme.text }]}>ft</Text>
                    
                    <TextInput
                      style={[styles.heightInput, { backgroundColor: theme.cardBackground, color: theme.text, borderColor: theme.border }]}
                      placeholder="8"
                      placeholderTextColor={theme.textTertiary}
                      value={heightInches}
                      onChangeText={setHeightInches}
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
                onPress={() => {
                  setTempLanguage(language); // Reset to original language
                  navigation.goBack();
                }}
              >
                <Text style={[styles.cancelButtonText, { color: theme.textSecondary }]}>{t('editProfile.cancel')}</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Pressable>
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