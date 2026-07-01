import axios from 'axios';
import { ENDPOINTS, EVENT_SLUG } from '../constants/api';
import { clearSession } from './auth';

// Shared Axios instance
const api = axios.create({
    timeout: 12000,
    headers: { Accept: 'application/json' },
});

// Storage ref for token (set from auth context)
let _token = null;
let _onUnauthorized = null;

export const setApiToken = (token) => { _token = token; };
export const setOnUnauthorized = (cb) => { _onUnauthorized = cb; };

// Request interceptor — attach Bearer token
api.interceptors.request.use((config) => {
    if (_token) {
        config.headers = { ...config.headers, Authorization: `Bearer ${_token}` };
    }
    if (__DEV__) {
        const url = `${config.baseURL ?? ''}${config.url ?? ''}`;
        console.log(`➡️ [API] ${config.method?.toUpperCase()} ${url}`, config.data ?? '');
    }
    return config;
});

// Response interceptor — handle 401
api.interceptors.response.use(
    (res) => {
        if (__DEV__) {
            console.log(`✅ [API] ${res.status} ${res.config?.url}`, res.data);
        }
        return res;
    },
    async (error) => {
        if (__DEV__) {
            console.log(
                `❌ [API] ${error?.response?.status ?? 'NETWORK ERROR'} ${error?.config?.url ?? ''}`,
                error?.response?.data ?? error.message
            );
        }
        if (error?.response?.status === 401) {
            await clearSession();
            _token = null;
            _onUnauthorized?.();
        }
        return Promise.reject(error);
    }
);

// ─── Auth ────────────────────────────────────────────────────────────────────
export const login = (email, password) =>
    axios.post(ENDPOINTS.login, { email, password, event_slug: EVENT_SLUG }, {
        timeout: 12000,
        headers: { Accept: 'application/json' },
    });

// ─── Event info (public) ─────────────────────────────────────────────────────
export const getEventInfo = () =>
    axios.get(ENDPOINTS.event, { timeout: 10000, headers: { Accept: 'application/json' } });

export const logout = () =>
    api.post(ENDPOINTS.logout, {}).catch(() => { });

export const fetchMe = () => api.get(ENDPOINTS.me);

// ─── Badge lookup ─────────────────────────────────────────────────────────────
export const lookupBadge = (badgeNumber) => api.get(ENDPOINTS.badgeLookup(badgeNumber));

// ─── Networking scan ─────────────────────────────────────────────────────────
export const networkingScan = (scannerBadgeNumber, targetBadgeNumber) =>
    api.post(ENDPOINTS.networkingScan, {
        scanner_badge_number: scannerBadgeNumber,
        target_badge_number: targetBadgeNumber,
        event_slug: EVENT_SLUG,
    });



// ─── Networking history ───────────────────────────────────────────────────────
export const networkingHistory = (badgeNumber) => api.get(ENDPOINTS.networkingHistory(badgeNumber));



// ─── Exposants ────────────────────────────────────────────────────────────────
export const getExposants = () => api.get(ENDPOINTS.exposants);

// ─── Register ─────────────────────────────────────────────────────────────────
export const register = (data) =>
    axios.post(ENDPOINTS.register, { ...data, event_slug: EVENT_SLUG }, {
        timeout: 12000,
        headers: { Accept: 'application/json' },
    });



// ─── Team ─────────────────────────────────────────────────────────────────────
export const getTeam = (search = '') =>
    api.get(ENDPOINTS.team + (search ? `?search=${encodeURIComponent(search)}` : ''));

export const addTeamMember = (data) =>
    api.post(ENDPOINTS.team, data);

export const deleteTeamMember = (id) =>
    api.delete(ENDPOINTS.teamDelete(id));

export const updateTeamMember = (id, data) =>
    api.put(ENDPOINTS.teamUpdate(id), data);

export default api;
