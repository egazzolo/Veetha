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
      const threshold = 100;
      const velocityThreshold = 500;

      const isRightSwipe = (e.translationX > threshold || e.velocityX > velocityThreshold);
      const isLeftSwipe  = (e.translationX < -threshold || e.velocityX < -velocityThreshold);

      // Right swipe = go to previous screen (wrap to last)
      if (isRightSwipe) {
        const previousIndex = (currentIndex - 1 + screenOrder.length) % screenOrder.length;
        const previousScreen = screenOrder[previousIndex];
        navigation.navigate(previousScreen, { animationDirection: 'left' });
      }

      // Left swipe = go to next screen (wrap to first)
      else if (isLeftSwipe) {
        const nextIndex = (currentIndex + 1) % screenOrder.length;
        const nextScreen = screenOrder[nextIndex];
        navigation.navigate(nextScreen, { animationDirection: 'right' });
      }
    });

  return swipe;
};