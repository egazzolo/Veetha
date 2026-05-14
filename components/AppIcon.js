import React from 'react';
import { Image } from 'react-native';

const ICONS = {
  // Bottom Nav
  'home': require('../assets/icons/icon_home.png'),
  'scanner': require('../assets/icons/icon_scanner.png'),
  'stats': require('../assets/icons/icon_stats.png'),
  'profile': require('../assets/icons/icon_profile.png'),
  
  // Macros
  'protein': require('../assets/icons/icon_muscle.png'),
  'carbs': require('../assets/icons/icon_wheat.png'),
  'fat': require('../assets/icons/icon_avocado.png'),
  'sodium': require('../assets/icons/icon_salt.png'),
  'sugar': require('../assets/icons/icon_candy.png'),
  'fiber': require('../assets/icons/icon_leaf.png'),
  'calories': require('../assets/icons/icon_flame.png'),
  'water': require('../assets/icons/icon_drop.png'),
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