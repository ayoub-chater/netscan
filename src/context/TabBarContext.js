import React, { createContext, useContext, useRef } from 'react';
import { useSharedValue, withTiming } from 'react-native-reanimated';

const TabBarContext = createContext(null);

// Shared vertical offset for the floating tab bar.
// 0 = fully visible, positive values slide it (and its blurred backdrop) off-screen.
export const TAB_BAR_HIDDEN_OFFSET = 160;

export function TabBarProvider({ children }) {
  const translateY = useSharedValue(0);
  return (
    <TabBarContext.Provider value={{ translateY }}>
      {children}
    </TabBarContext.Provider>
  );
}

export const useTabBar = () => useContext(TabBarContext);

// Reusable scroll handler that hides the floating tab bar while scrolling down
// the content and reveals it when scrolling back up. Spread the returned props
// onto any ScrollView / FlatList (or WebView) to enable the behaviour.
export function useTabBarScroll() {
  const { translateY } = useTabBar();
  const lastY = useRef(0);

  const onScroll = (e) => {
    const y = e?.nativeEvent?.contentOffset?.y ?? 0;
    const diff = y - lastY.current;
    if (y <= 0) {
      translateY.value = withTiming(0);
    } else if (diff > 6) {
      translateY.value = withTiming(TAB_BAR_HIDDEN_OFFSET);
    } else if (diff < -6) {
      translateY.value = withTiming(0);
    }
    lastY.current = y;
  };

  return { onScroll, scrollEventThrottle: 16 };
}
