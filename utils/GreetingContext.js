import React, { createContext, useContext, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const GreetingContext = createContext();

export function GreetingProvider({ children }) {
  const [showGreeting, setShowGreeting] = useState(false);
  const [greetingText, setGreetingText] = useState('');

  const triggerGreeting = async (userName, t) => {
    try {
      const greetings = t('greetings');
      const randomGreeting = greetings[Math.floor(Math.random() * greetings.length)];
      const personalizedGreeting = randomGreeting.replace('{name}', userName);
      
      setGreetingText(personalizedGreeting);
      setShowGreeting(true);
      
      // Update last open time
      await AsyncStorage.setItem('last_app_open', String(Date.now()));
    } catch (error) {
      console.error('Error triggering greeting:', error);
    }
  };

  const checkAndShowGreeting = async (userName, t) => {
    try {
      console.log('👋 FORCE GREETING TEST for:', userName);
      
      // TEMPORARY: Always show greeting for testing
      await triggerGreeting(userName, t);
      
    } catch (error) {
      console.error('Error checking greeting:', error);
    }
  };

  const hideGreeting = () => setShowGreeting(false);

  return (
    <GreetingContext.Provider value={{ 
      showGreeting, 
      greetingText, 
      triggerGreeting, 
      checkAndShowGreeting,
      hideGreeting 
    }}>
      {children}
    </GreetingContext.Provider>
  );
}

export function useGreeting() {
  const context = useContext(GreetingContext);
  if (!context) {
    throw new Error('useGreeting must be used within GreetingProvider');
  }
  return context;
}