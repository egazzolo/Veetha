import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

const TutorialContext = createContext();

export const TutorialProvider = ({ children }) => {
  const [tutorialCompleted, setTutorialCompleted] = useState(false);
  // Distinct from tutorialCompleted -- that flips true as soon as the HOME
  // screen's tutorial alone finishes (it's OR'd with tutorial_ever_shown, so
  // it can't tell "just Home" apart from "the whole Home->Scanner->Stats->
  // Profile sequence"). This tracks tutorial_ever_shown by itself, which is
  // only set once the LAST screen (Profile) finishes -- the actual signal
  // for "the entire tutorial is done".
  const [allTutorialsCompleted, setAllTutorialsCompleted] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [currentScreen, setCurrentScreen] = useState(null);

  useEffect(() => {
    checkTutorialStatus();
    
    // Also listen for auth changes
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN') {
        console.log('🔐 User signed in, checking tutorial status');
        setTimeout(() => checkTutorialStatus(), 500);
      }
    });

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  const checkTutorialStatus = async () => {
    try {

      // ✅ Guests skip the tutorial entirely, so treat as completed
      const userMode = await AsyncStorage.getItem('veetha_user_mode');
      if (userMode === 'guest') {
        setTutorialCompleted(true);
        setAllTutorialsCompleted(true);
        return;
      }

      // ✅ DEVICE-LEVEL tutorial check (works for guest + logged users)

      const localFlag = await AsyncStorage.getItem('tutorial_completed_home');
      const everShown = await AsyncStorage.getItem('tutorial_ever_shown');

      console.log('📚 Local tutorial flag:', localFlag, '| Ever shown:', everShown);

      setTutorialCompleted(localFlag === 'true' || everShown === 'true');
      setAllTutorialsCompleted(everShown === 'true');

    } catch (error) {
      console.error('Error checking tutorial:', error);
    }
  };

  const startTutorial = async (screen) => {
    // Guests never see the tutorial
    const userMode = await AsyncStorage.getItem('veetha_user_mode');
    if (userMode === 'guest') return;

    // Once shown on this device, never again -- except Stats, which was
    // added after this device-level flag was already set for devices that
    // completed the original Home->Scanner->Profile flow. Stats is gated
    // solely by its own stats_tutorial_completed column below instead.
    if (screen !== 'Stats') {
      const alreadyShown = await AsyncStorage.getItem('tutorial_ever_shown');
      if (alreadyShown === 'true') return;
    }

    // For Scanner, check scanner_tutorial_completed
    if (screen === 'Scanner') {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profile } = await supabase
          .from('profiles')
          .select('scanner_tutorial_completed')
          .eq('id', user.id)
          .single();

        if (profile?.scanner_tutorial_completed) {
          console.log('🎓 Scanner tutorial already completed');
          return;
        }
      } catch (error) {
        console.error('Error checking scanner tutorial:', error);
        return;
      }
    } 

    // For Profile, check profile_tutorial_completed
    else if (screen === 'Profile') {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profile } = await supabase
          .from('profiles')
          .select('profile_tutorial_completed')
          .eq('id', user.id)
          .single();

        if (profile?.profile_tutorial_completed) {
          console.log('🎓 Profile tutorial already completed');
          return;
        }
      } catch (error) {
        console.error('Error checking profile tutorial:', error);
        // Don't return — ProfileScreen already verified tutorial should start.
        // Allow tutorial to proceed even if this redundant check fails.
      }
    }

    // For Stats, check stats_tutorial_completed
    else if (screen === 'Stats') {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profile } = await supabase
          .from('profiles')
          .select('stats_tutorial_completed')
          .eq('id', user.id)
          .single();

        if (profile?.stats_tutorial_completed) {
          console.log('🎓 Stats tutorial already completed');
          return;
        }
      } catch (error) {
        console.error('Error checking stats tutorial:', error);
      }
    }

    // For Home, check regular tutorial_completed
    else {
      if (tutorialCompleted) return;
    }
    
    console.log(`✅ Starting ${screen} tutorial`);
    setCurrentScreen(screen);
    setCurrentStep(0);
  };

  // Called from the Profile tutorial's final "thank you" alert once the user
  // actually taps OK -- kept separate from completeTutorial() so the
  // RenameAnnouncementModal (gated on allTutorialsCompleted) can't appear
  // ahead of that alert.
  const markAllTutorialsSeen = () => {
    setAllTutorialsCompleted(true);
  };

  const nextStep = () => {
    setCurrentStep(prev => prev + 1);
  };

  const skipTutorial = async () => {
    await completeTutorial();
  };

  const completeTutorial = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        console.log('⚠️ No user session — skipping tutorial DB update');
        return;
      }

      let updateField = {};
      
      if (currentScreen === 'Home') {
        updateField = { home_tutorial_completed: true };
        console.log('✅ Completing HOME tutorial');
      } else if (currentScreen === 'Scanner') {
        updateField = { scanner_tutorial_completed: true };
        console.log('✅ Completing SCANNER tutorial');
      } else if (currentScreen === 'Stats') {
        updateField = { stats_tutorial_completed: true };
        console.log('✅ Completing STATS tutorial');
      } else if (currentScreen === 'Profile') {
        updateField = { 
          profile_tutorial_completed: true,
          tutorial_completed: true
        };
        console.log('✅ Completing PROFILE tutorial (MASTER FLAG SET)');
      }

      const { data, error } = await supabase  // ← Add error checking
        .from('profiles')
        .update(updateField)
        .eq('id', user.id);
      
      if (error) {
        console.error('❌ Failed to update tutorial:', error);  // ← Log errors
      } else {
        console.log('✅ Database updated successfully:', updateField);  // ← Confirm success
      }

      // Only set the device-level kill switch after the LAST tutorial (Profile)
      if (currentScreen === 'Profile') {
        await AsyncStorage.setItem('tutorial_ever_shown', 'true');
        // allTutorialsCompleted itself is NOT set here -- AppTutorial still
        // has its own native "thank you" Alert to show after this, and
        // flipping this now (before that alert appears) is exactly what let
        // the RenameAnnouncementModal jump in ahead of it. It's set instead
        // via markAllTutorialsSeen(), called from that alert's OK button.
      }

      if (currentScreen === 'Home') {

        // ✅ mark tutorial completed locally
        await AsyncStorage.setItem('tutorial_completed_home', 'true');

        setTutorialCompleted(true);
      }

      setCurrentScreen(null);
      setCurrentStep(0);
    } catch (error) {
      console.error('Error completing tutorial:', error);
    }
  };

  const resetTutorial = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from('profiles')
        .update({ 
          tutorial_completed: false,
          home_tutorial_completed: false,
          scanner_tutorial_completed: false,
          stats_tutorial_completed: false,
          profile_tutorial_completed: false,
        })
        .eq('id', user.id);

      await AsyncStorage.multiRemove([
        'tutorial_completed',
        'tutorial_completed_home',
        'profile_tutorial_completed',
        'scanner_tutorial_completed',
        'tutorial_ever_shown',
      ]);

      setTutorialCompleted(false);
      setAllTutorialsCompleted(false);
      setCurrentScreen(null);
      setCurrentStep(0);
    } catch (error) {
      console.error('Error resetting tutorial:', error);
    }
  };

  return (
    <TutorialContext.Provider value={{
      tutorialCompleted,
      allTutorialsCompleted,
      markAllTutorialsSeen,
      currentStep,
      currentScreen,
      startTutorial,
      nextStep,
      skipTutorial,
      completeTutorial,
      resetTutorial,
    }}>
      {children}
    </TutorialContext.Provider>
  );
};

export const useTutorial = () => {
  const context = useContext(TutorialContext);
  if (!context) {
    throw new Error('useTutorial must be used within TutorialProvider');
  }
  return context;
};