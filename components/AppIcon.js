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
  'chicken': require('../assets/icons/chicken.png'),
  'bread': require('../assets/icons/bread.png'),
  'avocado': require('../assets/icons/avocado.png'),
  'sodium': require('../assets/icons/icon_salt.png'),
  'sugar': require('../assets/icons/icon_candy.png'),
  'fiber': require('../assets/icons/icon_leaf.png'),
  'calories': require('../assets/icons/icon_battery.png'),
  'streak': require('../assets/icons/icon_flame.png'),
  'water': require('../assets/icons/icon_drop.png'),
  'exercise': require('../assets/icons/icon_muscle.png'),
  'plate': require('../assets/icons/icon_plate.png'),
  'scale': require('../assets/icons/icon_scale.png'),
  
  // Profile screen
  'moon': require('../assets/icons/icon_moon.png'),
  'target': require('../assets/icons/icon_target.png'),
  'fork_knife': require('../assets/icons/icon_fork_knife.png'),
  'palette': require('../assets/icons/icon_palette.png'),
  'book': require('../assets/icons/icon_book.png'),
  'chat': require('../assets/icons/icon_chat.png'),
  'lock': require('../assets/icons/icon_lock.png'),
  'document': require('../assets/icons/icon_document.png'),
  'info': require('../assets/icons/icon_info.png'),
  'trash': require('../assets/icons/icon_trash.png'),
  'camera': require('../assets/icons/icon_camera.png'),
  
  // Scanner / Result
  'edit': require('../assets/icons/icon_edit.png'),
  'search': require('../assets/icons/icon_search.png'),
  'barcode': require('../assets/icons/icon_barcode.png'),
  'add': require('../assets/icons/icon_add.png'),
  'check': require('../assets/icons/icon_check.png'),
  
  // Stats
  'export': require('../assets/icons/icon_export.png'),
  'chart': require('../assets/icons/icon_chart.png'),
  'clipboard': require('../assets/icons/icon_clipboard.png'),
  'streak_trophy': require('../assets/icons/icon_streak_trophy.png'),
  'bolt': require('../assets/icons/icon_bolt.png'),
  'steps': require('../assets/icons/icon_steps.png'),
  
  // Meal types (Quick Add / Recommendations)
  'breakfast': require('../assets/icons/icon_breakfast.png'),
  'lunch': require('../assets/icons/icon_lunch.png'),
  'dinner': require('../assets/icons/icon_plate.png'),
  
  // Onboarding activity levels
  'sitting': require('../assets/icons/icon_sitting.png'),
  'walking': require('../assets/icons/icon_walking.png'),
  'running': require('../assets/icons/icon_running.png'),
  'lifting': require('../assets/icons/icon_lifting.png'),
  'muscle': require('../assets/icons/icon_muscle.png'),
  
  // Onboarding goals
  'weight_loss': require('../assets/icons/icon_weight_loss.png'),
  'weight_gain': require('../assets/icons/icon_weight_gain.png'),
  
  // Tutorial pointer
  'fork': require('../assets/icons/icon_fork.png'),
  'hand_point_down': require('../assets/icons/icon_hand_point_down.png'),
  'hand_point_left': require('../assets/icons/icon_hand_point_left.png'),
  
  // Allergens (plain green)
  'peanut': require('../assets/icons/icon_peanut.png'),
  'milk': require('../assets/icons/icon_milk.png'),
  'shrimp': require('../assets/icons/icon_shrimp.png'),
  'egg': require('../assets/icons/icon_egg.png'),
  'soy': require('../assets/icons/icon_soy.png'),
  'wheat': require('../assets/icons/icon_wheat.png'),
  'fish': require('../assets/icons/icon_fish.png'),
  'walnut': require('../assets/icons/icon_walnut.png'),
  
  // Allergens (colorful)
  'peanut_clr': require('../assets/icons/icon_peanut_clr.png'),
  'milk_clr': require('../assets/icons/icon_milk_clr.png'),
  'shrimp_clr': require('../assets/icons/icon_shrimp_clr.png'),
  'egg_clr': require('../assets/icons/icon_egg_clr.png'),
  'soy_clr': require('../assets/icons/icon_soy_clr.png'),
  'wheat_clr': require('../assets/icons/icon_wheat_clr.png'),
  'fish_clr': require('../assets/icons/icon_fish_clr.png'),
  'walnut_clr': require('../assets/icons/icon_walnut_clr.png'),
  
  // Dietary "no" badges (colorful with red strike-through)
  'no_peanut': require('../assets/icons/icon_no_peanut.png'),
  'no_milk': require('../assets/icons/icon_no_milk.png'),
  'no_wheat': require('../assets/icons/icon_no_wheat.png'),
  'no_avocado': require('../assets/icons/icon_no_avocado.png'),
  
  // Leaf (for organic)
  'leaf': require('../assets/icons/icon_leaf.png'),
  
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
  'avocado_clr': require('../assets/icons/icon_avocado_clr.png'),
  'measuring_spoon': require('../assets/icons/icon_measuring_spoon.png'),
  'crop': require('../assets/icons/crop.png'),
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