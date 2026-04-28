import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const OnboardingContext = createContext();
const STORAGE_KEY = 'veetha_onboarding_data';

const DEFAULT_DATA = {
  gender: '',
  age: '',
  dateOfBirth: '',
  heightFeet: '',
  heightInches: '',
  heightCm: '',
  weight: '',
  unit: 'imperial',
  goal: '',
  targetWeight: '',
  activityLevel: '',
  dietaryRestrictions: [],
  medicalDisclaimerAgreed: false,
  referralSource: '',
};

export function OnboardingProvider({ children }) {
  const [onboardingData, setOnboardingData] = useState(DEFAULT_DATA);
  const [isLoaded, setIsLoaded] = useState(false);
  const isFirstRender = useRef(true);

  // Load from AsyncStorage on mount
  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          // Merge with defaults so newly-added fields don't break
          setOnboardingData({ ...DEFAULT_DATA, ...parsed });
          console.log('📂 Restored onboarding data from storage');
        }
      } catch (error) {
        console.error('Error loading onboarding data:', error);
      } finally {
        setIsLoaded(true);
      }
    })();
  }, []);

  // Persist to AsyncStorage whenever data changes (but skip the very first render)
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (!isLoaded) return; // don't overwrite before we've loaded
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(onboardingData)).catch(err =>
      console.error('Error saving onboarding data:', err)
    );
  }, [onboardingData, isLoaded]);

  const updateOnboardingData = (newData) => {
    setOnboardingData(prev => ({ ...prev, ...newData }));
  };

  const clearOnboardingData = async () => {
    setOnboardingData(DEFAULT_DATA);
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
      console.log('🗑️ Cleared onboarding data from storage');
    } catch (error) {
      console.error('Error clearing onboarding data:', error);
    }
  };

  return (
    <OnboardingContext.Provider value={{ onboardingData, updateOnboardingData, clearOnboardingData, isOnboardingLoaded: isLoaded }}>
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error('useOnboarding must be used within OnboardingProvider');
  }
  return context;
}