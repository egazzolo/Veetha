import React from 'react';
import { View, Text, Image, TouchableOpacity, Modal, StyleSheet } from 'react-native';

// A Meal Break-branded stand-in for the native Alert.alert() -- same
// overlay/card/button shape as RenameAnnouncementModal (cardBackground,
// primary-colored button, the little avocado mark up top) so messages read
// as part of the app instead of a generic OS dialog.
export default function BrandedAlert({
  visible,
  theme,
  title,
  message,
  messageAlign = 'center',
  buttonText = 'Got it',
  onDismiss,
  showIcon = true,
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: theme?.cardBackground || '#fff' }]}>
          {showIcon && (
            <Image
              source={require('../assets/icons/meal_break_preview_black.png')}
              style={styles.icon}
              resizeMode="contain"
            />
          )}
          {!!title && (
            <Text style={[styles.title, { color: theme?.text || '#1a1a1a' }]}>{title}</Text>
          )}
          {!!message && (
            <Text
              style={[
                styles.message,
                { color: theme?.textSecondary || '#666', textAlign: messageAlign },
              ]}
            >
              {message}
            </Text>
          )}
          <TouchableOpacity
            style={[styles.button, { backgroundColor: theme?.primary || '#4CAF50' }]}
            onPress={onDismiss}
          >
            <Text style={styles.buttonText}>{buttonText}</Text>
          </TouchableOpacity>
        </View>
      </View>
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
    width: '85%',
    maxWidth: 340,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
  },
  icon: {
    width: 70,
    height: 88,
    marginBottom: 12,
  },
  title: {
    fontSize: 19,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    marginBottom: 16,
    lineHeight: 22,
    alignSelf: 'stretch',
  },
  button: {
    marginTop: 8,
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
