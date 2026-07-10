import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { registerDevice, unregisterDevice } from './api';

Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
    }),
});

/**
 * Requests permission, fetches the Expo push token for this device and
 * registers it with the backend for the currently authenticated user.
 * Silently no-ops on simulators/emulators or if permission is denied.
 */
export async function registerForPushNotificationsAsync() {
    if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
            name: 'default',
            importance: Notifications.AndroidImportance.HIGH,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#2e368e',
        });
    }

    if (!Device.isDevice) return null;

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
    }
    if (finalStatus !== 'granted') return null;

    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    let token;
    try {
        ({ data: token } = await Notifications.getExpoPushTokenAsync({ projectId }));
    } catch (err) {
        console.warn('[push] getExpoPushTokenAsync failed', Platform.OS, err);
        return null;
    }

    try {
        await registerDevice(token, Platform.OS);
    } catch (err) {
        console.warn('[push] registerDevice failed', Platform.OS, err);
    }

    return token;
}

/**
 * Best-effort removal of this device's push token, called on sign-out.
 */
export async function unregisterPushNotificationsAsync() {
    try {
        const projectId = Constants.expoConfig?.extra?.eas?.projectId;
        const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
        if (token) await unregisterDevice(token);
    } catch { }
}
