import React, {
    createContext, useContext, useEffect, useRef, useState,
} from 'react';
import { Alert } from 'react-native';
import i18n from '../i18n';
import { login as apiLogin, logout as apiLogout, fetchMe, getProfile, getEventInfo, setApiToken, setOnUnauthorized } from '../services/api';
import { loadSession, saveSession, clearSession, loadBadgeNumber, saveBadgeNumber } from '../services/auth';
import { loadCachedRoleLabels, refreshRoleLabels, clearRoleLabels } from '../services/roleLabels';
import { SESSION_MAX_AGE_MS } from '../constants/api';
import { registerForPushNotificationsAsync, unregisterPushNotificationsAsync } from '../services/notifications';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [isBootstrapping, setIsBootstrapping] = useState(true);
    const [token, setToken] = useState(null);
    const [scanner, setScanner] = useState(null);
    const [badgeNumber, setBadgeNumber] = useState(null);
    const [eventInfo, setEventInfo] = useState(null);
    const [exhibitorId, setExhibitorId] = useState(null);
    // Bumped whenever the fr/en/ar role names change. `roleLabel()` reads them
    // from a module registry rather than from a hook, so this is what tells
    // the screens using them to paint again once they arrive.
    const [roleLabelsVersion, setRoleLabelsVersion] = useState(0);
    const timerRef = useRef(null);
    // Server-issued deadline (ISO) for the current token. Kept so every
    // re-save of the session preserves it instead of silently resetting it.
    const expiresAtRef = useRef(null);

    // Cached first (instant, possibly stale), then refreshed from the server.
    const syncRoleLabels = async () => {
        if (await loadCachedRoleLabels()) setRoleLabelsVersion((v) => v + 1);
        if (await refreshRoleLabels()) setRoleLabelsVersion((v) => v + 1);
    };

    const clearAuthState = () => {
        setToken(null);
        setScanner(null);
        setBadgeNumber(null);
        setEventInfo(null);
        setExhibitorId(null);
        setApiToken(null);
    };

    // `deadline` is an absolute timestamp: the moment the server stops
    // accepting the token. Signing out at exactly that point means the user
    // never meets a mysterious 401 mid-action.
    const scheduleAutoLogout = (deadline) => {
        if (timerRef.current) clearTimeout(timerRef.current);
        const remaining = deadline - Date.now();
        if (remaining <= 0) { signOut(); return; }
        timerRef.current = setTimeout(() => {
            signOut();
            Alert.alert(i18n.t('auth.sessionExpiredTitle'), i18n.t('auth.sessionExpiredBody'));
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
                    // Sessions stored by an older build carry no deadline:
                    // fall back to the 8h rule they were written under.
                    const deadline = session.expiresAt || (session.issuedAt + SESSION_MAX_AGE_MS);
                    expiresAtRef.current = session.expiresAt
                        ? new Date(session.expiresAt).toISOString()
                        : null;
                    if (Date.now() < deadline) {
                        setToken(session.token);
                        setScanner(session.scanner);
                        setApiToken(session.token);
                        scheduleAutoLogout(deadline);
                        registerForPushNotificationsAsync().catch(() => { });
                        syncRoleLabels().catch(() => { });
                        setExhibitorId(session.scanner?.exhibitor_id ?? null);

                        let storedEventInfo = session.eventInfo;
                        if (!storedEventInfo) {
                            try {
                                const evRes = await getEventInfo();
                                storedEventInfo = evRes?.data?.event || null;
                                if (storedEventInfo) {
                                    await saveSession(session.token, session.scanner, storedEventInfo, expiresAtRef.current);
                                }
                            } catch { }
                        }
                        setEventInfo(storedEventInfo);

                        let badge = session.badgeNumber;
                        try {
                            const meRes = await fetchMe();
                            const fresh = meRes?.data?.badge_number || null;
                            if (fresh) {
                                badge = fresh;
                                await saveBadgeNumber(fresh);
                            }
                            // Merge fresh profile (approval status, image, etc.) so a
                            // just-approved exhibitor unlocks without re-logging in.
                            const freshUser = meRes?.data?.user;
                            if (freshUser) {
                                const merged = { ...session.scanner, ...freshUser };
                                setScanner(merged);
                                setExhibitorId(merged.exhibitor_id ?? null);
                                await saveSession(session.token, merged, storedEventInfo, expiresAtRef.current);
                            }
                        } catch { }
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
        const expiresAt = data?.token_expires_at || data?.data?.token_expires_at || null;
        expiresAtRef.current = expiresAt;
        await saveSession(t, sc, ev, expiresAt);
        if (badge) await saveBadgeNumber(badge);
        setToken(t);
        setScanner(sc);
        setBadgeNumber(badge);
        setEventInfo(ev);
        setExhibitorId(sc?.exhibitor_id ?? null);
        setApiToken(t);
        scheduleAutoLogout(expiresAt ? new Date(expiresAt).getTime() : Date.now() + SESSION_MAX_AGE_MS);
        registerForPushNotificationsAsync().catch(() => { });
        syncRoleLabels().catch(() => { });
        return { token: t, scanner: sc, eventInfo: ev };
    };

    // `remember` asks the server for a 30-day session instead of 8 hours.
    const signIn = async (email, password, remember = false) => {
        const res = await apiLogin(email, password, remember);
        return applyAuthResponse(res.data);
    };




    const signOut = async () => {
        await unregisterPushNotificationsAsync();
        try { await apiLogout(); } catch { }
        await clearSession();
        await clearRoleLabels();
        if (timerRef.current) clearTimeout(timerRef.current);
        clearAuthState();
    };

    const updateBadgeNumber = async (badge) => {
        await saveBadgeNumber(badge);
        setBadgeNumber(badge);
    };

    // Merge partial fields into the stored user (after a profile edit).
    const updateScanner = async (partial) => {
        setScanner((prev) => {
            const merged = { ...prev, ...partial };
            saveSession(token, merged, eventInfo, expiresAtRef.current).catch(() => { });
            if (merged.exhibitor_id !== undefined) setExhibitorId(merged.exhibitor_id ?? null);
            return merged;
        });
    };

    // Re-fetch the profile from the server (approval status, image, …).
    const refreshProfile = async () => {
        try {
            const res = await getProfile();
            const user = res?.data?.user;
            if (user) {
                await updateScanner(user);
                if (user.badge_number) await updateBadgeNumber(user.badge_number);
            }
            return user;
        } catch {
            return null;
        }
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
            // Only here to re-render the consumers when the translated role
            // names land; read the names themselves through `roleLabel()`.
            roleLabelsVersion,
            // "Participer": everyone signs up as a visitor and applies for a
            // participant role afterwards. `null` = never applied.
            participationStatus: scanner?.participation_status ?? null,
            participationRole: scanner?.participation_role ?? null,
            participationNote: scanner?.participation_note ?? null,
            // Approved participants get the role features (B2B, team, …).
            isParticipant: scanner?.is_participant === true,
            // Added to an exhibitor's team by that exhibitor: they already
            // take part through their organisation, so no "Participer" CTA.
            isExhibitorStaff: scanner?.is_exhibitor_staff === true,
            // Registered straight into a participant role (private form or
            // back office) instead of applying for one: no "Participer" CTA
            // either, and role features are unlocked from the start.
            isVip: scanner?.is_vip === true,
            // Meetings others requested with me that I haven't answered yet —
            // surfaced as a red dot on the B2B tab and the agenda button.
            b2bPendingCount: scanner?.b2b_pending_count ?? 0,
            isExposant: (scanner?.role || '').toLowerCase() === 'exposant',
            isSpeaker: (scanner?.role || '').toLowerCase() === 'intervenant',
            signIn,
            signOut,
            updateBadgeNumber,
            updateScanner,
            refreshProfile,
            applySession: applyAuthResponse,
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
