// *** Welcome / "why we're asking for data" screen -- shown once, right after signup ***
import React, { useEffect, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Animated, Easing, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import { useLanguage } from '../../utils/LanguageContext';
import { scale } from '../../utils/responsive';
import { posthog } from '../../utils/posthog';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const RADIUS = 85;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

// Same green/blue/orange/purple split used on ResultScreen's macro badges,
// reused here so the preview donut reads as "this app" from the first screen.
const SEGMENTS = [
  { color: '#4CAF50', pct: 0.35, duration: 560, delay: 0 },
  { color: '#2196F3', pct: 0.25, duration: 400, delay: 560 },
  { color: '#FF9800', pct: 0.22, duration: 350, delay: 960 },
  { color: '#9C27B0', pct: 0.18, duration: 290, delay: 1310 },
];

let cumulativeAngle = 0;
const SEGMENT_ANGLES = SEGMENTS.map((s) => {
  const startAngle = cumulativeAngle;
  cumulativeAngle += s.pct * 360;
  return startAngle;
});

export default function OnboardingIntro({ navigation }) {
  const { t } = useLanguage();
  const segmentAnims = useRef(SEGMENTS.map(() => new Animated.Value(0))).current;
  const centerAnim = useRef(new Animated.Value(0)).current;
  const legendAnims = useRef([0, 1, 2, 3].map(() => new Animated.Value(0))).current;
  const eyeOpenAnim = useRef(new Animated.Value(1)).current; // 1 = open, ~0.15 = closed
  const bowAnim = useRef(new Animated.Value(0)).current; // 0 = upright, 1 = bowed

  useEffect(() => { posthog.capture('onboarding_step_viewed', { step: 'intro' }); }, []);

  useEffect(() => {
    Animated.parallel(
      segmentAnims.map((anim, i) =>
        Animated.timing(anim, {
          toValue: 1,
          duration: SEGMENTS[i].duration,
          delay: SEGMENTS[i].delay,
          easing: Easing.linear,
          useNativeDriver: false, // strokeDashoffset isn't supported by the native driver
        })
      )
    ).start();

    Animated.timing(centerAnim, {
      toValue: 1,
      duration: 400,
      delay: 1620,
      easing: Easing.out(Easing.back(1.5)),
      useNativeDriver: true,
    }).start();

    Animated.stagger(
      500,
      legendAnims.map((anim) =>
        Animated.timing(anim, {
          toValue: 1,
          duration: 400,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        })
      )
    ).start();

    // Little thank-you gesture: eyes close, avocado bows forward, holds,
    // rises back up, eyes open again -- runs once alongside the donut.
    Animated.sequence([
      Animated.delay(400),
      Animated.timing(eyeOpenAnim, { toValue: 0.15, duration: 250, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.delay(1000),
      Animated.timing(eyeOpenAnim, { toValue: 1, duration: 300, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    ]).start();

    Animated.sequence([
      Animated.delay(550),
      Animated.timing(bowAnim, { toValue: 1, duration: 450, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.delay(400),
      Animated.timing(bowAnim, { toValue: 0, duration: 450, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    ]).start();
  }, []);

  const legendLabels = [
    { key: 'calories', color: '#4CAF50', label: t('onboarding.introCalories') },
    { key: 'protein', color: '#2196F3', label: t('onboarding.introProtein') },
    { key: 'carbs', color: '#FF9800', label: t('onboarding.introCarbs') },
    { key: 'fat', color: '#9C27B0', label: t('onboarding.introFat') },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: '11.11%' }]} />
          </View>
          <View style={styles.calloutRing}>
            <Text style={styles.progressText}>{t('onboarding.step')} 1 {t('onboarding.of')} 9</Text>
          </View>
        </View>
        <View style={styles.calloutCaptionRow}>
          <Text style={styles.calloutCaption}>{t('onboarding.introProgressCallout')}</Text>
        </View>

        <Animated.View
          style={[
            styles.avocadoWrap,
            {
              transform: [
                { rotate: bowAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '14deg'] }) },
                { translateY: bowAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 4] }) },
              ],
            },
          ]}
        >
          <Image
            source={require('../../assets/icons/icon_avocado_clr.png')}
            style={styles.avocadoImage}
            resizeMode="contain"
          />
          <Animated.View style={[styles.avocadoEye, styles.avocadoEyeLeft, { transform: [{ scaleY: eyeOpenAnim }] }]}>
            <View style={styles.avocadoPupil} />
          </Animated.View>
          <Animated.View style={[styles.avocadoEye, styles.avocadoEyeRight, { transform: [{ scaleY: eyeOpenAnim }] }]}>
            <View style={styles.avocadoPupil} />
          </Animated.View>
        </Animated.View>
        <Text style={styles.title}>{t('onboarding.introTitle')}</Text>
        <Text style={styles.body}>{t('onboarding.introBody')}</Text>
        <Text style={styles.promise}>{t('onboarding.introPromise')}</Text>

        <View style={styles.donutWrap}>
          <Svg width={190} height={190} viewBox="0 0 200 200" style={{ transform: [{ rotate: '-90deg' }] }}>
            <Circle cx={100} cy={100} r={RADIUS} fill="none" stroke="#00000012" strokeWidth={16} />
            {SEGMENTS.map((seg, i) => {
              const length = seg.pct * CIRCUMFERENCE;
              const dashoffset = segmentAnims[i].interpolate({
                inputRange: [0, 1],
                outputRange: [length, 0],
              });
              return (
                <AnimatedCircle
                  key={seg.color}
                  cx={100}
                  cy={100}
                  r={RADIUS}
                  fill="none"
                  stroke={seg.color}
                  strokeWidth={16}
                  strokeDasharray={`${length}, ${CIRCUMFERENCE}`}
                  strokeDashoffset={dashoffset}
                  rotation={SEGMENT_ANGLES[i]}
                  origin="100, 100"
                />
              );
            })}
          </Svg>

          <Animated.View
            style={[
              styles.donutCenter,
              {
                opacity: centerAnim,
                transform: [{ scale: centerAnim }],
              },
            ]}
          >
            <Text style={styles.donutCenterTitle}>{t('onboarding.introYourPlan')}</Text>
            <Text style={styles.donutCenterSub}>{t('onboarding.introCalculatedForYou')}</Text>
          </Animated.View>
        </View>

        <View style={styles.legend}>
          {legendLabels.map((item, i) => (
            <Animated.View
              key={item.key}
              style={[
                styles.legendItem,
                {
                  opacity: legendAnims[i],
                  transform: [
                    {
                      translateY: legendAnims[i].interpolate({
                        inputRange: [0, 1],
                        outputRange: [14, 0],
                      }),
                    },
                  ],
                },
              ]}
            >
              <View style={[styles.dot, { backgroundColor: item.color }]} />
              <Text style={styles.legendText}>{item.label}</Text>
            </Animated.View>
          ))}
        </View>
      </ScrollView>

      <View style={styles.navigationButtons}>
        <TouchableOpacity style={styles.continueButton} onPress={() => navigation.navigate('OnboardingStep1')}>
          <Text style={styles.continueButtonText}>{t('onboarding.introCta')}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EAE0C8',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 30,
    paddingTop: 20,
    paddingBottom: 20,
  },
  calloutRing: {
    alignSelf: 'center',
    borderWidth: 2,
    borderColor: '#E53935',
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 12,
    marginTop: 4,
  },
  calloutCaptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: scale(20),
  },
  calloutCaption: {
    fontSize: scale(12),
    color: '#E53935',
    fontWeight: '700',
    textAlign: 'center',
  },
  progressContainer: {
    marginBottom: 0,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#e0e0e0',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
  },
  progressText: {
    fontSize: scale(12),
    color: '#999',
    textAlign: 'center',
  },
  avocadoWrap: {
    alignSelf: 'center',
    width: 80,
    height: 80,
    marginVertical: 10,
  },
  avocadoImage: {
    width: 80,
    height: 80,
  },
  avocadoEye: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#2E7D32',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avocadoEyeLeft: {
    top: 26,
    left: 24,
  },
  avocadoEyeRight: {
    top: 26,
    left: 46,
  },
  avocadoPupil: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#3E2723',
  },
  title: {
    fontSize: scale(24),
    fontWeight: '700',
    color: '#333',
    textAlign: 'center',
    marginBottom: 12,
  },
  body: {
    fontSize: scale(15),
    color: '#5a5a5a',
    textAlign: 'center',
    lineHeight: scale(22),
    marginBottom: 8,
    paddingHorizontal: 8,
  },
  promise: {
    fontSize: scale(14),
    color: '#4CAF50',
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 20,
  },
  donutWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 8,
  },
  donutCenter: {
    position: 'absolute',
    alignItems: 'center',
  },
  donutCenterTitle: {
    fontSize: scale(18),
    fontWeight: '800',
    color: '#333',
  },
  donutCenterSub: {
    fontSize: scale(11),
    color: '#888',
    marginTop: 2,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 16,
    marginTop: 20,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 9,
    height: 9,
    borderRadius: 5,
  },
  legendText: {
    fontSize: scale(12),
    color: '#555',
  },
  navigationButtons: {
    paddingHorizontal: 30,
    paddingVertical: 12,
  },
  continueButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: scale(14),
    borderRadius: 10,
    alignItems: 'center',
  },
  continueButtonText: {
    color: '#fff',
    fontSize: scale(16),
    fontWeight: '600',
  },
});
