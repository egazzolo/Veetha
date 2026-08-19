import React from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../utils/ThemeContext';

// A full-bleed background layer meant to sit as the first child inside a
// (transparent) root SafeAreaView/View. Themes that define `gradientColors`
// (currently just Silver) render an actual brushed-metal gradient here --
// a horizontal multi-band base plus a soft diagonal highlight sheen
// layered on top -- while every other theme just paints its flat
// `background`. Keeping this as one shared component means adding a
// "shiny" theme later doesn't require touching every screen again.
export default function ThemedScreenBackground() {
  const { theme } = useTheme();

  if (theme.gradientColors) {
    return (
      <>
        <LinearGradient
          colors={theme.gradientColors}
          locations={theme.gradientLocations}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
        {theme.gradientHighlightColors && (
          <LinearGradient
            colors={theme.gradientHighlightColors}
            locations={theme.gradientHighlightLocations}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0.4 }}
            style={StyleSheet.absoluteFill}
          />
        )}
      </>
    );
  }

  return <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.background }]} />;
}
