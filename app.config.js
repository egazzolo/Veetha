module.exports = {
  expo: {
    name: "Veetha",
    slug: "Veetha",
    scheme: "veetha",
    version: "1.2.3",
    orientation: "portrait",
    icon: "./assets/LogoAppStore.png",
    userInterfaceStyle: "light",
    newArchEnabled: false,
    assetBundlePatterns: [
      "**/*"
    ],
    plugins: [
      "expo-apple-authentication",
      "expo-localization",
      "./plugins/withFmtPatch",
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
      package: "com.yourname.veetha",
      googleServicesFile: "./google-services.json",
      versionCode: 40,
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
      buildNumber: "66",
      usesAppleSignIn: true,
      associatedDomains: ["applinks:nonotenb.com"],
      infoPlist: {
        "ITSAppUsesNonExemptEncryption": false,
        "NSLocationWhenInUseUsageDescription": "We use your location to suggest common foods in your area.",
        "NSCameraUsageDescription": "Veetha uses your camera to scan food barcodes for instant nutrition lookup and to photograph meals for AI-powered food recognition and calorie tracking.",
        "NSPhotoLibraryUsageDescription": "Veetha uses your photo library to let you select meal photos for AI-powered food recognition and calorie tracking."
      }
    },
    updates: {
      enabled: false,
    },
  }
};
