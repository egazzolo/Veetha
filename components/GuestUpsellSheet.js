import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useLanguage } from '../utils/LanguageContext';

const COLORS = {
  green: '#1F9B39',
  pearl: '#EAE0C8',
  textDark: '#2D2D2D',
  textMuted: '#5A5A5A',
  grayLight: '#E5E5EA',
};

export default function GuestUpsellSheet({ visible, onClose, message }) {
  const navigation = useNavigation();
  const { t } = useLanguage();

  const displayMessage = message || t('guestSheet.defaultMessage');

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.handle} />

          <Text style={styles.brand}>{t('guestSheet.brand')}</Text>
          <Text style={styles.message}>{displayMessage}</Text>

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => {
              onClose();
              navigation.navigate('SignUp');
            }}
          >
            <Text style={styles.primaryButtonText}>
              {t('guestSheet.createAccount')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => {
              onClose();
              navigation.navigate('Login');
            }}
          >
            <Text style={styles.secondaryButtonText}>
              {t('guestSheet.logIn')}
            </Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: COLORS.pearl,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingHorizontal: 28,
    paddingBottom: 40,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 10,
  },
  handle: {
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#C4B9A8',
    marginBottom: 18,
  },
  brand: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.green,
    marginBottom: 10,
  },
  message: {
    fontSize: 15,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
    paddingHorizontal: 10,
  },
  primaryButton: {
    backgroundColor: COLORS.green,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    width: '100%',
    marginBottom: 10,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    borderWidth: 1.5,
    borderColor: COLORS.green,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    width: '100%',
  },
  secondaryButtonText: {
    color: COLORS.green,
    fontSize: 16,
    fontWeight: '600',
  },
});
