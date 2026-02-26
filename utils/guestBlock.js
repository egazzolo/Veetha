import { Alert } from 'react-native';

/**
 * Block an action if user is a guest. Shows signup prompt.
 * @param {boolean} isGuest - whether user is in guest mode
 * @param {object} navigation - React Navigation object
 * @param {function} action - the action to run if not guest
 * @returns {boolean} true if blocked, false if allowed
 */
export const blockIfGuest = (isGuest, navigation, action) => {
  if (isGuest) {
    Alert.alert(
      'Create an Account',
      'Sign up to log meals, water, exercise, and more.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Up',
          onPress: () => navigation.navigate('SignUp'),
        },
      ]
    );
    return true;
  }
  action();
  return false;
};
