import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = 'netscan_token';
const TOKEN_ISSUED_KEY = 'netscan_token_issued_at';
const SCANNER_KEY = 'netscan_scanner';
const BADGE_KEY = 'netscan_badge_number';
const EVENT_INFO_KEY = 'netscan_event_info';

export const saveSession = async (token, scanner, eventInfo = null) => {
    const now = Date.now();
    await AsyncStorage.multiSet([
        [TOKEN_KEY, token],
        [TOKEN_ISSUED_KEY, String(now)],
        [SCANNER_KEY, JSON.stringify(scanner)],
        [EVENT_INFO_KEY, JSON.stringify(eventInfo)],
    ]);
};

export const loadSession = async () => {
    try {
        const keys = [TOKEN_KEY, TOKEN_ISSUED_KEY, SCANNER_KEY, BADGE_KEY, EVENT_INFO_KEY];
        const results = await AsyncStorage.multiGet(keys);
        
        const map = {};
        results.forEach(([key, value]) => { map[key] = value; });

        if (!map[TOKEN_KEY]) return null;

        return {
            token: map[TOKEN_KEY],
            issuedAt: map[TOKEN_ISSUED_KEY] ? parseInt(map[TOKEN_ISSUED_KEY], 10) : Date.now(),
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
    await AsyncStorage.multiRemove([TOKEN_KEY, TOKEN_ISSUED_KEY, SCANNER_KEY, BADGE_KEY, EVENT_INFO_KEY]);
};

export const saveBadgeNumber = async (badgeNumber) => {
    await AsyncStorage.setItem(BADGE_KEY, badgeNumber);
};

export const loadBadgeNumber = async () => {
    return AsyncStorage.getItem(BADGE_KEY);
};
