import axios from 'axios';
import { ENDPOINTS } from '../constants/api';
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
    return config;
});

// Response interceptor — handle 401
api.interceptors.response.use(
    (res) => res,
    async (error) => {
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
    axios.post(ENDPOINTS.login, { email, password }, {
        timeout: 12000,
        headers: { Accept: 'application/json' },
    });

export const logout = () =>
    api.post(ENDPOINTS.logout, {}).catch(() => { });

// ─── Badge lookup ─────────────────────────────────────────────────────────────
export const lookupBadge = (badgeNumber) => api.get(ENDPOINTS.badgeLookup(badgeNumber));

// ─── Networking scan ─────────────────────────────────────────────────────────
export const networkingScan = (scannerBadgeNumber, targetBadgeNumber) =>
    api.post(ENDPOINTS.networkingScan, {
        scanner_badge_number: scannerBadgeNumber,
        target_badge_number: targetBadgeNumber,
    });



// ─── Networking history ───────────────────────────────────────────────────────
export const networkingHistory = (badgeNumber) => api.get(ENDPOINTS.networkingHistory(badgeNumber));



// ─── Exposants ────────────────────────────────────────────────────────────────
export const getExposants = () => api.get(ENDPOINTS.exposants);

// ─── Register ─────────────────────────────────────────────────────────────────
export const register = (data) =>
    axios.post(ENDPOINTS.register, data, {
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
