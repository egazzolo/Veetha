import { Alert } from 'react-native';

/**
 * Block an action if user is a guest. Shows signup prompt.
 * @param {boolean} isGuest - whether user is in guest mode
 * @param {object} navigation - React Navigation object
 * @param {function} action - the action to run if not guest
 * @returns {boolean} true if blocked, false if allowed
 */
export const blockIfGuest = (isGuest, navigation, action, t) => {
  if (isGuest) {
    Alert.alert(
      t ? t('guest.createAccount') : 'Create an Account',
      t ? t('guest.signUpToLog') : 'Sign up to log meals, water, exercise, and more.',
      [
        { text: t ? t('common.cancel') : 'Cancel', style: 'cancel' },
        {
          text: t ? t('guest.signUp') : 'Sign Up',
          onPress: () => navigation.navigate('SignUp'),
        },
      ]
    );
    return true;
  }
  action();
  return false;
};
