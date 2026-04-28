import React, { useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView,
    Alert, Switch, Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { COLORS, SPACING, RADIUS, SHADOWS, BG_GRADIENT } from '../constants/theme';

const SettingItem = ({ label, value, onPress, isSwitch, onSwitchChange, subValue, textColor }) => (
    <TouchableOpacity
        style={styles.settingItem}
        onPress={onPress}
        disabled={isSwitch}
        activeOpacity={0.7}
    >
        <View style={styles.settingMain}>
            <Text style={[styles.settingLabel, textColor && { color: textColor }]}>{label}</Text>
            {subValue && <Text style={styles.settingSubValue}>{subValue}</Text>}
        </View>
        {isSwitch ? (
            <Switch
                value={value}
                onValueChange={onSwitchChange}
                trackColor={{ false: COLORS.gray300, true: COLORS.secondary }}
                thumbColor="#fff"
            />
        ) : (
            <View style={styles.settingAction}>
                {value ? <Text style={styles.settingSimpleValue}>{value}</Text> : null}
                <Text style={styles.chevron}>›</Text>
            </View>
        )}
    </TouchableOpacity>
);

export default function ProfileScreen({ navigation }) {
    const { scanner, badgeNumber, exhibitorId, signOut } = useAuth();
    const insets = useSafeAreaInsets();
    const [biometrics, setBiometrics] = useState(true);

    const scannerRole = scanner?.role || 'Visiteur';
    const isExposant = scannerRole.toLowerCase() === 'exposant';

    const handleLogout = () => {
        Alert.alert('Au revoir', 'Souhaitez-vous fermer votre session ?', [
            { text: 'Rester', style: 'cancel' },
            { text: 'Déconnexion', style: 'destructive', onPress: signOut },
        ]);
    };

    const scannerName = scanner?.name || 'Utilisateur';

    return (
        <LinearGradient colors={BG_GRADIENT.colors} start={BG_GRADIENT.start} end={BG_GRADIENT.end} style={styles.root}>
            <View style={{ height: insets.top, backgroundColor: '#000000' }} />
            <StatusBar style="light" backgroundColor="#000000" />

            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
                <View style={[styles.header]}>
                    <Text style={styles.title}>Paramètres</Text>
                </View>

                {/* Profile Header */}
                <View style={styles.profileBox}>
                    <View style={styles.avatarLarge}>
                        <Text style={styles.avatarTextLarge}>
                            {scannerName[0].toUpperCase()}
                        </Text>
                    </View>
                    <View style={styles.profileMeta}>
                        <Text style={styles.scannerName}>{scannerName}</Text>
                        <Text style={styles.scannerEmail}>{scanner?.email}</Text>
                        <View style={styles.roleBadge}>
                            <Text style={styles.roleBadgeText}>{scannerRole}</Text>
                        </View>
                    </View>
                </View>

                {/* SECTION: IDENTITY */}
                <Text style={styles.sectionHeader}>Mon Identité</Text>
                <View style={styles.group}>
                    <SettingItem
                        label="Rôle"
                        value={scannerRole}
                        onPress={() => { }}
                    />
                    <View style={styles.divider} />
                    <SettingItem
                        label="Badge Relié"
                        value={badgeNumber || 'Aucun badge relié'}
                        onPress={() => { }}
                    />
                </View>

                {/* SECTION: SUPPORT */}
                <Text style={styles.sectionHeader}>À Propos</Text>
                <View style={styles.group}>
                    <SettingItem label="Aide et Support" onPress={() => { }} />
                    <View style={styles.divider} />
                    <SettingItem label="Mentions Légales" onPress={() => { }} />
                </View>

                {/* Logout */}
                <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
                    <Text style={styles.logoutText}>Se déconnecter de NetScan</Text>
                </TouchableOpacity>

                <Text style={styles.version}>Version 1.2.0 • "Mindful Edition"</Text>
            </ScrollView>

        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1 },
    scroll: { paddingBottom: 140 },
    header: {
        paddingTop: SPACING.md,
        paddingHorizontal: SPACING.lg,
        marginBottom: SPACING.xl,
    },
    title: { fontSize: 28, fontWeight: '800', color: COLORS.textPrimary },

    profileBox: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: SPACING.lg,
        padding: SPACING.lg,
        backgroundColor: COLORS.bgCard,
        borderRadius: RADIUS.lg,
        marginBottom: SPACING.xxl,
        ...SHADOWS.soft,
    },
    avatarLarge: {
        width: 64, height: 64, borderRadius: RADIUS.md,
        backgroundColor: COLORS.secondary + '20',
        alignItems: 'center', justifyContent: 'center',
    },
    avatarTextLarge: { fontSize: 28, fontWeight: '800', color: COLORS.secondary },
    profileMeta: { marginLeft: SPACING.lg },
    scannerName: { fontSize: 20, fontWeight: '800', color: COLORS.textPrimary },
    scannerEmail: { fontSize: 13, color: COLORS.textSecondary, marginTop: 4 },
    roleBadge: {
        alignSelf: 'flex-start',
        backgroundColor: COLORS.secondary + '22',
        paddingHorizontal: 10,
        paddingVertical: 3,
        borderRadius: RADIUS.full,
        marginTop: 6,
    },
    roleBadgeText: { fontSize: 11, fontWeight: '800', color: COLORS.secondary, textTransform: 'uppercase', letterSpacing: 0.5 },

    sectionHeader: {
        fontSize: 13, fontWeight: '800', color: COLORS.textMuted,
        paddingHorizontal: SPACING.xl, marginBottom: SPACING.sm,
        textTransform: 'uppercase', letterSpacing: 1,
    },
    group: {
        backgroundColor: COLORS.bgCard,
        marginHorizontal: SPACING.lg,
        borderRadius: RADIUS.lg,
        marginBottom: SPACING.xl,
        overflow: 'hidden',
        ...SHADOWS.soft,
    },
    settingItem: {
        flexDirection: 'row', alignItems: 'center',
        paddingVertical: 18, paddingHorizontal: SPACING.lg,
    },
    settingMain: { flex: 1 },
    settingLabel: { fontSize: 16, fontWeight: '600', color: COLORS.textPrimary },
    settingSubValue: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
    settingAction: { flexDirection: 'row', alignItems: 'center' },
    settingSimpleValue: { fontSize: 14, color: COLORS.secondary, fontWeight: '700', marginRight: 8 },
    chevron: { fontSize: 20, color: COLORS.borderStrong, marginLeft: 4 },
    divider: { height: 1, backgroundColor: COLORS.borderLight, marginLeft: SPACING.lg },

    logoutBtn: {
        marginHorizontal: SPACING.lg,
        height: 60, borderRadius: RADIUS.full,
        backgroundColor: '#FFE5E3',
        alignItems: 'center', justifyContent: 'center',
        marginTop: SPACING.md,
    },
    logoutText: { color: COLORS.danger, fontWeight: '700', fontSize: 15 },
    version: { textAlign: 'center', color: COLORS.textMuted, fontSize: 11, marginTop: SPACING.xxl },
});
