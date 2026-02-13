import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bfgreozkoftncayzyzhz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJmZ3Jlb3prb2Z0bmNheXp5emh6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA4MDA3NTksImV4cCI6MjA3NjM3Njc1OX0.dZKhStPxQVKrfLhg1ZnL1OW43YFF4SLkhEhhRr_NipM';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
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
