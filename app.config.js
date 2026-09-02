module.exports = {
  expo: {
    name: "Meal Break",
    slug: "Veetha",
    scheme: "veetha",
    version: "1.2.11",
    orientation: "portrait",
    icon: "./assets/LogoAppStore.png",
    userInterfaceStyle: "light",
    newArchEnabled: false,
    assetBundlePatterns: [
      "**/*"
    ],
    plugins: [
      "expo-apple-authentication",
      "expo-asset",
      "expo-localization",
      "expo-web-browser",
      "./plugins/withFmtPatch",
      "./plugins/withGradleJvmArgs",
      "./plugins/withNativeBillingTest",
      "./plugins/withNativeBillingModule",
      "./plugins/withNativeStoreKitModule",
      [
        "expo-location",
        {
          "locationAlwaysAndWhenInUsePermission": "Allow Meal Break to suggest local foods based on your location."
        }
      ],
      [
        "expo-sensors",
        {
          "motionPermission": "Allow Meal Break to access your motion data to track your daily step count."
        }
      ]
    ],
    extra: {
      eas: {
        projectId: "3ea65199-c1c8-4c23-bcac-ae6b34aead78"
      }
    },
    android: {
      package: "com.yourname.veetha",
      googleServicesFile: "./google-services.json",
      versionCode: 53,
      icon: "./assets/adaptive-icon.png",
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#EAE0C8",
      },
      permissions: [
        "ACCESS_COARSE_LOCATION",
        "ACCESS_FINE_LOCATION"
      ],
      blockedPermissions: [
        "android.permission.READ_MEDIA_IMAGES",
        "android.permission.READ_MEDIA_VIDEO",
        "android.permission.READ_EXTERNAL_STORAGE",
        "android.permission.WRITE_EXTERNAL_STORAGE"
      ],
      intentFilters: [
        {
          action: "VIEW",
          autoVerify: true,
          data: [
            {
              scheme: "veetha"
            }
          ],
          category: ["BROWSABLE", "DEFAULT"]
        }
      ]
    },
    ios: {
      icon: "./assets/LogoAppStore.png",
      bundleIdentifier: "com.yourname.veetha",
      buildNumber: "109",
      usesAppleSignIn: true,
      associatedDomains: ["applinks:nonotenb.com"],
      infoPlist: {
        "ITSAppUsesNonExemptEncryption": false,
        "NSLocationWhenInUseUsageDescription": "We use your location to suggest common foods in your area.",
        "NSCameraUsageDescription": "Meal Break uses your camera to scan food barcodes for instant nutrition lookup and to photograph meals for AI-powered food recognition and calorie tracking.",
        "NSPhotoLibraryUsageDescription": "Meal Break uses your photo library to let you select meal photos for AI-powered food recognition and calorie tracking."
      }
    },
    updates: {
      enabled: false,
    },
  }
};
