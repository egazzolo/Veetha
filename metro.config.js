const {
  getSentryExpoConfig
} = require("@sentry/react-native/metro");

const config = getSentryExpoConfig(__dirname);

config.resolver.assetExts.push(
  // Add video extensions
  'mp4',
  'mov',
  'avi'
);

config.resolver.sourceExts.push('ts', 'tsx'); 

module.exports = config;