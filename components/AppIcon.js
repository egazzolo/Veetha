import React from 'react';
import { Image } from 'react-native';

const ICONS = {
  // Bottom Nav
  'home': require('../assets/icons/icon_home.png'),
  'scanner': require('../assets/icons/icon_scanner.png'),
  'stats': require('../assets/icons/icon_stats.png'),
  'profile': require('../assets/icons/icon_profile.png'),
  
  // Macros
  'protein': require('../assets/icons/icon_flexing.png'),
  'carbs': require('../assets/icons/icon_wheat.png'),
  'fat': require('../assets/icons/icon_avocado.png'),
  'sodium': require('../assets/icons/icon_salt.png'),
  'sugar': require('../assets/icons/icon_candy.png'),
  'fiber': require('../assets/icons/icon_leaf.png'),
  'calories': require('../assets/icons/icon_battery.png'),
  'streak': require('../assets/icons/icon_flame.png'),
  'water': require('../assets/icons/icon_drop.png'),
  'exercise': require('../assets/icons/icon_muscle.png'),
  'plate': require('../assets/icons/icon_plate.png'),
  'scale': require('../assets/icons/icon_scale.png'),

  // Exercise icons (colored, Apple Fitness style)
  'walking_clr': require('../assets/icons/icon_walking_clr.png'),
  'running_clr': require('../assets/icons/icon_running_clr.png'),
  'cycling_clr': require('../assets/icons/icon_cycling_clr.png'),
  'swimming_clr': require('../assets/icons/icon_swimming_clr.png'),
  'stairs_clr': require('../assets/icons/icon_stairs_clr.png'),
  'jumprope_clr': require('../assets/icons/icon_jumprope_clr.png'),
  'elliptical_clr': require('../assets/icons/icon_elliptical_clr.png'),
  'rowing_clr': require('../assets/icons/icon_rowing_clr.png'),
  'strength_clr': require('../assets/icons/icon_strength_clr.png'),
  'bodyweight_clr': require('../assets/icons/icon_bodyweight_clr.png'),
  'hiit_clr': require('../assets/icons/icon_hiit_clr.png'),
  'crosstrain_clr': require('../assets/icons/icon_crosstrain_clr.png'),
  'yoga_clr': require('../assets/icons/icon_yoga_clr.png'),
  'pilates_clr': require('../assets/icons/icon_pilates_clr.png'),
  'stretching_clr': require('../assets/icons/icon_stretching_clr.png'),
  'dancing_clr': require('../assets/icons/icon_dancing_clr.png'),
  'housework_clr': require('../assets/icons/icon_housework_clr.png'),
  'basketball_clr': require('../assets/icons/icon_basketball_clr.png'),
  'soccer_clr': require('../assets/icons/icon_soccer_clr.png'),
  'tennis_clr': require('../assets/icons/icon_tennis_clr.png'),
  'volleyball_clr': require('../assets/icons/icon_volleyball_clr.png'),
};

export default function AppIcon({ name, size = 24, tintColor, style }) {
  const source = ICONS[name];
  if (!source) {
    if (__DEV__) console.warn(`AppIcon: unknown icon name "${name}"`);
    return null;
  }
  return (
    <Image
      source={source}
      style={[
        { width: size, height: size },
        tintColor ? { tintColor } : null,
        style,
      ]}
      resizeMode="contain"
    />
  );
}