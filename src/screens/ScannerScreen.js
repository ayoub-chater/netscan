import React, { useRef, useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ActivityIndicator,
    Dimensions, Alert, Platform,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import Animated, {
    useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing,
} from 'react-native-reanimated';
import { useAuth } from '../context/AuthContext';
import { networkingScan } from '../services/api';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SPACING, RADIUS, SHADOWS, BG_GRADIENT } from '../constants/theme';
import NetworkingModal from '../components/NetworkingModal';

const { width, height } = Dimensions.get('window');
const FRAME = 280;

export default function ScannerScreen({ navigation }) {
    const { badgeNumber, updateBadgeNumber } = useAuth();
    const [permission, requestPermission] = useCameraPermissions();
    const [scanning, setScanning] = useState(false);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const lastScanRef = useRef(0);

    const ambientOpacity = useSharedValue(0.1);

    useEffect(() => {
        ambientOpacity.value = withRepeat(
            withTiming(0.4, { duration: 1200, easing: Easing.inOut(Easing.sin) }),
            -1, true
        );
    }, []);

    const ambientStyle = useAnimatedStyle(() => ({ opacity: ambientOpacity.value }));

    const extractBadgeNumber = (qrData) => {
        if (!qrData) return null;
        const trimmed = qrData.trim();
        const looksLikeBadge = (s) => /^(VIS|EXP|SPO|ORG|INT|PAR|INS|PRS)-[A-Z0-9\-]+$/i.test(s);
        try {
            const url = new URL(trimmed);
            const parts = url.pathname.split('/').filter(Boolean);
            const scanIndex = parts.findIndex(p => p.toLowerCase() === 'scan');
            if (scanIndex !== -1) {
                const afterScan = parts[scanIndex + 1];
                const maybeBadge = parts[scanIndex + 2];
                if (afterScan?.toLowerCase() === 'badge' && maybeBadge) return maybeBadge;
                if (afterScan && looksLikeBadge(afterScan)) return afterScan;
            }
            return looksLikeBadge(parts[parts.length - 1]) ? parts[parts.length - 1] : null;
        } catch {
            const match = trimmed.match(/scan\/(?:badge\/)?([^\/?#]+)/i);
            if (match?.[1]) return match[1].trim();
            return looksLikeBadge(trimmed) ? trimmed : null;
        }
    };

    const handleBarcodeScanned = async ({ data }) => {
        const now = Date.now();
        if (now - lastScanRef.current < 3000) return;
        lastScanRef.current = now;

        if (!badgeNumber) {
            Alert.alert('Erreur', 'Impossible de récupérer votre numéro de badge.');
            return;
        }

        const targetBadge = extractBadgeNumber(data);
        if (__DEV__) console.log('📷 [SCAN] raw:', data, '→ target:', targetBadge, '| me:', badgeNumber);
        if (!targetBadge) {
            Alert.alert('Badge inconnu', 'Ce QR Code ne semble pas être un badge valide.');
            return;
        }
        if (targetBadge.toLowerCase() === badgeNumber.toLowerCase()) {
            Alert.alert('Auto-scan', 'C\'est votre propre badge.');
            return;
        }

        setLoading(true);
        try {
            const res = await networkingScan(badgeNumber, targetBadge);
            if (res?.data?.success) {
                await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                setResult(res.data);
                setScanning(false);
            } else {
                const errMsg = res?.data?.message || 'Une erreur est survenue.';
                const errCode = res?.data?.code;

                await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                if (errCode === 'ALREADY_CONNECTED') {
                    Alert.alert('Déjà connectés 🌿', errMsg);
                } else {
                    Alert.alert('Oups', errMsg);
                }
            }
        } catch (e) {
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            const status = e.response?.status;
            const msg = e.response?.data?.message;
            if (status === 401) {
                Alert.alert('Session expirée', 'Veuillez vous reconnecter.');
            } else if (status === 404) {
                Alert.alert('Badge introuvable', msg || 'Ce badge n\'est pas reconnu dans le système.');
            } else if (msg) {
                Alert.alert(status === 422 ? 'Info' : 'Oups', msg);
            } else {
                Alert.alert('Erreur réseau', `Code: ${status ?? 'inconnu'} — Vérifiez votre connexion.`);
            }
        } finally { setLoading(false); }
    };

    if (!scanning && !result) {
        return (
            <LinearGradient colors={BG_GRADIENT.colors} start={BG_GRADIENT.start} end={BG_GRADIENT.end} style={styles.root}>
                <StatusBar style="light" backgroundColor="#000000" />
                <View style={styles.center}>
                    <View style={styles.iconCircle}>
                        <Ionicons name="camera-outline" size={38} color={COLORS.primary} />
                    </View>
                    <Text style={styles.title}>Prêt pour une rencontre ?</Text>
                    <Text style={styles.sub}>
                        Ouvrez votre caméra et scannez le badge de votre futur collaborateur.
                    </Text>

                    <TouchableOpacity
                        onPress={async () => {
                            if (!permission?.granted) {
                                const res = await requestPermission();
                                if (!res.granted) {
                                    Alert.alert(
                                        'Caméra requise',
                                        'Veuillez autoriser l\'accès à la caméra dans les réglages de votre téléphone.',
                                    );
                                    return;
                                }
                            }
                            setScanning(true);
                        }}
                        style={styles.actionBtn}
                    >
                        <Text style={styles.actionText}>Lancer le scanner</Text>
                    </TouchableOpacity>

                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                        <Text style={styles.backText}>Plus tard</Text>
                    </TouchableOpacity>
                </View>
            </LinearGradient>
        );
    }

    if (loading) {
        return (
            <LinearGradient colors={BG_GRADIENT.colors} start={BG_GRADIENT.start} end={BG_GRADIENT.end} style={styles.loading}>
                <ActivityIndicator color={COLORS.secondary} size="large" />
                <Text style={styles.loadingText}>Connexion en cours...</Text>
            </LinearGradient>
        )
    }

    if (result) {
        return (
            <NetworkingModal
                visible={true}
                result={result}
                onClose={() => { setResult(null); navigation.goBack(); }}
                onScanAgain={() => { setResult(null); setScanning(true); }}
            />
        );
    }

    return (
        <View style={styles.root}>
            <StatusBar hidden={scanning} style="light" backgroundColor="#000000" />
            <CameraView
                style={StyleSheet.absoluteFillObject}
                facing="back"
                barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                onBarcodeScanned={loading ? undefined : handleBarcodeScanned}
            />
            <View style={styles.overlay}>
                <View style={styles.vignetteTop} />
                <View style={styles.frameContainer}>
                    <View style={styles.sideVignette} />
                    <View style={styles.frame}>
                        <View style={[styles.corner, styles.tl]} />
                        <View style={[styles.corner, styles.tr]} />
                        <View style={[styles.corner, styles.bl]} />
                        <View style={[styles.corner, styles.br]} />
                        <Animated.View style={[styles.glowLine, ambientStyle]} />
                    </View>
                    <View style={styles.sideVignette} />
                </View>
                <View style={styles.vignetteBottom}>
                    <Text style={styles.hintText}>Centrez le badge ici</Text>
                    <TouchableOpacity onPress={() => setScanning(false)} style={styles.closeCircle}>
                        <Text style={styles.closeIcon}>✕</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.xxl },
    iconCircle: {
        width: 80, height: 80, borderRadius: 40,
        backgroundColor: COLORS.bgCard, marginBottom: SPACING.xl,
        alignItems: 'center', justifyContent: 'center', ...SHADOWS.soft
    },
    iconEmoji: { fontSize: 36 },
    title: { fontSize: 24, fontWeight: '800', color: COLORS.textPrimary, textAlign: 'center', marginBottom: 12 },
    sub: { fontSize: 16, color: COLORS.textSecondary, textAlign: 'center', marginBottom: SPACING.xxxl, lineHeight: 24 },
    actionBtn: {
        width: '100%', height: 60, borderRadius: RADIUS.full,
        backgroundColor: COLORS.secondary, // Moss Green
        alignItems: 'center', justifyContent: 'center', ...SHADOWS.medium
    },
    actionText: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary },
    backBtn: { marginTop: SPACING.xl, padding: 10 },
    backText: { fontSize: 15, color: COLORS.textMuted, fontWeight: '600' },

    loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    loadingText: { marginTop: SPACING.md, fontSize: 16, color: COLORS.textSecondary, fontWeight: '600' },

    // Overlay
    overlay: { ...StyleSheet.absoluteFillObject },
    vignetteTop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
    frameContainer: { height: FRAME, flexDirection: 'row' },
    sideVignette: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
    vignetteBottom: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', paddingTop: 40 },
    frame: {
        width: FRAME, height: FRAME, position: 'relative',
        backgroundColor: 'transparent',
        borderRadius: RADIUS.lg, overflow: 'hidden'
    },
    corner: { position: 'absolute', width: 24, height: 24, borderColor: '#fff' },
    tl: { top: 0, left: 0, borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: RADIUS.md },
    tr: { top: 0, right: 0, borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: RADIUS.md },
    bl: { bottom: 0, left: 0, borderBottomWidth: 4, borderLeftWidth: 4, borderBottomLeftRadius: RADIUS.md },
    br: { bottom: 0, right: 0, borderBottomWidth: 4, borderRightWidth: 4, borderBottomRightRadius: RADIUS.md },
    glowLine: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: COLORS.secondary },
    hintText: { color: '#fff', fontSize: 16, fontWeight: '700', marginBottom: 60 },
    closeCircle: {
        width: 56, height: 56, borderRadius: 28,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center', justifyContent: 'center'
    },
    closeIcon: { color: '#fff', fontSize: 20, fontWeight: '700' },
});
