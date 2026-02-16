import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

const UserContext = createContext();

export function UserProvider({ children }) {
  const [profile, setProfile] = useState(null);
  const [user, setUser] = useState(null);
  const [meals, setMeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cacheLoaded, setCacheLoaded] = useState(false);
  const [freshDataLoaded, setFreshDataLoaded] = useState(false);
  const [isGuest, setIsGuest] = useState(false);

  useEffect(() => {
    initializeUserData();
    
    // Listen for auth changes (login/logout)
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('🔐 Auth state changed:', event);
      
      if (event === 'SIGNED_IN') {
        setIsGuest(false);
        console.log('✅ User signed in, reloading data');
        loadUserData();
      } else if (event === 'SIGNED_OUT') {
        console.log('👋 User signed out, clearing data');
        clearUserData();
      }
    });

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  // Initialize: Load cache FIRST, then fetch fresh data
  const initializeUserData = async () => {
    try {

      const { data } = await supabase.auth.getUser();
      const authUser = data?.user;

      if (!authUser) {

        // GUEST → load local cache
        setIsGuest(true);
        await loadCachedData();
        await loadUserData();

      } else {

        // AUTHENTICATED → NEVER load local cache
        setIsGuest(false);
        await loadUserData();

      }

    } catch (error) {
      console.error('Error initializing user data:', error);
      setLoading(false);
    }
  };

  // Load cached data from AsyncStorage (instant!)
  const loadCachedData = async () => {
    try {
      const cachedProfile = await AsyncStorage.getItem('cached_profile');
      const cachedMeals = await AsyncStorage.getItem('cached_meals');
      
      if (cachedProfile) {
        setProfile(JSON.parse(cachedProfile));
        console.log('⚡ Loaded cached profile');
      }
      
      if (cachedMeals) {
        setMeals(JSON.parse(cachedMeals));
        console.log('⚡ Loaded cached meals');
      }
      
      setCacheLoaded(true);
    } catch (error) {
      console.error('Error loading cache:', error);
    }
  };

  // Fetch fresh data from Supabase
  const loadUserData = async () => {
    let loadedProfile = null; 
    try {
      console.log('🔍 UserContext: Loading user data...');
      
      const { data } = await supabase.auth.getUser();
      const authUser = data?.user;

      setUser(authUser);

      // ✅ GUEST MODE SUPPORT
      if (!authUser) {
        console.log('👤 Guest mode activated');

        setIsGuest(true);      // NEW
        setProfile(null);      // important cleanup
        setMeals([]);          // prevent stale cache UI

        setLoading(false);
        return;
      }

      //console.log('👤 UserContext: User =', authUser.id);

      // Load profile
      if (!authUser?.id) {
        console.log('❌ UserContext: authUser has no id');
        setLoading(false);
        return;
      }

      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .maybeSingle();

      //console.log('📊 UserContext: Profile data =', profileData);
      //console.log('📊 UserContext: Profile error =', error);

      if (profileData) {
        loadedProfile = profileData;  // ← ADD THIS LINE
        setProfile(profileData);
        // Cache it for next time
        await AsyncStorage.setItem('cached_profile', JSON.stringify(profileData));
        console.log('✅ UserContext: Profile loaded & cached!');
      } else {
        console.log('⚠️ UserContext: No profile data found');
      }

      // Load today's meals
      await loadTodaysMeals(authUser.id);

    } catch (error) {
      console.error('❌ UserContext: Error =', error);
    } finally {
      setLoading(false);
      setFreshDataLoaded(true);
      console.log('✅ UserContext: Loading complete');
    }
    return loadedProfile;
  };

  const loadTodaysMeals = async (userId) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('meals')
        .select(`
          *,
          product:food_database(
            id,
            name,
            calories,
            protein,
            carbs,
            fat,
            fiber,
            sugar,
            sodium,
            serving_unit,
            image_url
          )
        `)
        .eq('user_id', userId)
        .gte('logged_at', `${today}T00:00:00`)
        .lte('logged_at', `${today}T23:59:59`)
        .order('logged_at', { ascending: false });

      if (!error && data) {
        setMeals(data);
        // Cache meals for next time
        await AsyncStorage.setItem('cached_meals', JSON.stringify(data));
        console.log('✅ UserContext: Meals loaded & cached!');
      }
    } catch (error) {
      console.error('Error loading meals:', error);
    }
  };

  const refreshMeals = async () => {
    const { data } = await supabase.auth.getUser();
    const authUser = data?.user;

    if (!authUser?.id) return;

    await loadTodaysMeals(authUser.id);
  };

  const refreshProfile = async () => {
    const freshProfile = await loadUserData();
    return freshProfile;
  };

  const clearUserData = async () => {
    setProfile(null);
    setMeals([]);
    await AsyncStorage.removeItem('cached_profile');
    await AsyncStorage.removeItem('cached_meals');
  };

  return (
    <UserContext.Provider value={{ 
      user,
      profile, 
      meals,
      isGuest,
      loading: loading && !cacheLoaded, // Only show loading if no cache
      freshDataLoaded,
      isGuest,
      refreshMeals,
      refreshProfile,
    }}>
      {children}
    </UserContext.Provider>
  );
}

export { UserContext };

export function useUser() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within UserProvider');
  }
  return context;
}