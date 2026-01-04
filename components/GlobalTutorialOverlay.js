import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTutorial } from '../utils/TutorialContext';

export default function GlobalTutorialOverlay() {
  const { currentScreen } = useTutorial();
  
  // Show overlay if ANY tutorial is active
  if (!currentScreen) return null;
  
  return (
    <View style={styles.overlay} pointerEvents="box-only">
      <View style={styles.grayBackground} />
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9998, // Below tutorial bubbles but above everything else
  },
  grayBackground: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
  },
});