const { withXcodeProject, IOSConfig } = require('@expo/config-plugins');
const { mergeContents } = require('@expo/config-plugins/build/utils/generateCode');
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

const TEMPLATE_FILES = ['NativeStoreKitModule.swift', 'NativeStoreKitModule.m'];
const BRIDGING_HEADER_IMPORTS = [
  '#import <React/RCTBridgeModule.h>',
  '#import <React/RCTEventEmitter.h>',
];

function unquote(value) {
  if (typeof value !== 'string') return value;
  const match = value.match(/^"(.*)"$/);
  return match ? match[1] : value;
}

// SWIFT_OBJC_BRIDGING_HEADER values seen in the wild are typically a bare
// "<Target>/<Target>-Bridging-Header.h" or "$(SRCROOT)/..."/"$(PROJECT_DIR)/..."
// prefixed path -- both of the latter point at platformProjectRoot (the
// `ios/` folder). Any other build variable in the value isn't confidently
// resolvable here, so it's treated as absent rather than risk patching (or
// losing track of) the wrong file.
function resolveBridgingHeaderPath(rawValue, platformProjectRoot) {
  if (!rawValue) return null;
  let value = rawValue;
  if (value.startsWith('$(SRCROOT)/')) {
    value = value.slice('$(SRCROOT)/'.length);
  } else if (value.startsWith('$(PROJECT_DIR)/')) {
    value = value.slice('$(PROJECT_DIR)/'.length);
  } else if (value.includes('$(')) {
    return null;
  }
  return { relativePath: value, absolutePath: path.join(platformProjectRoot, value) };
}

function ensureBridgingHeaderImports(headerPath) {
  fs.mkdirSync(path.dirname(headerPath), { recursive: true });
  const existing = fs.existsSync(headerPath) ? fs.readFileSync(headerPath, 'utf8') : '';
  const merged = mergeContents({
    src: existing,
    newSrc: BRIDGING_HEADER_IMPORTS.join('\n'),
    tag: 'native-storekit-module-bridging-imports',
    anchor: /^/,
    offset: 0,
    comment: '//',
  });
  fs.writeFileSync(headerPath, merged.contents);
}

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

    // Ground truth, not a filesystem guess. A prior version of this plugin
    // located the bridging header by globbing the source directory for any
    // "*-Bridging-Header.h" filename and assumed that was the one Xcode
    // actually uses -- on the real project that patched either the wrong
    // file or one nothing referenced, so the #import lines below never
    // reached the compiler and RCTEventEmitter came back unresolved
    // (cascading into every override/@objc error in the same file). Reading
    // the target's own SWIFT_OBJC_BRIDGING_HEADER setting directly removes
    // that guess entirely.
    const rawSetting = unquote(
      project.getBuildProperty('SWIFT_OBJC_BRIDGING_HEADER', 'Debug', projectName)
    );
    const resolved = resolveBridgingHeaderPath(rawSetting, platformProjectRoot);

    const headerRelativePath = resolved
      ? resolved.relativePath
      : `${projectName}/${projectName}-Bridging-Header.h`;
    const headerPathOnDisk = resolved
      ? resolved.absolutePath
      : path.join(sourceDir, `${projectName}-Bridging-Header.h`);

    ensureBridgingHeaderImports(headerPathOnDisk);

    // Set unconditionally, not just when missing: if the existing setting
    // already pointed at headerPathOnDisk this is a no-op rewrite of the
    // same value; if it was missing, unresolved, or pointed somewhere this
    // plugin didn't actually patch, this is what makes the two agree.
    project.updateBuildProperty(
      'SWIFT_OBJC_BRIDGING_HEADER',
      `"${headerRelativePath}"`,
      undefined,
      projectName
    );

    return config;
  });
};
