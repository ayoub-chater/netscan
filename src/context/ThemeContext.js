import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Uniwind, useUniwind } from 'uniwind';

const ThemeContext = createContext(null);
const THEME_KEY = '@netscan_theme';

const VALID_MODES = ['system', 'light', 'dark'];

export function ThemeProvider({ children }) {
  // User's stored preference: 'system' follows the OS, 'light'/'dark' pin it.
  const [themeMode, setThemeModeState] = useState('system');

  // Reactive, resolved theme from Uniwind (follows the OS live when in adaptive mode).
  const { theme: resolvedTheme } = useUniwind();

  useEffect(() => {
    AsyncStorage.getItem(THEME_KEY).then((saved) => {
      // Migration: legacy value was only ever 'light'; missing → default 'system'.
      const mode = VALID_MODES.includes(saved) ? saved : 'system';
      Uniwind.setTheme(mode);
      setThemeModeState(mode);
    });
  }, []);

  const setThemeMode = async (mode) => {
    if (!VALID_MODES.includes(mode)) return;
    Uniwind.setTheme(mode);
    setThemeModeState(mode);
    await AsyncStorage.setItem(THEME_KEY, mode);
  };

  const isDark = resolvedTheme === 'dark';

  return (
    <ThemeContext.Provider value={{ themeMode, isDark, setThemeMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
