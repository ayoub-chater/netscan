import React from 'react';
import { useFocusEffect } from '@react-navigation/native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolate,
  Easing,
} from 'react-native-reanimated';

const IN = { duration: 300, easing: Easing.out(Easing.cubic) };
const OUT = { duration: 160, easing: Easing.in(Easing.cubic) };

/**
 * Content mount animation: the screen body rises and fades in every time it
 * gains focus, and settles back on blur. Runs on top of the navigator's own
 * transition, so it stays deliberately small.
 */
export default function PageTransition({ children, style }) {
  const progress = useSharedValue(0);

  useFocusEffect(
    React.useCallback(() => {
      progress.value = withTiming(1, IN);
      return () => {
        progress.value = withTiming(0, OUT);
      };
    }, [])
  );

  // Opacity resolves early so it doesn't stack with the navigator's own fade —
  // the rise is what's left to read as the mount.
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.4, 1], [0, 1, 1]),
    transform: [{ translateY: interpolate(progress.value, [0, 1], [14, 0]) }],
  }));

  return (
    <Animated.View style={[{ flex: 1 }, style, animatedStyle]}>
      {children}
    </Animated.View>
  );
}

/** Wraps a screen component so it animates in on focus. */
export function withPageTransition(Screen) {
  const Wrapped = (props) => (
    <PageTransition>
      <Screen {...props} />
    </PageTransition>
  );
  Wrapped.displayName = `withPageTransition(${Screen.displayName || Screen.name || 'Screen'})`;
  return Wrapped;
}
