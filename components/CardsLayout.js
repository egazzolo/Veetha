import React, { useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Easing } from 'react-native';
import { Svg, Circle } from 'react-native-svg';
import { useTheme } from '../utils/ThemeContext';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// A flat grey track read as an unrelated smudge sitting next to a colored
// ring once the card backgrounds were removed. A soft tint of the ring's
// own color reads as "this ring, not yet filled" instead.
function hexToRgba(hex, alpha) {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// Circular Progress Component
function CircularProgress({ percentage, size = 80, strokeWidth = 6, color = '#fff', trackColor = 'rgba(128,128,128,0.25)', style, children }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const progress = Math.min(Math.max(percentage, 0), 100);

  // Sweeps from empty up to the real value on load/update -- like a
  // speedometer needle settling into place -- instead of just appearing
  // already at its final position.
  const animatedProgress = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(animatedProgress, {
      toValue: progress,
      duration: 1100,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false, // strokeDashoffset isn't driven by the native driver
    }).start();
  }, [progress]);

  const strokeDashoffset = animatedProgress.interpolate({
    inputRange: [0, 100],
    outputRange: [circumference, 0],
    extrapolate: 'clamp',
  });

  return (
    <View style={[{ width: size, height: size, position: 'relative' }, style]}>
      <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
        <Circle
          stroke={trackColor}
          fill="none"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
        />
        <AnimatedCircle
          stroke={color}
          fill="none"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
        />
      </Svg>
      <View style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
      }}>
        {children}
      </View>
    </View>
  );
}

export default function CardsLayout({
  theme,
  t,
  loading,
  refreshing,
  consumed,
  protein,
  carbs,
  fat,
  totalCalories,
  totalProtein,
  totalCarbs,
  totalFat,
  remaining,
  caloriePercent,
  proteinPercent,
  carbsPercent,  
  fatPercent,  
  setSelectedNutrient,
  setShowNutrientModal,
  caloriesCardRef,
  macroCardsRef,
  tutorialCompleted,
  exerciseCaloriesBurned,
}) {
  const { isProMode } = useTheme();

  // Card background colors switch to greyscale in Pro Mode
  const caloriesBg = isProMode ? '#1B1B1B' : '#4CAF50';
  const proteinBg  = isProMode ? '#3D3D3D' : '#2196F3';
  const carbsBg    = isProMode ? '#555555' : '#FF9800';
  const fatBg      = isProMode ? '#777777' : '#9C27B0';
  return (
    <View>
      {/* 2x2 Card Grid */}
      <View 
        ref={macroCardsRef}
        onLayout={(event) => {
          const { x, y, width, height } = event.nativeEvent.layout;
          if (macroCardsRef.current && macroCardsRef.current.measureInWindow) {
            macroCardsRef.current.measureInWindow((wx, wy, w, h) => {
              if (macroCardsRef.current) {
                macroCardsRef.current.tutorialCoords = {
                  top: wy,
                  left: wx,
                  width: w,
                  height: h,
                  borderRadius: 16
                };
              }
            });
          }
        }}
        style={styles.cardGrid}
      >
        {/* Calories Card */}
        <TouchableOpacity
          ref={caloriesCardRef}
          onLayout={(event) => {
            const { x, y, width, height } = event.nativeEvent.layout;
            if (caloriesCardRef.current && caloriesCardRef.current.measureInWindow) {
              caloriesCardRef.current.measureInWindow((wx, wy, w, h) => {
                if (caloriesCardRef.current) {
                  caloriesCardRef.current.tutorialCoords = {
                    top: wy,
                    left: wx,
                    width: w,
                    height: h,
                    borderRadius: 16
                  };
                }
              });
            }
          }}
          style={[styles.card, styles.topCard, styles.leftCard]}
          onPress={() => {
            if (!loading && !refreshing) {
              setSelectedNutrient('calories');
              setShowNutrientModal(true);
            }
          }}
          disabled={loading || refreshing}
        >
          <CircularProgress
            percentage={caloriePercent}
            size={130}
            strokeWidth={13}
            color={caloriesBg}
            trackColor={hexToRgba(caloriesBg, 0.18)}
          >
            <Text style={[
              styles.cardValue,
              { color: theme.text },
              { fontSize: Math.round(consumed) >= 1000 || Math.round(totalCalories) >= 1000 ? 15 : 18 }
            ]}>
              {Math.round(consumed)} / {Math.round(totalCalories)}
            </Text>
          </CircularProgress>
          <Text style={[styles.cardLabel, styles.caloriesCardLabel, { color: theme.text }]}>{t('home.calories')}</Text>
        </TouchableOpacity>

        {/* Protein Card */}
        <TouchableOpacity
          style={[styles.card, styles.topCard, styles.rightCard]}
          onPress={() => {
            if (!loading && !refreshing) {
              setSelectedNutrient('protein');
              setShowNutrientModal(true);
            }
          }}
          disabled={loading || refreshing}
        >
          <CircularProgress
            percentage={proteinPercent}
            size={110}
            strokeWidth={11}
            color={proteinBg}
            trackColor={hexToRgba(proteinBg, 0.18)}
            style={styles.proteinRing}
          >
            <Text style={[
              styles.cardValue,
              { color: theme.text },
              { fontSize: Math.round(protein) >= 100 || Math.round(totalProtein) >= 100 ? 13 : 16 }
            ]}>
              {Math.round(protein)} / {Math.round(totalProtein)}g
            </Text>
          </CircularProgress>
          <Text style={[styles.cardLabel, styles.proteinCardLabel, { color: theme.text }]}>{t('home.protein')}</Text>
        </TouchableOpacity>

        {/* Carbs Card */}
        <TouchableOpacity
          style={[styles.card, styles.leftCard]}
          onPress={() => {
            if (!loading && !refreshing) {
              setSelectedNutrient('carbs');
              setShowNutrientModal(true);
            }
          }}
          disabled={loading || refreshing}
        >
          <CircularProgress
            percentage={carbsPercent}
            size={110}
            strokeWidth={11}
            color={carbsBg}
            trackColor={hexToRgba(carbsBg, 0.18)}
          >
            <Text style={[
              styles.cardValue,
              { color: theme.text },
              { fontSize: Math.round(carbs) >= 100 || Math.round(totalCarbs) >= 100 ? 13 : 16 }
            ]}>
              {Math.round(carbs)} / {Math.round(totalCarbs)}g
            </Text>
          </CircularProgress>
          <Text style={[styles.cardLabel, { color: theme.text }]}>{t('home.carbs')}</Text>
        </TouchableOpacity>

        {/* Fat Card */}
        <TouchableOpacity
          style={[styles.card, styles.rightCard]}
          onPress={() => {
            if (!loading && !refreshing) {
              setSelectedNutrient('fat');
              setShowNutrientModal(true);
            }
          }}
          disabled={loading || refreshing}
        >
          <CircularProgress
            percentage={fatPercent}
            size={110}
            strokeWidth={11}
            color={fatBg}
            trackColor={hexToRgba(fatBg, 0.18)}
          >
            <Text style={[
              styles.cardValue,
              { color: theme.text },
              { fontSize: Math.round(fat) >= 100 || Math.round(totalFat) >= 100 ? 13 : 16 }
            ]}>
              {Math.round(fat)} / {Math.round(totalFat)}g
            </Text>
          </CircularProgress>
          <Text style={[styles.cardLabel, { color: theme.text }]}>{t('home.fat')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: 20,
    marginBottom: 4,
    rowGap: 4,
    columnGap: 0,
  },
  card: {
    width: '47.5%',
    aspectRatio: 1,
    borderRadius: 16,
    paddingTop: 6,
    paddingBottom: 2,
    paddingHorizontal: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  topCard: {
    marginTop: 12,
    // Calories' ring (130px) and Protein's ring (110px) sit in equal-size
    // boxes -- centering each independently makes the bigger calories ring
    // start higher than protein's. Aligning to the top of the box instead
    // makes both rings start at the same height, matching their different
    // sizes without being centered against each other.
    justifyContent: 'flex-start',
  },
  // Column gap between cards is already at its minimum (0) -- these nudge
  // each ring's content toward the vertical center within its own
  // (invisible, background-less) card box instead, tightening the columns
  // further without needing negative margins between separate boxes.
  leftCard: {
    paddingLeft: 14,
  },
  rightCard: {
    paddingRight: 14,
  },
  cardLabel: {
    fontSize: 14,
    marginBottom: 8,
    fontWeight: '600',
  },
  caloriesCardLabel: {
    fontSize: 16,
  },
  proteinCardLabel: {
    // Calories' ring is 130px, Protein's is 110px (now shifted down 10px
    // via proteinRing) -- this closes the remaining 10px gap so both
    // labels still land at the same height.
    marginTop: 10,
  },
  proteinRing: {
    // Moves the whole ring (not just the number inside it) down so its
    // number lands level with calories' bigger, lower-centered number --
    // keeps the number properly centered within its own ring, unlike
    // shifting the text alone would.
    marginTop: 10,
  },
  cardValue: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});