import React, { useEffect, useRef } from 'react';
import { StyleSheet, Text, View, Animated, Dimensions } from 'react-native';
import { BlurView } from 'expo-blur';
import { useTheme } from '../utils/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

export default function GreetingBanner({ visible, greeting, onComplete }) {
  const { theme, isDark } = useTheme();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    if (visible) {
      // Fade in + scale up
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
      ]).start();

      // Wait 2 seconds, then fade out
      setTimeout(() => {
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 0.8,
            duration: 500,
            useNativeDriver: true,
          }),
        ]).start(() => {
          if (onComplete) onComplete();
        });
      }, 2000);
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Animated.View 
      style={[
        styles.overlay,
        { opacity: fadeAnim }
      ]}
      pointerEvents="none"
    >
      {/* SUPER dark overlay - almost completely obscures background */}
      <View style={[styles.darkOverlay, { backgroundColor: isDark ? 'rgba(0,0,0,0.92)' : 'rgba(0,0,0,0.85)' }]} />

      <BlurView 
        intensity={100}  // Maximum blur!
        style={styles.blurView}
        tint={isDark ? 'dark' : 'light'}
      >
        {/* Additional blur layer for EXTRA effect */}
        <View style={[styles.extraBlur, { backgroundColor: isDark ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.4)' }]} />
        <Animated.View 
          style={[
            styles.banner,
            { transform: [{ scale: scaleAnim }] }
          ]}
        >
          <LinearGradient
            colors={
              isDark 
                ? ['rgba(30, 30, 30, 0)', 'rgba(30, 30, 30, 0.9)', 'rgba(30, 30, 30, 0)']
                : ['rgba(255, 255, 255, 0)', 'rgba(255, 255, 255, 0.95)', 'rgba(255, 255, 255, 0)']
            }
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.gradientContainer}
          >
            <Text style={[styles.greetingText, { color: theme.text }]}>
              {greeting}
            </Text>
            <View style={[styles.underline, { backgroundColor: theme.primary }]} />
          </LinearGradient>
        </Animated.View>
      </BlurView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
  },
  darkOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
  },
  blurView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 0,  // No padding!
    zIndex: 2,
  },
  banner: {
    width: width,  // FULL width!
    paddingHorizontal: 40,
    paddingVertical: 40,
    alignItems: 'center',
    backgroundColor: 'trasparent',
    // No borderRadius for full-width effect
  },
  greetingText: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  underline: {
    width: 80,
    height: 4,
    borderRadius: 2,
    marginTop: 20,
  },
  gradientContainer: {
    width: '100%',
    paddingHorizontal: 40,
    paddingVertical: 40,
    alignItems: 'center',
  },
});