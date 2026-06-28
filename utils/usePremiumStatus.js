  import { PAYWALL_ENABLED } from './paywallConfig';
  import { isPremiumActive } from './trialAndAbuse';
  import { useUser } from './UserContext';

  export function usePremiumStatus() {
    const { profile } = useUser();

    if (!PAYWALL_ENABLED) return { isPremium: true };

    return { isPremium: isPremiumActive(profile) };
  }