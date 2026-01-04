// Firebase Analytics disabled for Expo Go testing
// TODO: Re-enable when building with EAS

export const logScreen = async (screenName) => {
  console.log('📊 Analytics (DISABLED): Screen view -', screenName);
};

export const logEvent = async (eventName, params = {}) => {
  console.log('📊 Analytics (DISABLED): Event -', eventName, params);
};

export const logMealLogged = async (mealData) => {
  console.log('📊 Analytics (DISABLED): Meal logged -', mealData);
};

export const setUserProperties = async (userId, properties = {}) => {
  console.log('📊 Analytics (DISABLED): User properties set -', userId, properties);
};