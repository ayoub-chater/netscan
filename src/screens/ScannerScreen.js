import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Dimensions,
  Alert,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { withUniwind } from 'uniwind';
import { Button, Surface } from 'heroui-native';
import { useAuth } from '../context/AuthContext';
import { networkingScan } from '../services/api';
import NetworkingModal from '../components/NetworkingModal';

const StyledIonicons = withUniwind(Ionicons);

const { width } = Dimensions.get('window');
const FRAME = 280;
const BLUE = '#286EAD';

export default function ScannerScreen({ navigation }) {
  const { badgeNumber } = useAuth();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const lastScanRef = useRef(0);

  const ambientOpacity = useSharedValue(0.12);

  useEffect(() => {
    ambientOpacity.value = withRepeat(
      withTiming(0.45, { duration: 1200, easing: Easing.inOut(Easing.sin) }),
      -1,
      true
    );
  }, []);

  const ambientStyle = useAnimatedStyle(() => ({ opacity: ambientOpacity.value }));

  const extractBadgeNumber = (qrData) => {
    if (!qrData) return null;
    const trimmed = qrData.trim();
    const looksLikeBadge = (s) =>
      /^(VIS|EXP|SPO|ORG|INT|PAR|INS|PRS)-[A-Z0-9\-]+$/i.test(s);
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
      Alert.alert('Auto-scan', "C'est votre propre badge.");
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
        Alert.alert('Badge introuvable', msg || "Ce badge n'est pas reconnu dans le système.");
      } else if (msg) {
        Alert.alert(status === 422 ? 'Info' : 'Oups', msg);
      } else {
        Alert.alert('Erreur réseau', `Code: ${status ?? 'inconnu'} — Vérifiez votre connexion.`);
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Welcome state ────────────────────────────────────────────────────────────
  if (!scanning && !result) {
    return (
      <View className="flex-1 bg-background items-center justify-center px-8">
        <StatusBar style="light" />

        <View className="w-20 h-20 rounded-full bg-surface items-center justify-center mb-8">
          <Ionicons name="camera-outline" size={38} color="#2db067" />
        </View>

        <Text className="text-2xl font-extrabold text-foreground text-center mb-3">
          Prêt pour une rencontre ?
        </Text>
        <Text className="text-base text-muted text-center mb-10 leading-6">
          Ouvrez votre caméra et scannez le badge de votre futur collaborateur.
        </Text>

        <Button
          variant="primary"
          size="lg"
          className="rounded-2xl w-full"
          onPress={async () => {
            if (!permission?.granted) {
              const res = await requestPermission();
              if (!res.granted) {
                Alert.alert(
                  'Caméra requise',
                  "Veuillez autoriser l'accès à la caméra dans les réglages de votre téléphone."
                );
                return;
              }
            }
            setScanning(true);
          }}
        >
          <Button.Label>Lancer le scanner</Button.Label>
        </Button>

        <Pressable onPress={() => navigation.goBack()} className="mt-6 p-2" hitSlop={8}>
          <Text className="text-sm text-muted font-semibold">Plus tard</Text>
        </Pressable>
      </View>
    );
  }

  // ── Loading state ────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View className="flex-1 bg-background items-center justify-center">
        <StatusBar style="light" />
        <ActivityIndicator color={BLUE} size="large" />
        <Text className="mt-4 text-base text-muted font-semibold">
          Connexion en cours...
        </Text>
      </View>
    );
  }

  // ── Result state ─────────────────────────────────────────────────────────────
  if (result) {
    return (
      <NetworkingModal
        visible
        result={result}
        onClose={() => {
          setResult(null);
          navigation.goBack();
        }}
        onScanAgain={() => {
          setResult(null);
          setScanning(true);
        }}
      />
    );
  }

  // ── Camera / scan state ──────────────────────────────────────────────────────
  return (
    <View style={styles.root}>
      <StatusBar hidden style="light" />
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
          {/* Blue scan frame */}
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
          <Pressable onPress={() => setScanning(false)} style={styles.closeCircle}>
            <Ionicons name="close" size={22} color="#fff" />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  overlay: { ...StyleSheet.absoluteFillObject },
  vignetteTop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' },
  frameContainer: { height: FRAME, flexDirection: 'row' },
  sideVignette: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' },
  vignetteBottom: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    paddingTop: 40,
  },
  frame: {
    width: FRAME,
    height: FRAME,
    position: 'relative',
    backgroundColor: 'transparent',
    borderRadius: 16,
    overflow: 'hidden',
  },
  // Blue corners
  corner: { position: 'absolute', width: 28, height: 28, borderColor: BLUE },
  tl: { top: 0, left: 0, borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: 10 },
  tr: { top: 0, right: 0, borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: 10 },
  bl: { bottom: 0, left: 0, borderBottomWidth: 4, borderLeftWidth: 4, borderBottomLeftRadius: 10 },
  br: { bottom: 0, right: 0, borderBottomWidth: 4, borderRightWidth: 4, borderBottomRightRadius: 10 },
  // Blue pulse line
  glowLine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: BLUE,
  },
  hintText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 60,
    letterSpacing: 0.3,
  },
  closeCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
});
