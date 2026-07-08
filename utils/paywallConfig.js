export const PAYWALL_ENABLED = true;
  /*
  TESTING CHECKLIST:
  - PAYWALL_ENABLED = false → all users see premium features, Go Premium card hidden
  - PAYWALL_ENABLED = true → non-premium users see Go Premium card on Profile
  - Tap Go Premium → PaywallScreen opens as modal
  - Yearly pill selected by default, pricing card shows $59.99/year
  - Toggle to Monthly → pricing card shows $7.99/month, badge disappears
  - Tap "Start Free Trial" → confirmation modal appears with correct date (+7 days)
  - Confirm → toast appears "Trial started! (demo mode)"
  - highlightFeature param: navigate with { highlightFeature: 'AI photo recognition' }
    → that row pulses yellow for 2 seconds on mount
  */