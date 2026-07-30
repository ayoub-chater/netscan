import { Easing } from 'react-native';

// Shared motion language: short, eased-out, never longer than ~280ms so the app
// still feels immediate. Stack pushes slide + fade, tab switches cross-fade.

const OPEN_SPEC = {
  animation: 'timing',
  config: { duration: 280, easing: Easing.out(Easing.cubic), useNativeDriver: true },
};

const CLOSE_SPEC = {
  animation: 'timing',
  config: { duration: 220, easing: Easing.in(Easing.cubic), useNativeDriver: true },
};

// ── Stack (Scanner, MyBadge, Team, Terms, EditProfile…) ─────────────────────
export const stackTransition = {
  cardOverlayEnabled: true,
  transitionSpec: { open: OPEN_SPEC, close: CLOSE_SPEC },
  cardStyleInterpolator: ({ current, next, layouts }) => {
    const translateX = current.progress.interpolate({
      inputRange: [0, 1],
      outputRange: [layouts.screen.width * 0.08, 0],
      extrapolate: 'clamp',
    });

    const opacity = current.progress.interpolate({
      inputRange: [0, 0.55, 1],
      outputRange: [0, 1, 1],
      extrapolate: 'clamp',
    });

    // The card underneath eases back slightly while a new one covers it.
    const scale = next
      ? next.progress.interpolate({
          inputRange: [0, 1],
          outputRange: [1, 0.96],
          extrapolate: 'clamp',
        })
      : 1;

    const overlayOpacity = next
      ? next.progress.interpolate({
          inputRange: [0, 1],
          outputRange: [0, 0.22],
          extrapolate: 'clamp',
        })
      : 0;

    return {
      cardStyle: { opacity, transform: [{ translateX }, { scale }] },
      overlayStyle: { opacity: overlayOpacity },
    };
  },
};

// ── Bottom tabs ─────────────────────────────────────────────────────────────
// Supplying transitionSpec is what enables tab animation at all in v7.
export const tabTransition = {
  transitionSpec: {
    animation: 'timing',
    config: { duration: 200, easing: Easing.out(Easing.cubic), useNativeDriver: true },
  },
  sceneStyleInterpolator: ({ current }) => ({
    sceneStyle: {
      opacity: current.progress.interpolate({
        inputRange: [-1, 0, 1],
        outputRange: [0, 1, 0],
      }),
      transform: [
        {
          scale: current.progress.interpolate({
            inputRange: [-1, 0, 1],
            outputRange: [0.96, 1, 0.96],
          }),
        },
        {
          translateY: current.progress.interpolate({
            inputRange: [-1, 0, 1],
            outputRange: [10, 0, 10],
          }),
        },
      ],
    },
  }),
};
