import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Svg, Path, Defs, LinearGradient, Stop, Line } from 'react-native-svg';
import { useLanguage } from '../utils/LanguageContext';

// Single filled water glass — tapered shape, water below brim
function WaterGlass({ size }) {
  // viewBox: 24 wide x 32 tall
  // Glass: wider at top, narrower at bottom, with a rim
  return (
    <Svg width={size} height={size * 1.33} viewBox="0 0 24 32">
      <Defs>
        <LinearGradient id="waterFill" x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor="#4FC3F7" stopOpacity="0.9" />
          <Stop offset="100%" stopColor="#0277BD" stopOpacity="0.95" />
        </LinearGradient>
        <LinearGradient id="glassBody" x1="0%" y1="0%" x2="100%" y2="0%">
          <Stop offset="0%" stopColor="#E0E0E0" stopOpacity="0.25" />
          <Stop offset="50%" stopColor="#FFFFFF" stopOpacity="0.1" />
          <Stop offset="100%" stopColor="#E0E0E0" stopOpacity="0.25" />
        </LinearGradient>
      </Defs>

      {/* Water fill — starts below the rim, tapers with glass shape */}
      <Path
        d="M5 10 L6.5 28 Q7 30 9 30 L15 30 Q17 30 17.5 28 L19 10 Z"
        fill="url(#waterFill)"
      />

      {/* Glass body outline — tapered tumbler shape */}
      <Path
        d="M3.5 3 L6 28 Q6.5 31 9 31 L15 31 Q17.5 31 18 28 L20.5 3"
        fill="url(#glassBody)"
        stroke="#B0BEC5"
        strokeWidth="1"
      />

      {/* Rim — thick top edge */}
      <Line x1="3" y1="3" x2="21" y2="3" stroke="#90A4AE" strokeWidth="1.8" strokeLinecap="round" />

      {/* Glass shine highlight */}
      <Path
        d="M7 6 L8 26"
        stroke="rgba(255,255,255,0.35)"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </Svg>
  );
}

export default function WaterPitcher({ cups, maxCups = 8, theme }) {
  const { t } = useLanguage();
  const fillPercent = Math.min((cups / maxCups) * 100, 100);

  // Dynamic glass sizing: shrink glasses to fit within fixed card height
  const CONTAINER_WIDTH = 130;
  const MAX_GLASSES_HEIGHT = 70;
  const GAP = 3;

  let glassSize = 28;

  if (cups > 0) {
    for (let size = 28; size >= 12; size -= 2) {
      const perRow = Math.floor(CONTAINER_WIDTH / (size + GAP));
      const rows = Math.ceil(cups / perRow);
      const totalHeight = rows * (size * 1.33 + GAP);
      if (totalHeight <= MAX_GLASSES_HEIGHT) {
        glassSize = size;
        break;
      }
      glassSize = size;
    }
  }

  return (
    <View style={styles.container}>
      <Text style={[styles.cupsText, { color: theme.text }]}>
        {cups} / {maxCups}
      </Text>

      <View style={styles.glassesGrid}>
        {cups > 0 ? (
          Array.from({ length: cups }).map((_, i) => (
            <WaterGlass key={i} size={glassSize} />
          ))
        ) : (
          <Text style={[styles.emptyText, { color: theme.textTertiary }]}>
            {t('home.noWaterYet')}
          </Text>
        )}
      </View>

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
