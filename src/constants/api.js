// For local development, set this to your computer's current IPv4 address
const API_IP = '192.168.11.116';

// export const BASE_URL = `http://${API_IP}:8000/api/v1`;

// Other options (for reference):
export const BASE_URL = 'https://admin.logiterre-expo.com/api/v1'; // Production
// export const BASE_URL = 'http://10.0.2.2:8000/api/v1'; // Android Emulator

export const EVENT_SLUG = 'logiterre-expo';

// Public event site. Opened in the phone's browser, not in an in-app WebView.
export const EVENT_WEBSITE_URL = 'https://logiterre-expo.com/';

export const ENDPOINTS = {
    login: `${BASE_URL}/login`,
    logout: `${BASE_URL}/logout`,
    forgotPassword: `${BASE_URL}/forgot-password`,
    resetPassword: `${BASE_URL}/reset-password`,
    me: `${BASE_URL}/me?event_slug=${EVENT_SLUG}`,
    event: `${BASE_URL}/event?slug=${EVENT_SLUG}`,
    badgeLookup: (badge) => `${BASE_URL}/badge/${encodeURIComponent(badge)}`,
    networkingScan: `${BASE_URL}/networking/scan`,
    networkingHistory: (badge) => `${BASE_URL}/networking/history?badge_number=${encodeURIComponent(badge)}`,
    networkingDelete: (id, badge) => `${BASE_URL}/networking/history/${id}?badge_number=${encodeURIComponent(badge)}`,
    exposants: `${BASE_URL}/exposants`,
    personas: `${BASE_URL}/personas?event_slug=${EVENT_SLUG}`,
    personaSlots: (slug, date) =>
        `${BASE_URL}/personas/${encodeURIComponent(slug)}/slots?event_slug=${EVENT_SLUG}&date=${encodeURIComponent(date)}`,
    appointments: `${BASE_URL}/appointments?event_slug=${EVENT_SLUG}`,
    conference: `${BASE_URL}/conference?event_slug=${EVENT_SLUG}`,
    conferencePanelReserve: (panelId) => `${BASE_URL}/conference/panels/${panelId}/reserve`,
    appointmentBook: `${BASE_URL}/appointments`,
    appointmentCancel: (id) => `${BASE_URL}/appointments/${id}`,
    // "Participer" — apply for a participant role after signing up
    participationRoles: `${BASE_URL}/participation/roles?event_slug=${EVENT_SLUG}`,
    participation: `${BASE_URL}/participation`,
    // B2B self-service (any approved participant)
    speakerPersona: `${BASE_URL}/b2b/persona`,
    speakerAvailabilities: `${BASE_URL}/b2b/persona/availabilities`,
    speakerAvailabilityDelete: (id) => `${BASE_URL}/b2b/persona/availabilities/${id}`,
    speakerAppointments: `${BASE_URL}/b2b/appointments`,
    speakerAppointmentUpdate: (id) => `${BASE_URL}/b2b/appointments/${id}`,
    profile: `${BASE_URL}/profile`,
    notifications: `${BASE_URL}/notifications`,
    notificationsUnreadCount: `${BASE_URL}/notifications/unread-count`,
    notificationsReadAll: `${BASE_URL}/notifications/read-all`,
    notificationRead: (id) => `${BASE_URL}/notifications/${encodeURIComponent(id)}/read`,
    devicesRegister: `${BASE_URL}/devices/register`,
    devicesUnregister: `${BASE_URL}/devices/unregister`,
    register: `${BASE_URL}/register`,
    team: `${BASE_URL}/team`,
    teamDelete: (id) => `${BASE_URL}/team/${id}`,
    teamUpdate: (id) => `${BASE_URL}/team/${id}`,
};

export const SESSION_MAX_AGE_MS = 8 * 60 * 60 * 1000; // 8h
export const SCAN_THROTTLE_MS = 2000;
