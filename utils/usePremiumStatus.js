import { PAYWALL_ENABLED } from './paywallConfig';
import { isPremiumActive } from './trialAndAbuse';
import { useUser } from './UserContext';
export function usePremiumStatus() {
  const { profile } = useUser();
  if (!PAYWALL_ENABLED) return { isPremium: true };
  if (profile?.grace_period_ends_at) {
    const graceEnd = new Date(profile.grace_period_ends_at);
    if (graceEnd > new Date()) return { isPremium: true };
  }
  return { isPremium: isPremiumActive(profile) };
}