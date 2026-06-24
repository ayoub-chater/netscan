import React, {
    createContext, useContext, useEffect, useRef, useState,
} from 'react';
import { Alert } from 'react-native';
import { login as apiLogin, logout as apiLogout, fetchMe, setApiToken, setOnUnauthorized } from '../services/api';
import { loadSession, saveSession, clearSession, loadBadgeNumber, saveBadgeNumber } from '../services/auth';
import { SESSION_MAX_AGE_MS } from '../constants/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [isBootstrapping, setIsBootstrapping] = useState(true);
    const [token, setToken] = useState(null);
    const [scanner, setScanner] = useState(null);
    const [badgeNumber, setBadgeNumber] = useState(null);
    const [eventInfo, setEventInfo] = useState(null);
    const [exhibitorId, setExhibitorId] = useState(null);
    const timerRef = useRef(null);

    const clearAuthState = () => {
        setToken(null);
        setScanner(null);
        setBadgeNumber(null);
        setEventInfo(null);
        setExhibitorId(null);
        setApiToken(null);
    };

    const scheduleAutoLogout = (issuedAt) => {
        if (timerRef.current) clearTimeout(timerRef.current);
        const remaining = SESSION_MAX_AGE_MS - (Date.now() - issuedAt);
        if (remaining <= 0) { signOut(); return; }
        timerRef.current = setTimeout(() => {
            signOut();
            Alert.alert('Session expirée', 'Vous avez été déconnecté automatiquement.');
        }, remaining);
    };

    useEffect(() => {
        setOnUnauthorized(() => {
            clearAuthState();
            clearSession();
        });

        (async () => {
            try {
                const session = await loadSession();
                if (session?.token) {
                    const age = Date.now() - session.issuedAt;
                    if (age <= SESSION_MAX_AGE_MS) {
                        setToken(session.token);
                        setScanner(session.scanner);
                        setEventInfo(session.eventInfo);
                        setExhibitorId(session.scanner?.exhibitor_id ?? null);
                        setApiToken(session.token);
                        scheduleAutoLogout(session.issuedAt);

                        let badge = session.badgeNumber;
                        if (!badge) {
                            try {
                                const meRes = await fetchMe();
                                badge = meRes?.data?.badge_number || null;
                                if (badge) await saveBadgeNumber(badge);
                            } catch { }
                        }
                        setBadgeNumber(badge);
                    } else {
                        await clearSession();
                    }
                }
            } catch { }
            finally { setIsBootstrapping(false); }
        })();

        return () => { if (timerRef.current) clearTimeout(timerRef.current); };
    }, []);

    const applyAuthResponse = async (data) => {
        const t = data?.token || data?.data?.token || data?.api_token;
        if (!t) throw new Error('Token non trouvé');
        const sc = data?.user || data?.scanner || data?.data?.user || null;
        const ev = data?.event || data?.data?.event || null;
        let badge = sc?.badge_number || sc?.badge || sc?.person?.badge_number ||
                    sc?.barcode || sc?.qr_code || data?.badge_number || null;
        await saveSession(t, sc, ev);
        if (badge) await saveBadgeNumber(badge);
        setToken(t);
        setScanner(sc);
        setBadgeNumber(badge);
        setEventInfo(ev);
        setExhibitorId(sc?.exhibitor_id ?? null);
        setApiToken(t);
        return { token: t, scanner: sc, eventInfo: ev };
    };

    const signIn = async (email, password) => {
        const res = await apiLogin(email, password);
        return applyAuthResponse(res.data);
    };




    const signOut = async () => {
        try { await apiLogout(); } catch { }
        await clearSession();
        if (timerRef.current) clearTimeout(timerRef.current);
        clearAuthState();
    };

    const updateBadgeNumber = async (badge) => {
        await saveBadgeNumber(badge);
        setBadgeNumber(badge);
    };

    return (
        <AuthContext.Provider value={{
            isBootstrapping,
            isAuthenticated: !!token,
            token,
            scanner,
            badgeNumber,
            eventInfo,
            exhibitorId,
            signIn,
            signOut,
            updateBadgeNumber,
            applySession: applyAuthResponse,
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
