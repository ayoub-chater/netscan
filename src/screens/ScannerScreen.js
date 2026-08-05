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
import { useIsFocused } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { Button, Surface } from 'heroui-native';
import { useAuth } from '../context/AuthContext';
import { networkingScan } from '../services/api';
import NetworkingModal from '../components/NetworkingModal';
import MenuButton from '../components/MenuButton';
import { SafeAreaView } from 'react-native-safe-area-context';

const StyledIonicons = withUniwind(Ionicons);

const { width } = Dimensions.get('window');
const FRAME = 280;
const BLUE = '#286EAD';

export default function ScannerScreen({ navigation }) {
  const { t } = useTranslation();
  const { badgeNumber } = useAuth();
  const isFocused = useIsFocused();
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

  // This screen stays mounted as a tab, and its result sheet renders through a
  // global Portal — leaving it behind would keep the sheet (and the camera)
  // alive on top of whatever screen the user moved to.
  useEffect(() => {
    if (isFocused) return;
    setResult(null);
    setScanning(false);
  }, [isFocused]);

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
      Alert.alert(t('common.error'), t('scanner.errorNoBadge'));
      return;
    }

    const targetBadge = extractBadgeNumber(data);
    if (__DEV__) console.log('📷 [SCAN] raw:', data, '→ target:', targetBadge, '| me:', badgeNumber);

    if (!targetBadge) {
      Alert.alert(t('scanner.unknownBadgeTitle'), t('scanner.unknownBadgeBody'));
      return;
    }
    if (targetBadge.toLowerCase() === badgeNumber.toLowerCase()) {
      Alert.alert(t('scanner.selfScanTitle'), t('scanner.selfScanBody'));
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
        const errMsg = res?.data?.message || t('scanner.genericError');
        const errCode = res?.data?.code;
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        if (errCode === 'ALREADY_CONNECTED') {
          Alert.alert(t('scanner.alreadyConnectedTitle'), errMsg);
        } else {
          Alert.alert(t('scanner.oops'), errMsg);
        }
      }
    } catch (e) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      const status = e.response?.status;
      const msg = e.response?.data?.message;
      if (status === 401) {
        Alert.alert(t('auth.sessionExpiredTitle'), t('scanner.reconnect'));
      } else if (status === 404) {
        Alert.alert(t('scanner.badgeNotFoundTitle'), msg || t('scanner.badgeNotFoundBody'));
      } else if (msg) {
        Alert.alert(status === 422 ? t('scanner.info') : t('scanner.oops'), msg);
      } else {
        Alert.alert(
          t('scanner.networkErrorTitle'),
          t('scanner.networkErrorBody', { code: status ?? t('scanner.unknownCode') })
        );
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Single render tree. NetworkingModal mounts its own sheet only once a
  // scan result exists and handles the false→true isOpen transition itself.
  return (
    <>
      {scanning ? (
        // ── Camera / scan state ─────────────────────────────────────────────
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
              <Text style={styles.hintText}>{t('scanner.centerBadge')}</Text>
              <Pressable onPress={() => setScanning(false)} style={styles.closeCircle}>
                <Ionicons name="close" size={22} color="#fff" />
              </Pressable>
            </View>
          </View>
        </View>
      ) : (
        // ── Welcome / loading state ─────────────────────────────────────────
        <View className="flex-1 bg-background items-center justify-center px-8">
          {/* This state has no header, and the camera state is deliberately
              chrome-free, so the menu lives here only. */}
          <SafeAreaView
            style={{ position: 'absolute', top: 0, left: 16 }}
            edges={['top']}
            pointerEvents="box-none"
          >
            <MenuButton style={{ marginTop: 20 }} />
          </SafeAreaView>
          {loading ? (
            <>
              <ActivityIndicator color={BLUE} size="large" />
              <Text className="mt-4 text-base text-muted font-semibold">
                {t('scanner.connecting')}
              </Text>
            </>
          ) : (
            <>
              <View className="w-20 h-20 rounded-full bg-surface items-center justify-center mb-8">
                <Ionicons name="camera-outline" size={38} color="#2db067" />
              </View>

              <Text className="text-2xl font-extrabold text-foreground text-center mb-3">
                {t('scanner.readyTitle')}
              </Text>
              <Text className="text-base text-muted text-center mb-10 leading-6">
                {t('scanner.readyBody')}
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
                        t('scanner.cameraRequiredTitle'),
                        t('scanner.cameraRequiredBody')
                      );
                      return;
                    }
                  }
                  setScanning(true);
                }}
              >
                <Button.Label>{t('scanner.launch')}</Button.Label>
              </Button>

              <Button
                variant="secondary"
                size="lg"
                className="rounded-2xl w-full mt-3"
                onPress={() => navigation.navigate('MyBadge')}
              >
                <Ionicons name="qr-code-outline" size={20} color={BLUE} />
                <Button.Label>{t('scanner.showMyQr')}</Button.Label>
              </Button>

              <Pressable
                onPress={() => {
                  if (navigation.canGoBack()) navigation.goBack();
                }}
                className="mt-6 p-2"
                hitSlop={8}
              >
                <Text className="text-sm text-muted font-semibold">{t('scanner.later')}</Text>
              </Pressable>
            </>
          )}
        </View>
      )}

      {/* Only while this screen is on top — the sheet renders in a global portal */}
      <NetworkingModal
        visible={isFocused && !!result}
        result={result}
        onClose={() => {
          setResult(null);
          setScanning(false);
          if (navigation.canGoBack()) navigation.goBack();
        }}
        onScanAgain={() => {
          setResult(null);
          setScanning(true);
        }}
      />
    </>
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
