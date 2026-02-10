module.exports = {
  expo: {
    name: "Veetha",
    slug: "Veetha",
    version: "1.0.1",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",
    newArchEnabled: false,
    assetBundlePatterns: [
      "**/*"
    ],
    plugins: [
      "expo-localization",
      [
        "expo-location",
        {
          "locationAlwaysAndWhenInUsePermission": "Allow Veetha to suggest local foods based on your location."
        }
      ]
    ],
    extra: {
      eas: {
        projectId: "3ea65199-c1c8-4c23-bcac-ae6b34aead78"
      }
    },
    android: {
      softwareKeyboardLayoutMode: "resize",
      package: "com.yourname.veetha",
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#ffffff"
      },
      permissions: [
        "android.permission.READ_EXTERNAL_STORAGE",
        "android.permission.WRITE_EXTERNAL_STORAGE",
        "android.permission.READ_MEDIA_IMAGES",
        "android.permission.READ_MEDIA_VIDEO",
        "ACCESS_COARSE_LOCATION",
        "ACCESS_FINE_LOCATION"
      ]
    },
    ios: {
      bundleIdentifier: "com.yourname.veetha",
      infoPlist: {
        "NSLocationWhenInUseUsageDescription": "We use your location to suggest common foods in your area."
      }
    }
  }
};