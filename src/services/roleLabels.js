import AsyncStorage from '@react-native-async-storage/async-storage';

import { getRoleLabels } from './api';
import { setRoleTranslations, getRoleTranslations } from '../constants/roles';

const ROLE_LABELS_KEY = 'netscan_role_labels';

// Cached so a role reads in the user's language on the very first frame after
// a cold start, instead of flashing the French name until the fetch lands.
export const loadCachedRoleLabels = async () => {
    try {
        const raw = await AsyncStorage.getItem(ROLE_LABELS_KEY);
        const labels = raw ? JSON.parse(raw) : null;
        if (labels && typeof labels === 'object') {
            setRoleTranslations(labels);
            return labels;
        }
    } catch { }
    return null;
};

/**
 * Fetch the event's role names in every language and install them.
 * Returns the labels, or null when the call failed — in which case whatever
 * was cached stays in place and roles keep showing their stored (French) name.
 */
export const refreshRoleLabels = async () => {
    let labels = null;
    try {
        const res = await getRoleLabels();
        labels = res?.data?.labels;
    } catch {
        return null;
    }
    if (!labels || typeof labels !== 'object') return null;

    setRoleTranslations(labels);
    // A failed write only costs the next cold start its cached labels.
    try { await AsyncStorage.setItem(ROLE_LABELS_KEY, JSON.stringify(labels)); } catch { }
    return labels;
};

export const clearRoleLabels = async () => {
    // The registry is deliberately left alone: the sign-out screens still show
    // roles while they unmount, and the next sign-in refreshes it anyway.
    try { await AsyncStorage.removeItem(ROLE_LABELS_KEY); } catch { }
};

export { getRoleTranslations };
