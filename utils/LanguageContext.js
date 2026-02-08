import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';
import en from './translations/en';
import es from './translations/es';
import fr from './translations/fr';
import tl from './translations/tl';

const LanguageContext = createContext();

const TRANSLATIONS = {
  en,
  es,
  fr,
  tl,
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
      setLoading(false);
    }
  };

  // This is the function components will call
  const setLanguage = async (newLanguage) => {
    try {
      await AsyncStorage.setItem('app_language', newLanguage);
      setLanguageState(newLanguage);  // ← Now calls the useState setter
      console.log('🌍 Language changed to:', newLanguage);
    } catch (error) {
      console.error('Error saving language:', error);
    }
  };

  const t = (key, params = {}) => {
    const keys = key.split('.');
    let value = TRANSLATIONS[language];
    
    for (const k of keys) {
      value = value?.[k];
    }
    
    // If no translation found, return the key
    if (!value) return key;
    
    // Replace {{variable}} placeholders with actual values
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