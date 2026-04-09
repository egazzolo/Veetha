import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

const ThemeContext = createContext();

// Modern Light Theme (current default)
const modernLightTheme = {
  background: '#EAE0C8',
  cardBackground: '#F8F6F0',
  text: '#333333',
  textSecondary: '#666666',
  textTertiary: '#999999',
  primary: '#4CAF50',
  border: '#e0e0e0',
  error: '#ff5252',
  success: '#4CAF50',
  warning: '#FF9800',
};

// Modern Dark Theme
const modernDarkTheme = {
  background: '#000000',
  cardBackground: '#0b0b0b',
  text: '#ffffff',
  textSecondary: '#b0b0b0',
  textTertiary: '#808080',
  primary: '#66BB6A',
  border: '#333333',
  error: '#ff5252',
  success: '#66BB6A',
  warning: '#FFB74D',
};

const themes = {
  'modern-light': modernLightTheme,
  'modern-dark': modernDarkTheme,
};

export function ThemeProvider({ children }) {
  const [currentTheme, setCurrentTheme] = useState('modern-light');
  const [loaded, setLoaded] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    loadTheme();
    
    // Listen for auth changes (login/logout)
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('🔐 Auth state changed:', event);
      
      if (event === 'SIGNED_OUT') {
        console.log('👋 User signed out');
      }
    });

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  const loadTheme = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem('appTheme');
      if (savedTheme && themes[savedTheme]) {
        console.log('📱 Loaded saved theme:', savedTheme);
        setCurrentTheme(savedTheme);
      } else {
        // No saved theme - ensure light mode and save it
        console.log('💡 No saved theme, defaulting to light mode');
        setCurrentTheme('modern-light');
        await AsyncStorage.setItem('appTheme', 'modern-light');
      }
    } catch (error) {
      console.log('Error loading theme:', error);
    } finally {
      setLoaded(true);
    }
  };

  const changeTheme = async (newTheme) => {
    try {
      if (themes[newTheme]) {
        setIsTransitioning(true); // Start fade
        await new Promise(resolve => setTimeout(resolve, 200));
        setCurrentTheme(newTheme);
        await new Promise(resolve => setTimeout(resolve, 100));
        setIsTransitioning(false); // Complete
        await AsyncStorage.setItem('appTheme', newTheme);
        console.log('✅ Theme changed to:', newTheme);
      }
    } catch (error) {
      console.log('Error saving theme:', error);
      setIsTransitioning(false);
    }
  };

  // Legacy toggleTheme for dark mode switch
  const toggleTheme = async () => {
    const newTheme = currentTheme === 'modern-light' ? 'modern-dark' : 'modern-light';
    await changeTheme(newTheme);
  };

  const theme = themes[currentTheme];
  const isDark = currentTheme === 'modern-dark';

  if (!loaded) return null;

  return (
    <ThemeContext.Provider value={{ 
      theme, 
      currentTheme, 
      isDark, 
      isTransitioning,
      toggleTheme,
      changeTheme,
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}