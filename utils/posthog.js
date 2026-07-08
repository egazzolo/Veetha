import PostHog from 'posthog-react-native'

export const posthog = new PostHog('phc_kum9WUw3TP9Nn5QDjoCeNVDQuzNFm7JTsCjHiX4oJWRG', {
  host: 'https://us.i.posthog.com',
  flushAt: 1,
  flushInterval: 5000,
})