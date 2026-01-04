import React, { createContext, useContext, useState } from 'react';

const OnboardingContext = createContext();

export function OnboardingProvider({ children }) {
  const [onboardingData, setOnboardingData] = useState({
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
  });

  const updateOnboardingData = (newData) => {
    setOnboardingData(prev => ({ ...prev, ...newData }));
  };

  const clearOnboardingData = () => {
    setOnboardingData({
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
    });
  };

  return (
    <OnboardingContext.Provider value={{ onboardingData, updateOnboardingData, clearOnboardingData }}>
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