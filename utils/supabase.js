import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bfgreozkoftncayzyzhz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJmZ3Jlb3prb2Z0bmNheXp5emh6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA4MDA3NTksImV4cCI6MjA3NjM3Njc1OX0.dZKhStPxQVKrfLhg1ZnL1OW43YFF4SLkhEhhRr_NipM';

const SecureStoreAdapter = {
  getItem: async (key) => {
    return await SecureStore.getItemAsync(key);
  },
  setItem: async (key, value) => {
    await SecureStore.setItemAsync(key, value);
  },
  removeItem: async (key) => {
    await SecureStore.deleteItemAsync(key);
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: SecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
// Extract access_token & refresh_token from an OAuth redirect URL and set the session
export async function createSessionFromUrl(url) {
  const fragmentIndex = url.indexOf('#');
  if (fragmentIndex === -1) return { data: null, error: new Error('No fragment in URL') };

  const params = new URLSearchParams(url.substring(fragmentIndex + 1));
  const access_token = params.get('access_token');
  const refresh_token = params.get('refresh_token');

  if (!access_token || !refresh_token) {
    return { data: null, error: new Error('Missing tokens in URL') };
  }

  return await supabase.auth.setSession({ access_token, refresh_token });
}

// ✅ HARD RESET for corrupted Supabase auth session
export async function resetSupabaseAuthStorage() {
  try {
    const keys = await AsyncStorage.getAllKeys();

    // remove only supabase-related keys
    const supabaseKeys = keys.filter((k) => {
      const lower = k.toLowerCase();
      return (
        lower.includes("supabase") ||
        lower.startsWith("sb-") ||
        lower.includes("auth-token")
      );
    });

    if (supabaseKeys.length > 0) {
      await AsyncStorage.multiRemove(supabaseKeys);
    }

    await supabase.auth.signOut();

    console.log("✅ Supabase auth storage reset complete");
  } catch (err) {
    console.log("resetSupabaseAuthStorage error:", err);
  }
}
