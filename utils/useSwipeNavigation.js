import { Gesture } from 'react-native-gesture-handler';
//import { runOnJS } from 'react-native-reanimated'; 

/**
 * Custom hook for swipe navigation between screens
 * @param {Object} navigation - React Navigation object
 * @param {string} currentScreen - Current screen name
 * @param {boolean} enabled - Whether swipe is enabled (default: true)
 */
export const useSwipeNavigation = (navigation, currentScreen, enabled = true) => {
  // Define screen order
  const screenOrder = ['Home', 'Scanner', 'Stats', 'Profile'];
  const currentIndex = screenOrder.indexOf(currentScreen);

  const swipe = Gesture.Pan()
    .enabled(enabled)
    .activeOffsetX([-20, 20]) // Only activate on horizontal movement (±20px)
    .failOffsetY([-10, 10]) // Fail (allow ScrollView) on vertical movement (±10px)
    .onEnd((e) => {
      const threshold = 100; // Minimum swipe distance
      const velocityThreshold = 500; // Minimum swipe speed

      // Right swipe (go to previous/left screen)
      if ((e.translationX > threshold || e.velocityX > velocityThreshold) && currentIndex > 0) {
        const previousScreen = screenOrder[currentIndex - 1];
        navigation.navigate(previousScreen, { animationDirection: 'left' });
      }
      // Left swipe (go to next/right screen)
      else if ((e.translationX < -threshold || e.velocityX < -velocityThreshold) && currentIndex < screenOrder.length - 1) {
        const nextScreen = screenOrder[currentIndex + 1];
        navigation.navigate(nextScreen, { animationDirection: 'right' });
      }
    });

  return swipe;
};