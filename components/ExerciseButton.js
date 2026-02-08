import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, ActivityIndicator, Alert } from 'react-native';
import { useLanguage } from '../utils/LanguageContext';
import { supabase } from '../utils/supabase';

export default function ExerciseButton({ theme, navigation }) {
  const { t } = useLanguage();
  const [showWeightModal, setShowWeightModal] = useState(false);
  const [weight, setWeight] = useState(null);
  const [loading, setLoading] = useState(false);

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

        // Load weight
        if (data.weight_kg) {
            if (data.unit_system === 'imperial') {
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
    setShowWeightModal(false);
    navigation.navigate('EditProfile');
  };

  return (
    <>
      <TouchableOpacity
        style={[styles.button, { backgroundColor: theme.cardBackground }]}
        onPress={handleExercisePress}
        disabled={loading}
      >
        <Text style={styles.emoji}>💪</Text>
        <Text style={[styles.buttonText, { color: theme.text }]}>
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
            <Text style={[styles.modalTitle, { color: theme.text }]}>
              ⚖️ {t('exercise.confirmWeight')}
            </Text>
            
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
    </>
  );
}

const styles = StyleSheet.create({
  button: {
    flex: 1,
    padding: 20,
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
