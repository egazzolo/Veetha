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

// Pro Mode — minimal black/white/grey with green accent
const proModeTheme = {
  background: '#FFFFFF',
  cardBackground: '#F5F5F5',
  text: '#1B1B1B',
  textSecondary: '#666666',
  textTertiary: '#999999',
  primary: '#1F9B39',
  border: '#E0E0E0',
  error: '#1B1B1B',
  success: '#1F9B39',
  warning: '#555555',
};

// Gold Mode — warm brushed-gold backdrop, dark text for contrast against
// the bright metal, and the same two-layer gradient technique used for
// the (now removed) Silver mode: a multi-band brushed base plus a soft
// warm-white sheen crossing it diagonally.
const goldTheme = {
  background: '#C9A227',
  cardBackground: '#D9B94A',
  text: '#241B00',
  textSecondary: '#4A3A0A',
  textTertiary: '#6E5A18',
  primary: '#4CAF50',
  border: '#A9821D',
  error: '#C62828',
  success: '#4CAF50',
  warning: '#8A5A00',
  gradientColors: ['#B8860B', '#E8C766', '#AD850F', '#F0D878', '#A2790C', '#DEB94D', '#B8901C', '#F4DE8E', '#A67C0E'],
  gradientLocations: [0, 0.12, 0.25, 0.37, 0.5, 0.62, 0.75, 0.87, 1],
  gradientHighlightColors: ['rgba(255,250,225,0)', 'rgba(255,250,225,0.6)', 'rgba(255,250,225,0)'],
  gradientHighlightLocations: [0.25, 0.5, 0.75],
};

const themes = {
  'modern-light': modernLightTheme,
  'modern-dark': modernDarkTheme,
  'pro-mode': proModeTheme,
  'gold': goldTheme,
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

  // Falls back to Light if a saved theme (e.g. a removed one like the old
  // Silver mode) no longer exists in `themes`, rather than crashing every
  // screen that reads theme.* on an undefined object.
  const theme = themes[currentTheme] || modernLightTheme;
  const isDark = currentTheme === 'modern-dark';
  const isProMode = currentTheme === 'pro-mode';
  const isGold = currentTheme === 'gold';

  if (!loaded) return null;

  return (
    <ThemeContext.Provider value={{ 
      theme, 
      currentTheme, 
      isDark,
      isProMode,
      isGold,
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