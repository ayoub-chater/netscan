import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'expo-localization';

import en from './locales/en.json';
import fr from './locales/fr.json';
import ar from './locales/ar.json';

export const SUPPORTED_LANGUAGES = ['fr', 'en', 'ar'];
export const RTL_LANGUAGES = ['ar'];

export function getDeviceLanguage() {
  try {
    // Walk the phone's ordered language preferences and pick the first we support.
    const locales = getLocales() || [];
    for (const locale of locales) {
      if (SUPPORTED_LANGUAGES.includes(locale?.languageCode)) {
        return locale.languageCode;
      }
    }
    return 'fr';
  } catch {
    return 'fr';
  }
}

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    fr: { translation: fr },
    ar: { translation: ar },
  },
  lng: getDeviceLanguage(),
  fallbackLng: 'fr',
  interpolation: { escapeValue: false },
  compatibilityJSON: 'v4',
});

export default i18n;
