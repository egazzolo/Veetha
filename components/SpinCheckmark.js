import React, { useRef, useEffect } from 'react';
import { Animated, Easing } from 'react-native';

// Spins its child (a checkmark glyph) 360° clockwise, once, the moment
// `trigger` turns truthy -- rising edge only, same convention as PopIcon,
// so a single-select control that flips two items per tap only spins the
// newly-picked one. Skips the very first render so an already-selected
// item doesn't spin on mount.
export default function SpinCheckmark({ trigger, style, children }) {
  const rotate = useRef(new Animated.Value(0)).current;
  const isFirstRender = useRef(true);
  const prevTrigger = useRef(trigger);

  useEffect(() => {
    const wasTrue = prevTrigger.current;
    prevTrigger.current = trigger;

    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (!trigger || wasTrue) return;

    rotate.setValue(0);
    Animated.timing(rotate, {
      toValue: 1,
      duration: 380,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger]);

  const spin = rotate.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <Animated.Text
      style={[
        style,
        // Forces a symmetric, glyph-centered box regardless of the parent's
        // own layout/transform -- when this sits inside another Animated
        // transform (a selected chip's own pop-scale, say), transformOrigin
        // alone wasn't reliably centering the pivot; a guaranteed-square box
        // with the glyph centered in it rotates around its true center no
        // matter what.
        { width: 24, height: 24, lineHeight: 24, textAlign: 'center' },
        { transformOrigin: 'center', transform: [{ rotate: spin }] },
      ]}
    >
      {children}
    </Animated.Text>
  );
}
