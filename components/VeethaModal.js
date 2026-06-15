import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Pressable } from 'react-native';
import { useTheme } from '../utils/ThemeContext';

const COLORS = {
  green: '#1F9B39',
  pearl: '#EAE0C8',
  gray: '#8E8E93',
  grayLight: '#E5E5EA',
  textDark: '#2D2D2D',
  textMuted: '#5A5A5A',
};

export default function VeethaModal({
  visible,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  confirmStyle,
  buttons,
}) {

  const { isDark } = useTheme();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <Pressable style={styles.backdrop} onPress={onCancel}>
        <Pressable 
          style={[styles.card, isDark && { backgroundColor: '#1c1c1e' }]} 
          onPress={(e) => e.stopPropagation()}
        >
          {title ? <Text style={[styles.title, isDark && { color: '#F5E6A3' }]}>{title}</Text> : null}
          {message ? <Text style={[styles.message, isDark && { color: '#B8B8B8' }]}>{message}</Text> : null}

          <View style={styles.buttonRow}>
            {buttons ? (
              buttons.map((btn, i) => (
                <TouchableOpacity
                  key={i}
                  style={[
                    styles.button,
                    btn.style === 'destructive'
                      ? styles.destructiveButton
                      : btn.style === 'cancel'
                      ? styles.cancelButton
                      : styles.confirmButton,
                    btn.style === 'cancel' && isDark && { backgroundColor: '#3a3a3c' },
                  ]}
                  onPress={btn.onPress}
                >
                  <Text
                    style={[
                      styles.buttonText,
                      btn.style === 'destructive'
                        ? styles.destructiveText
                        : btn.style === 'cancel'
                        ? styles.cancelText
                        : styles.confirmText,
                      btn.style === 'cancel' && isDark && { color: '#F5E6A3' },
                    ]}
                  >
                    {btn.text}
                  </Text>
                </TouchableOpacity>
              ))
            ) : (
              <>
                {onCancel && (
                  <TouchableOpacity
                    style={[
                      styles.button, 
                      styles.cancelButton,
                      isDark && { backgroundColor: '#3a3a3c' },
                    ]}
                    onPress={onCancel}
                  >
                    <Text style={[
                      styles.buttonText, 
                      styles.cancelText,
                      isDark && { color: '#F5E6A3' },
                    ]}>
                      {cancelText}
                    </Text>
                  </TouchableOpacity>
                )}
                {onConfirm && (
                  <TouchableOpacity
                    style={[
                      styles.button,
                      confirmStyle === 'destructive'
                        ? styles.destructiveButton
                        : styles.confirmButton,
                    ]}
                    onPress={onConfirm}
                  >
                    <Text
                      style={[
                        styles.buttonText,
                        confirmStyle === 'destructive'
                          ? styles.destructiveText
                          : styles.confirmText,
                      ]}
                    >
                      {confirmText}
                    </Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: COLORS.pearl,
    borderRadius: 18,
    paddingTop: 24,
    paddingHorizontal: 24,
    paddingBottom: 18,
    width: '82%',
    maxWidth: 340,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textDark,
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    color: COLORS.textMuted,
    lineHeight: 20,
    marginBottom: 22,
    textAlign: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  confirmButton: {
    backgroundColor: COLORS.green,
  },
  cancelButton: {
    backgroundColor: COLORS.grayLight,
  },
  destructiveButton: {
    backgroundColor: '#FF3B30',
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  confirmText: {
    color: '#fff',
  },
  cancelText: {
    color: COLORS.textDark,
  },
  destructiveText: {
    color: '#fff',
  },
});
