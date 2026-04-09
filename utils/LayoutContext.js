// This stores the user's layout preference
import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

const LayoutContext = createContext();

export function LayoutProvider({ children }) {
  const [layout, setLayout] = useState('cards'); // Default: cards
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLayout();
  }, []);

  const loadLayout = async () => {
    // CLEAR OLD DATA (temporary fix)
    await AsyncStorage.removeItem('home_layout');
    
    // Force cards as default
    setLayout('cards');
    
    // Check Supabase
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from('profiles')
        .select('home_layout')
        .eq('id', user.id)
        .single();
      
      // Only use database value if it exists and is valid
      if (data?.home_layout && (data.home_layout === 'cards' || data.home_layout === 'bars')) {
        setLayout(data.home_layout);
        await AsyncStorage.setItem('home_layout', data.home_layout);
      } else {
        // Database is null or invalid - set to cards
        setLayout('cards');
        await AsyncStorage.setItem('home_layout', 'cards');
        await supabase
          .from('profiles')
          .update({ home_layout: 'cards' })
          .eq('id', user.id);
      }
    }
    
    setLoading(false);
  };

  const changeLayout = async (newLayout) => {
    // 1. Update state (instant UI change)
    setLayout(newLayout);
    
    // 2. Save to AsyncStorage (instant)
    await AsyncStorage.setItem('home_layout', newLayout);
    
    // 3. Save to Supabase (background)
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from('profiles')
        .update({ home_layout: newLayout })
        .eq('id', user.id);
    }
  };

  return (
    <LayoutContext.Provider value={{ layout, changeLayout, loading }}>
      {children}
    </LayoutContext.Provider>
  );
}

export function useLayout() {
  return useContext(LayoutContext);
}