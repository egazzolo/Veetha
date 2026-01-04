import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Modal, ScrollView } from 'react-native';

export default function AllergenWarningModal({ visible, warnings, onCancel, onProceed, theme }) {
  if (!warnings || warnings.length === 0) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <View style={[styles.modalContent, { backgroundColor: theme.cardBackground }]}>
          <View style={styles.header}>
            <Text style={styles.warningIcon}>⚠️</Text>
            <Text style={[styles.title, { color: theme.text }]}>DIETARY ALERT</Text>
          </View>

          <ScrollView style={styles.warningsContainer} showsVerticalScrollIndicator={false}>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
              This product contains ingredients you've marked:
            </Text>

            {warnings.map((warning, index) => (
              <View key={index} style={[styles.warningItem, { backgroundColor: theme.background }]}>
                <Text style={styles.warningEmoji}>{warning.emoji}</Text>
                <View style={styles.warningText}>
                  <Text style={[styles.warningLabel, { color: '#ff5252' }]}>
                    {warning.label}
                  </Text>
                  <Text style={[styles.warningReason, { color: theme.textTertiary }]}>
                    {warning.reason}
                  </Text>
                </View>
              </View>
            ))}

            <Text style={[styles.disclaimer, { color: theme.textTertiary }]}>
              ℹ️ This warning is based on your dietary restrictions. Always check product labels for accuracy.
            </Text>
          </ScrollView>

          <View style={styles.buttons}>
            <TouchableOpacity 
              style={[styles.button, styles.cancelButton, { borderColor: theme.border }]}
              onPress={onCancel}
            >
              <Text style={[styles.buttonText, { color: theme.text }]}>← Go Back</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.button, styles.proceedButton]}
              onPress={onProceed}
            >
              <Text style={styles.proceedButtonText}>Log Anyway</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
    borderRadius: 20,
    padding: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  warningIcon: {
    fontSize: 50,
    marginBottom: 10,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 15,
    lineHeight: 20,
  },
  warningsContainer: {
    maxHeight: 300,
  },
  warningItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 12,
    marginBottom: 12,
  },
  warningEmoji: {
    fontSize: 28,
    marginRight: 12,
  },
  warningText: {
    flex: 1,
  },
  warningLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  warningReason: {
    fontSize: 13,
    fontStyle: 'italic',
  },
  disclaimer: {
    fontSize: 12,
    marginTop: 15,
    marginBottom: 10,
    lineHeight: 16,
    textAlign: 'center',
  },
  buttons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButton: {
    borderWidth: 2,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  proceedButton: {
    backgroundColor: '#ff5252',
  },
  proceedButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
  },
});