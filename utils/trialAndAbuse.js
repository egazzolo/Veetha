import * as Application from 'expo-application';
import * as Crypto from 'expo-crypto';
import { supabase } from './supabase';

/**
 * Get a stable device identifier for abuse detection.
 * iOS: identifierForVendor (changes only on full app uninstall)
 * Android: Android ID (changes on factory reset)
 */
export async function getDeviceId() {
  try {
    if (Application.getIosIdForVendorAsync) {
      const iosId = await Application.getIosIdForVendorAsync();
      if (iosId) return iosId;
    }
    if (Application.getAndroidId) {
      return Application.getAndroidId();
    }
    return null;
  } catch (e) {
    console.error('getDeviceId error:', e);
    return null;
  }
}

/**
 * Hash an email for storage. Lowercase + trim before hashing for consistency.
 */
export async function hashEmail(email) {
  const normalized = email.trim().toLowerCase();
  return await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    normalized
  );
}

/**
 * Check signup history and determine if this user gets a trial.
 * Returns: { grantTrial: boolean, abuseLevel: number, blocked: boolean }
 */
export async function checkSignupAbuse(email, deviceId) {
  const emailHash = await hashEmail(email);

  // Query existing signup history
  const { data: priorSignups, error } = await supabase
    .from('signup_history')
    .select('*')
    .or(`email_hash.eq.${emailHash},device_id.eq.${deviceId}`);

  if (error) {
    console.error('checkSignupAbuse query error:', error);
    // On error, grant trial (fail open for legitimate users)
    return { grantTrial: true, abuseLevel: 0, blocked: false };
  }

  if (!priorSignups || priorSignups.length === 0) {
    return { grantTrial: true, abuseLevel: 0, blocked: false };
  }

  // Check if any prior record is blocked
  const isBlocked = priorSignups.some(s => s.blocked);
  if (isBlocked) {
    return { grantTrial: false, abuseLevel: 99, blocked: true };
  }

  const now = new Date();
  const daysSince = (date) => (now - new Date(date)) / (1000 * 60 * 60 * 24);

  // Same device, signed up 7-30 days ago
  const recentSameDevice = priorSignups.filter(s =>
    s.device_id === deviceId && daysSince(s.created_at) >= 7 && daysSince(s.created_at) <= 30
  );

  // Same email used before
  const sameEmail = priorSignups.filter(s => s.email_hash === emailHash);

  // Same email seen on multiple devices
  const emailDeviceCount = new Set(
    priorSignups.filter(s => s.email_hash === emailHash).map(s => s.device_id)
  ).size;

  let abuseLevel = 0;
  if (recentSameDevice.length >= 1) abuseLevel++;
  if (emailDeviceCount >= 2) abuseLevel++;
  if (sameEmail.length >= 1) abuseLevel++; // any reuse of email = no second trial

  const grantTrial = abuseLevel === 0;

  return { grantTrial, abuseLevel, blocked: false };
}

/**
 * Record a signup in signup_history. Call this AFTER a successful signup,
 * before setting profile.trial_ends_at.
 */
export async function recordSignup(email, deviceId, grantTrial, abuseLevel) {
  const emailHash = await hashEmail(email);
  const { error } = await supabase
    .from('signup_history')
    .insert({
      email_hash: emailHash,
      device_id: deviceId,
      trial_granted: grantTrial,
      abuse_flag_count: abuseLevel,
    });
  if (error) console.error('recordSignup error:', error);
}

/**
 * Check if a user is currently premium (paid or in trial).
 */
export function isPremiumActive(profile) {
  if (!profile) return false;
  if (profile.is_premium) return true;
  if (profile.trial_ends_at && new Date(profile.trial_ends_at) > new Date()) return true;
  return false;
}