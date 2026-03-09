import { Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

// Scale font sizes proportionally based on screen width
// Base design width is 390 (standard iPhone)
// Screens under 375px wide or 700px tall get additional reduction
const isSmallScreen = width < 375 || height < 700;
const baseWidth = 390;

export const scale = (size) => {
  const factor = width / baseWidth;
  const scaled = isSmallScreen ? size * factor * 0.88 : size * Math.min(factor, 1.1);
  return Math.round(scaled);
};

export const screenWidth = width;
export const screenHeight = height;
export const isSmall = isSmallScreen;
