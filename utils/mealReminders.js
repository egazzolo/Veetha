import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';

const PREF_KEYS = {
  breakfast: 'notify_breakfast',
  lunch: 'notify_lunch',
  dinner: 'notify_dinner',
};

const TIME_KEYS = {
  breakfast: 'notify_breakfast_time',
  lunch: 'notify_lunch_time',
  dinner: 'notify_dinner_time',
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

// Absent key falls back to that meal's built-in default hour/minute above --
// same "never touched it yet" convention as getMealReminderPrefs.
export async function getMealReminderTimes() {
  const entries = await Promise.all(
    MEALS.map(async (meal) => {
      const stored = await AsyncStorage.getItem(TIME_KEYS[meal.key]);
      if (stored) {
        const [hour, minute] = stored.split(':').map(Number);
        return [meal.key, { hour, minute }];
      }
      return [meal.key, { hour: meal.hour, minute: meal.minute }];
    })
  );
  return Object.fromEntries(entries);
}

export async function setMealReminderTime(meal, hour, minute) {
  const padded = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  await AsyncStorage.setItem(TIME_KEYS[meal], padded);
}

// Cancels every scheduled notification and re-schedules only the meals whose
// preference is enabled. Called on Home's initial permission grant, and
// again from Preferences whenever a toggle or time changes, so a change
// takes effect immediately instead of waiting for the next app open.
//
// Custom times are a premium perk -- a free user (or one who set a custom
// time and then had their subscription lapse) always gets the built-in
// default hour/minute, even if a customized time is still sitting in
// AsyncStorage from an earlier premium period.
export async function rescheduleMealReminders(t, isPremium = false) {
  const { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') return;

  await Notifications.cancelAllScheduledNotificationsAsync();

  const prefs = await getMealReminderPrefs();
  const times = isPremium ? await getMealReminderTimes() : null;
  for (const meal of MEALS) {
    if (!prefs[meal.key]) continue;
    const { hour, minute } = times ? times[meal.key] : { hour: meal.hour, minute: meal.minute };
    await Notifications.scheduleNotificationAsync({
      content: {
        title: t(meal.titleKey),
        body: t(meal.bodyKey),
      },
      trigger: {
        type: 'daily',
        hour,
        minute,
        repeats: true,
      },
    });
  }
}
