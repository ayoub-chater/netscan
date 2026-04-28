import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    Dimensions, RefreshControl, Image,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { networkingHistory } from '../services/api';
import { COLORS, SPACING, RADIUS, SHADOWS, BG_GRADIENT, getRoleColor } from '../constants/theme';
import NetworkingModal from '../components/NetworkingModal';

const { width } = Dimensions.get('window');

const StatCard = ({ value, label, color }) => (
    <View style={[styles.statCard]}>
        <View style={[styles.statValueCircle, { backgroundColor: color + '22' }]}>
            <Text style={[styles.statValue, { color: color }]}>{value}</Text>
        </View>
        <Text style={styles.statLabel}>{label}</Text>
    </View>
);

const CountdownBox = ({ value, label }) => (
    <View style={styles.countdownBoxContainer}>
        <View style={styles.countdownBox}>
            <Text style={styles.countdownValue}>{value}</Text>
        </View>
        <Text style={styles.countdownLabel}>{label}</Text>
    </View>
);

const ActivityItem = ({ item, onPress }) => {
    const role = item?.person?.role || '';
    const roleColor = getRoleColor(role);
    return (
        <TouchableOpacity style={styles.activityCard} onPress={() => onPress(item)}>
            <View style={[styles.avatar, { backgroundColor: roleColor + '15' }]}>
                <Text style={[styles.avatarText, { color: roleColor }]}>
                    {(item?.person?.name || '?')[0].toUpperCase()}
                </Text>
            </View>
            <View style={styles.activityCore}>
                <Text style={styles.activityName}>{item?.person?.name || 'Inconnu'}</Text>
                <Text style={styles.activitySub}>
                    {item?.person?.company || 'Indépendant'} • <Text style={{ color: roleColor, fontWeight: '700' }}>{role}</Text>
                </Text>
            </View>
            <View style={styles.activityTime}>
                <Text style={styles.timeText}>
                    {item.scanned_at
                        ? new Date(item.scanned_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
                        : ''}
                </Text>
            </View>
        </TouchableOpacity>
    );
};

export default function HomeScreen({ navigation }) {
    const { scanner, badgeNumber, eventInfo, signOut } = useAuth();
    const insets = useSafeAreaInsets();
    const [history, setHistory] = useState([]);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);
    const [badgeModalVisible, setBadgeModalVisible] = useState(false);
    const [timeLeft, setTimeLeft] = useState({ d: '00', h: '00', m: '00', s: '00' });
    const [displayedHi, setDisplayedHi] = useState('');
    const [displayedName, setDisplayedName] = useState('');

    const loadHistory = async () => {
        if (!badgeNumber) return;
        try {
            const res = await networkingHistory(badgeNumber);
            setHistory(res?.data?.history || []);
        } catch { }
        finally { setRefreshing(false); }
    };

    useFocusEffect(
        React.useCallback(() => {
            loadHistory();
        }, [badgeNumber])
    );

    useFocusEffect(
        React.useCallback(() => {
            const fullHi = "Bonjour,";
            const fullName = scanner?.name || 'Ami';
            let hiIndex = 0;
            let nameIndex = 0;
            let timeout1, timeout2;

            setDisplayedHi('');
            setDisplayedName('');

            const typeHi = () => {
                if (hiIndex < fullHi.length) {
                    setDisplayedHi(fullHi.slice(0, hiIndex + 1));
                    hiIndex++;
                    timeout1 = setTimeout(typeHi, 40);
                } else {
                    timeout1 = setTimeout(typeName, 100);
                }
            };

            const typeName = () => {
                if (nameIndex < fullName.length) {
                    setDisplayedName(fullName.slice(0, nameIndex + 1));
                    nameIndex++;
                    timeout2 = setTimeout(typeName, 40);
                }
            };

            timeout1 = setTimeout(typeHi, 300);

            return () => {
                clearTimeout(timeout1);
                clearTimeout(timeout2);
            };
        }, [scanner?.name])
    );

    // Countdown Timer logic
    useEffect(() => {
        if (!eventInfo?.start_date) return;

        const timer = setInterval(() => {
            const target = new Date(eventInfo.start_date);
            const now = new Date();
            const diff = target - now;

            if (diff <= 0) {
                setTimeLeft({ d: '00', h: '00', m: '00', s: '00' });
                clearInterval(timer);
                return;
            }

            const d = Math.floor(diff / (1000 * 60 * 60 * 24));
            const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
            const m = Math.floor((diff / (1000 * 60)) % 60);
            const s = Math.floor((diff / 1000) % 60);

            setTimeLeft({
                d: d.toString().padStart(2, '0'),
                h: h.toString().padStart(2, '0'),
                m: m.toString().padStart(2, '0'),
                s: s.toString().padStart(2, '0')
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [eventInfo?.start_date]);

    const onRefresh = () => {
        setRefreshing(true);
        loadHistory();
    };

    const scannerName = scanner?.name || 'Ami';
    const todayCount = history.filter(h => {
        if (!h.scanned_at) return false;
        return new Date(h.scanned_at).toDateString() === new Date().toDateString();
    }).length;

    const currentDayIndex = (new Date().getDay() + 6) % 7; // Monday = 0, Tuesday = 1...

    return (
        <LinearGradient colors={BG_GRADIENT.colors} start={BG_GRADIENT.start} end={BG_GRADIENT.end} style={styles.root}>
            <StatusBar style="light" backgroundColor="#000000" />

            <View style={{ height: insets.top, backgroundColor: '#000000' }} />
            <StatusBar style="light" backgroundColor="#000000" />

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scroll}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.secondary} />
                }
            >
                {/* Unified Header inside ScrollView */}
                <View style={styles.header}>
                    <View style={{ minHeight: 70, justifyContent: 'center' }}>
                        <Text style={styles.hiText}>{displayedHi || '\u200B'}</Text>
                        <Text style={styles.nameText}>{displayedName || '\u200B'}</Text>
                    </View>
                </View>

                <View style={styles.daySelector}>
                    {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((d, i) => (
                        <View key={d} style={[styles.dayItem, i === currentDayIndex && styles.dayItemActive]}>
                            <Text style={[styles.dayText, i === currentDayIndex && styles.dayTextActive]}>{d}</Text>
                            <View style={[styles.dayDot, i === currentDayIndex && styles.dayDotActive]} />
                        </View>
                    ))}
                </View>

                <TouchableOpacity
                    style={styles.badgeBannerContainer}
                    onPress={() => setBadgeModalVisible(true)}
                    activeOpacity={0.8}
                >
                    <Image
                        source={require('../../assets/banner-badge.png')}
                        style={styles.badgeBanner}
                        resizeMode="cover"
                    />
                </TouchableOpacity>

                <View style={styles.countdownContainer}>
                    <CountdownBox value={timeLeft.d} label="Jours" />
                    <Text style={styles.countdownSeparator}>:</Text>
                    <CountdownBox value={timeLeft.h} label="Heures" />
                    <Text style={styles.countdownSeparator}>:</Text>
                    <CountdownBox value={timeLeft.m} label="Minutes" />
                    <Text style={styles.countdownSeparator}>:</Text>
                    <CountdownBox value={timeLeft.s} label="Secondes" />
                </View>

                <TouchableOpacity
                    style={styles.banner}
                    onPress={() => navigation.navigate('Scanner')}
                    activeOpacity={0.9}
                >
                    <View style={styles.bannerContent}>
                        <Text style={styles.bannerTitle}>Prêt à Networker ?</Text>
                        <Text style={styles.bannerSub}>Scannez un badge pour capturer l'instant et rester connecté.</Text>
                        <View style={styles.bannerBtn}>
                            <Text style={styles.bannerBtnText}>Ouvrir le scanner</Text>
                        </View>
                    </View>
                    <View style={styles.bannerVisual}>
                    </View>
                </TouchableOpacity>

                <View style={styles.statsRow}>
                    <StatCard value={todayCount} label="Scans (Auj.)" color={COLORS.secondary} />
                    <StatCard value={history.length} label="Total Reseau" color={COLORS.primary} />
                </View>

                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Journal de Rencontres</Text>
                        <TouchableOpacity onPress={() => navigation.navigate('Journal')}>
                            <Text style={styles.seeAll}>Voir tout</Text>
                        </TouchableOpacity>
                    </View>

                    {history.length === 0 ? (
                        <View style={styles.empty}>
                            <Text style={styles.emptyIcon}>🪴</Text>
                            <Text style={styles.emptyText}>Votre jardin est vide</Text>
                            <Text style={styles.emptySub}>Commencer par networker pour voir l'historique de vos connexions.</Text>
                        </View>
                    ) : (
                        history.slice(0, 4).map((item, index) => (
                            <ActivityItem key={item.id || index} item={item} onPress={setSelectedItem} />
                        ))
                    )}
                </View>

                <View style={{ height: 120 }} />
            </ScrollView>

            <NetworkingModal
                visible={!!selectedItem}
                result={selectedItem}
                viewOnly={true}
                onClose={() => setSelectedItem(null)}
            />

            {badgeModalVisible && (
                <View style={styles.modalOverlay}>
                    <View style={styles.badgeModal}>
                        <Text style={styles.modalEmoji}>🎫</Text>
                        <Text style={styles.modalTitle}>Demande de Badge</Text>
                        <Text style={styles.modalText}>
                            Votre badge sera disponible deux semaines avant le début de l'événement. Veuillez patienter encore un peu !
                        </Text>
                        <TouchableOpacity style={styles.modalBtn} onPress={() => setBadgeModalVisible(false)}>
                            <Text style={styles.modalBtnText}>D'accord</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1 },
    scroll: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.md },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 0,
        marginBottom: SPACING.md,
    },
    hiText: { fontSize: 26, color: COLORS.textPrimary, fontWeight: '400', marginRight: 6 },
    nameText: { fontSize: 26, color: COLORS.textPrimary, fontWeight: '800' },
    daySelector: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: SPACING.xs, // Reduced margin
        paddingHorizontal: 4,
    },
    dayItem: { alignItems: 'center', padding: 8, borderRadius: RADIUS.md },
    dayItemActive: { backgroundColor: COLORS.primary },
    dayText: { fontSize: 13, color: COLORS.textMuted, fontWeight: '600' },
    dayTextActive: { color: COLORS.textInvert },
    dayDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: 'transparent', marginTop: 4 },
    dayDotActive: { backgroundColor: COLORS.textInvert },
    banner: {
        backgroundColor: '#E0F2FE', // Modern Glass/Slate Blue instead of yellow
        borderRadius: RADIUS.lg,
        padding: SPACING.lg,
        flexDirection: 'row',
        marginBottom: SPACING.xl,
        ...SHADOWS.medium,
    },
    bannerContent: { flex: 1 },
    bannerTitle: { fontSize: 20, fontWeight: '800', color: COLORS.textPrimary },
    bannerSub: { fontSize: 13, color: COLORS.textPrimary, opacity: 0.7, marginTop: 4, lineHeight: 18 },
    bannerBtn: {
        backgroundColor: COLORS.bgCard,
        paddingHorizontal: 16, paddingVertical: 8,
        borderRadius: RADIUS.full, alignSelf: 'flex-start',
        marginTop: SPACING.md,
    },
    bannerBtnText: { fontSize: 13, fontWeight: '700', color: COLORS.textPrimary },
    bannerVisual: { justifyContent: 'center', paddingLeft: SPACING.md },
    bannerEmoji: { fontSize: 48 },
    statsRow: { flexDirection: 'row', gap: SPACING.lg, marginBottom: SPACING.xl },
    statCard: {
        flex: 1, backgroundColor: COLORS.bgCard,
        borderRadius: RADIUS.lg, padding: SPACING.lg,
        alignItems: 'center', ...SHADOWS.soft,
    },
    statValueCircle: {
        width: 64, height: 64, borderRadius: RADIUS.full,
        alignItems: 'center', justifyContent: 'center',
        marginBottom: SPACING.sm,
    },
    statValue: { fontSize: 28, fontWeight: '800' },
    statLabel: { fontSize: 13, color: COLORS.textMuted, fontWeight: '600' },
    section: {},
    sectionHeader: {
        flexDirection: 'row', justifyContent: 'space-between',
        alignItems: 'flex-end', marginBottom: SPACING.lg
    },
    sectionTitle: { fontSize: 18, fontWeight: '800', color: COLORS.textPrimary },
    seeAll: { fontSize: 14, color: COLORS.secondary, fontWeight: '700' },
    activityCard: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: COLORS.bgCard, borderRadius: RADIUS.md,
        padding: SPACING.md, marginBottom: SPACING.sm,
        ...SHADOWS.soft,
    },
    avatar: { width: 48, height: 48, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center' },
    avatarText: { fontSize: 18, fontWeight: '800' },
    activityCore: { flex: 1, marginLeft: SPACING.md },
    activityName: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary },
    activitySub: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
    activityTime: { opacity: 0.5 },
    timeText: { fontSize: 11, fontWeight: '600', color: COLORS.textMuted },
    empty: {
        alignItems: 'center', paddingVertical: SPACING.xl,
        backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg,
        borderWidth: 2, borderColor: COLORS.border, borderStyle: 'dotted',
    },
    emptyIcon: { fontSize: 40, marginBottom: SPACING.md },
    emptyText: { fontSize: 16, fontWeight: '700', color: COLORS.textSecondary },
    emptySub: { fontSize: 12, color: COLORS.textMuted, textAlign: 'center', marginTop: 8, paddingHorizontal: 40, lineHeight: 18 },
    countdownContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: SPACING.md, // Reduced bottom margin
        paddingTop: 0, // Removed top padding to bring it closer to days
        paddingBottom: SPACING.sm, // Reduced bottom padding
    },
    countdownBoxContainer: {
        alignItems: 'center',
        marginHorizontal: 4,
    },
    countdownBox: {
        backgroundColor: '#0E4DA4', // Deep Blue matching the badge branding
        width: 60, // Smaller boxes as requested
        height: 60,
        borderRadius: RADIUS.md,
        alignItems: 'center',
        justifyContent: 'center',
        ...SHADOWS.medium,
    },
    countdownValue: {
        fontSize: 18, // Slightly reduced font for smaller boxes
        fontWeight: '800',
        color: '#FFFFFF',
    },
    countdownLabel: {
        fontSize: 11,
        color: COLORS.textMuted,
        fontWeight: '700',
        marginTop: 2,
        textTransform: 'capitalize',
    },
    countdownSeparator: {
        fontSize: 24,
        color: COLORS.textMuted,
        fontWeight: '400',
        marginBottom: 18, // Adjusted for smaller boxes
    },
    badgeBannerContainer: {
        width: '100%',
        height: 140,
        borderRadius: RADIUS.lg,
        overflow: 'hidden',
        marginBottom: SPACING.xl,
        ...SHADOWS.medium,
    },
    badgeBanner: {
        width: '100%',
        height: '100%',
    },
    modalOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'transparent',
        justifyContent: 'center',
        alignItems: 'center',
        padding: SPACING.xl,
        zIndex: 999,
    },
    badgeModal: {
        backgroundColor: COLORS.bgCard,
        borderRadius: RADIUS.xl,
        padding: SPACING.xl,
        width: '100%',
        alignItems: 'center',
        ...SHADOWS.medium,
    },
    modalEmoji: { fontSize: 44, marginBottom: SPACING.md },
    modalTitle: { fontSize: 20, fontWeight: '800', color: COLORS.textPrimary, marginBottom: SPACING.sm },
    modalText: {
        fontSize: 15, color: COLORS.textSecondary,
        textAlign: 'center', lineHeight: 22,
        marginBottom: SPACING.xl,
    },
    modalBtn: {
        backgroundColor: COLORS.primary,
        paddingHorizontal: 32, paddingVertical: 12,
        borderRadius: RADIUS.full,
    },
    modalBtnText: { color: COLORS.textInvert, fontWeight: '700', fontSize: 16 },
});
