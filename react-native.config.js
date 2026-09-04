module.exports = {
  dependencies: {
    // Android's actual purchase flow is entirely custom (NativeBillingModule,
    // Play Billing Library direct) -- react-native-iap's Android module is
    // never called into, and has repeatedly proven incompatible with this
    // project's Android/Kotlin/Billing Library versions (a Nitro Modules
    // requirement in v14+, a removed-API compile error in v13.x, and now a
    // BillingClient.Builder API mismatch at runtime). Excluding it from
    // Android autolinking entirely stops Gradle from building it there at
    // all. iOS is untouched -- react-native-iap's JS-level utility functions
    // (initConnection/endConnection/etc, see utils/iap.js) are still used
    // there, gated by Platform.OS checks.
    'react-native-iap': {
      platforms: {
        android: null,
      },
    },
  },
};
