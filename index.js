import * as Sentry from '@sentry/react-native';
import { registerRootComponent } from 'expo';

// Must run before `./calo` (the whole app) is required below. Babel's
// CommonJS transform hoists every `import`-derived require() call above a
// module's own top-level statements, regardless of source position -- so
// `import App from './calo'` here would get hoisted above this Sentry.init()
// call too, exactly like calo.js's own former Sentry.init() call got
// hoisted below its later imports (including, transitively, utils/iap.js),
// silently dropping any Sentry call made at their module top level
// (confirmed against @sentry/core: captureMessage/etc. with no client
// configured is a silent no-op, not a throw). Verified directly: compiling
// `import App from './calo'` placed after this call still hoists it above
// Sentry.init() in the actual Babel output. The require() below, not an
// `import` statement, is what actually stays in source position -- also
// verified directly against this project's real babel.config.js.
Sentry.init({
  dsn: 'https://a7cb9cc40e73b8aaf47a0db71cca59ec@o4511091850215424.ingest.us.sentry.io/4511091971457024',

  // Log Sentry setup details to Metro console in development
  debug: __DEV__,

  // Performance monitoring — capture traces on 20% of sessions
  tracesSampleRate: 0.2,

  // Adds more context data to events (IP address, cookies, user, etc.)
  // Disabled — caused "frozen object" crash with Sentry React Native 7.x
  // For more information, visit: https://docs.sentry.io/platforms/react-native/data-management/data-collected/
  sendDefaultPii: false,

  // Enable Logs
  enableLogs: true,

  // Configure Session Replay
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1,
  integrations: [Sentry.mobileReplayIntegration(), Sentry.feedbackIntegration()],

  // uncomment the line below to enable Spotlight (https://spotlightjs.com)
  // spotlight: __DEV__,
});

// React Native only wires up Hermes' unhandled-promise-rejection tracker
// when __DEV__ is true (see node_modules/react-native/Libraries/Core/polyfillPromise.js),
// so in release/TestFlight builds a rejected promise with no .catch() vanishes
// silently — no console output at all. Registering our own tracker here makes
// those visible in production builds too, which is needed to diagnose the IAP
// validateReceipt() flow going dark with zero edge function logs.
if (global?.HermesInternal?.enablePromiseRejectionTracker) {
  global.HermesInternal.enablePromiseRejectionTracker({
    allRejections: true,
    onUnhandled: (id, error) => {
      console.error('🔥 [unhandledRejection]', id, error);
    },
    onHandled: (id) => {
      console.log('🔥 [unhandledRejection] late-handled', id);
    },
  });
}

// require(), not `import App from './calo'` -- see the comment above
// Sentry.init(): an `import` here would be hoisted above it by Babel,
// undoing the whole point of this file.
const App = require('./calo').default;

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
