import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Svg, Path, Defs, LinearGradient, Stop } from 'react-native-svg';

// Single filled water glass
function WaterGlass({ size }) {
  return (
    <Svg width={size} height={size * 1.25} viewBox="0 0 24 30">
      <Defs>
        <LinearGradient id="waterFill" x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor="#4FC3F7" stopOpacity="0.85" />
          <Stop offset="100%" stopColor="#0288D1" stopOpacity="0.95" />
        </LinearGradient>
      </Defs>
      {/* Glass body with water fill */}
      <Path
        d="M4 2 L3 26 Q3 29 6 29 L18 29 Q21 29 21 26 L20 2 Z"
        fill="url(#waterFill)"
      />
      {/* Glass outline */}
      <Path
        d="M4 2 L3 26 Q3 29 6 29 L18 29 Q21 29 21 26 L20 2 Z"
        fill="none"
        stroke="#B0BEC5"
        strokeWidth="1.2"
      />
      {/* Rim highlight */}
      <Path
        d="M4 2 L20 2"
        stroke="#B0BEC5"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </Svg>
  );
}

export default function WaterPitcher({ cups, maxCups = 8, theme }) {
  const fillPercent = Math.min((cups / maxCups) * 100, 100);

  // Dynamic glass sizing: shrink glasses to fit within fixed card height
  // Available width ~130px, max glasses area height ~70px
  const CONTAINER_WIDTH = 130;
  const MAX_GLASSES_HEIGHT = 70;
  const GAP = 3;

  let glassSize = 28;

  if (cups > 0) {
    // Find the largest size where all glasses fit
    for (let size = 28; size >= 12; size -= 2) {
      const perRow = Math.floor(CONTAINER_WIDTH / (size + GAP));
      const rows = Math.ceil(cups / perRow);
      const totalHeight = rows * (size * 1.25 + GAP);
      if (totalHeight <= MAX_GLASSES_HEIGHT) {
        glassSize = size;
        break;
      }
      glassSize = size;
    }
  }

  return (
    <View style={styles.container}>
      {/* Cups count */}
      <Text style={[styles.cupsText, { color: theme.text }]}>
        {cups} / {maxCups}
      </Text>

      {/* Glasses grid */}
      <View style={styles.glassesGrid}>
        {cups > 0 ? (
          Array.from({ length: cups }).map((_, i) => (
            <WaterGlass key={i} size={glassSize} />
          ))
        ) : (
          <Text style={[styles.emptyText, { color: theme.textTertiary }]}>
            No water yet
          </Text>
        )}
      </View>

      {/* Percentage */}
      <Text style={[styles.percentText, { color: theme.textSecondary }]}>
        {Math.round(fillPercent)}%
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  cupsText: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  glassesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 3,
    minHeight: 30,
    maxHeight: 70,
    marginVertical: 4,
  },
  emptyText: {
    fontSize: 11,
    fontStyle: 'italic',
  },
  percentText: {
    fontSize: 11,
  },
});
