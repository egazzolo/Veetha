import React from 'react'; // X:
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AppIcon from './AppIcon';

export default function BottomNav({
  theme,
  t,
  navigation,
  activeScreen = 'Home',
  scannerButtonRef,
  statsButtonRef,
  profileButtonRef
}) {
  // Explicit inset instead of relying on each screen's ambient SafeAreaView
  // padding to push an absolutely-positioned child above the system nav bar
  // -- that worked on Home but not on Stats/Profile, so this makes the bar
  // responsible for its own safe-area clearance everywhere it's used.
  const insets = useSafeAreaInsets();
  // Screen order for directional navigation
  const screenOrder = ['Home', 'Scanner', 'Stats', 'Profile'];
  
  // Helper to navigate with correct animation direction
  const navigateToScreen = (targetScreen) => {
    const currentIndex = screenOrder.indexOf(activeScreen);
    const targetIndex = screenOrder.indexOf(targetScreen);
    
    if (currentIndex === targetIndex) return; // Already on this screen
    
    const animationDirection = targetIndex > currentIndex ? 'right' : 'left';
    navigation.navigate(targetScreen, { animationDirection });
  };
  
  return (
    <View style={[
      styles.bottomNav,
      {
        // ~10% opacity -- just enough of a backdrop to be felt, not seen.
        // theme.background is always a plain 6-digit hex, so an alpha
        // suffix is safe to append directly.
        backgroundColor: `${theme.background}80`,
        shadowOpacity: 0,
        shadowRadius: 0,
        shadowOffset: { width: 0, height: 0 },
        elevation: 0,
        borderTopWidth: 0,
        paddingBottom: Math.max(insets.bottom, 0),
      }
    ]}>
      {/* Home */}
      <TouchableOpacity 
        style={styles.navItem}
        onPress={() => navigateToScreen('Home')}
      >
        <AppIcon
          name="home"
          size={28}
          tintColor={activeScreen === 'Home' ? theme.primary : theme.textSecondary}
          style={styles.navIcon}
        />
        <Text style={[
          styles.navLabel,
          activeScreen === 'Home' && styles.navLabelActive,
          { color: activeScreen === 'Home' ? theme.primary : theme.textSecondary }
        ]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
          {t('nav.home')}
        </Text>
        {activeScreen === 'Home' && (
          <View style={[styles.activeIndicator, { backgroundColor: theme.primary }]} />
        )}
      </TouchableOpacity>

      {/* Scanner (Center Button) */}
      <TouchableOpacity 
        style={styles.navItem}
        onPress={() => navigateToScreen('Scanner')}
      >
        <View 
          ref={scannerButtonRef}
          onLayout={(event) => {
            const { x, y, width, height } = event.nativeEvent.layout;
            if (scannerButtonRef?.current?.measureInWindow) {  // ← ADD ?. here
              scannerButtonRef.current.measureInWindow((wx, wy, w, h) => {
                if (scannerButtonRef.current) {  // ← ADD this check
                  scannerButtonRef.current.tutorialCoords = {
                    top: wy,
                    left: wx,
                    width: w,
                    height: h,
                    borderRadius: 28
                  };
                }
              });
            }
          }}
          style={[styles.scanButton, { backgroundColor: theme.primary }]}
        >
          <AppIcon
            name="scanner"
            size={42}
            tintColor="#fff"
          />
        </View>
      </TouchableOpacity>

      {/* Stats */}
      <TouchableOpacity
        ref={statsButtonRef}
        onLayout={(event) => {
          const { x, y, width, height } = event.nativeEvent.layout;
          if (statsButtonRef?.current?.measureInWindow) {
            statsButtonRef.current.measureInWindow((wx, wy, w, h) => {
              if (statsButtonRef.current) {
                statsButtonRef.current.tutorialCoords = {
                  top: wy,
                  left: wx,
                  width: w,
                  height: h,
                  borderRadius: 8
                };
              }
            });
          }
        }}
        style={styles.navItem}
        onPress={() => navigateToScreen('Stats')}
      >
        <AppIcon
          name="stats"
          size={28}
          tintColor={activeScreen === 'Stats' ? theme.primary : theme.textSecondary}
          style={styles.navIcon}
        />
        <Text style={[
          styles.navLabel,
          activeScreen === 'Stats' && styles.navLabelActive,
          { color: activeScreen === 'Stats' ? theme.primary : theme.textSecondary }
        ]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
          {t('nav.stats')}
        </Text>
        {activeScreen === 'Stats' && (
          <View style={[styles.activeIndicator, { backgroundColor: theme.primary }]} />
        )}
      </TouchableOpacity>

      {/* Profile */}
      <TouchableOpacity 
        ref={profileButtonRef}
        onLayout={(event) => {
          const { x, y, width, height } = event.nativeEvent.layout;
          if (profileButtonRef?.current?.measureInWindow) {  // ← ADD ?. here
            profileButtonRef.current.measureInWindow((wx, wy, w, h) => {
              if (profileButtonRef.current) {  // ← ADD this check
                profileButtonRef.current.tutorialCoords = {
                  top: wy,
                  left: wx,
                  width: w,
                  height: h,
                  borderRadius: 8
                };
              }
            });
          }
        }}
        style={styles.navItem}
        onPress={() => navigateToScreen('Profile')}
      >
        <AppIcon
          name="profile"
          size={28}
          tintColor={activeScreen === 'Profile' ? theme.primary : theme.textSecondary}
          style={styles.navIcon}
        />
        <Text style={[
          styles.navLabel,
          activeScreen === 'Profile' && styles.navLabelActive,
          { color: activeScreen === 'Profile' ? theme.primary : theme.textSecondary }
        ]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
          {t('nav.profile')}
        </Text>
        {activeScreen === 'Profile' && (
          <View style={[styles.activeIndicator, { backgroundColor: theme.primary }]} />
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  bottomNav: {
    // Floats over the scrollable content instead of sitting in normal flow
    // below it -- translucency is invisible when there's nothing behind the
    // bar to show through.
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 8,
    paddingBottom: 20,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    paddingVertical: 8,
  },
  navIcon: {
    fontSize: 24,
    marginBottom: 4,
    opacity: 0.6,
  },
  navIconActive: {
    opacity: 1,
  },
  navLabel: {
    fontSize: 11,
  },
  navLabelActive: {
    fontWeight: '600',
  },
  activeIndicator: {
    position: 'absolute',
    bottom: 0,
    width: 40,
    height: 3,
    borderRadius: 2,
  },
  scanButton: {
    width: 66,
    height: 66,
    borderRadius: 33,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: -20,
  },
  scanIcon: {
    fontSize: 28,
  },
});