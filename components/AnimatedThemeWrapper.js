import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet } from 'react-native';
import { useTheme } from '../utils/ThemeContext';

function AnimatedThemeWrapper({ children, style }) {
  const { isTransitioning } = useTheme();
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isTransitioning) {
      // Fade out
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      // Fade in
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    }
  }, [isTransitioning]);

  return (
    <Animated.View style={[styles.wrapper, style, { opacity: fadeAnim }]}>
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
});

export default AnimatedThemeWrapper;