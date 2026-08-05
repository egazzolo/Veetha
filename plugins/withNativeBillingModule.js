const { withAppBuildGradle, withMainApplication, withDangerousMod } = require('@expo/config-plugins');
const { mergeContents } = require('@expo/config-plugins/build/utils/generateCode');
const fs = require('fs');
const path = require('path');

// Replaces react-native-iap's Android product-fetch/purchase path with a
// direct Play Billing Library bridge (NativeBillingModule / NativeBillingPackage),
// reusing the connection/query logic already proven in NativeBillingTest.kt
// (see withNativeBillingTest.js). iOS is untouched and keeps using
// react-native-iap as-is -- only utils/iap.js's Android branch calls into this.
// Written as a config plugin (like withFmtPatch / withGradleJvmArgs /
// withNativeBillingTest) so it survives `expo prebuild --clean`.

const BILLING_LIBRARY_VERSION = '8.3.0';
const TEMPLATE_FILES = ['NativeBillingModule.kt', 'NativeBillingPackage.kt'];

function withNativeBillingModuleSource(config) {
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

      for (const fileName of TEMPLATE_FILES) {
        const templatePath = path.join(__dirname, 'templates', fileName);
        const kotlinSource = fs
          .readFileSync(templatePath, 'utf8')
          .replace('__PACKAGE_NAME__', packageName);
        fs.writeFileSync(path.join(targetDir, fileName), kotlinSource);
      }

      return config;
    },
  ]);
}

function withNativeBillingModuleGradleDep(config) {
  return withAppBuildGradle(config, (config) => {
    if (config.modResults.language !== 'groovy') {
      throw new Error(
        'withNativeBillingModule: expected a Groovy app/build.gradle, got ' + config.modResults.language
      );
    }
    const merged = mergeContents({
      src: config.modResults.contents,
      newSrc: `    implementation "com.android.billingclient:billing:${BILLING_LIBRARY_VERSION}"`,
      tag: 'native-billing-module-dependency',
      anchor: /dependencies\s*\{/,
      offset: 1,
      comment: '//',
    });
    config.modResults.contents = merged.contents;
    return config;
  });
}

function withNativeBillingModuleRegistration(config) {
  return withMainApplication(config, (config) => {
    const merged = mergeContents({
      src: config.modResults.contents,
      newSrc: '      add(NativeBillingPackage())',
      tag: 'native-billing-module-package-registration',
      anchor: /PackageList\(this\)\.packages\.apply\s*\{/,
      offset: 1,
      comment: '//',
    });
    config.modResults.contents = merged.contents;
    return config;
  });
}

module.exports = function withNativeBillingModule(config) {
  config = withNativeBillingModuleSource(config);
  config = withNativeBillingModuleGradleDep(config);
  config = withNativeBillingModuleRegistration(config);
  return config;
};
