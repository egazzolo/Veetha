import React, { useState, useRef, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Switch, Alert, Linking, ActivityIndicator, Platform } from 'react-native';
import { showToast } from '../components/VeethaToast';
import VeethaModal from '../components/VeethaModal';
import GuestUpsellSheet from '../components/GuestUpsellSheet';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../utils/supabase';
import { Image } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSwipeNavigation } from '../utils/useSwipeNavigation';
import { useTheme } from '../utils/ThemeContext';
import { useLanguage } from '../utils/LanguageContext';
import { useUser } from '../utils/UserContext';
import { usePremiumStatus } from '../utils/usePremiumStatus';
import { useUserMode } from '../utils/UserModeContext';
import { RefreshControl } from 'react-native';
import { logScreen, logEvent, logMealLogged } from '../utils/analytics';
import AnimatedThemeWrapper from '../components/AnimatedThemeWrapper';
import ThemedScreenBackground from '../components/ThemedScreenBackground';
import Constants from 'expo-constants';
import BottomNav from '../components/BottomNav';
import { useTutorial } from '../utils/TutorialContext';
import AppTutorial from '../components/AppTutorial';
import ExitSurveyModal from '../components/ExitSurveyModal';
import { posthog } from '../utils/posthog';
import * as ImagePicker from 'expo-image-picker';
import AppIcon from '../components/AppIcon';

export default function ProfileScreen({ navigation }) {

  const { theme, isDark, toggleTheme } = useTheme();
  const { t } = useLanguage();
  const [refreshing, setRefreshing] = useState(false);
  const [checkingTutorial, setCheckingTutorial] = useState(true);
  const { profile, loading, refreshProfile, refreshMeals } = useUser();
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || null);
  const { isGuest, setUserMode } = useUserMode();
  const { startTutorial } = useTutorial();
  const { isPremium } = usePremiumStatus();
  const [guestSheetVisible, setGuestSheetVisible] = useState(false);
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  const [deleteModalStep, setDeleteModalStep] = useState(0); // 0=hidden, 1=first confirm, 2=final confirm, 3=exit survey
  const [photoPickerVisible, setPhotoPickerVisible] = useState(false);

  // Swipe navigation
  // Disabled during the tutorial's freeze phase -- it's a plain View overlay
  // (not a native Modal), so unlike the coach-mark steps themselves it
  // doesn't stop this Pan gesture from reaching the screen underneath.
  const swipeGesture = useSwipeNavigation(navigation, 'Profile', !checkingTutorial);

  const scrollViewRef = useRef(null);
  const statsGridRef = useRef(null);
  const editButtonRef = useRef(null);
  const goalsButtonRef = useRef(null);
  const dietaryButtonRef = useRef(null);
  const displaySettingsButtonRef = useRef(null);
  
  console.log('📱 ProfileScreen: profile =', profile);
  console.log('📱 ProfileScreen: loading =', loading);

  const userName = profile?.full_name || profile?.email?.split('@')[0] || "User";

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshProfile();
    await refreshMeals();
    setRefreshing(false);
  };

  useEffect(() => {
    if (profile?.avatar_url) {
      setAvatarUrl(profile.avatar_url);
    }
  }, [profile]);

  // Start Profile tutorial on first visit to this screen
  useFocusEffect(
    React.useCallback(() => {
    // Re-arm the freeze on every focus, not just the component's first ever
    // mount -- this screen stays mounted between tab navigations, so
    // checkingTutorial's useState(true) initializer only ever applies once.
    // Without this, revisiting Profile later in the same session (after an
    // earlier visit already resolved it to false) would find the freeze
    // already off, leaving the screen tappable/scrollable before this
    // visit's own checks (and the tutorial, if it's about to start) are done.
    setCheckingTutorial(true);

    // Guests never see tutorials
    if (isGuest) {
      setCheckingTutorial(false);
      return;
    }

    let cancelled = false;
    let timerId;

    const checkProfileTutorial = async () => {
      // Safety net — never leave overlay up more than 5 seconds
      const safetyTimer = setTimeout(() => {
        setCheckingTutorial(false);
      }, 5000);
      try {
        // Check local cache first
        const cached = await AsyncStorage.getItem('profile_tutorial_completed');
        if (cached === 'true') {
          clearTimeout(safetyTimer);
          setCheckingTutorial(false);
          return;
        }

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          clearTimeout(safetyTimer);
          setCheckingTutorial(false);
          return;
        }

        const { data: profileData } = await supabase
          .from('profiles')
          .select('profile_tutorial_completed')
          .eq('id', user.id)
          .single();

        if (profileData?.profile_tutorial_completed) {
          clearTimeout(safetyTimer);
          await AsyncStorage.setItem('profile_tutorial_completed', 'true');
          setCheckingTutorial(false);
          return;
        }

        if (cancelled) return;

        // Wait for refs to be ready before starting tutorial
        let checkCount = 0;
        const checkRefsReady = () => {
          if (cancelled) return;
          checkCount++;
          
          const refsReady = 
            statsGridRef.current !== null &&
            editButtonRef.current !== null &&
            goalsButtonRef.current !== null;
          
          console.log('🔍 Tutorial refs check:', {
            statsGrid: statsGridRef.current !== null,
            editButton: editButtonRef.current !== null,
            goalsButton: goalsButtonRef.current !== null,
            checkCount,
          });

          if (refsReady) {
            timerId = setTimeout(() => {
              if (cancelled) return;
              startTutorial('Profile');
              // AppTutorial's own onVisible fires once its coach-mark
              // overlay actually becomes visible -- that's the real release
              // signal. This fallback only covers startTutorial() deciding
              // NOT to start (tutorial already completed for this user),
              // in which case AppTutorial never measures anything and
              // onVisible never fires.
              //
              // Deliberately NOT gated on `cancelled` here: startTutorial()
              // has already been called above, so if this release got
              // skipped the freeze overlay would be stuck on screen forever
              // with no other code path left to clear it.
              setTimeout(() => {
                setCheckingTutorial(false);
              }, 800);
            }, 300);
          } else if (checkCount < 10) {
            timerId = setTimeout(checkRefsReady, 300);
          } else {
            // Hard fallback -- refs never became ready in time. Still don't
            // release the freeze before the tutorial actually starts (that
            // was leaving the screen scrollable while it was still loading
            // in) -- mirror the happy-path sequencing above instead: start
            // it, then release shortly after.
            timerId = setTimeout(() => {
              if (cancelled) return;
              startTutorial('Profile');
              setTimeout(() => {
                setCheckingTutorial(false);
              }, 800);
            }, 300);
          }
        };

        checkRefsReady();

      } catch (error) {
        console.error('Error checking profile tutorial:', error);
        clearTimeout(safetyTimer);
        setCheckingTutorial(false);
      }
    };

    checkProfileTutorial();

    return () => {
      cancelled = true;
      if (timerId) clearTimeout(timerId);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isGuest])
  );

  const userStats = React.useMemo(() => ({
    age: profile?.age || 0,
    gender: profile?.gender === 'male' ? t('onboarding.male')
      : profile?.gender === 'female' ? t('onboarding.female')
      : 'Not set',
    height: profile?.unit_preference === 'imperial' 
      ? `${profile?.height_ft || 0}'${profile?.height_in || 0}"` 
      : `${profile?.height_cm || 0}cm`, 
    weight: profile?.unit_preference === 'imperial'
      ? `${profile?.weight_lbs || 0} lbs`
      : `${profile?.weight_kg || 0} kg`,
    goal: profile?.goal || 'Not set',
    targetWeight: profile?.unit_preference === 'imperial'
      ? `${profile?.target_weight_lbs || 0} lbs`
      : `${profile?.target_weight_kg || 0} kg`,
    activityLevel: profile?.activity_level || 'Not set',
  }), [profile]);

  const handleEditProfile = () => {
    navigation.navigate('EditProfile');
  };

  const handleLearnMore = () => {
    // TODO: Navigate to Learn More section
    showToast('info', t('profile.learnMore'), 'Educational content coming soon!');
  };

  const handleSupport = () => {
    // TODO: Navigate to support/help
    showToast('info', t('profile.helpSupport'), t('profile.contactSupport'));
  };

  const handleLogout = () => {
    setLogoutModalVisible(true);
  };

  const confirmLogout = async () => {
    setLogoutModalVisible(false);
    try {
      console.log('🚪 Logging out...');
      await AsyncStorage.removeItem('last_app_open');
      await setUserMode(null);
      await supabase.auth.signOut();
      console.log('✅ Logout successful');
      navigation.reset({ index: 0, routes: [{ name: 'Landing' }] });
    } catch (error) {
      console.error('❌ Error logging out:', error);
      Alert.alert('Error', 'Failed to log out. Please try again.');
    }
  };

  const handleDeleteAccount = () => {
    setDeleteModalStep(1);
  };

  const confirmDeleteAccountFinal = async () => {
    setDeleteModalStep(0);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase.functions.invoke('delete-user', {
        headers: { Authorization: `Bearer ${session.access_token}` }
      });

      if (error) throw error;
      await supabase.auth.signOut();

      showToast('success', t('profile.accountDeleted'), t('profile.accountDeletedMessage'));
      navigation.reset({ index: 0, routes: [{ name: 'Landing' }] });
    } catch (error) {
      console.error('Error deleting account:', error);
      // Data is deleted even if Edge Function errored — clean up and go to Landing
      await supabase.auth.signOut();
      await AsyncStorage.clear();
      navigation.reset({ index: 0, routes: [{ name: 'Landing' }] });
    }
  };

  // The reason is the one signal PostHog funnels/RevenueCat-style billing
  // metrics can't infer on their own -- fire it to both so it shows up
  // alongside the behavioral and revenue data instead of sitting isolated
  // in its own table. Best-effort: a failure here should never block the
  // account deletion the user actually asked for.
  const handleExitSurveySubmit = async (reason, feedbackText) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('account_deletion_feedback').insert({
          user_id: user.id,
          reason,
          feedback_text: feedbackText || null,
        });
      }
      posthog.capture('account_deletion_reason', { reason });
    } catch (err) {
      console.error('Error saving exit survey:', err);
    }
    confirmDeleteAccountFinal();
  };

  const handleToggleDarkMode = () => {
    toggleTheme();
  };

  console.log('📱 ProfileScreen: Rendering with userStats =', userStats);

  const handlePickAvatar = async () => {
    if (isGuest) {
      setGuestSheetVisible(true);
      return;
    }
    setPhotoPickerVisible(true);
  };

  const handleTakePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(t('common.error'), 'Camera permission is required.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled) await uploadAvatar(result.assets[0].uri);
  };

  const handleChooseFromLibrary = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(t('common.error'), 'Permission to access photos is required.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    }); 

    if (!result.canceled) await uploadAvatar(result.assets[0].uri);
  };

  const uploadAvatar = async (uri) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const ext = uri.split('.').pop().toLowerCase();
      const fileName = `avatar-${user.id}.${ext}`;
      const contentType = `image/${ext === 'jpg' ? 'jpeg' : ext}`;

      const formData = new FormData();
      formData.append('file', {
        uri,
        name: fileName,
        type: contentType,
      });

      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch(
        `https://bfgreozkoftncayzyzhz.supabase.co/storage/v1/object/avatars/${fileName}`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            'x-upsert': 'true',
          },
          body: formData,
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText);
      }

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);

      setAvatarUrl(`${publicUrl}?t=${Date.now()}`);
      console.log('✅ Avatar updated:', publicUrl);

    } catch (error) {
      console.error('❌ Error uploading avatar:', error);
      Alert.alert(t('common.error'), 'Failed to upload photo.');
    }
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <GestureDetector gesture={swipeGesture}>
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
          <ThemedScreenBackground />
          <AnimatedThemeWrapper>
            <ScrollView
              ref={scrollViewRef}
              style={styles.scrollView}
              showsVerticalScrollIndicator={false}
              scrollEnabled={!checkingTutorial}
              refreshControl={
                <RefreshControl 
                  refreshing={refreshing} 
                  onRefresh={onRefresh}
                  tintColor={theme.primary}
                />
              }
            >
              {/* Header */}
              <View style={[styles.header, { backgroundColor: theme.cardBackground }]}>
                <TouchableOpacity onPress={handlePickAvatar} style={styles.avatarWrapper}>
                  <View style={styles.avatarContainer}>
                    {avatarUrl ? (
                      <Image
                        source={{ uri: avatarUrl }}
                        style={styles.avatarImage}
                        onError={() => setAvatarUrl(null)}
                      />
                    ) : (
                      <>
                        <Text style={styles.avatarText}>
                          {userName.charAt(0).toUpperCase()}
                        </Text>
                        <AppIcon name="camera" size={20} />
                      </>
                    )}
                  </View>
                </TouchableOpacity>
                <Text style={[styles.userName, { color: theme.text }]}>{userName}</Text>
                <TouchableOpacity
                  ref={editButtonRef}
                  onLayout={(event) => {
                    try {
                      const { x, y, width, height } = event.nativeEvent.layout;
                      if (editButtonRef?.current?.measureInWindow) {
                        editButtonRef.current.measureInWindow((wx, wy, w, h) => {
                          if (editButtonRef.current) {
                            editButtonRef.current.tutorialCoords = { 
                              top: wy, left: wx, width: w, height: h, borderRadius: 16 
                            };
                          }
                        });
                      }
                    } catch (error) {
                        // Silently ignore - this is expected during layout
                    }
                  }}
                  style={styles.editButton} 
                  onPress={handleEditProfile}
                >
                  <Text style={styles.editButtonText}>{t('profile.editProfile')}</Text>
                </TouchableOpacity>

              </View>

              {/* Stats Summary -- notebook-page treatment matching the
                  Weekly Summary card on Stats, but without the punched
                  holes / red margin rule (Profile-only variant). */}
              <View style={styles.section}>
                <View
                  ref={statsGridRef}
                  onLayout={(event) => {
                    try {
                      const { x, y, width, height } = event.nativeEvent.layout;
                      if (statsGridRef?.current?.measureInWindow) {
                        statsGridRef.current.measureInWindow((wx, wy, w, h) => {
                          if (statsGridRef.current) {
                            statsGridRef.current.tutorialCoords = {
                              top: wy, left: wx, width: w, height: h, borderRadius: 16
                            };
                          }
                        });
                      }
                    } catch (error) {
                      // Silently ignore - this is expected during layout
                    }
                  }}
                  style={styles.notebookCard}
                >
                  <Text style={[styles.sectionTitle, styles.notebookTitle, { color: theme.text, borderBottomColor: 'rgba(90, 130, 190, 0.4)' }]}>
                    {t('profile.yourStats')}
                  </Text>

                  <View style={[styles.notebookRow, { borderBottomColor: 'rgba(90, 130, 190, 0.4)' }]}>
                    <Text style={[styles.statLabel, { color: theme.textSecondary }]}>{t('onboarding.gender')}</Text>
                    <Text style={[styles.statValue, { color: theme.text }]}>{userStats.gender}</Text>
                  </View>
                  <View style={[styles.notebookRow, { borderBottomColor: 'rgba(90, 130, 190, 0.4)' }]}>
                    <Text style={[styles.statLabel, { color: theme.textSecondary }]}>{t('profile.height')}</Text>
                    <Text style={[styles.statValue, { color: theme.text }]}>{userStats.height}</Text>
                  </View>
                  <View style={[styles.notebookRow, { borderBottomColor: 'rgba(90, 130, 190, 0.4)' }]}>
                    <Text style={[styles.statLabel, { color: theme.textSecondary }]}>{t('profile.weight')}</Text>
                    <Text style={[styles.statValue, { color: theme.text }]}>{userStats.weight}</Text>
                  </View>
                  <View style={[styles.notebookRow, { borderBottomColor: 'rgba(90, 130, 190, 0.4)' }]}>
                    <Text style={[styles.statLabel, { color: theme.textSecondary }]}>{t('profile.age')}</Text>
                    <Text style={[styles.statValue, { color: theme.text }]}>{userStats.age}</Text>
                  </View>
                  <View style={[styles.notebookRow, styles.notebookRowLast]}>
                    <Text style={[styles.statLabel, { color: theme.textSecondary }]}>{t('profile.goal')}</Text>
                    <Text style={[styles.statValue, { color: theme.text }]}>
                      {userStats.goal === 'lose' ? t('profile.goalLose') :
                      userStats.goal === 'gain' ? t('profile.goalGain') :
                      userStats.goal === 'maintain' ? t('profile.goalMaintain') :
                      'Not set'}
                    </Text>
                  </View>
                </View>
              </View>

              {!isGuest && !isPremium && (
                <TouchableOpacity
                  style={{
                    backgroundColor: '#1F9B39',
                    borderRadius: 12,
                    padding: 20,
                    marginHorizontal: 20,
                    marginBottom: 16,
                  }}
                  onPress={() => navigation.navigate('Paywall')}
                  activeOpacity={0.85}
                >
                  <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold' }}>
                    Meal Break Premium
                  </Text>
                  <Text style={{ color: '#fff', fontSize: 14, marginTop: 4 }}>
                    Unlock all features with a 7-day free trial
                  </Text>
                  <Text style={{ color: '#fff', fontWeight: '600', marginTop: 12 }}>
                    Go Premium →
                  </Text>
                </TouchableOpacity>
              )}

              {/* Settings Section */}
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}> {t('profile.settings')}</Text>
                <TouchableOpacity 
                  ref={goalsButtonRef}
                  onLayout={(event) => {
                    try {
                      const { x, y, width, height } = event.nativeEvent.layout;
                      if (goalsButtonRef?.current?.measureInWindow) {
                        goalsButtonRef.current.measureInWindow((wx, wy, w, h) => {
                          if (goalsButtonRef.current) {
                            goalsButtonRef.current.tutorialCoords = { 
                              top: wy, left: wx, width: w, height: h, borderRadius: 16 
                            };
                          }
                        });
                      }
                    } catch (error) {
                      // Silently ignore - this is expected during layout
                    }
                  }}
                  style={[styles.settingItem, { backgroundColor: 'transparent' }]}
                  onPress={() => navigation.navigate('GoalsPreferences')}
                >
                  <View style={styles.settingLeft}>
                    <AppIcon name="target" size={24} style={{ marginRight: 15 }} />
                    <Text style={[styles.settingLabel, { color: theme.text }]}>{t('profile.goalsPreferences')}</Text>
                  </View>
                  <Text style={styles.settingArrow}>›</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.settingItem, { backgroundColor: 'transparent' }]}
                  onPress={() => navigation.navigate('Preferences')}
                >
                  <View style={styles.settingLeft}>
                    <AppIcon name="clipboard" size={24} style={{ marginRight: 15 }} />
                    <Text style={[styles.settingLabel, { color: theme.text }]}>{t('profile.preferences')}</Text>
                  </View>
                  <Text style={styles.settingArrow}>›</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  ref={dietaryButtonRef}
                  onLayout={(event) => {
                    try {
                      const { x, y, width, height } = event.nativeEvent.layout;
                      if (dietaryButtonRef?.current?.measureInWindow) {
                        dietaryButtonRef.current.measureInWindow((wx, wy, w, h) => {
                          if (dietaryButtonRef.current) {
                            dietaryButtonRef.current.tutorialCoords = { 
                              top: wy, left: wx, width: w, height: h, borderRadius: 16 
                            };
                          }
                        });
                      }
                    } catch (error) {
                      // Silently ignore - this is expected during layout
                    }
                  }}
                  style={[styles.settingItem, { backgroundColor: 'transparent' }]}
                  onPress={() => navigation.navigate('DietaryRestrictions')}
                >
                  <View style={styles.settingLeft}>
                    <AppIcon name="fork_knife" size={24} style={{ marginRight: 15 }} />
                    <Text style={[styles.settingLabel, { color: theme.text }]}>{t('profile.dietaryRestrictions')}</Text>
                  </View>
                  <Text style={styles.settingArrow}>›</Text>
                </TouchableOpacity>
                {!isGuest && (
                <TouchableOpacity
                  ref={displaySettingsButtonRef}
                  onLayout={(event) => {
                    try {
                      const { x, y, width, height } = event.nativeEvent.layout;
                      if (displaySettingsButtonRef?.current?.measureInWindow) {
                        displaySettingsButtonRef.current.measureInWindow((wx, wy, w, h) => {
                          console.log('🟢 DISPLAY SETTINGS ACTUAL POSITION:', {
                            measureInWindow: { wx, wy, w, h },
                            onLayoutLocal: { x, y, width, height },
                          });
                          if (displaySettingsButtonRef.current) {
                            displaySettingsButtonRef.current.tutorialCoords = {
                              top: wy, left: wx, width: w, height: h, borderRadius: 16
                            };
                          }
                        });
                      }
                    } catch (error) {
                      // Silently ignore - this is expected during layout
                    }
                  }}
                  style={[styles.menuItem, { backgroundColor: 'transparent' }]}
                  onPress={() => navigation.navigate('DisplaySettings')}
                >
                  <AppIcon name="palette" size={24} style={{ marginRight: 15 }} />
                  <View style={styles.menuContent}>
                    <Text style={[styles.menuLabel, { color: theme.text }]}>{t('profile.displaySettingsButton')}</Text>
                    <Text style={[styles.menuDescription, { color: theme.textSecondary }]}>
                      {t('profile.displaySettingsDesc')}
                    </Text>
                  </View>
                  <Text style={[styles.menuArrow, { color: '#ccc' }]}>›</Text>
              </TouchableOpacity>
                )}
              </View>

              {/* Resources Section */}
              <View style={[styles.section, { paddingBottom: 0 }]}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>{t('profile.resources')}</Text>
                
                <TouchableOpacity style={[styles.settingItem, { backgroundColor: 'transparent', display: 'none' }]} onPress={handleLearnMore}>
                  <View style={styles.settingLeft}>
                    <AppIcon name="book" size={24} style={{ marginRight: 15 }} />
                    <Text style={[styles.settingLabel, { color: theme.text }]}>{t('profile.learnMore')}</Text>
                  </View>
                  <Text style={styles.settingArrow}>›</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.settingItem, { backgroundColor: 'transparent' }]} onPress={handleSupport}>
                  <View style={styles.settingLeft}>
                    <AppIcon name="chat" size={24} style={{ marginRight: 15 }} />
                    <Text style={[styles.settingLabel, { color: theme.text }]}>{t('profile.helpSupport')}</Text>
                  </View>
                  <Text style={styles.settingArrow}>›</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.settingItem, { backgroundColor: 'transparent' }]}
                  onPress={() => navigation.navigate('PrivacyPolicy', { initialTab: 'privacy' })}
                >
                  <View style={styles.settingLeft}>
                    <AppIcon name="lock" size={24} style={{ marginRight: 15 }} />
                    <Text style={[styles.settingLabel, { color: theme.text }]}>{t('profile.privacyPolicy')}</Text>
                  </View>
                  <Text style={styles.settingArrow}>›</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.settingItem, { backgroundColor: 'transparent' }]}
                  onPress={() => navigation.navigate('PrivacyPolicy', { initialTab: 'terms' })} 
                >
                  <View style={styles.settingLeft}>
                    <AppIcon name="document" size={24} style={{ marginRight: 15 }} />
                    <Text style={[styles.settingLabel, { color: theme.text }]}>{t('profile.termsOfService')}</Text>
                  </View>
                  <Text style={styles.settingArrow}>›</Text>
                </TouchableOpacity>
              </View>

              {/* App Info */}
              <View style={[styles.section, { paddingTop: 0 }]}>
                <TouchableOpacity style={[styles.settingItem, { backgroundColor: 'transparent' }]}>
                  <View style={styles.settingLeft}>
                    <AppIcon name="info" size={24} style={{ marginRight: 15 }} />
                    <Text style={[styles.settingLabel, { color: theme.text }]}>{t('profile.aboutVeetha')}</Text>
                  </View>
                  <Text style={styles.settingArrow}>›</Text>
                </TouchableOpacity>
                
                <View style={styles.versionInfo}>
                  <Text style={styles.versionText}>{t('profile.version')} {Constants.expoConfig.version}</Text>
                </View>
              </View>

              {/* Logout Button — hidden for guests */}
              {!isGuest && (
                <TouchableOpacity style={[styles.logoutButton, { backgroundColor: theme.cardBackground }]} onPress={handleLogout}>
                  <Text style={styles.logoutText}>{t('profile.logOut')}</Text>
                </TouchableOpacity>
              )}

              {/* Delete Account — hidden for guests */}
              {!isGuest && (
                <TouchableOpacity
                  style={[styles.deleteButton, { backgroundColor: theme.error || '#ff3b30' }]}
                  onPress={handleDeleteAccount}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                    <AppIcon name="trash" size={18} />
                    <Text style={[styles.deleteButtonText, { marginLeft: 8 }]}>Delete Account</Text>
                  </View>
                </TouchableOpacity>
              )}

              {/* Guest upgrade banner */}
              {isGuest && (
                <View style={[styles.guestBanner, { backgroundColor: theme.cardBackground }]}>
                  <Text style={[styles.guestBannerText, { color: theme.text }]}>
                    {t('guest.profileBanner')}
                  </Text>
                  <TouchableOpacity
                    style={styles.guestBannerButton}
                    onPress={() => {
                      navigation.reset({
                        index: 0,
                        routes: [{ name: 'Landing' }],
                      });
                    }}
                  >
                    <Text style={styles.guestBannerButtonText}>{t('guest.signUpLogIn')}</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Bottom Padding */}
              <View style={{ height: 100 }} />
            </ScrollView>
            <AppTutorial
              screen="Profile"
              scrollViewRef={scrollViewRef}
              onVisible={() => setCheckingTutorial(false)}
              onProfileRefresh={refreshProfile}
              tutorialRefs={{
                statsGrid: statsGridRef,
                editButton: editButtonRef,
                goalsButton: goalsButtonRef,
                dietaryButton: dietaryButtonRef,
                displaySettingsButton: displaySettingsButtonRef,
              }}
            />
          </AnimatedThemeWrapper>

          {/* Guest Upsell Sheet */}
          <GuestUpsellSheet
            visible={guestSheetVisible}
            onClose={() => setGuestSheetVisible(false)}
            message={t('guest.signUpProfilePhoto')}
          />

          {/* Logout Confirmation */}
          <VeethaModal
            visible={logoutModalVisible}
            title={t('profile.logOut')}
            message={t('profile.logOutConfirm')}
            confirmText={t('profile.logOut')}
            cancelText={t('profile.cancel')}
            confirmStyle="destructive"
            onConfirm={confirmLogout}
            onCancel={() => setLogoutModalVisible(false)}
          />

          {/* Delete Account - Step 1 */}
          <VeethaModal
            visible={deleteModalStep === 1}
            title={t('profile.deleteAccount')}
            message={t('profile.deleteWarning')}
            confirmText={t('common.delete')}
            cancelText={t('common.cancel')}
            confirmStyle="destructive"
            onConfirm={() => setDeleteModalStep(2)}
            onCancel={() => setDeleteModalStep(0)}
          />

          {/* Delete Account - Step 2 (Final) */}
          <VeethaModal
            visible={deleteModalStep === 2}
            title={t('profile.finalConfirmation')}
            message={t('profile.deleteConfirmMessage')}
            confirmText={t('profile.yesDeleteEverything')}
            cancelText={t('common.cancel')}
            confirmStyle="destructive"
            onConfirm={() => setDeleteModalStep(3)}
            onCancel={() => setDeleteModalStep(0)}
          />

          {/* Delete Account - Step 3 (Exit Survey) */}
          <ExitSurveyModal
            visible={deleteModalStep === 3}
            theme={theme}
            onSubmit={handleExitSurveySubmit}
            onSkip={confirmDeleteAccountFinal}
          />

          {/* Photo Picker Modal */}
          <VeethaModal
            visible={photoPickerVisible}
            title={t('profile.profilePhoto') || 'Profile Photo'}
            onCancel={() => setPhotoPickerVisible(false)}
            buttons={[
              { text: t('profile.takePhoto') || 'Take Photo', onPress: () => { setPhotoPickerVisible(false); handleTakePhoto(); } },
              { text: (Platform.OS === 'ios' ? t('profile.fromPhotos') : t('profile.gallery')) || 'Choose from Library', onPress: () => { setPhotoPickerVisible(false); handleChooseFromLibrary(); } },
              { text: t('common.cancel') || 'Cancel', style: 'cancel', onPress: () => setPhotoPickerVisible(false) },
            ]}
          />

          {/* Bottom Navigation */}
          <BottomNav
            theme={theme}
            t={t}
            navigation={navigation}
            activeScreen="Profile"
          />

          {/* Freeze overlay during tutorial check */}
          {checkingTutorial && (
            <View style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0,0,0,0.5)',
              justifyContent: 'center',
              alignItems: 'center',
              zIndex: 9999,
            }}>
              <ActivityIndicator size="large" color={theme.primary} />
            </View>
          )}
        </SafeAreaView>
      </GestureDetector>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    backgroundColor: '#fff',
    alignItems: 'center',
    padding: 30,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  avatarText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  editButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  editButtonText: {
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: '600',
  },
  section: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  statLabel: {
    fontSize: 14,
  },
  // "Your Stats" styled like a torn notebook sheet, matching the Weekly
  // Summary card on the Stats screen (minus its punched holes / red margin
  // rule, which are Stats-only): no background fill, pale blue ruled lines
  // under each row instead of a card boundary.
  notebookCard: {
    marginHorizontal: 20,
    marginBottom: 15,
    paddingVertical: 18,
    paddingHorizontal: 16,
    backgroundColor: 'transparent',
    position: 'relative',
    borderWidth: 1.5,
    borderColor: 'rgba(150, 120, 80, 0.4)',
  },
  notebookTitle: {
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
  },
  notebookRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 11,
    borderBottomWidth: 1,
  },
  notebookRowLast: {
    borderBottomWidth: 0,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginBottom: 0,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIcon: {
    fontSize: 24,
    marginRight: 15,
  },
  settingLabel: {
    fontSize: 16,
    color: '#333',
  },
  settingArrow: {
    fontSize: 24,
    color: '#ccc',
  },
  versionInfo: {
    alignItems: 'center',
    marginTop: 10,
  },
  versionText: {
    fontSize: 12,
    color: '#999',
  },
  logoutButton: {
    marginHorizontal: 20,
    backgroundColor: '#fff',
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ff5252',
  },
  logoutText: {
    color: '#ff5252',
    fontSize: 16,
    fontWeight: '600',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginBottom: 0,
  },
  menuIcon: {
    fontSize: 24,
    marginRight: 15,
    width: 32,
    textAlign: 'center',
  },
  menuContent: {
    flex: 1,
  },
  menuLabel: {
    fontSize: 16,
    fontWeight: 'normal',
    marginBottom: 2,
  },
  menuDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
  menuArrow: {
    fontSize: 24,
    fontWeight: 'normal',
    marginLeft: 10,
  },
  deleteButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 20,
    marginTop: 20,
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  guestBanner: {
    marginHorizontal: 20,
    marginTop: 20,
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  guestBannerText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 15,
  },
  guestBannerButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
  },
  guestBannerButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  avatarCameraIcon: {
    fontSize: 16,
    position: 'absolute',
    bottom: 8,
  },
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    position: 'absolute',
    top: 0,
    left: 0,
  },
});