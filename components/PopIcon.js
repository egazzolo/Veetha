import React, { useRef, useEffect } from 'react';
import { Animated, Easing } from 'react-native';

// Wraps an icon/checkmark and pulses it -- pop up (scale up, settle back)
// when `trigger` turns truthy, contract (scale down, settle back) when it
// turns falsy, but only if `pulseOnDeselect` is set.
//
// pulseOnDeselect defaults to false because a single-select control (e.g.
// Diet Type) flips two items' trigger on one tap -- the old choice off, the
// new one on -- and animating both reads as "everything I touched moved,"
// not "this one got picked." Multi-select chips (Allergies, Preferences)
// pass pulseOnDeselect so unpicking one also gets feedback.
//
// Skips the very first render either way, so items already selected on
// load (from saved profile data) don't animate on mount.
export default function PopIcon({ trigger, style, pulseOnDeselect = false, children }) {
  const scale = useRef(new Animated.Value(1)).current;
  const isFirstRender = useRef(true);
  const prevTrigger = useRef(trigger);

  useEffect(() => {
    const wasTrue = prevTrigger.current;
    prevTrigger.current = trigger;

    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    const risingEdge = trigger && !wasTrue;
    const fallingEdge = !trigger && wasTrue;
    if (!risingEdge && !(fallingEdge && pulseOnDeselect)) return;

    const peak = risingEdge ? 1.18 : 0.82;
    scale.setValue(1);
    Animated.sequence([
      Animated.timing(scale, {
        toValue: peak,
        duration: 120,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 1,
        duration: 150,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger]);

  return (
    <Animated.View style={[style, { transform: [{ scale }] }]}>
      {children}
    </Animated.View>
  );
}
