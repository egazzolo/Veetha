module.exports = {
  expo: {
    name: "Veetha",
    slug: "Veetha",
    scheme: "veetha",
    version: "1.0.1",
    orientation: "portrait",
    icon: "./assets/LogoD.png",
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
      intentFilters: [
        {
          action: "VIEW",
          autoVerify: true,
          data: [
            {
              scheme: "veetha",
              host: "auth",
              pathPrefix: "/callback",
            },
          ],
          category: ["BROWSABLE", "DEFAULT"],
        },
      ],
      softwareKeyboardLayoutMode: "resize",
      package: "com.yourname.veetha",
      allowBackup: false,
      adaptiveIcon: {
        foregroundImage: "./assets/LogoD.png",
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
      icon: "./assets/LogoD.png",
      infoPlist: {
        "NSLocationWhenInUseUsageDescription": "We use your location to suggest common foods in your area."
      }
    }
  }
};