import * as SecureStore from 'expo-secure-store';
import * as Device from 'expo-device';
import * as Application from 'expo-application';
import { Platform } from 'react-native';

const DEVICE_ID_KEY = 'netscan_device_id';

let cached = null;

/**
 * A stable identifier for this install, kept in the OS keystore.
 *
 * Not a secret and not a credential: the server only ever compares it to the
 * value recorded when the token was issued, so a token copied out of this
 * phone and replayed from another one arrives with the wrong id and is
 * refused. Reinstalling the app produces a new id, which just means a new
 * sign-in — the correct outcome.
 */
const uuid = () =>
    'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });

export const getDeviceId = async () => {
    if (cached) return cached;

    try {
        let id = await SecureStore.getItemAsync(DEVICE_ID_KEY);
        if (!id) {
            id = uuid();
            await SecureStore.setItemAsync(DEVICE_ID_KEY, id);
        }
        cached = id;
        return id;
    } catch {
        // Keystore unavailable (rare). Returning null — rather than a fresh
        // random id — matters: a new id on every launch would look like a
        // different phone to the server and kill the session each time. With
        // no id the request simply carries no device claim.
        return null;
    }
};

/**
 * Headers sent with every request so the backend can bind the session to this
 * phone and show a readable device name in the session list.
 */
export const deviceHeaders = async () => {
    const headers = {
        'X-Device-Name': Device.modelName || Device.deviceName || 'Appareil',
        'X-Device-Platform': Platform.OS,
        'X-App-Version': Application.nativeApplicationVersion || '',
    };

    const id = await getDeviceId();
    if (id) headers['X-Device-Id'] = id;

    return headers;
};
