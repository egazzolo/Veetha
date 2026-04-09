import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Toast, { BaseToast } from 'react-native-toast-message';

const COLORS = {
  green: '#1F9B39',
  pearl: '#EAE0C8',
  pearlDark: '#D4CAB2',
  errorRed: '#D94F3B',
  errorBg: '#FDEEEB',
  textDark: '#2D2D2D',
  textMuted: '#5A5A5A',
};

const toastConfig = {
  success: ({ text1, text2, ...rest }) => (
    <View style={[styles.container, styles.successContainer]}>
      <View style={[styles.accent, { backgroundColor: COLORS.green }]} />
      <View style={styles.content}>
        {text1 ? <Text style={[styles.title, { color: COLORS.green }]}>{text1}</Text> : null}
        {text2 ? <Text style={styles.message}>{text2}</Text> : null}
      </View>
    </View>
  ),

  error: ({ text1, text2, ...rest }) => (
    <View style={[styles.container, styles.errorContainer]}>
      <View style={[styles.accent, { backgroundColor: COLORS.errorRed }]} />
      <View style={styles.content}>
        {text1 ? <Text style={[styles.title, { color: COLORS.errorRed }]}>{text1}</Text> : null}
        {text2 ? <Text style={styles.message}>{text2}</Text> : null}
      </View>
    </View>
  ),

  info: ({ text1, text2, ...rest }) => (
    <View style={[styles.container, styles.infoContainer]}>
      <View style={[styles.accent, { backgroundColor: COLORS.pearlDark }]} />
      <View style={styles.content}>
        {text1 ? <Text style={[styles.title, { color: COLORS.textDark }]}>{text1}</Text> : null}
        {text2 ? <Text style={styles.message}>{text2}</Text> : null}
      </View>
    </View>
  ),
};

export function showToast(type, title, message) {
  Toast.show({
    type,
    text1: title,
    text2: message,
    position: 'top',
    visibilityTime: 2500,
    topOffset: 60,
  });
}

export function VeethaToastRoot() {
  return <Toast config={toastConfig} />;
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    width: '90%',
    minHeight: 56,
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 5,
  },
  successContainer: {
    backgroundColor: '#F0F9F2',
  },
  errorContainer: {
    backgroundColor: COLORS.errorBg,
  },
  infoContainer: {
    backgroundColor: COLORS.pearl,
  },
  accent: {
    width: 5,
  },
  content: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 14,
    justifyContent: 'center',
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  message: {
    fontSize: 13,
    color: COLORS.textMuted,
    lineHeight: 18,
  },
});
