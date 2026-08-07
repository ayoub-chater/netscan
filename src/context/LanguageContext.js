import React, { createContext, useContext, useState, useEffect } from 'react';
import { I18nManager, DevSettings, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Updates from 'expo-updates';
import i18n, { getDeviceLanguage, RTL_LANGUAGES } from '../i18n';
import { direction } from '../utils/rtl';

const LanguageContext = createContext(null);
const LANG_KEY = '@netscan_language';

/**
 * Restart the app so the new language and direction are applied from scratch.
 *
 * Returns whether a restart is actually under way, because neither route is
 * available everywhere and the caller has to know:
 *
 * • `Updates.reloadAsync()` is the real one, but it throws `ERR_UPDATES_DISABLED`
 *   in Expo Go and in any build where expo-updates isn't enabled.
 * • `DevSettings.reload()` covers development. In a release build `DevSettings`
 *   still exists but its reload does nothing, so calling it there would report
 *   success and silently leave the app as it was — hence the `__DEV__` guard.
 *
 * When both are unavailable the caller falls back to switching in JS, which is
 * enough for layout: the direction is carried by the Yoga `direction` on the
 * root view, not by the native flag.
 */
async function restartApp() {
  try {
    await Updates.reloadAsync();
    return true;
  } catch {
    // Not available here — fall through.
  }
  if (__DEV__) {
    try {
      DevSettings.reload();
      return true;
    } catch {
      // Fall through.
    }
  }
  return false;
}

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(i18n.language);

  // Native flag only — it drives the platform's own chrome (keyboards, alerts,
  // text selection). App layout does not depend on it; that comes from the Yoga
  // `direction` below. `forceRTL` needs a genuine relaunch to take effect, so
  // this is set *before* the restart and read back on the next launch.
  const syncNativeDirection = (lng) => {
    const shouldRTL = RTL_LANGUAGES.includes(lng);
    if (I18nManager.isRTL !== shouldRTL) {
      I18nManager.allowRTL(shouldRTL);
      I18nManager.forceRTL(shouldRTL);
    }
  };

  const applyLanguage = (lng) => {
    i18n.changeLanguage(lng);
    setLanguageState(lng);
    syncNativeDirection(lng);
  };

  useEffect(() => {
    AsyncStorage.getItem(LANG_KEY).then((saved) => {
      applyLanguage(saved || getDeviceLanguage());
    });
  }, []);

  const setLanguage = async (lng) => {
    if (lng === language) return;
    // Persist first: the restart below reloads from storage, so the write has to
    // have landed before the process goes down.
    await AsyncStorage.setItem(LANG_KEY, lng);
    syncNativeDirection(lng);

    // Restart immediately, so every screen is rebuilt against the new direction
    // rather than re-rendered into it.
    const restarting = await restartApp();

    // No restart available (Expo Go, or a build without expo-updates). Switch in
    // place instead of leaving the tap doing nothing at all — which is what used
    // to happen, because this path never called `changeLanguage`. Layout still
    // flips: `direction()` is re-read on this render and every logical edge
    // resolves against it. Only the platform's own chrome keeps the old
    // direction until the next cold start.
    if (!restarting) applyLanguage(lng);
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage }}>
      {/* The single place the app's layout direction is set, on both platforms.
          On iOS it is the only thing carrying it — `I18nManager.forceRTL` needs
          a real process relaunch, which the dev reload doesn't perform, so the
          native surface stays LTR. On Android it restates a surface that is
          already RTL, which is a no-op for layout but keeps the mirroring
          identical on the launch *before* the native flag has caught up.
          Everything below inherits it, and every logical edge (`ms/me/ps/pe`,
          `start-*`/`end-*`) resolves against it — see `utils/rtl` for why
          physical edges must not be used. Do not reintroduce uniwind's
          `LayoutDirection` here: it renders a `display: contents` View with no
          flex of its own, and anything that doesn't honour `contents` collapses
          the tree to zero height — a blank screen with no error to show for it.
          uniwind needs nothing anyway; its runtime seeds `rtl` from
          `I18nManager.isRTL`, which `forceRTL` persists natively on both. */}
      <View style={{ flex: 1, direction: direction() }}>{children}</View>
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => useContext(LanguageContext);
