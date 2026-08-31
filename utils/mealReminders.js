import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';

const PREF_KEYS = {
  breakfast: 'notify_breakfast',
  lunch: 'notify_lunch',
  dinner: 'notify_dinner',
};

const MEALS = [
  { key: 'breakfast', hour: 8, minute: 0, titleKey: 'mealReminders.breakfastTitle', bodyKey: 'mealReminders.breakfastBody' },
  { key: 'lunch', hour: 13, minute: 0, titleKey: 'mealReminders.lunchTitle', bodyKey: 'mealReminders.lunchBody' },
  { key: 'dinner', hour: 19, minute: 0, titleKey: 'mealReminders.dinnerTitle', bodyKey: 'mealReminders.dinnerBody' },
];

// Absent key defaults to enabled -- matches the previous always-on behavior
// for existing users who never touched a preference that didn't exist yet.
export async function getMealReminderPrefs() {
  const entries = await Promise.all(
    Object.entries(PREF_KEYS).map(async ([meal, storageKey]) => {
      const val = await AsyncStorage.getItem(storageKey);
      return [meal, val !== 'false'];
    })
  );
  return Object.fromEntries(entries);
}

export async function setMealReminderPref(meal, enabled) {
  await AsyncStorage.setItem(PREF_KEYS[meal], String(enabled));
}

// Cancels every scheduled notification and re-schedules only the meals whose
// preference is enabled. Called on Home's initial permission grant, and
// again from Preferences whenever a toggle changes, so a change takes
// effect immediately instead of waiting for the next app open.
export async function rescheduleMealReminders(t) {
  const { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') return;

  await Notifications.cancelAllScheduledNotificationsAsync();

  const prefs = await getMealReminderPrefs();
  for (const meal of MEALS) {
    if (!prefs[meal.key]) continue;
    await Notifications.scheduleNotificationAsync({
      content: {
        title: t(meal.titleKey),
        body: t(meal.bodyKey),
      },
      trigger: {
        type: 'daily',
        hour: meal.hour,
        minute: meal.minute,
        repeats: true,
      },
    });
  }
}
