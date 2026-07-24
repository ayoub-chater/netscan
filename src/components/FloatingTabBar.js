import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useTabBar, TAB_BAR_HIDDEN_OFFSET } from '../context/TabBarContext';
import { useTheme } from '../context/ThemeContext';

// [active icon, inactive icon] per route. Routes not listed here are not shown in the bar.
const ICONS = {
  Dashboard: ['home', 'home-outline'],
  ScannerTab: ['qr-code', 'qr-code-outline'],
  Plan: ['map', 'map-outline'],
  Expos: ['globe', 'globe-outline'],
  Exposants: ['storefront', 'storefront-outline'],
  RDV: ['calendar', 'calendar-outline'],
  Détails: ['person', 'person-outline'],
};

const NAVBAR_COLOR = '#286EAD';

export default function FloatingTabBar({ state, navigation }) {
  const insets = useSafeAreaInsets();
  const { translateY } = useTabBar();
  const { isDark } = useTheme();

  // Sit above the phone's system nav strip with a bit of breathing room, so
  // the floating bar doesn't look stuck to the OS navigation bar.
  const barBottom = Math.max(insets.bottom, 10) + 14;

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: 1 - Math.min(translateY.value / (TAB_BAR_HIDDEN_OFFSET * 0.7), 1),
  }));

  return (
    <>
      {/* Blur only over the phone's system navigation strip at the very bottom. */}
      {insets.bottom > 0 && (
        <BlurView
          intensity={40}
          tint={isDark ? 'dark' : 'light'}
          experimentalBlurMethod="dimezisBlurView"
          style={[styles.systemBlur, { height: insets.bottom }]}
          pointerEvents="none"
        />
      )}

      {/* Floating pill — transparent wrapper, animated on scroll. */}
      <Animated.View
        pointerEvents="box-none"
        style={[styles.barWrap, { bottom: barBottom }, animatedStyle]}
      >
        <View style={styles.bar}>
          {state.routes.map((route, index) => {
            const icons = ICONS[route.name];
            if (!icons) return null;

            const focused = state.index === index;
            const [active, inactive] = icons;
            const color = focused ? '#FFFFFF' : 'rgba(255,255,255,0.55)';

            const onPress = () => {
              // Always reveal the bar when switching tabs.
              translateY.value = withTiming(0);
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });
              if (!focused && !event.defaultPrevented) {
                navigation.navigate(route.name);
              }
            };

            return (
              <Pressable
                key={route.key}
                onPress={onPress}
                style={styles.item}
                hitSlop={4}
                android_ripple={{ color: 'rgba(255,255,255,0.12)', borderless: true }}
              >
                <View style={styles.iconContainer}>
                  {focused && <View style={styles.iconContainerActive} pointerEvents="none" />}
                  <Ionicons name={focused ? active : inactive} size={24} color={color} />
                </View>
              </Pressable>
            );
          })}
        </View>
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  systemBlur: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  barWrap: {
    position: 'absolute',
    left: 16,
    right: 16,
  },
  bar: {
    height: 70,
    borderRadius: 35,
    backgroundColor: NAVBAR_COLOR,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    elevation: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
  },
  item: {
    flex: 1,
    height: 70,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 44,
    height: 44,
  },
  iconContainerActive: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
});
