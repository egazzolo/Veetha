import React, { useState, useRef, useEffect } from 'react';
import { View, Image, Animated, Easing, StyleSheet } from 'react-native';

// Plays once per distinct `source`, gated on both the container's measured
// size AND the image having actually decoded (a fresh remote photo can take
// longer to load than the animation itself -- starting on layout alone made
// the transform finish before there were any pixels to show, so all that was
// visible was the image's own late, transform-less pop-in, i.e. a plain fade).
//
// The whole sheet flies in from the right (scale + translateX + fade) as one
// piece, landing with its top edge "glued" down first while the bottom half
// stays pitched backward on a hinge at the seam (the visual middle of the
// photo). Once landed, the bottom half unrolls forward to lie flat, "gluing"
// the rest of the poster down.
export default function PosterRevealImage({ source, style, resizeMode = 'cover', borderRadius = 0 }) {
  const [size, setSize] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const arriveAnim = useRef(new Animated.Value(0)).current;
  const foldAnim = useRef(new Animated.Value(0)).current;
  const playedForRef = useRef(null);

  const sourceKey = typeof source === 'number' ? source : source?.uri;

  useEffect(() => {
    setLoaded(false);
    playedForRef.current = null;
    arriveAnim.setValue(0);
    foldAnim.setValue(0);
  }, [sourceKey]);

  useEffect(() => {
    if (!size || !loaded || !sourceKey) return;
    if (playedForRef.current === sourceKey) return;
    playedForRef.current = sourceKey;

    Animated.sequence([
      Animated.timing(arriveAnim, {
        toValue: 1,
        duration: 420,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(foldAnim, {
        toValue: 1,
        duration: 520,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [size, loaded, sourceKey]);

  const handleLayout = (e) => {
    const { width, height } = e.nativeEvent.layout;
    if (!size || size.width !== width || size.height !== height) {
      setSize({ width, height });
    }
  };

  const arriveTranslateX = arriveAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [size ? size.width * 1.1 : 200, 0],
  });
  const arriveScale = arriveAnim.interpolate({ inputRange: [0, 1], outputRange: [1.4, 1] });
  const foldRotateX = foldAnim.interpolate({ inputRange: [0, 1], outputRange: ['-80deg', '0deg'] });

  const halfHeight = size ? size.height / 2 : 0;
  const imageStyle = size ? { width: size.width, height: size.height } : null;

  return (
    <View style={[style, { overflow: 'hidden' }]} onLayout={handleLayout}>
      {size && (
        <>
          {/* Top half -- lands flat once the arrival flight finishes. */}
          <Animated.View
            style={[
              styles.half,
              {
                width: size.width,
                height: halfHeight,
                top: 0,
                borderTopLeftRadius: borderRadius,
                borderTopRightRadius: borderRadius,
                opacity: arriveAnim,
                transform: [
                  { translateX: arriveTranslateX },
                  { scale: arriveScale },
                ],
              },
            ]}
          >
            <Image source={source} resizeMode={resizeMode} style={imageStyle} onLoad={() => setLoaded(true)} />
          </Animated.View>

          {/* Bottom half -- an outer view shares the same arrival flight as
              the top (translateY/scale/opacity), while an inner view carries
              the perspective + hinge rotation for the fold. Keeping the fold
              on its own nested view stops the perspective matrix from also
              warping the arrival translate/scale. */}
          <Animated.View
            style={[
              styles.half,
              {
                width: size.width,
                height: halfHeight,
                top: halfHeight,
                opacity: arriveAnim,
                transform: [
                  { translateX: arriveTranslateX },
                  { scale: arriveScale },
                ],
              },
            ]}
          >
            <Animated.View
              style={[
                styles.foldClip,
                {
                  borderBottomLeftRadius: borderRadius,
                  borderBottomRightRadius: borderRadius,
                  transform: [
                    { perspective: 700 },
                    { translateY: -halfHeight / 2 },
                    { rotateX: foldRotateX },
                    { translateY: halfHeight / 2 },
                  ],
                },
              ]}
            >
              <Image
                source={source}
                resizeMode={resizeMode}
                style={[imageStyle, { marginTop: -halfHeight }]}
                onLoad={() => setLoaded(true)}
              />
            </Animated.View>
          </Animated.View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  half: {
    position: 'absolute',
    left: 0,
    overflow: 'hidden',
  },
  foldClip: {
    width: '100%',
    height: '100%',
    overflow: 'hidden',
  },
});
