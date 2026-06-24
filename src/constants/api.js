// For local development, set this to your computer's current IPv4 address
const API_IP = '192.168.11.116';

// export const BASE_URL = `http://${API_IP}:8000/api/v1`;

// Other options (for reference):
export const BASE_URL = 'https://admin.logiterre-expo.com/api/v1'; // Production
// export const BASE_URL = 'http://10.0.2.2:8000/api/v1'; // Android Emulator

export const EVENT_SLUG = 'logiterre-expo';

export const ENDPOINTS = {
    login: `${BASE_URL}/login`,
    logout: `${BASE_URL}/logout`,
    me: `${BASE_URL}/me?event_slug=${EVENT_SLUG}`,
    badgeLookup: (badge) => `${BASE_URL}/badge/${encodeURIComponent(badge)}`,
    networkingScan: `${BASE_URL}/networking/scan`,
    networkingHistory: (badge) => `${BASE_URL}/networking/history?badge_number=${encodeURIComponent(badge)}`,
    exposants: `${BASE_URL}/exposants`,
    register: `${BASE_URL}/register`,
    team: `${BASE_URL}/team`,
    teamDelete: (id) => `${BASE_URL}/team/${id}`,
    teamUpdate: (id) => `${BASE_URL}/team/${id}`,
};

export const SESSION_MAX_AGE_MS = 8 * 60 * 60 * 1000; // 8h
export const SCAN_THROTTLE_MS = 2000;
