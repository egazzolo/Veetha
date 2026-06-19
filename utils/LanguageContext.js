import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';
import { supabase } from './supabase';
import en from './translations/en';
import es from './translations/es';
import fr from './translations/fr';
import tl from './translations/tl';
import pt from './translations/pt';

const LanguageContext = createContext();

const TRANSLATIONS = {
  en,
  es,
  fr,
  tl,
  pt,
};

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState('en');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLanguage();
  }, []);

  const loadLanguage = async () => {
    try {
      // Try to get saved language preference
      const savedLanguage = await AsyncStorage.getItem('app_language');
      
      if (savedLanguage && TRANSLATIONS[savedLanguage]) {
        setLanguageState(savedLanguage);
      } else {
        // Auto-detect from phone settings
        let detectedLang = 'en'; // Default to English
        
        try {
          const deviceLocale = Localization.locale || Localization.getLocales()?.[0]?.languageCode;
          
          if (deviceLocale && typeof deviceLocale === 'string') {
            const deviceLang = deviceLocale.split('-')[0].toLowerCase();
            // Check if detected language is supported, otherwise default to English
            detectedLang = TRANSLATIONS[deviceLang] ? deviceLang : 'en';
          }
        } catch (error) {
          console.log('Could not detect language, defaulting to English');
        }
        
        setLanguageState(detectedLang);
        await AsyncStorage.setItem('app_language', detectedLang);
        console.log('🌍 Language set to:', detectedLang);
      }
    } catch (error) {
      console.error('Error loading language:', error);
      setLanguageState('en'); // Default to English on error
    } finally {
      // Sync resolved language to Supabase profile (if user is logged in)
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user && !user.is_anonymous) {
          const finalLang = await AsyncStorage.getItem('app_language') || 'en';
          await supabase
            .from('profiles')
            .update({ language: finalLang })
            .eq('id', user.id);
          console.log('🌍 Language synced to Supabase:', finalLang);
        }
      } catch (syncError) {
        console.log('Could not sync language to Supabase:', syncError.message);
      }
      setLoading(false);
    }
  };

  // This is the function components will call
  const setLanguage = async (newLanguage) => {
    try {
      await AsyncStorage.setItem('app_language', newLanguage);
      setLanguageState(newLanguage);  // ← Now calls the useState setter
      console.log('🌍 Language changed to:', newLanguage);
      
      // Sync to Supabase profile (if user is logged in)
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user && !user.is_anonymous) {
          await supabase
            .from('profiles')
            .update({ language: newLanguage })
            .eq('id', user.id);
          console.log('🌍 Language synced to Supabase:', newLanguage);
        }
      } catch (syncError) {
        console.log('Could not sync language to Supabase:', syncError.message);
      }
    } catch (error) {
      console.error('Error saving language:', error);
    }
  };

  const t = (key, params = {}) => {
    const keys = key.split('.');
    let value = TRANSLATIONS[language];

    // Traverse translation object
    for (const k of keys) {
      value = value?.[k];
    }

    // 🚨 Missing translation detector
    if (!value) {
      console.warn('🚨 Missing translation:', key);
      return key;
    }

    // Replace {{variable}} placeholders
    let translatedText = value;

    Object.keys(params).forEach(param => {
      translatedText = translatedText.replace(
        new RegExp(`{{${param}}}`, 'g'),
        params[param]
      );
    });

    return translatedText;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, loading }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
}