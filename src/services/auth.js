import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

// The token lives in the OS keystore (Keychain / Android Keystore), not in
// AsyncStorage: AsyncStorage is a plain file that a device backup or a rooted
// phone hands over as readable text. Everything else here is non-sensitive
// display data and stays where it was.
const TOKEN_KEY = 'netscan_token';
const TOKEN_ISSUED_KEY = 'netscan_token_issued_at';
const TOKEN_EXPIRES_KEY = 'netscan_token_expires_at';
const SCANNER_KEY = 'netscan_scanner';
const BADGE_KEY = 'netscan_badge_number';
const EVENT_INFO_KEY = 'netscan_event_info';

const putToken = async (token) => {
    try {
        await SecureStore.setItemAsync(TOKEN_KEY, token);
        // Older builds kept it here; drop any leftover copy.
        await AsyncStorage.removeItem(TOKEN_KEY);
    } catch {
        // Keystore unavailable: an unusable app is worse than a stored token.
        await AsyncStorage.setItem(TOKEN_KEY, token);
    }
};

const readToken = async () => {
    try {
        const secure = await SecureStore.getItemAsync(TOKEN_KEY);
        if (secure) return secure;
    } catch { }

    // Migration path: a session written by a build that predates SecureStore.
    const legacy = await AsyncStorage.getItem(TOKEN_KEY);
    if (legacy) {
        await putToken(legacy);
        return legacy;
    }

    return null;
};

/**
 * @param {string|null} expiresAt ISO deadline returned by the server
 *   (`token_expires_at`). After it, the token is dead server-side too.
 */
export const saveSession = async (token, scanner, eventInfo = null, expiresAt = null) => {
    const now = Date.now();
    await putToken(token);
    await AsyncStorage.multiSet([
        [TOKEN_ISSUED_KEY, String(now)],
        [TOKEN_EXPIRES_KEY, expiresAt ? String(new Date(expiresAt).getTime()) : ''],
        [SCANNER_KEY, JSON.stringify(scanner)],
        [EVENT_INFO_KEY, JSON.stringify(eventInfo)],
    ]);
};

export const loadSession = async () => {
    try {
        const token = await readToken();
        if (!token) return null;

        const keys = [TOKEN_ISSUED_KEY, TOKEN_EXPIRES_KEY, SCANNER_KEY, BADGE_KEY, EVENT_INFO_KEY];
        const results = await AsyncStorage.multiGet(keys);

        const map = {};
        results.forEach(([key, value]) => { map[key] = value; });

        const expiresAt = map[TOKEN_EXPIRES_KEY] ? parseInt(map[TOKEN_EXPIRES_KEY], 10) : null;

        return {
            token,
            issuedAt: map[TOKEN_ISSUED_KEY] ? parseInt(map[TOKEN_ISSUED_KEY], 10) : Date.now(),
            expiresAt: Number.isFinite(expiresAt) && expiresAt > 0 ? expiresAt : null,
            scanner: map[SCANNER_KEY] ? JSON.parse(map[SCANNER_KEY]) : null,
            badgeNumber: map[BADGE_KEY] || null,
            eventInfo: map[EVENT_INFO_KEY] ? JSON.parse(map[EVENT_INFO_KEY]) : null,
        };
    } catch (e) {
        console.error('[auth.js] loadSession error:', e);
        return null;
    }
};

export const clearSession = async () => {
    try {
        await SecureStore.deleteItemAsync(TOKEN_KEY);
    } catch { }
    await AsyncStorage.multiRemove([
        TOKEN_KEY, TOKEN_ISSUED_KEY, TOKEN_EXPIRES_KEY, SCANNER_KEY, BADGE_KEY, EVENT_INFO_KEY,
    ]);
};

export const saveBadgeNumber = async (badgeNumber) => {
    await AsyncStorage.setItem(BADGE_KEY, badgeNumber);
};

export const loadBadgeNumber = async () => {
    return AsyncStorage.getItem(BADGE_KEY);
};
