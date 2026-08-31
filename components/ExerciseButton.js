import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Modal, ActivityIndicator, Alert, Image } from 'react-native';
import { useLanguage } from '../utils/LanguageContext';
import { supabase } from '../utils/supabase';
import { useUser } from '../utils/UserContext';
import AppIcon from './AppIcon';

const ACTIVITY_MULTIPLIERS = {
  sedentary: 1.2,
  lightly_active: 1.375,
  moderately_active: 1.55,
  active: 1.725,
  very_active: 1.9,
};

// Hand-drawn curl sequence (extended arm -> fully flexed, matching
// icon_muscle.png on the last frame) -- a flipbook, same technique
// AppTutorial.js already uses for its own multi-frame animations. A single
// flat icon has no joint to bend, so an actual bent-elbow motion needs
// real drawn poses rather than a transform trick on one image.
const CURL_FRAMES = [
  require('../assets/icons/curl_1.png'),
  require('../assets/icons/curl_2.png'),
  require('../assets/icons/curl_3.png'),
  require('../assets/icons/curl_4.png'),
  require('../assets/icons/curl_5.png'),
  require('../assets/icons/curl_6.png'),
  require('../assets/icons/curl_7.png'),
];
const CURL_FRAME_DURATION = 80; // ms per frame -- ~560ms total, a brisk single curl

export default function ExerciseButton({ theme, navigation, isGuestMode, onGuestPress, startAnimation = true, iconStyle, labelStyle }) {
  const { t } = useLanguage();
  const { refreshProfile } = useUser();
  const [showWeightModal, setShowWeightModal] = useState(false);
  const [showEditWeightModal, setShowEditWeightModal] = useState(false);
  const [weightInput, setWeightInput] = useState('');
  const [savingWeight, setSavingWeight] = useState(false);
  const [weight, setWeight] = useState(null);
  const [unitSystem, setUnitSystem] = useState('metric');
  const [loading, setLoading] = useState(false);

  // Plays through the curl frames once, stopping on the last one (which
  // matches the resting icon) -- waits for startAnimation instead of firing
  // on mount, since this button sits below the fold on most screens and
  // would otherwise finish playing before it ever scrolled into view.
  // hasPlayedRef guards against restarting if startAnimation flips again.
  // When not animating (e.g. the static empty-state button elsewhere),
  // start on the last/flexed frame instead of the resting extended pose.
  const [curlFrame, setCurlFrame] = useState(startAnimation ? 0 : CURL_FRAMES.length - 1);
  const hasPlayedRef = useRef(false);
  useEffect(() => {
    if (!startAnimation || hasPlayedRef.current) return;
    hasPlayedRef.current = true;

    let frame = 0;
    const interval = setInterval(() => {
      frame += 1;
      if (frame >= CURL_FRAMES.length - 1) {
        setCurlFrame(CURL_FRAMES.length - 1);
        clearInterval(interval);
        return;
      }
      setCurlFrame(frame);
    }, CURL_FRAME_DURATION);
    return () => clearInterval(interval);
  }, [startAnimation]);

  const fetchWeight = async () => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

        if (error) throw error;
        setWeight(data?.weight || null);
        setUnitSystem(data?.unit_preference || 'metric');

        // Load weight
        if (data.weight_kg) {
            if (data.unit_preference === 'imperial') {
                setWeight((data.weight_kg * 2.20462).toFixed(1));
            } else {
                setWeight(data.weight_kg.toString());
            }
        }
    } catch (err) {
      console.error('Error fetching weight:', err);
    }
  };

  const handleExercisePress = async () => {
    if (isGuestMode) { onGuestPress?.(); return; }
    setLoading(true);
    await fetchWeight();
    setLoading(false);
    setShowWeightModal(true);
  };

  const handleContinue = () => {
    if (!weight) {
      Alert.alert(t('common.error'), t('exercise.noWeightSet'));
      return;
    }
    setShowWeightModal(false);
    navigation.navigate('ExerciseCategoryScreen', { weight, theme });
  };

  const handleEditWeight = () => {
    setWeightInput(weight || '');
    setShowWeightModal(false);
    setShowEditWeightModal(true);
  };

  const handleCancelEditWeight = () => {
    setShowEditWeightModal(false);
    setShowWeightModal(true);
  };

  const handleSaveWeight = async () => {
    if (!weightInput || isNaN(parseFloat(weightInput)) || parseFloat(weightInput) <= 0) {
      Alert.alert(t('common.error'), 'Please enter a valid weight');
      return;
    }

    setSavingWeight(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const weightKg = unitSystem === 'imperial'
        ? parseFloat(weightInput) / 2.20462
        : parseFloat(weightInput);

      // Needed for the same TDEE recalculation EditProfileScreen does --
      // fetched fresh rather than threaded through props since this button
      // only otherwise cares about the weight fields.
      const { data: profileData, error: fetchError } = await supabase
        .from('profiles')
        .select('age, gender, activity_level, height_cm')
        .eq('id', user.id)
        .single();
      if (fetchError) throw fetchError;

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ weight_kg: weightKg, updated_at: new Date().toISOString() })
        .eq('id', user.id);
      if (updateError) throw updateError;

      if (profileData?.height_cm && profileData?.age && profileData?.gender && profileData?.activity_level) {
        let bmr;
        if (profileData.gender === 'male') {
          bmr = (10 * weightKg) + (6.25 * profileData.height_cm) - (5 * profileData.age) + 5;
        } else {
          bmr = (10 * weightKg) + (6.25 * profileData.height_cm) - (5 * profileData.age) - 161;
        }
        const newTdee = Math.round(bmr * (ACTIVITY_MULTIPLIERS[profileData.activity_level] || 1.55));
        await supabase
          .from('profiles')
          .update({ daily_calorie_goal: newTdee })
          .eq('id', user.id);
      }

      await refreshProfile();

      setWeight(weightInput);
      setShowEditWeightModal(false);
      setShowWeightModal(true);
    } catch (err) {
      console.error('Error saving weight:', err);
      Alert.alert(t('common.error'), 'Could not save weight');
    } finally {
      setSavingWeight(false);
    }
  };

  return (
    <>
      <TouchableOpacity
        style={styles.button}
        onPress={handleExercisePress}
        disabled={loading}
      >
        <Image
          source={CURL_FRAMES[curlFrame]}
          style={[{ width: 104, height: 104, marginBottom: 8, tintColor: theme.primary }, iconStyle]}
          resizeMode="contain"
        />
        <Text style={[styles.buttonText, { color: theme.text }, labelStyle]}>
          {t('exercise.exercise')}
        </Text>
        {loading && <ActivityIndicator size="small" color={theme.primary} />}
      </TouchableOpacity>

      {/* Weight Check Modal */}
      <Modal
        visible={showWeightModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowWeightModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.cardBackground }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 20 }}>
              <AppIcon name="scale" size={24} tintColor={theme.text} />
              <Text style={[styles.modalTitle, { color: theme.text, marginBottom: 0 }]}>
                {t('exercise.confirmWeight')}
              </Text>
            </View>
            
            {weight ? (
              <>
                <Text style={[styles.weightLabel, { color: theme.textSecondary }]}>
                  {t('exercise.currentWeight')}
                </Text>
                <Text style={[styles.weightValue, { color: theme.text }]}>
                  {weight} kg
                </Text>
              </>
            ) : (
              <Text style={[styles.noWeight, { color: theme.textSecondary }]}>
                {t('exercise.noWeightSet')}
              </Text>
            )}

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, { borderColor: theme.border }]}
                onPress={handleEditWeight}
              >
                <Text style={[styles.modalButtonText, { color: theme.primary }]}>
                  {t('exercise.editWeight')}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.continueButton, { backgroundColor: theme.primary }]}
                onPress={handleContinue}
                disabled={!weight}
              >
                <Text style={[styles.modalButtonText, { color: '#fff' }]}>
                  {t('common.continue')}
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowWeightModal(false)}
            >
              <Text style={[styles.closeButtonText, { color: theme.textSecondary }]}>
                {t('common.cancel')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Edit Weight Modal -- appears in place instead of navigating away to
          Edit Profile, so the user can update their weight without losing
          their spot in the exercise flow. Saves straight to Supabase, the
          same fields (and TDEE recalculation) EditProfileScreen updates. */}
      <Modal
        visible={showEditWeightModal}
        transparent
        animationType="fade"
        onRequestClose={handleCancelEditWeight}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.cardBackground }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 20 }}>
              <AppIcon name="scale" size={24} tintColor={theme.text} />
              <Text style={[styles.modalTitle, { color: theme.text, marginBottom: 0 }]}>
                {t('exercise.editWeight')}
              </Text>
            </View>

            <TextInput
              style={[styles.weightInput, { color: theme.text, borderColor: theme.border }]}
              value={weightInput}
              onChangeText={setWeightInput}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor={theme.textSecondary}
              autoFocus
            />
            <Text style={[styles.weightUnitLabel, { color: theme.textSecondary }]}>
              {unitSystem === 'imperial' ? 'lbs' : 'kg'}
            </Text>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, { borderColor: theme.border }]}
                onPress={handleCancelEditWeight}
                disabled={savingWeight}
              >
                <Text style={[styles.modalButtonText, { color: theme.primary }]}>
                  {t('common.cancel')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.continueButton, { backgroundColor: theme.primary }]}
                onPress={handleSaveWeight}
                disabled={savingWeight}
              >
                {savingWeight ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={[styles.modalButtonText, { color: '#fff' }]}>
                    {t('common.save')}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  button: {
    flex: 1,
    paddingTop: 0,
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center'
  },
  emoji: { fontSize: 32, marginBottom: 8 },
  buttonText: { fontSize: 16, fontWeight: '600' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  modalContent: {
    width: '85%',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center'
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20
  },
  weightLabel: {
    fontSize: 15,
    marginBottom: 8
  },
  weightValue: {
    fontSize: 36,
    fontWeight: 'bold',
    marginBottom: 24
  },
  noWeight: {
    fontSize: 16,
    marginBottom: 24,
    textAlign: 'center'
  },
  weightInput: {
    fontSize: 36,
    fontWeight: 'bold',
    textAlign: 'center',
    borderBottomWidth: 2,
    minWidth: 140,
    paddingVertical: 4,
  },
  weightUnitLabel: {
    fontSize: 15,
    marginTop: 6,
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    marginBottom: 16
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1
  },
  continueButton: {
    borderWidth: 0
  },
  modalButtonText: {
    fontSize: 17,
    fontWeight: '600'
  },
  closeButton: {
    paddingVertical: 8
  },
  closeButtonText: {
    fontSize: 16
  }
});
