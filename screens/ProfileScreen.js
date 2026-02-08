import React, { useState, useRef, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Switch, Alert, Linking, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../utils/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSwipeNavigation } from '../utils/useSwipeNavigation';
import { useTheme } from '../utils/ThemeContext';
import { useLanguage } from '../utils/LanguageContext';
import { useUser } from '../utils/UserContext';
import { RefreshControl } from 'react-native';
import { logScreen, logEvent, logMealLogged } from '../utils/analytics';
import AnimatedThemeWrapper from '../components/AnimatedThemeWrapper';
import Constants from 'expo-constants';
import BottomNav from '../components/BottomNav';
import { useTutorial } from '../utils/TutorialContext';
import AppTutorial from '../components/AppTutorial';

export default function ProfileScreen({ navigation }) {

  const { theme, isDark, toggleTheme } = useTheme();
  const { t } = useLanguage();
  const [refreshing, setRefreshing] = useState(false);
  const [checkingTutorial, setCheckingTutorial] = useState(true);
  const { profile, loading, refreshProfile, refreshMeals } = useUser();
  const { startTutorial } = useTutorial();

  // Swipe navigation
  const swipeGesture = useSwipeNavigation(navigation, 'Profile');

  const scrollViewRef = useRef(null);
  const statsGridRef = useRef(null);
  const editButtonRef = useRef(null);
  const goalsButtonRef = useRef(null);
  const dietaryButtonRef = useRef(null);
  const displaySettingsButtonRef = useRef(null);
  
  console.log('📱 ProfileScreen: profile =', profile);
  console.log('📱 ProfileScreen: loading =', loading);

  const userName = profile?.full_name || profile?.email?.split('@')[0] || "User";
  const userEmail = profile?.email || "user@example.com";

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshProfile();
    await refreshMeals();
    setRefreshing(false);
  };

  useEffect(() => {
    logScreen('Profile');
  }, []);

  // Start Profile tutorial on first visit
  useEffect(() => {
    const checkProfileTutorial = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setCheckingTutorial(false);
          return;
        }

        const { data: profileData } = await supabase
          .from('profiles')
          .select('profile_tutorial_completed')
          .eq('id', user.id)
          .single();

        // If tutorial already completed, unfreeze immediately
        if (profileData?.profile_tutorial_completed) {
          console.log('✅ Profile tutorial already completed - unfreezing');
          setCheckingTutorial(false);
          return;
        }

        // Tutorial needs to start - unfreeze and start
        console.log('🎓 Starting Profile tutorial');
        setCheckingTutorial(false); // Unfreeze before tutorial
        
        setTimeout(() => {
          if (statsGridRef.current && editButtonRef.current) {
            startTutorial('Profile');
          } else {
            console.log('⏳ Refs not ready, trying again...');
            setTimeout(() => startTutorial('Profile'), 2000);
          }
        }, 500);
        
      } catch (error) {
        console.error('Error checking profile tutorial:', error);
        setCheckingTutorial(false); // Unfreeze on error
      }
    };

    checkProfileTutorial();
  }, []);

  const userStats = React.useMemo(() => ({
    age: profile?.age || 0,
    gender: profile?.gender || 'Not set',
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
    Alert.alert(t('profile.learnMore'), 'Educational content coming soon!');
  };

  const handleSupport = () => {
    // TODO: Navigate to support/help
    Alert.alert(t('profile.helpSupport'), t('profile.contactSupport'));
  };

  const handleLogout = () => {
    Alert.alert(
      t('profile.logOut'),
      t('profile.logOutConfirm'),
      [
        { text: t('profile.cancel'), style: 'cancel' },
        { 
          text: t('profile.logOut'),
          style: 'destructive',
          onPress: async () => {  // ← Made async
            try {
              console.log('🚪 Logging out...');
              
              // Clear greeting timestamp so next login shows greeting
              await AsyncStorage.removeItem('last_app_open');
              
              // Sign out from Supabase
              await supabase.auth.signOut();
              
              console.log('✅ Logout successful');
              
              // Navigate to landing screen
              navigation.reset({
                index: 0,
                routes: [{ name: 'Landing' }],
              });
            } catch (error) {
              console.error('❌ Error logging out:', error);
              Alert.alert('Error', 'Failed to log out. Please try again.');
            }
          }
        },
      ]
    );
  };

  const handleDeleteAccount = async () => {
    Alert.alert(
      t('profile.deleteAccount'),
      t('profile.deleteWarning'),
      [
        {
          text: t('common.cancel'),
          style: 'cancel'
        },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            Alert.alert(
              t('profile.finalConfirmation'),
              t('profile.deleteConfirmMessage'),
              [
                {
                  text: t('common.cancel'),
                  style: 'cancel'
                },
                {
                  text: t('profile.yesDeleteEverything'),
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      const { data: { session } } = await supabase.auth.getSession();
                      if (!session) return;

                      const { data, error } = await supabase.functions.invoke('delete-user', {
                        headers: {
                          Authorization: `Bearer ${session.access_token}`
                        }
                      });

                      if (error) throw error;

                      await supabase.auth.signOut();

                      Alert.alert(
                        t('profile.accountDeleted'),
                        t('profile.accountDeletedMessage'),
                        [
                          {
                            text: t('common.ok'),
                            onPress: () => {
                              navigation.reset({
                                index: 0,
                                routes: [{ name: 'Landing' }],
                              });
                            }
                          }
                        ]
                      );
                    } catch (error) {
                      console.error('Error deleting account:', error);
                      Alert.alert(
                        t('common.error'),
                        `${t('profile.deleteError')}: ${error.message}`
                      );
                    }
                  }
                }
              ]
            );
          }
        }
      ]
    );
  };

  const handleToggleDarkMode = () => {
    toggleTheme();
  };

  console.log('📱 ProfileScreen: Rendering with userStats =', userStats);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <GestureDetector gesture={swipeGesture}>
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top', 'bottom']}>
          <AnimatedThemeWrapper>
            <ScrollView
              ref={scrollViewRef}
              style={styles.scrollView} 
              showsVerticalScrollIndicator={false}
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
                <View style={styles.avatarContainer}>
                  <Text style={styles.avatarText}>
                    {userName.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <Text style={[styles.userName, { color: theme.text }]}>{userName}</Text>
                <Text style={[styles.userEmail, { color: theme.textSecondary }]}>{userEmail}</Text>
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

              {/* Stats Summary */}
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>{t('profile.yourStats')}</Text>
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
                  style={styles.statsGrid}
                >
                  <View style={[styles.statCard, { backgroundColor: theme.cardBackground }]}>
                    <Text style={[styles.statValue, { color: theme.primary }]}>{userStats.height}</Text>
                    <Text style={[styles.statLabel, { color: theme.textSecondary }]}>{t('profile.height')}</Text>
                  </View>
                  <View style={[styles.statCard, { backgroundColor: theme.cardBackground }]}>
                    <Text style={[styles.statValue, { color: theme.primary }]}>{userStats.weight}</Text>
                    <Text style={[styles.statLabel, { color: theme.textSecondary }]}>{t('profile.weight')}</Text>
                  </View>
                  <View style={[styles.statCard, { backgroundColor: theme.cardBackground }]}>
                    <Text style={[styles.statValue, { color: theme.primary }]}>{userStats.age}</Text>
                    <Text style={[styles.statLabel, { color: theme.textSecondary }]}>{t('profile.age')}</Text>
                  </View>
                  <View style={[styles.statCard, { backgroundColor: theme.cardBackground }]}>
                    <Text style={[styles.statValue, { color: theme.primary }]}>
                      {userStats.goal === 'lose' ? t('profile.goalLose') : 
                      userStats.goal === 'gain' ? t('profile.goalGain') : 
                      userStats.goal === 'maintain' ? t('profile.goalMaintain') : 
                      'Not set'}
                    </Text>
                    <Text style={[styles.statLabel, { color: theme.textSecondary }]}>{t('profile.goal')}</Text>
                  </View>
                </View>
              </View>

              {/* Settings Section */}
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}> {t('profile.settings')}</Text>
                
                <View style={[styles.settingItem, { backgroundColor: theme.cardBackground }]}>
                  <View style={styles.settingLeft}>
                    <Text style={styles.settingIcon}>🌙</Text>
                    <Text style={[styles.settingLabel, { color: theme.text }]}>{t('profile.darkMode')}</Text>
                  </View>
                  <Switch
                    value={isDark}
                    onValueChange={handleToggleDarkMode}
                    trackColor={{ false: '#ddd', true: '#81c784' }}
                    thumbColor={isDark ? '#4CAF50' : '#f4f3f4'}
                  />
                </View>

                <TouchableOpacity style={[styles.settingItem, { backgroundColor: theme.cardBackground }]}>
                  <View style={styles.settingLeft}>
                    <Text style={styles.settingIcon}>🔔</Text>
                    <Text style={[styles.settingLabel, { color: theme.text }]}>{t('profile.notifications')}</Text>
                  </View>
                  <Text style={styles.settingArrow}>›</Text>
                </TouchableOpacity>

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
                  style={[styles.settingItem, { backgroundColor: theme.cardBackground }]}
                  onPress={() => navigation.navigate('GoalsPreferences')}
                >
                  <View style={styles.settingLeft}>
                    <Text style={styles.settingIcon}>🎯</Text>
                    <Text style={[styles.settingLabel, { color: theme.text }]}>{t('profile.goalsPreferences')}</Text>
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
                  style={[styles.settingItem, { backgroundColor: theme.cardBackground }]}
                  onPress={() => navigation.navigate('DietaryRestrictions')}
                >
                  <View style={styles.settingLeft}>
                    <Text style={styles.settingIcon}>🍽️</Text>
                    <Text style={[styles.settingLabel, { color: theme.text }]}>{t('profile.dietaryRestrictions')}</Text>
                  </View>
                  <Text style={styles.settingArrow}>›</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  ref={displaySettingsButtonRef}
                  onLayout={(event) => {
                    try {
                      const { x, y, width, height } = event.nativeEvent.layout;
                      if (displaySettingsButtonRef?.current?.measureInWindow) {
                        displaySettingsButtonRef.current.measureInWindow((wx, wy, w, h) => {
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
                  style={[styles.menuItem, { backgroundColor: theme.cardBackground }]}
                  onPress={() => navigation.navigate('DisplaySettings')}
                >
                  <Text style={styles.menuIcon}>🎨</Text>
                  <View style={styles.menuContent}>
                    <Text style={[styles.menuLabel, { color: theme.text }]}>{t('profile.displaySettingsButton')}</Text>
                    <Text style={[styles.menuDescription, { color: theme.textSecondary }]}>
                      {t('profile.displaySettingsDesc')}
                    </Text>
                  </View>
                  <Text style={[styles.menuArrow, { color: theme.textTertiary }]}>›</Text>
              </TouchableOpacity>
              </View>

              {/* Resources Section */}
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>{t('profile.resources')}</Text>
                
                <TouchableOpacity style={[styles.settingItem, { backgroundColor: theme.cardBackground, display: 'none' }]} onPress={handleLearnMore}>
                  <View style={styles.settingLeft}>
                    <Text style={styles.settingIcon}>📚</Text>
                    <Text style={[styles.settingLabel, { color: theme.text }]}>{t('profile.learnMore')}</Text>
                  </View>
                  <Text style={styles.settingArrow}>›</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.settingItem, { backgroundColor: theme.cardBackground }]} onPress={handleSupport}>
                  <View style={styles.settingLeft}>
                    <Text style={styles.settingIcon}>💬</Text>
                    <Text style={[styles.settingLabel, { color: theme.text }]}>{t('profile.helpSupport')}</Text>
                  </View>
                  <Text style={styles.settingArrow}>›</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.settingItem, { backgroundColor: theme.cardBackground }]}
                  onPress={() => navigation.navigate('PrivacyPolicy', { initialTab: 'privacy' })}
                >
                  <View style={styles.settingLeft}>
                    <Text style={styles.settingIcon}>🔒</Text>
                    <Text style={[styles.settingLabel, { color: theme.text }]}>{t('profile.privacyPolicy')}</Text>
                  </View>
                  <Text style={styles.settingArrow}>›</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.settingItem, { backgroundColor: theme.cardBackground }]}
                  onPress={() => navigation.navigate('PrivacyPolicy', { initialTab: 'terms' })} 
                >
                  <View style={styles.settingLeft}>
                    <Text style={styles.settingIcon}>📄</Text>
                    <Text style={[styles.settingLabel, { color: theme.text }]}>{t('profile.termsOfService')}</Text>
                  </View>
                  <Text style={styles.settingArrow}>›</Text>
                </TouchableOpacity>
              </View>

              {/* App Info */}
              <View style={styles.section}>
                <TouchableOpacity style={[styles.settingItem, { backgroundColor: theme.cardBackground }]}>
                  <View style={styles.settingLeft}>
                    <Text style={styles.settingIcon}>ℹ️</Text>
                    <Text style={[styles.settingLabel, { color: theme.text }]}>{t('profile.aboutVeetha')}</Text>
                  </View>
                  <Text style={styles.settingArrow}>›</Text>
                </TouchableOpacity>
                
                <View style={styles.versionInfo}>
                  <Text style={styles.versionText}>{t('profile.version')} {Constants.expoConfig.version}</Text>
                </View>
              </View>

              {/* Logout Button */}
              <TouchableOpacity style={[styles.logoutButton, { backgroundColor: theme.cardBackground }]} onPress={handleLogout}>
                <Text style={styles.logoutText}>{t('profile.logOut')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.deleteButton, { backgroundColor: theme.error || '#ff3b30' }]}
                onPress={handleDeleteAccount}
              >
                <Text style={styles.deleteButtonText}>🗑️ Delete Account</Text>
              </TouchableOpacity>

              {/* Bottom Padding */}
              <View style={{ height: 100 }} />
            </ScrollView>
            <AppTutorial 
              screen="Profile"
              scrollViewRef={scrollViewRef}
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
  userEmail: {
    fontSize: 14,
    color: '#999',
    marginBottom: 15,
  },
  editButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  editButtonText: {
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: '600',
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statCard: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 12,
    color: '#999',
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 10,
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
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
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
    fontWeight: '600',
    marginBottom: 2,
  },
  menuDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
  menuArrow: {
    fontSize: 24,
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
});