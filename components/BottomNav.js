import React from 'react'; // X:
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

export default function BottomNav({ 
  theme, 
  t, 
  navigation, 
  activeScreen = 'Home', 
  scannerButtonRef, 
  profileButtonRef 
}) {
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
        backgroundColor: theme.background,
        shadowOpacity: 0,
        shadowRadius: 0,
        shadowOffset: { width: 0, height: 0 },
        elevation: 0,
        borderTopWidth: 0,
      }
    ]}>
      {/* Home */}
      <TouchableOpacity 
        style={styles.navItem}
        onPress={() => navigateToScreen('Home')}
      >
        <Text style={[styles.navIcon, activeScreen === 'Home' && styles.navIconActive]}>🏠</Text>
        <Text style={[
          styles.navLabel, 
          activeScreen === 'Home' && styles.navLabelActive, 
          { color: activeScreen === 'Home' ? theme.primary : theme.textSecondary }
        ]}>
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
          <Text style={styles.scanIcon}>📸</Text>
        </View>
      </TouchableOpacity>

      {/* Stats */}
      <TouchableOpacity 
        style={styles.navItem}
        onPress={() => navigateToScreen('Stats')}
      >
        <Text style={[styles.navIcon, activeScreen === 'Stats' && styles.navIconActive]}>📊</Text>
        <Text style={[
          styles.navLabel, 
          activeScreen === 'Stats' && styles.navLabelActive,
          { color: activeScreen === 'Stats' ? theme.primary : theme.textSecondary }
        ]}>
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
        <Text style={[styles.navIcon, activeScreen === 'Profile' && styles.navIconActive]}>👤</Text>
        <Text style={[
          styles.navLabel,
          activeScreen === 'Profile' && styles.navLabelActive,
          { color: activeScreen === 'Profile' ? theme.primary : theme.textSecondary }
        ]}>
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
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: -20,
  },
  scanIcon: {
    fontSize: 28,
  },
});