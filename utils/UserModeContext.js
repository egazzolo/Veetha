import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'veetha_user_mode';

const UserModeContext = createContext();

export function UserModeProvider({ children }) {
  const [userMode, setUserModeState] = useState(null); // 'guest' | 'authenticated' | null (loading)

  // Restore persisted mode on mount
  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored === 'guest' || stored === 'authenticated') {
          setUserModeState(stored);
        }
        // If nothing stored, stay null — calo.js will handle routing
      } catch (e) {
        console.error('Error restoring userMode:', e);
      }
    })();
  }, []);

  // Set + persist mode
  const setUserMode = async (mode) => {
    setUserModeState(mode);
    try {
      if (mode) {
        await AsyncStorage.setItem(STORAGE_KEY, mode);
      } else {
        await AsyncStorage.removeItem(STORAGE_KEY);
      }
    } catch (e) {
      console.error('Error persisting userMode:', e);
    }
  };

  const isGuest = userMode === 'guest';
  const isAuthenticated = userMode === 'authenticated';

  return (
    <UserModeContext.Provider value={{ userMode, setUserMode, isGuest, isAuthenticated }}>
      {children}
    </UserModeContext.Provider>
  );
}

export function useUserMode() {
  const context = useContext(UserModeContext);
  if (!context) {
    throw new Error('useUserMode must be used within UserModeProvider');
  }
  return context;
}

export { UserModeContext };
