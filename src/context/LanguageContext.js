import React, { createContext, useContext, useState, useEffect } from 'react';
import { I18nManager, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';
import i18n, { getDeviceLanguage, RTL_LANGUAGES } from '../i18n';

const LanguageContext = createContext(null);
const LANG_KEY = '@netscan_language';

export function LanguageProvider({ children }) {
  const { t } = useTranslation();
  const [language, setLanguageState] = useState(i18n.language);

  const applyLanguage = (lng, promptRestart) => {
    i18n.changeLanguage(lng);
    setLanguageState(lng);

    const shouldRTL = RTL_LANGUAGES.includes(lng);
    if (I18nManager.isRTL !== shouldRTL) {
      I18nManager.allowRTL(shouldRTL);
      I18nManager.forceRTL(shouldRTL);
      if (promptRestart) {
        Alert.alert(t('common.restartTitle'), t('common.restartBody'));
      }
    }
  };

  useEffect(() => {
    AsyncStorage.getItem(LANG_KEY).then((saved) => {
      applyLanguage(saved || getDeviceLanguage(), false);
    });
  }, []);

  const setLanguage = async (lng) => {
    await AsyncStorage.setItem(LANG_KEY, lng);
    applyLanguage(lng, true);
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => useContext(LanguageContext);
