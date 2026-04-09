/**
 * Block an action if user is a guest. Calls onBlock so the caller can show GuestUpsellSheet.
 * @param {boolean} isGuest - whether user is in guest mode
 * @param {function} action - the action to run if not guest
 * @param {function} onBlock - callback when blocked (caller shows GuestUpsellSheet)
 * @returns {boolean} true if blocked, false if allowed
 */
export const blockIfGuest = (isGuest, navigation, action, t, onBlock) => {
  if (isGuest) {
    if (onBlock) {
      onBlock();
    }
    return true;
  }
  action();
  return false;
};
