import { registerRootComponent } from 'expo';

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

import App from './calo';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
