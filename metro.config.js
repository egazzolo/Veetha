const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.resolver.assetExts.push(
  // Add video extensions
  'mp4',
  'mov',
  'avi'
);

module.exports = config;