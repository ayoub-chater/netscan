import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Uniwind } from 'uniwind';

const ThemeContext = createContext(null);
const THEME_KEY = '@netscan_theme';

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState('dark');

  useEffect(() => {
    AsyncStorage.getItem(THEME_KEY).then(saved => {
      const t = saved === 'light' ? 'light' : 'dark';
      if (t !== 'dark') {
        Uniwind.setTheme(t);
        setTheme(t);
      }
    });
  }, []);

  const toggleTheme = async () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    Uniwind.setTheme(next);
    setTheme(next);
    await AsyncStorage.setItem(THEME_KEY, next);
  };

  return (
    <ThemeContext.Provider value={{ theme, isDark: theme === 'dark', toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
