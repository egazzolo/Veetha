const { withXcodeProject, IOSConfig } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

// Replaces react-native-iap's iOS purchase-*listening* path with a direct
// StoreKit 2 bridge (NativeStoreKitModule.swift), reusing the same
// Transaction.updates mechanism Apple's own docs recommend, independent of
// react-native-iap. This exists because react-native-iap's
// purchaseUpdatedListener has been confirmed to sometimes never fire in JS
// even though StoreKit completes the transaction on-device. Mirrors
// withNativeBillingModule.js's Android fix in spirit (a second, native,
// library-independent path) but not in API shape -- Play Billing and
// StoreKit 2 are unrelated SDKs. react-native-iap is NOT removed: purchase
// *initiation* on iOS still goes through it (see utils/iap.js) -- only
// transaction *delivery* gains this second, independent path.
// Written as a config plugin (like withFmtPatch / withNativeBillingModule)
// so it survives `expo prebuild --clean`.
//
// No bridging header setup here: NativeStoreKitModule.swift sees
// RCTEventEmitter via a plain `import React` instead. An earlier version of
// this plugin patched SWIFT_OBJC_BRIDGING_HEADER, which is how classic
// (pre-CocoaPods-module) React Native tutorials expose RN's Objective-C
// classes to Swift -- verified against three real EAS builds to reliably
// fail to compile in this project. Expo's own generated AppDelegate.swift
// (node_modules/expo/template.tgz) imports RCTBridge/RCTLinkingManager the
// same `import React` way and ships with a completely empty bridging
// header, confirming this project's React Native is exposed to Swift as a
// CocoaPods module (react-native/React.podspec, depends on React-Core,
// which sets DEFINES_MODULE => YES), not via bridging-header textual
// #import. See NativeStoreKitModule.swift's header comment for the full
// evidence chain.

const TEMPLATE_FILES = ['NativeStoreKitModule.swift', 'NativeStoreKitModule.m'];

module.exports = function withNativeStoreKitModule(config) {
  return withXcodeProject(config, (config) => {
    const projectRoot = config.modRequest.projectRoot;
    const platformProjectRoot = config.modRequest.platformProjectRoot;
    const projectName = IOSConfig.XcodeUtils.getProjectName(projectRoot);
    const project = config.modResults;
    const sourceDir = path.join(platformProjectRoot, projectName);

    fs.mkdirSync(sourceDir, { recursive: true });
    for (const fileName of TEMPLATE_FILES) {
      const templatePath = path.join(__dirname, 'templates', fileName);
      fs.copyFileSync(templatePath, path.join(sourceDir, fileName));
    }

    const applicationNativeTarget = IOSConfig.XcodeUtils.getApplicationNativeTarget({
      project,
      projectName,
    });

    for (const fileName of TEMPLATE_FILES) {
      IOSConfig.XcodeUtils.addBuildSourceFileToGroup({
        filepath: `${projectName}/${fileName}`,
        groupName: projectName,
        project,
        targetUuid: applicationNativeTarget.uuid,
      });
    }

    // StoreKit is a system framework -- explicitly linking it here means
    // this module doesn't depend on react-native-iap (or any other pod)
    // happening to already link it for the app target.
    IOSConfig.XcodeUtils.addFramework({
      project,
      projectName,
      framework: 'StoreKit.framework',
    });

    return config;
  });
};
