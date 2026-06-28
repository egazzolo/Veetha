const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

module.exports = function withFmtPatch(config) {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile');
      let podfile = fs.readFileSync(podfilePath, 'utf8');
      if (!podfile.includes('fmt_patch')) {
        const fmtPatch = `
  # fmt_patch: fix Xcode 26 C++ incompatibility
  installer.pods_project.targets.each do |target|
    if target.name == 'fmt'
      target.build_configurations.each do |config|
        config.build_settings['CLANG_CXX_LANGUAGE_STANDARD'] = 'c++17'
      end
    end
  end
`;
        podfile = podfile.replace(
          /post_install do \|installer\|/,
          `post_install do |installer|\n${fmtPatch}`
        );
        fs.writeFileSync(podfilePath, podfile);
      }
      return config;
    },
  ]);
};