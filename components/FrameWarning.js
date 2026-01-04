import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { supabase } from '../utils/supabase';

export default function FrameWarning({ children, theme }) {
  const [frameColor, setFrameColor] = useState(null);
  const [showFrame, setShowFrame] = useState(false);
  const fadeAnim = useState(new Animated.Value(0))[0];

  useEffect(() => {
    checkCalorieStatus();
    
    // Re-check every 30 seconds
    const interval = setInterval(checkCalorieStatus, 5000);
    return () => clearInterval(interval);
  }, [frameColor]);

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

  const checkCalorieStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setFrameColor(null);
        return;
      }

      // Get daily goal
      const { data: profile } = await supabase
        .from('profiles')
        .select('daily_calorie_goal')
        .eq('id', user.id)
        .single();

      const dailyGoal = profile?.daily_calorie_goal || 2000;

      // Get TODAY's meals
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStr = today.toISOString().split('T')[0];

      const { data: meals } = await supabase
        .from('meals')
        .select('calories')
        .eq('user_id', user.id)
        .gte('logged_at', `${todayStr}T00:00:00`)
        .lte('logged_at', `${todayStr}T23:59:59`);

      const consumed = meals?.reduce((sum, meal) => sum + (meal.calories || 0), 0) || 0;
      const percentage = (consumed / dailyGoal) * 100;

      // Determine frame color
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

    } catch (error) {
      console.error('Error checking calorie status:', error);
      setFrameColor(null);
      setShowFrame(false);
    }
  };

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