import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Svg, Rect, Defs, LinearGradient, Stop } from 'react-native-svg';

export default function WaterPitcher({ cups, maxCups = 8, theme }) {
  // Calculate fill percentage (0-100)
  const fillPercent = Math.min((cups / maxCups) * 100, 100);
  
  // Pitcher dimensions
  const pitcherHeight = 200;
  const pitcherWidth = 120;
  const waterHeight = (pitcherHeight * fillPercent) / 100;

  return (
    <View style={styles.container}>
      <Svg height={pitcherHeight + 20} width={pitcherWidth + 40}>
        {/* Water Gradient */}
        <Defs>
          <LinearGradient id="waterGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor="#4FC3F7" stopOpacity="0.8" />
            <Stop offset="100%" stopColor="#0288D1" stopOpacity="0.9" />
          </LinearGradient>
        </Defs>

        {/* Pitcher Outline */}
        <Rect
          x="20"
          y="10"
          width={pitcherWidth}
          height={pitcherHeight}
          rx="15"
          ry="15"
          fill="none"
          stroke={theme.border}
          strokeWidth="3"
        />

        {/* Water Fill */}
        <Rect
          x="23"
          y={10 + pitcherHeight - waterHeight}
          width={pitcherWidth - 6}
          height={waterHeight}
          rx="12"
          ry="12"
          fill="url(#waterGrad)"
        />

        {/* Pitcher Handle */}
        <Rect
          x={pitcherWidth + 15}
          y="60"
          width="15"
          height="80"
          rx="8"
          fill="none"
          stroke={theme.border}
          strokeWidth="3"
        />
      </Svg>

      {/* Text Display */}
      <Text style={[styles.cupsText, { color: theme.text }]}>
        {cups} / {maxCups} cups
      </Text>
      
      <Text style={[styles.percentText, { color: theme.textSecondary }]}>
        {Math.round(fillPercent)}% of daily goal
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  cupsText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 10,
  },
  percentText: {
    fontSize: 12,
    marginTop: 4,
  },
});