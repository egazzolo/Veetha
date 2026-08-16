import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Animated } from 'react-native';

// Derives its warning color from the same `consumed`/`totalCalories` HomeScreen
// already keeps current -- previously this polled Supabase directly on its own
// 5-second timer (duplicated in CalorieWarningBanner above), which meant two
// separate components each firing 3 network requests every 5 seconds for as
// long as the app was open. That constant, ever-growing request volume was the
// real cause of the app eventually hanging and needing a force-close.
export default function FrameWarning({ children, theme, consumed = 0, totalCalories }) {
  const [frameColor, setFrameColor] = useState(null);
  const [showFrame, setShowFrame] = useState(false);
  const fadeAnim = useState(new Animated.Value(0))[0];

  useEffect(() => {
    const dailyGoal = totalCalories || 2000;
    const percentage = (consumed / dailyGoal) * 100;

    let newColor = null;
    if (consumed > dailyGoal) {
      newColor = '#FF3B30'; // Red - OVER goal
    } else if (percentage >= 90) {
      newColor = '#FF9500'; // Orange - WARNING (90%+)
    }

    // Only show frame if color changed (new warning state)
    if (newColor && newColor !== frameColor) {
      setFrameColor(newColor);
      setShowFrame(true);
    } else if (!newColor) {
      setFrameColor(null);
      setShowFrame(false);
    }
  }, [consumed, totalCalories]);

  // Animate frame appearance/disappearance
  useEffect(() => {
    if (frameColor && showFrame) {
      // Fade in
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();

      // Hide after 5 seconds
      const timer = setTimeout(() => {
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start(() => {
          setShowFrame(false);
        });
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [frameColor, showFrame]);

  // If no frame to show, just return children
  if (!frameColor || !showFrame) {
    return <>{children}</>;
  }

  // Render animated glowing frame
  return (
    <View style={styles.container}>
      {/* Top border */}
      <Animated.View style={[
        styles.borderTop, 
        { backgroundColor: frameColor, opacity: fadeAnim }
      ]} />
      
      {/* Left border */}
      <Animated.View style={[
        styles.borderLeft, 
        { backgroundColor: frameColor, opacity: fadeAnim }
      ]} />
      
      {/* Right border */}
      <Animated.View style={[
        styles.borderRight, 
        { backgroundColor: frameColor, opacity: fadeAnim }
      ]} />
      
      {/* Bottom border */}
      <Animated.View style={[
        styles.borderBottom, 
        { backgroundColor: frameColor, opacity: fadeAnim }
      ]} />
      
      {/* Content */}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  borderTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 6,
    zIndex: 9999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 8,
  },
  borderLeft: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: 6,
    zIndex: 9999,
    shadowColor: '#000',
    shadowOffset: { width: 3, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 8,
  },
  borderRight: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    width: 6,
    zIndex: 9999,
    shadowColor: '#000',
    shadowOffset: { width: -3, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 8,
  },
  borderBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 6,
    zIndex: 9999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 8,
  },
});