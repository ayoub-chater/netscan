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

export const fetchMe = () => api.get(ENDPOINTS.me, { params: { event_slug: EVENT_SLUG } });

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

export const deleteNetworkingRecord = (scanId, badgeNumber) =>
    api.delete(ENDPOINTS.networkingDelete(scanId, badgeNumber));



// ─── Exposants ────────────────────────────────────────────────────────────────
export const getExposants = () => api.get(ENDPOINTS.exposants);

// ─── Appointments (bookable contacts / networking sessions) ────────────────────
export const getPersonas = () => api.get(ENDPOINTS.personas);

export const getPersonaSlots = (slug, date) => api.get(ENDPOINTS.personaSlots(slug, date));

// data: { persona_slug, date, start_time, meeting_type?, note? }
export const bookAppointment = (data) =>
    api.post(ENDPOINTS.appointmentBook, { ...data, event_slug: EVENT_SLUG });

export const getMyAppointments = () => api.get(ENDPOINTS.appointments);

export const cancelAppointment = (id) => api.delete(ENDPOINTS.appointmentCancel(id));

// ─── Participation ("Participer": apply for a participant role) ────────────────
// Roles available for this event, each with the extra form fields to fill.
export const getParticipationRoles = () => api.get(ENDPOINTS.participationRoles);

// The signed-in user's own request: { role, status, note, data, submitted_at }.
export const getParticipation = () =>
    api.get(ENDPOINTS.participation, { params: { event_slug: EVENT_SLUG } });

// fields: { <field_name>: <value> } as described by getParticipationRoles().
export const submitParticipation = (role, fields) =>
    api.post(ENDPOINTS.participation, { role, fields, event_slug: EVENT_SLUG });

export const cancelParticipation = () =>
    api.delete(ENDPOINTS.participation, { params: { event_slug: EVENT_SLUG } });

// ─── Conference (published agenda: panels + speakers) ──────────────────────────
export const getConference = () => api.get(ENDPOINTS.conference);

export const reservePanelSeat = (panelId) => api.post(ENDPOINTS.conferencePanelReserve(panelId));

export const cancelPanelSeat = (panelId) => api.delete(ENDPOINTS.conferencePanelReserve(panelId));

// ─── B2B self-service (any approved participant) ───────────────────────────────
export const getSpeakerPersona = () => api.get(ENDPOINTS.speakerPersona);

// data: { name?, title, company, bio, location, video_link, appointment_duration,
//         buffer_time, max_per_day, meeting_types?, languages?, status?, photo? }
// photo is a { uri, name, type } object from expo-image-picker.
export const updateSpeakerPersona = (data) => {
    const form = new FormData();
    form.append('_method', 'PUT'); // method spoofing so multipart files parse
    // `company` is read-only (set at registration) — never sent.
    [
        'name', 'title', 'bio', 'location',
        'appointment_duration', 'buffer_time', 'max_per_day', 'status',
    ].forEach((key) => {
        if (data[key] !== undefined && data[key] !== null) form.append(key, String(data[key]));
    });
    (data.meeting_types || []).forEach((m) => form.append('meeting_types[]', m));
    (data.languages || []).forEach((l) => form.append('languages[]', l));
    if (data.photo) form.append('photo', data.photo);
    return api.post(ENDPOINTS.speakerPersona, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 30000,
    });
};

// data: { date, start_time, end_time }  (times as 'HH:mm')
export const addSpeakerAvailability = (data) =>
    api.post(ENDPOINTS.speakerAvailabilities, data);

export const deleteSpeakerAvailability = (id) =>
    api.delete(ENDPOINTS.speakerAvailabilityDelete(id));

export const getSpeakerAppointments = () => api.get(ENDPOINTS.speakerAppointments);

// status: 'confirmed' | 'cancelled' | 'completed'
export const updateSpeakerAppointment = (id, status, internalNote) =>
    api.patch(ENDPOINTS.speakerAppointmentUpdate(id), {
        status,
        internal_note: internalNote,
    });

// ─── Profile ──────────────────────────────────────────────────────────────────
export const getProfile = () => api.get(ENDPOINTS.profile);

// data: { name, phone, website, company, image?, logo? }
// image/logo are { uri, name, type } objects from expo-image-picker.
export const updateProfile = (data) => {
    const form = new FormData();
    ['name', 'phone', 'website', 'company', 'ville', 'pays', 'secteur'].forEach((key) => {
        if (data[key] !== undefined && data[key] !== null) form.append(key, data[key]);
    });
    if (data.image) form.append('image', data.image);
    if (data.logo) form.append('logo', data.logo);
    return api.post(ENDPOINTS.profile, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 30000,
    });
};

// ─── In-app notifications ─────────────────────────────────────────────────────
export const getNotifications = () => api.get(ENDPOINTS.notifications);

export const getUnreadNotificationCount = () => api.get(ENDPOINTS.notificationsUnreadCount);

export const markNotificationRead = (id) => api.post(ENDPOINTS.notificationRead(id));

export const markAllNotificationsRead = () => api.post(ENDPOINTS.notificationsReadAll);

// ─── Push notification devices ────────────────────────────────────────────────
export const registerDevice = (expoPushToken, platform) =>
    api.post(ENDPOINTS.devicesRegister, { expo_push_token: expoPushToken, platform });

export const unregisterDevice = (expoPushToken) =>
    api.post(ENDPOINTS.devicesUnregister, { expo_push_token: expoPushToken }).catch(() => { });

// ─── Register ─────────────────────────────────────────────────────────────────
export const register = (data) =>
    axios.post(ENDPOINTS.register, { ...data, event_slug: EVENT_SLUG }, {
        timeout: 12000,
        headers: { Accept: 'application/json' },
    });

// ─── Forgot / reset password ────────────────────────────────────────────────
export const sendPasswordResetCode = (email) =>
    axios.post(ENDPOINTS.forgotPassword, { email }, {
        timeout: 12000,
        headers: { Accept: 'application/json' },
    });

export const resetPasswordWithCode = (email, code, password, passwordConfirmation) =>
    axios.post(ENDPOINTS.resetPassword, {
        email,
        code,
        password,
        password_confirmation: passwordConfirmation,
    }, {
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
