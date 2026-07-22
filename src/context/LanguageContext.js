import React, { createContext, useContext, useState, useEffect } from 'react';
import { I18nManager, DevSettings } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Updates from 'expo-updates';
import i18n, { getDeviceLanguage, RTL_LANGUAGES } from '../i18n';

const LanguageContext = createContext(null);
const LANG_KEY = '@netscan_language';

// Force a full native restart so every screen re-renders and RTL/LTR layout
// is applied cleanly. Falls back to the dev fast-refresh reload in Expo Go / dev.
async function restartApp() {
  try {
    await Updates.reloadAsync();
  } catch {
    try {
      DevSettings.reload();
    } catch {
      // last resort: nothing else to do; next cold start picks up the change
    }
  }
}

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(i18n.language);

  const applyLanguage = (lng) => {
    i18n.changeLanguage(lng);
    setLanguageState(lng);
    const shouldRTL = RTL_LANGUAGES.includes(lng);
    if (I18nManager.isRTL !== shouldRTL) {
      I18nManager.allowRTL(shouldRTL);
      I18nManager.forceRTL(shouldRTL);
    }
  };

  useEffect(() => {
    AsyncStorage.getItem(LANG_KEY).then((saved) => {
      applyLanguage(saved || getDeviceLanguage());
    });
  }, []);

  const setLanguage = async (lng) => {
    if (lng === language) return;
    // Persist first so the new language is loaded after the restart.
    await AsyncStorage.setItem(LANG_KEY, lng);
    const shouldRTL = RTL_LANGUAGES.includes(lng);
    if (I18nManager.isRTL !== shouldRTL) {
      I18nManager.allowRTL(shouldRTL);
      I18nManager.forceRTL(shouldRTL);
    }
    // Force restart so the whole tree reloads with the new language / direction.
    await restartApp();
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => useContext(LanguageContext);
