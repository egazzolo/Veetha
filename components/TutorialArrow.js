import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { useLanguage } from '../utils/LanguageContext';
import AppIcon from './AppIcon';

export default function TutorialArrow({
  visible,
  targetCoords,
  onSkip,
  // Called when the user taps the highlighted target. Rendering a real
  // button here instead of trying to let the tap "pass through" a hole in
  // the overlay to the real element underneath -- that approach depended on
  // exact pixel alignment and z-order/elevation quirks that kept failing
  // across platforms, so instead this button just performs the same action
  // the real element would (e.g. navigate to the Stats tab).
  onTargetPress,
  direction = 'down',
  message = 'Tap here to continue!',
  // Per-instance nudge on top of the shared direction formula below -- two
  // different targets (e.g. scanner vs profile tab icon) can need slightly
  // different corrections even sharing the same direction/formula, so this
  // lets a specific usage be tweaked without affecting the others.
  offsetX = 0,
  offsetY = 0,
}) {
  const bounceAnim = useRef(new Animated.Value(0)).current;
  const { t } = useLanguage();

  useEffect(() => {
    if (visible) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(bounceAnim, {
            toValue: -10,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(bounceAnim, {
            toValue: 0,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [visible]);

  if (!visible || !targetCoords) return null;

  return (
    <View style={styles.container} pointerEvents="box-none">
      {/* Gray overlay - blocks every tap except the target button below */}
      <View style={styles.overlay} pointerEvents="auto" />

      {/* Real button standing in for the actual element -- tapping it
          performs the same action (navigate, go back, etc.) directly. */}
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={onTargetPress}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        style={[
          styles.targetButton,
          {
            top: targetCoords.top,
            left: targetCoords.left,
            width: targetCoords.width,
            height: targetCoords.height,
            borderRadius: targetCoords.borderRadius || 16,
          },
        ]}
      />

      {/* Skip button */}
      <TouchableOpacity style={styles.skipButton} onPress={onSkip}>
        <Text style={styles.skipText}>{t('skipTutorial')}</Text>
      </TouchableOpacity>

      {/* Bouncing arrow */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.arrowContainer,
          {
            top: (direction === 'left'
              ? targetCoords.top + (targetCoords.height / 2) - 25  // Vertically centered
              : targetCoords.top - 17) + offsetY,  // was -80; recalibrated for the AppIcon hand graphic (was tuned for the old emoji glyph's size)
            left: (direction === 'left'
              ? targetCoords.left + targetCoords.width + 15
              : targetCoords.left + (targetCoords.width / 2) - 55) + offsetX,  // was -80; same recalibration
            transform: direction === 'left'
              ? [{ translateX: bounceAnim }]  // Bounce horizontally
              : [{ translateY: bounceAnim }],  // Bounce vertically
          }
        ]}
      >
        <AppIcon
          name={direction === 'left' ? 'hand_point_left' : 'hand_point_down'}
          size={40}
          style={styles.arrow}
        />
        <Text style={styles.message}>{message}</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9998,
    elevation: 9998,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  targetButton: {
    position: 'absolute',
  },
  skipButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  skipText: {
    color: '#333',
    fontWeight: '600',
  },
  arrowContainer: {
    position: 'absolute',
    alignItems: 'center',
  },
  arrow: {
  },
  message: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 5,
  },
});
