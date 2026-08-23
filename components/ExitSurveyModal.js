import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet, Modal, KeyboardAvoidingView, Platform } from 'react-native';

const REASONS = [
  'Too expensive',
  'Missing a feature I need',
  'Found a better app',
  'Not using it enough',
  'Technical issues/bugs',
  'Other',
];

// Shown right before an account deletion actually goes through -- the one
// signal neither PostHog funnels nor RevenueCat-style billing metrics can
// give on their own: the user's own stated reason, not just an inferred
// behavior pattern. Never blocks the delete -- "Skip" is always available,
// since forcing a survey on someone already leaving just adds friction to
// something they didn't ask to be interrupted for.
export default function ExitSurveyModal({ visible, theme, onSubmit, onSkip }) {
  const [selectedReason, setSelectedReason] = useState(null);
  const [feedbackText, setFeedbackText] = useState('');

  const reset = () => {
    setSelectedReason(null);
    setFeedbackText('');
  };

  const handleSubmit = () => {
    if (!selectedReason) return;
    onSubmit(selectedReason, feedbackText.trim());
    reset();
  };

  const handleSkip = () => {
    reset();
    onSkip();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleSkip}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[styles.card, { backgroundColor: theme?.cardBackground || '#fff' }]}>
          <Text style={[styles.title, { color: theme?.text || '#1a1a1a' }]}>
            Before you go...
          </Text>
          <Text style={[styles.subtitle, { color: theme?.textSecondary || '#666' }]}>
            Mind telling us why? It helps us improve.
          </Text>

          {REASONS.map((reason) => (
            <TouchableOpacity
              key={reason}
              style={[
                styles.reasonRow,
                { borderColor: theme?.border || '#e0e0e0' },
                selectedReason === reason && { borderColor: theme?.primary || '#4CAF50', backgroundColor: `${theme?.primary || '#4CAF50'}15` },
              ]}
              onPress={() => setSelectedReason(reason)}
            >
              <View style={[
                styles.radio,
                { borderColor: theme?.border || '#c0c0c0' },
                selectedReason === reason && { borderColor: theme?.primary || '#4CAF50' },
              ]}>
                {selectedReason === reason && (
                  <View style={[styles.radioFill, { backgroundColor: theme?.primary || '#4CAF50' }]} />
                )}
              </View>
              <Text style={[styles.reasonText, { color: theme?.text || '#1a1a1a' }]}>{reason}</Text>
            </TouchableOpacity>
          ))}

          <TextInput
            style={[styles.input, { color: theme?.text || '#1a1a1a', borderColor: theme?.border || '#e0e0e0' }]}
            placeholder="Anything else? (optional)"
            placeholderTextColor={theme?.textTertiary || '#999'}
            value={feedbackText}
            onChangeText={setFeedbackText}
            multiline
            numberOfLines={3}
          />

          <TouchableOpacity
            style={[
              styles.submitButton,
              { backgroundColor: theme?.primary || '#4CAF50' },
              !selectedReason && { opacity: 0.5 },
            ]}
            onPress={handleSubmit}
            disabled={!selectedReason}
          >
            <Text style={styles.submitButtonText}>Submit & Delete Account</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleSkip}>
            <Text style={[styles.skipText, { color: theme?.textSecondary || '#666' }]}>Skip & Delete Account</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    width: '88%',
    maxWidth: 380,
    borderRadius: 20,
    padding: 24,
  },
  title: {
    fontSize: 19,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 18,
  },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 8,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  radioFill: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  reasonText: {
    fontSize: 14,
    flex: 1,
  },
  input: {
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    marginTop: 8,
    marginBottom: 16,
    textAlignVertical: 'top',
    minHeight: 70,
  },
  submitButton: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  skipText: {
    fontSize: 13,
    textAlign: 'center',
  },
});
