import React, { useState } from 'react';
import { View, StyleSheet, ActivityIndicator, Text, TouchableOpacity } from 'react-native';
import { WebView } from 'react-native-webview';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../constants/theme';
import { StatusBar } from 'expo-status-bar';

export default function WebsiteScreen() {
    const insets = useSafeAreaInsets();
    const [key, setKey] = useState(0);

    const renderError = () => (
        <View style={styles.errorContainer}>
            <Text style={styles.errorEmoji}>🌐</Text>
            <Text style={styles.errorTitle}>Problème de connexion</Text>
            <Text style={styles.errorSub}>
                Assurez-vous que votre téléphone est connecté à Internet (WiFi ou Data) pour accéder au site.
            </Text>
            <TouchableOpacity
                style={styles.retryBtn}
                onPress={() => setKey(k => k + 1)}
            >
                <Text style={styles.retryText}>Réessayer</Text>
            </TouchableOpacity>
        </View>
    );

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <StatusBar style="light" backgroundColor="#000000" />
            <WebView
                key={key}
                source={{ uri: 'https://logiterre-expo.com/' }}
                style={styles.webview}
                startInLoadingState={true}
                renderLoading={() => (
                    <View style={styles.loading}>
                        <ActivityIndicator color={COLORS.secondary} size="large" />
                    </View>
                )}
                renderError={renderError}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.bg,
    },
    webview: {
        flex: 1,
    },
    loading: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: COLORS.bg,
        justifyContent: 'center',
        alignItems: 'center',
    },
    errorContainer: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: COLORS.bg,
        justifyContent: 'center',
        alignItems: 'center',
        padding: SPACING.xl,
    },
    errorEmoji: { fontSize: 60, marginBottom: SPACING.lg },
    errorTitle: { fontSize: 22, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 8 },
    errorSub: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: SPACING.xl },
    retryBtn: {
        paddingHorizontal: 24,
        paddingVertical: 12,
        backgroundColor: COLORS.primary,
        borderRadius: RADIUS.full,
        ...SHADOWS.soft,
    },
    retryText: { fontWeight: '700', color: COLORS.textPrimary }
});
