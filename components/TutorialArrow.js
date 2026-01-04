import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';

export default function TutorialArrow({ 
  visible, 
  targetCoords, 
  onSkip, 
  direction = 'down',
  message = 'Tap here to continue!'
}) {
  const bounceAnim = useRef(new Animated.Value(0)).current;

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
    <>
      {/* Gray overlay */}
      <View style={styles.overlay} pointerEvents="box-none">
        {/* Skip button */}
        <TouchableOpacity style={styles.skipButton} onPress={onSkip}>
          <Text style={styles.skipText}>Skip Tutorial</Text>
        </TouchableOpacity>

        {/* Bouncing arrow */}
        <Animated.View 
          style={[
            styles.arrowContainer,
            {
              top: direction === 'left' 
                ? targetCoords.top + (targetCoords.height / 2) - 25  // Vertically centered
                : targetCoords.top - 80,
              left: direction === 'left'
                ? targetCoords.left + targetCoords.width + 15  // To the right
                : targetCoords.left + (targetCoords.width / 2) - 60,
              transform: direction === 'left' 
                ? [{ translateX: bounceAnim }]  // Bounce horizontally
                : [{ translateY: bounceAnim }],  // Bounce vertically
            }
          ]}
        >
          <Text style={styles.arrow}>
            {direction === 'left' ? '👈' : '👇'}
          </Text>
          <Text style={styles.message}>{message}</Text>
        </Animated.View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 9998,
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
    fontSize: 40,
  },
  message: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 5,
  },
});