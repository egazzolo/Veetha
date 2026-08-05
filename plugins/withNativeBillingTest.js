const { withAppBuildGradle, withMainApplication, withDangerousMod } = require('@expo/config-plugins');
const { mergeContents } = require('@expo/config-plugins/build/utils/generateCode');
const fs = require('fs');
const path = require('path');

// Diagnostic-only plugin: injects a native Kotlin BillingClient test
// (NativeBillingTest.kt) that queries the real subscription product IDs
// directly against Google's Play Billing Library, with zero react-native-iap
// involvement, to determine whether react-native-iap is the source of the
// empty-SKU issue. Written as a config plugin (like withFmtPatch /
// withGradleJvmArgs) so it survives `expo prebuild --clean`.
// Remove this plugin (and its entry in app.config.js) once diagnosed.

// NOTE: react-native-iap's own native dependency graph pulls in a newer
// billing library, and Gradle's default conflict resolution takes the
// highest requested version project-wide. That resolved to 8.3.0 when this
// was verified, which is why this is pinned here to match rather than an
// older version — declaring a stale/lower version wouldn't change what
// actually compiles, only what's misleadingly displayed in this file.
const BILLING_LIBRARY_VERSION = '8.3.0';

function withNativeBillingTestSource(config) {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      const packageName = config.android.package;
      const packagePath = packageName.split('.').join('/');
      const targetDir = path.join(
        config.modRequest.platformProjectRoot,
        'app',
        'src',
        'main',
        'java',
        packagePath
      );
      fs.mkdirSync(targetDir, { recursive: true });

      const templatePath = path.join(__dirname, 'templates', 'NativeBillingTest.kt');
      const kotlinSource = fs
        .readFileSync(templatePath, 'utf8')
        .replace('__PACKAGE_NAME__', packageName);

      fs.writeFileSync(path.join(targetDir, 'NativeBillingTest.kt'), kotlinSource);

      return config;
    },
  ]);
}

function withNativeBillingTestGradleDep(config) {
  return withAppBuildGradle(config, (config) => {
    if (config.modResults.language !== 'groovy') {
      throw new Error(
        'withNativeBillingTest: expected a Groovy app/build.gradle, got ' + config.modResults.language
      );
    }
    const merged = mergeContents({
      src: config.modResults.contents,
      newSrc: `    implementation "com.android.billingclient:billing:${BILLING_LIBRARY_VERSION}"`,
      tag: 'native-billing-test-dependency',
      anchor: /dependencies\s*\{/,
      offset: 1,
      comment: '//',
    });
    config.modResults.contents = merged.contents;
    return config;
  });
}

function withNativeBillingTestAutoRun(config) {
  return withMainApplication(config, (config) => {
    const isKotlin = config.modResults.language === 'kt';
    const callLine = isKotlin
      ? '    NativeBillingTest(this).runTest()'
      : '    new NativeBillingTest(this).runTest();';
    const merged = mergeContents({
      src: config.modResults.contents,
      newSrc: callLine,
      tag: 'native-billing-test-autorun',
      anchor: /super\.onCreate\(\)/,
      offset: 1,
      comment: '//',
    });
    config.modResults.contents = merged.contents;
    return config;
  });
}

module.exports = function withNativeBillingTest(config) {
  config = withNativeBillingTestSource(config);
  config = withNativeBillingTestGradleDep(config);
  config = withNativeBillingTestAutoRun(config);
  return config;
};
