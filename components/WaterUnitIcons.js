import React from 'react';
import { Svg, Path, Line } from 'react-native-svg';

// Simple outline cup -- same silhouette as WaterGlass's static body outline
// (components/WaterPitcher.js), just untethered from that component's fill
// animation so it can be reused here as a plain two-tone icon.
export function CupIcon({ size = 24, color = '#000' }) {
  return (
    <Svg width={size} height={size * 1.33} viewBox="0 0 24 32">
      <Path
        d="M3.5 3 L6 28 Q6.5 31 9 31 L15 31 Q17.5 31 18 28 L20.5 3"
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinejoin="round"
      />
      <Line x1="3" y1="3" x2="21" y2="3" stroke={color} strokeWidth={2.4} strokeLinecap="round" />
    </Svg>
  );
}

// No pitcher artwork exists anywhere in the project -- this is a hand-drawn
// placeholder (body + spout notch + side handle) in the same plain-outline
// style as CupIcon above, good enough to ship now. Swap for a nicer asset
// later by dropping a PNG in assets/icons and pointing this file at it.
export function PitcherIcon({ size = 24, color = '#000' }) {
  return (
    <Svg width={size} height={size * 1.1} viewBox="0 0 30 32">
      <Path
        d="M6 8 L5 4 Q4.5 2.5 6 3 Q8 3.3 8.5 5.5 L9 8 L18 6.5 Q21 6.5 21 9.5 L21 25 Q21 29.5 16 29.5 L10 29.5 Q5.5 29.5 5.5 25 L5.5 10 Q5.5 8.5 6 8 Z"
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinejoin="round"
      />
      <Path
        d="M20.5 11 Q26 11 26 16 Q26 21 20.5 21"
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
    </Svg>
  );
}
