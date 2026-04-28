import React, {
    createContext, useContext, useEffect, useRef, useState,
} from 'react';
import { Alert } from 'react-native';
import { login as apiLogin, logout as apiLogout, setApiToken, setOnUnauthorized } from '../services/api';
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
                        setBadgeNumber(session.badgeNumber);
                        setEventInfo(session.eventInfo);
                        setExhibitorId(session.scanner?.exhibitor_id ?? null);
                        setApiToken(session.token);
                        scheduleAutoLogout(session.issuedAt);
                    } else {
                        await clearSession();
                    }
                }
            } catch { }
            finally { setIsBootstrapping(false); }
        })();

        return () => { if (timerRef.current) clearTimeout(timerRef.current); };
    }, []);

    const signIn = async (email, password) => {
        console.log(`[AuthContext] signIn called for email: ${email}`);
        const res = await apiLogin(email, password);
        console.log('[AuthContext] apiLogin result:', res?.status, res?.data);
        
        const t = res?.data?.token || res?.data?.data?.token || res?.data?.api_token;
        if (!t) {
            console.error('[AuthContext] Token not extracted from response', res?.data);
            throw new Error('Token non trouvé');
        }
        
        const sc = res?.data?.user || res?.data?.scanner || res?.data?.data?.user || null;
        const ev = res?.data?.event || res?.data?.data?.event || null;
        
        // Even more aggressive badge extraction
        let badge = sc?.badge_number || sc?.badge || sc?.person?.badge_number || 
                    sc?.barcode || sc?.qr_code || res?.data?.badge_number || null;
        
        console.log('[AuthContext] Extracted badge:', badge);

        await saveSession(t, sc, ev);
        if (badge) {
            await saveBadgeNumber(badge);
        }
        
        setToken(t);
        setScanner(sc);
        setBadgeNumber(badge);
        setEventInfo(ev);
        setExhibitorId(sc?.exhibitor_id ?? null);
        setApiToken(t);
        
        return { token: t, scanner: sc, eventInfo: ev };
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
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
