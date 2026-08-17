import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Easing } from 'react-native';
import { Svg, Path, Defs, LinearGradient, Stop, Line } from 'react-native-svg';
import { useLanguage } from '../utils/LanguageContext';
import VeethaModal from './VeethaModal';

const AnimatedPath = Animated.createAnimatedComponent(Path);

const WATER_FACTS = [
  'Your body is about 60% water, and your brain is roughly 73% water.',
  'You lose water constantly through breathing, sweating, and digestion — even without exercising.',
  'Feeling tired or unfocused in the afternoon can sometimes just be mild dehydration.',
  'Thirst is easy to mistake for hunger — a glass of water can help before reaching for a snack.',
  'Water cushions your joints and helps protect your brain and spinal cord like a shock absorber.',
  'Muscle tissue is roughly 75% water, which is part of why hydration affects workout performance.',
  'Pale yellow urine is one of the simplest signs that you\'re well hydrated.',
  'Water has zero calories, making it one of the easiest ways to stay full without adding to your daily intake.',
  'Your kidneys filter your entire blood supply many times a day, and water helps them do it efficiently.',
  'Fruits like watermelon and cucumber are more than 90% water by weight.',
  'Water helps regulate body temperature through sweat, which is why you need more of it in heat or during exercise.',
  'Even a small drop in hydration can make exercise feel noticeably harder.',
];

function shuffle(array) {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// Single filled water glass — tapered shape, water below brim. The glass
// itself is always visible; on load (staggered per glass) a stream falls
// from above like it's being poured from a pitcher, the water fades in as
// the stream lands, and a splash pops at the rim right as it finishes.
function WaterGlass({ size, index = 0 }) {
  const pourAnim = useRef(new Animated.Value(0)).current;
  const streamAnim = useRef(new Animated.Value(0)).current;
  const splashAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const staggerDelay = index * 180;
    const pourDuration = 550;

    Animated.sequence([
      Animated.delay(staggerDelay),
      Animated.parallel([
        Animated.timing(streamAnim, { toValue: 1, duration: 180, easing: Easing.out(Easing.quad), useNativeDriver: false }),
        Animated.timing(pourAnim, { toValue: 1, duration: pourDuration, easing: Easing.out(Easing.cubic), useNativeDriver: false }),
      ]),
    ]).start();

    Animated.sequence([
      Animated.delay(staggerDelay + pourDuration - 100),
      Animated.parallel([
        Animated.timing(streamAnim, { toValue: 0, duration: 200, easing: Easing.in(Easing.quad), useNativeDriver: false }),
        Animated.timing(splashAnim, { toValue: 1, duration: 350, easing: Easing.out(Easing.quad), useNativeDriver: false }),
      ]),
    ]).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Water level: fades the fully-drawn fill shape in rather than clipping a
  // rising level -- <ClipPath> itself (regardless of what's inside it) is
  // inconsistent across platforms in react-native-svg, which is why the
  // glasses were filling unreliably before. A plain opacity animation on a
  // directly-rendered element (same technique as the ring's
  // strokeDashoffset) is dependable everywhere, at the cost of no longer
  // showing a literal rising level.
  const waterOpacity = pourAnim;

  const streamHeight = streamAnim.interpolate({ inputRange: [0, 1], outputRange: [0, size * 0.5] });

  const splashOpacity = splashAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 1, 0] });
  const splashScale = splashAnim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1.8] });
  const splashRise = splashAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -size * 0.35] });

  return (
    <View>
      {/* Falling stream, as if poured from a pitcher above */}
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: -size * 0.5,
          left: '50%',
          marginLeft: -1.5,
          width: 3,
          borderRadius: 2,
          backgroundColor: '#4FC3F7',
          opacity: streamAnim,
          height: streamHeight,
        }}
      />

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

        {/* Water fill — starts below the rim, tapers with glass shape.
            Fades in as the stream lands, instead of clipping a rising level. */}
        <AnimatedPath
          d="M5 10 L6.5 28 Q7 30 9 30 L15 30 Q17 30 17.5 28 L19 10 Z"
          fill="url(#waterFill)"
          opacity={waterOpacity}
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

      {/* Splash droplet popping up from the rim as the pour finishes */}
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: size * 0.28,
          left: '50%',
          marginLeft: -size * 0.16,
          width: size * 0.32,
          height: size * 0.14,
          borderRadius: size * 0.16,
          backgroundColor: 'rgba(129, 212, 250, 0.85)',
          opacity: splashOpacity,
          transform: [{ scale: splashScale }, { translateY: splashRise }],
        }}
      />
    </View>
  );
}

export default function WaterPitcher({ cups, maxCups = 8, theme }) {
  const { t } = useLanguage();
  const fillPercent = Math.min((cups / maxCups) * 100, 100);

  // Dynamic glass sizing: shrink glasses to fit within fixed card height.
  // Bounds are 30% bigger than the original card-background-constrained
  // sizing, matching the muscle icon's 30% bump once the card square was
  // removed and the glasses had more room to breathe.
  const CONTAINER_WIDTH = 169;
  const MAX_GLASSES_HEIGHT = 91;
  const GAP = 4;

  let glassSize = 36;

  if (cups > 0) {
    for (let size = 36; size >= 16; size -= 2) {
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

  const [fact, setFact] = useState(null);
  // A shuffled queue instead of plain Math.random() each tap -- guarantees
  // every fact gets shown once before any repeat, rather than the same one
  // occasionally popping up twice in a row by chance.
  const factQueueRef = useRef([]);

  const showRandomFact = () => {
    if (factQueueRef.current.length === 0) {
      factQueueRef.current = shuffle(WATER_FACTS);
    }
    setFact(factQueueRef.current.pop());
  };

  return (
    <TouchableOpacity style={styles.container} activeOpacity={0.7} onPress={showRandomFact}>
      <Text style={[styles.cupsText, { color: theme.text }]}>
        {cups} / {maxCups}
      </Text>

      <View style={styles.glassesGrid}>
        {cups > 0 ? (
          Array.from({ length: cups }).map((_, i) => (
            <WaterGlass key={i} size={glassSize} index={i} />
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

      <VeethaModal
        visible={!!fact}
        title="💧 Did You Know?"
        message={fact || ''}
        confirmText="Got it"
        onConfirm={() => setFact(null)}
      />
    </TouchableOpacity>
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
