import React, { useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView,
    Dimensions, Pressable, Platform, Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
    useSharedValue, useAnimatedStyle, withSpring, withTiming,
} from 'react-native-reanimated';
import { COLORS, SPACING, RADIUS, SHADOWS, BG_GRADIENT, getRoleColor } from '../constants/theme';
import { LinearGradient } from 'expo-linear-gradient';

const { height } = Dimensions.get('window');

const InfoRow = ({ label, value }) => {
    if (!value || value.toLowerCase() === 'vide') return null;
    return (
        <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{label}</Text>
            <Text style={styles.infoValue}>{value}</Text>
        </View>
    );
};

const PersonCard = ({ person, message, roleColor }) => (
    <View style={styles.personCard}>
        <View style={styles.personHeader}>
            <View style={[styles.avatar, { backgroundColor: roleColor + '15' }]}>
                <Text style={[styles.avatarText, { color: roleColor }]}>
                    {(person?.name || '?')[0].toUpperCase()}
                </Text>
            </View>
            <View style={styles.personMeta}>
                <Text style={styles.personName}>{person?.name}</Text>
                <Text style={[styles.roleLabel, { color: roleColor }]}>
                    {person?.role || 'Visiteur'}
                </Text>
            </View>
        </View>

        {!!message && (
            <View style={styles.messageBox}>
                <Text style={styles.messageText}>"{message}"</Text>
            </View>
        )}

        <View style={styles.infoGrid}>
            <InfoRow label="Organisation" value={person?.company} />
            <InfoRow label="Secteur" value={person?.secteur} />
            <InfoRow label="Email" value={person?.email} />
            <InfoRow label="Téléphone" value={person?.phone} />
            <InfoRow label="Ville" value={person?.ville} />
        </View>
    </View>
);

export default function NetworkingModal({ visible, result, onClose, onScanAgain, viewOnly = false }) {
    const translateY = useSharedValue(height);
    const backdropOpacity = useSharedValue(0);

    useEffect(() => {
        if (visible) {
            backdropOpacity.value = withTiming(1, { duration: 350 });
            translateY.value = withSpring(0, { damping: 24, stiffness: 130 });
        } else {
            backdropOpacity.value = withTiming(0, { duration: 250 });
            translateY.value = withTiming(height, { duration: 350 });
        }
    }, [visible]);

    const backdropStyle = useAnimatedStyle(() => ({ opacity: backdropOpacity.value }));
    const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }));

    if (!result && !visible) return null;

    // Support both direct person object (from history) and scanner_view wrapper (from scan)
    const targetPerson = result?.scanner_view?.person || result?.person;
    const message = result?.scanner_view?.message || (viewOnly ? "" : "Nouveau contact ajouté !");

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="none"
            onRequestClose={onClose}
        >
            <View style={styles.wrapper}>
                {/* Backdrop */}
                <Animated.View style={[styles.backdrop, backdropStyle]}>
                    <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
                </Animated.View>

                {/* Modal Content */}
                <Animated.View style={[styles.sheet, sheetStyle]}>
                  <LinearGradient colors={BG_GRADIENT.colors} start={BG_GRADIENT.start} end={BG_GRADIENT.end} style={StyleSheet.absoluteFillObject} />
                    <View style={styles.header}>
                        <View style={styles.handle} />
                        <Text style={styles.title}>{viewOnly ? 'Détails du Contact' : 'Nouvelle Connexion'}</Text>
                    </View>

                    <ScrollView
                        style={styles.scroll}
                        contentContainerStyle={styles.scrollContent}
                        showsVerticalScrollIndicator={false}
                    >
                        <View style={styles.successIconContainer}>
                            {viewOnly ? (
                                <Ionicons name="person-outline" size={34} color={COLORS.primary} />
                            ) : (
                                <Text style={styles.successEmoji}>✨</Text>
                            )}
                        </View>
                        <Text style={styles.successTitle}>{viewOnly ? targetPerson?.name : 'Moment Partagé !'}</Text>
                        <Text style={styles.successSub}>
                            {viewOnly
                                ? `Vous êtes connecté avec ${targetPerson?.name} depuis le journal.`
                                : `Vous avez échangé vos profils avec succès. Retrouvez ${targetPerson?.name} dans votre journal.`
                            }
                        </Text>

                        <PersonCard
                            person={targetPerson}
                            message={message}
                            roleColor={getRoleColor(targetPerson?.role)}
                        />

                        <View style={styles.privacyNote}>
                            <Text style={styles.privacyText}>
                                🌿 Vos informations ont également été partagées avec cet interlocuteur.
                            </Text>
                        </View>
                    </ScrollView>

                    <View style={styles.footer}>
                        {!viewOnly && (
                            <TouchableOpacity onPress={onScanAgain} style={styles.secondaryBtn}>
                                <Text style={styles.secondaryBtnText}>Scanner un autre</Text>
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity onPress={onClose} style={styles.primaryBtn}>
                            <Text style={styles.primaryBtnText}>{viewOnly ? 'Fermer' : 'Terminer'}</Text>
                        </TouchableOpacity>
                    </View>
                </Animated.View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    wrapper: { ...StyleSheet.absoluteFillObject, justifyContent: 'flex-end', zIndex: 1000 },
    backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'transparent' },

    sheet: {
        height: height * 0.78,
        borderTopLeftRadius: RADIUS.xl,
        borderTopRightRadius: RADIUS.xl,
        overflow: 'hidden',
    },
    header: {
        alignItems: 'center',
        paddingVertical: SPACING.md,
    },
    handle: {
        width: 40, height: 5, borderRadius: 2.5,
        backgroundColor: COLORS.borderStrong, marginBottom: SPACING.sm,
    },
    title: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary },

    scroll: { flex: 1 },
    scrollContent: { padding: SPACING.lg, paddingBottom: SPACING.xxxl, alignItems: 'center' },

    successIconContainer: {
        width: 72, height: 72, borderRadius: 36,
        backgroundColor: COLORS.bgCard, // Replaced yellow with clean background
        alignItems: 'center', justifyContent: 'center',
        marginBottom: SPACING.md, ...SHADOWS.soft,
        borderWidth: 1, borderColor: COLORS.borderLight,
    },
    successEmoji: { fontSize: 32 },
    successTitle: { fontSize: 24, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 8 },
    successSub: {
        fontSize: 14, color: COLORS.textSecondary, textAlign: 'center',
        lineHeight: 20, marginBottom: SPACING.xl, paddingHorizontal: 20
    },

    // Person Card
    personCard: {
        width: '100%',
        backgroundColor: COLORS.bgCard,
        borderRadius: RADIUS.lg,
        padding: SPACING.xl,
        ...SHADOWS.soft,
        marginBottom: SPACING.xl,
    },
    personHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.lg },
    avatar: { width: 56, height: 56, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center' },
    avatarText: { fontSize: 22, fontWeight: '800' },
    personMeta: { marginLeft: SPACING.md },
    personName: { fontSize: 20, fontWeight: '800', color: COLORS.textPrimary },
    roleLabel: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginTop: 2 },

    messageBox: {
        backgroundColor: COLORS.bg,
        padding: SPACING.md, borderRadius: RADIUS.md,
        marginBottom: SPACING.lg, borderStyle: 'italic'
    },
    messageText: { fontSize: 14, color: COLORS.textSecondary, fontStyle: 'italic', lineHeight: 20 },

    infoGrid: { gap: SPACING.sm },
    infoRow: {
        flexDirection: 'row', justifyContent: 'space-between',
        paddingVertical: SPACING.xs,
        borderBottomWidth: 1, borderColor: COLORS.borderLight,
    },
    infoLabel: { fontSize: 13, color: COLORS.textMuted, fontWeight: '600' },
    infoValue: { fontSize: 13, color: COLORS.textPrimary, fontWeight: '700' },

    privacyNote: {
        backgroundColor: COLORS.bgCard,
        padding: SPACING.md, borderRadius: RADIUS.full,
        ...SHADOWS.soft, width: '100%',
    },
    privacyText: { fontSize: 12, color: COLORS.textSecondary, textAlign: 'center', fontWeight: '500' },

    footer: {
        padding: SPACING.lg,
        paddingBottom: 40,
        flexDirection: 'row', gap: SPACING.md,
        backgroundColor: 'transparent',
    },
    primaryBtn: {
        flex: 1, height: 56, backgroundColor: COLORS.primary,
        borderRadius: RADIUS.full, alignItems: 'center', justifyContent: 'center',
        ...SHADOWS.soft,
    },
    primaryBtnText: { color: COLORS.textInvert, fontSize: 16, fontWeight: '700' },
    secondaryBtn: {
        flex: 1, height: 56, backgroundColor: COLORS.bgCard,
        borderRadius: RADIUS.full, alignItems: 'center', justifyContent: 'center',
        borderWidth: 1, borderColor: COLORS.borderStrong,
    },
    secondaryBtnText: { color: COLORS.textPrimary, fontSize: 16, fontWeight: '600' },
});
