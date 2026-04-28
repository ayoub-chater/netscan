import { useState, useCallback, useEffect } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    Image, Modal, RefreshControl, Linking,
    ActivityIndicator, TextInput, Dimensions, Pressable, ScrollView,
} from 'react-native';
import Animated, {
    useSharedValue, useAnimatedStyle, withSpring, withTiming,
    useAnimatedScrollHandler, interpolate
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getExposants, networkingHistory } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { COLORS, SPACING, RADIUS, BG_GRADIENT, SHADOWS } from '../constants/theme';

const { height } = Dimensions.get('window');

// ─── Category filter chips ────────────────────────────────────────────────────

const CATEGORIES = ['Tous', 'Tech', 'Startups', 'AI', 'Finance', 'Santé', 'Logistique'];

// ─── Exposant card ────────────────────────────────────────────────────────────

const ExposantCard = ({ item, isMine, onPress }) => {
    const displayName = item.company || item.name;
    const initials = displayName ? displayName.slice(0, 2).toUpperCase() : '??';
    const sector = item.secteur || null;

    return (
        <View style={[styles.card, isMine && styles.cardMine]}>
            {/* Header row: logo + sector badge */}
            <View style={styles.cardTop}>
                {item.logo ? (
                    <Image source={{ uri: item.logo }} style={styles.cardLogo} resizeMode="contain" />
                ) : (
                    <View style={[styles.cardAvatar, isMine && styles.cardAvatarMine]}>
                        <Text style={[styles.cardInitials, isMine && { color: '#fff' }]}>{initials}</Text>
                    </View>
                )}
                {sector ? (
                    <View style={styles.sectorBadge}>
                        <Text style={styles.sectorBadgeText}>{sector.toUpperCase()}</Text>
                    </View>
                ) : null}
                {isMine && (
                    <View style={styles.meBadge}>
                        <Text style={styles.meBadgeText}>MOI</Text>
                    </View>
                )}
            </View>

            {/* Name & description */}
            <Text style={[styles.cardName, isMine && { color: COLORS.primary }]} numberOfLines={1}>
                {displayName}
            </Text>
            {item.description ? (
                <Text style={styles.cardDesc} numberOfLines={3}>{item.description}</Text>
            ) : item.email ? (
                <Text style={styles.cardDesc} numberOfLines={1}>{item.email}</Text>
            ) : null}

            {/* Detail button */}
            <TouchableOpacity
                style={[styles.detailBtn, isMine && { backgroundColor: COLORS.primary }]}
                onPress={() => onPress(item)}
                activeOpacity={0.85}
            >
                <Text style={[styles.detailBtnText, isMine && { color: '#fff' }]}>
                    {isMine ? 'Mon profil' : 'Voir détails'}
                </Text>
            </TouchableOpacity>
        </View>
    );
};

// ─── Detail bottom-sheet ──────────────────────────────────────────────────────

const DetailModal = ({ exposant, visible, isMine, onClose, onTeam }) => {
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

    if (!exposant && !visible) return null;

    const displayName = exposant ? (exposant.company || exposant.name) : '';
    const initials = displayName ? displayName.slice(0, 2).toUpperCase() : '??';

    const openLink = (url) => {
        if (!url) return;
        const prefixed = url.startsWith('http') ? url : `https://${url}`;
        Linking.openURL(prefixed).catch(() => { });
    };

    const InfoRow = ({ icon, label, value, onPress }) => {
        if (!value) return null;
        return (
            <TouchableOpacity
                style={styles.infoRow}
                onPress={onPress}
                disabled={!onPress}
                activeOpacity={onPress ? 0.7 : 1}
            >
                <View style={styles.infoIconWrap}>
                    <Ionicons name={icon} size={16} color={COLORS.primary} />
                </View>
                <View style={styles.infoTextWrap}>
                    <Text style={styles.infoLabel}>{label}</Text>
                    <Text style={[styles.infoValue, onPress && styles.infoLink]}>{value}</Text>
                </View>
                {onPress && (
                    <Ionicons name="arrow-forward-circle-outline" size={18} color={COLORS.primary + '80'} />
                )}
            </TouchableOpacity>
        );
    };

    return (
        <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
            <View style={styles.modalWrapper}>
                <Animated.View style={[styles.modalBackdrop, backdropStyle]}>
                    <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
                </Animated.View>

                <Animated.View style={[styles.sheet, sheetStyle]}>
                    <View style={styles.handleWrap}>
                        <View style={styles.handle} />
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false}>
                        {/* Hero area */}
                        <View style={styles.heroArea}>
                            {isMine && (
                                <View style={styles.heroMeBadge}>
                                    <Ionicons name="checkmark-circle" size={12} color={COLORS.primary} />
                                    <Text style={styles.heroMeBadgeText}>Votre organisation</Text>
                                </View>
                            )}
                            {exposant?.logo ? (
                                <View style={styles.heroLogoWrap}>
                                    <Image source={{ uri: exposant.logo }} style={styles.heroLogo} resizeMode="contain" />
                                </View>
                            ) : (
                                <View style={[styles.heroLogoWrap, isMine && styles.heroLogoWrapMine]}>
                                    <Text style={[styles.heroInitials, isMine && styles.heroInitialsMine]}>{initials}</Text>
                                </View>
                            )}
                            <Text style={styles.heroName}>{displayName}</Text>
                            {exposant?.secteur ? (
                                <View style={styles.heroCategoryBadge}>
                                    <Text style={styles.heroCategoryText}>{exposant.secteur}</Text>
                                </View>
                            ) : null}
                        </View>

                        {/* Info section */}
                        <View style={styles.infoSection}>
                            <Text style={styles.infoSectionTitle}>Contact</Text>
                            <InfoRow icon="person-outline" label="Nom" value={exposant?.name} />
                            <InfoRow icon="mail-outline" label="Email" value={exposant?.email}
                                onPress={exposant?.email ? () => Linking.openURL(`mailto:${exposant.email}`) : null} />
                            <InfoRow icon="call-outline" label="Téléphone" value={exposant?.phone}
                                onPress={exposant?.phone ? () => Linking.openURL(`tel:${exposant.phone}`) : null} />
                            <InfoRow icon="location-outline" label="Adresse" value={exposant?.address} />
                            <InfoRow icon="globe-outline" label="Site web" value={exposant?.website}
                                onPress={exposant?.website ? () => openLink(exposant.website) : null} />
                        </View>

                        {exposant?.description ? (
                            <View style={styles.descriptionBox}>
                                <Text style={styles.descriptionText}>{exposant.description}</Text>
                            </View>
                        ) : null}
                    </ScrollView>

                    {/* Footer */}
                    <View style={styles.sheetFooter}>
                        {isMine ? (
                            <>
                                <TouchableOpacity style={styles.teamBtn} onPress={onTeam} activeOpacity={0.85}>
                                    <LinearGradient
                                        colors={['#2563EB', '#0E4DA4']}
                                        style={styles.teamBtnGradient}
                                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                                    >
                                        <Ionicons name="people-outline" size={18} color="#fff" />
                                        <Text style={styles.teamBtnText}>Mon Équipe</Text>
                                    </LinearGradient>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.closeBtnSecondary} onPress={onClose}>
                                    <Text style={styles.closeBtnSecondaryText}>Fermer</Text>
                                </TouchableOpacity>
                            </>
                        ) : (
                            <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.85}>
                                <LinearGradient
                                    colors={['#1E293B', '#0F172A']}
                                    style={styles.closeBtnGradient}
                                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                                >
                                    <Text style={styles.closeBtnText}>Fermer</Text>
                                </LinearGradient>
                            </TouchableOpacity>
                        )}
                    </View>
                </Animated.View>
            </View>
        </Modal>
    );
};

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function ExposantsScreen({ navigation }) {
    const insets = useSafeAreaInsets();
    const { exhibitorId, badgeNumber } = useAuth();
    const [connectedEmails, setConnectedEmails] = useState(new Set());
    const [exposants, setExposants] = useState([]);
    const [eventName, setEventName] = useState('');
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selected, setSelected] = useState(null);
    const [search, setSearch] = useState('');
    const [activeCategory, setActiveCategory] = useState('Tous');

    const scrollY = useSharedValue(0);
    const scrollHandler = useAnimatedScrollHandler({
        onScroll: (event) => {
            scrollY.value = event.contentOffset.y;
        },
    });

    const topAnimatedStyle = useAnimatedStyle(() => {
        const opacity = interpolate(scrollY.value, [0, 80], [1, 0], 'clamp');
        const translateY = interpolate(scrollY.value, [0, 100], [0, -40], 'clamp');
        const scale = interpolate(scrollY.value, [0, 80], [1, 0.9], 'clamp');

        return {
            opacity,
            transform: [{ translateY }, { scale }],
        };
    });

    const stickyHeaderStyle = useAnimatedStyle(() => {
        // Updated to match the new top offset (160 instead of 140)
        const translateY = interpolate(scrollY.value, [0, 160], [0, -160], 'clamp');
        
        const backgroundColorOpacity = interpolate(scrollY.value, [120, 160], [0, 1], 'clamp');
        
        return {
            transform: [{ translateY }],
            // Using the exact light color of your background (F5F9FF)
            backgroundColor: `rgba(245, 249, 255, ${backgroundColorOpacity})`, 
            zIndex: 10,
        };
    });

    const load = async () => {
        try {
            const [exposantsRes, historyRes] = await Promise.allSettled([
                getExposants(),
                badgeNumber ? networkingHistory(badgeNumber) : Promise.resolve(null),
            ]);

            if (exposantsRes.status === 'fulfilled') {
                setExposants(exposantsRes.value?.data?.data || []);
                setEventName(exposantsRes.value?.data?.event || '');
            } else {
                setExposants([]);
            }

            if (historyRes.status === 'fulfilled' && historyRes.value?.data?.history) {
                const emails = new Set(
                    historyRes.value.data.history
                        .map(h => h?.person?.email)
                        .filter(Boolean)
                        .map(e => e.toLowerCase())
                );
                setConnectedEmails(emails);
            }
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(useCallback(() => {
        setLoading(true);
        load();
    }, []));

    const onRefresh = () => { setRefreshing(true); load(); };

    const isMineCheck = (item) => !!exhibitorId && item.exhibitor_id === exhibitorId;

    const filtered = (() => {
        let list = exposants;
        if (search.trim()) {
            list = list.filter(e =>
                e.company?.toLowerCase().includes(search.toLowerCase()) ||
                e.name?.toLowerCase().includes(search.toLowerCase()) ||
                e.secteur?.toLowerCase().includes(search.toLowerCase())
            );
        }
        if (activeCategory !== 'Tous') {
            list = list.filter(e =>
                e.secteur?.toLowerCase().includes(activeCategory.toLowerCase())
            );
        }
        const rank = (item) => {
            if (isMineCheck(item)) return 2;
            if (item.email && connectedEmails.has(item.email.toLowerCase())) return 1;
            return 0;
        };
        return [...list].sort((a, b) => rank(b) - rank(a));
    })();

    return (
        <LinearGradient colors={BG_GRADIENT.colors} start={BG_GRADIENT.start} end={BG_GRADIENT.end} style={styles.root}>
            <View style={{ height: insets.top, backgroundColor: '#000000' }} />
            <StatusBar style="light" backgroundColor="#000000" />

            {/* 1. Scrolling Part: Logo and title */}
            <View style={{ position: 'absolute', top: insets.top, left: 0, right: 0, zIndex: 1 }}>
                <Animated.View style={[topAnimatedStyle, { paddingHorizontal: SPACING.lg, paddingTop: SPACING.md }]}>
                    <View style={styles.headerTopRow}>
                        <Image
                            source={require('../../assets/logiterre-logo.png')}
                            style={styles.headerLogo}
                            resizeMode="contain"
                        />
                    </View>
                    <Text style={styles.headerTitle}>Exposant</Text>
                    <Text style={styles.headerSub}>
                        Connectez-vous avec des leaders du secteur{'\n'}et des startups innovantes.
                    </Text>
                </Animated.View>
            </View>

            {/* 2. Sticky Part: Search and Categories */}
            <Animated.View style={[stickyHeaderStyle, { 
                position: 'absolute', 
                top: insets.top + 160, // Increased from 140 to 160 for more margin
                left: 0, 
                right: 0, 
                zIndex: 5, 
                paddingTop: 20, // Increased top padding
                paddingBottom: 20,
            }]}>
                {/* Search Box */}
                <View style={[styles.searchBox, { marginHorizontal: SPACING.lg, marginBottom: 12 }]}>
                    <Ionicons name="search-outline" size={16} color={COLORS.textMuted} style={{ marginRight: 8 }} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search exposant..."
                        placeholderTextColor={COLORS.textMuted}
                        value={search}
                        onChangeText={setSearch}
                        autoCorrect={false}
                    />
                    {search ? (
                        <TouchableOpacity onPress={() => setSearch('')}>
                            <Ionicons name="close-circle" size={16} color={COLORS.textMuted} />
                        </TouchableOpacity>
                    ) : null}
                </View>

                {/* Category chips */}
                <View style={{ backgroundColor: 'transparent' }}>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={styles.chipsScroll}
                        contentContainerStyle={styles.chipsContent}
                    >
                        {CATEGORIES.map((cat) => (
                            <TouchableOpacity
                                key={cat}
                                style={[styles.chip, activeCategory === cat && styles.chipActive]}
                                onPress={() => setActiveCategory(cat)}
                                activeOpacity={0.8}
                            >
                                <Text style={[styles.chipText, activeCategory === cat && styles.chipTextActive]}>
                                    {cat}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
            </Animated.View>

            {/* 3. Main List with padding to keep items below the sticky header area */}
            <Animated.FlatList
                data={filtered}
                keyExtractor={(item) => String(item.id)}
                contentContainerStyle={[styles.list, { paddingTop: 275 }]}
                showsVerticalScrollIndicator={false}
                onScroll={scrollHandler}
                scrollEventThrottle={16}
                refreshControl={
                    <RefreshControl 
                        refreshing={refreshing} 
                        onRefresh={onRefresh} 
                        tintColor={COLORS.primary} 
                        progressViewOffset={320}
                    />
                }
                renderItem={({ item }) => (
                    <ExposantCard item={item} isMine={isMineCheck(item)} onPress={setSelected} />
                )}
                ListEmptyComponent={
                    !loading && (
                        <View style={[styles.centered, { marginTop: 40 }]}>
                            <View style={styles.emptyIconWrap}>
                                <Ionicons name="business-outline" size={40} color={COLORS.primary} />
                            </View>
                            <Text style={styles.emptyText}>Aucun exposant trouvé</Text>
                            <Text style={styles.emptySub}>Les exposants apparaîtront ici une fois l'événement configuré.</Text>
                        </View>
                    )
                }
                ListFooterComponent={<View style={{ height: 120 }} />}
            />

            {loading && filtered.length === 0 && (
                <View style={[StyleSheet.absoluteFill, styles.centered, { backgroundColor: 'rgba(255,255,255,0.5)', zIndex: 20 }]}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                </View>
            )}

            <DetailModal
                exposant={selected}
                visible={!!selected}
                isMine={selected ? isMineCheck(selected) : false}
                onClose={() => setSelected(null)}
                onTeam={() => { setSelected(null); navigation.navigate('Team'); }}
            />
        </LinearGradient>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    root: { flex: 1 },

    // Header
    header: {
        paddingHorizontal: SPACING.lg,
        paddingBottom: SPACING.md,
        backgroundColor: 'transparent',
    },
    headerTopRow: {
        alignItems: 'center',
        marginBottom: SPACING.md,
    },
    headerLogo: {
        width: 160,
        height: 50,
    },
    headerTitle: {
        fontSize: 26,
        fontWeight: '800',
        color: COLORS.textPrimary,
        letterSpacing: -0.5,
        marginBottom: 4,
    },
    headerSub: {
        fontSize: 14,
        color: COLORS.textSecondary,
        lineHeight: 20,
        marginBottom: SPACING.md,
    },

    searchBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: RADIUS.full,
        paddingHorizontal: SPACING.md,
        paddingVertical: 4,
        minHeight: 34,
        borderWidth: 1,
        borderColor: COLORS.border,
        marginBottom: SPACING.md,
    },
    searchInput: { flex: 1, fontSize: 14, color: COLORS.textPrimary },

    chipsScroll: { marginHorizontal: -SPACING.lg, marginBottom: 10 },
    chipsContent: { paddingHorizontal: SPACING.xl, gap: SPACING.xs },
    chip: {
        paddingHorizontal: 18,
        paddingVertical: 8,
        borderRadius: RADIUS.full,
        backgroundColor: '#fff',
        borderWidth: 1.5,
        borderColor: COLORS.border,
    },
    chipActive: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
    },
    chipText: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
    chipTextActive: { color: '#fff' },

    // List
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.xl },
    emptyIconWrap: {
        width: 80, height: 80, borderRadius: 40, backgroundColor: COLORS.primary + '12',
        alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.md,
    },
    emptyText: { fontSize: 16, fontWeight: '700', color: COLORS.textSecondary },
    emptySub: {
        fontSize: 13, color: COLORS.textMuted, textAlign: 'center',
        marginTop: 8, lineHeight: 20, paddingHorizontal: SPACING.lg,
    },
    list: { paddingHorizontal: SPACING.md, paddingTop: SPACING.md },

    // Card (vertical)
    card: {
        backgroundColor: '#fff',
        borderRadius: RADIUS.lg,
        padding: SPACING.lg,
        marginBottom: SPACING.md,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    cardMine: {
        borderColor: COLORS.primary + '40',
        shadowColor: '#000000',
        shadowOpacity: 0.04,
        shadowRadius: 15,
        elevation: 3,
    },
    cardTop: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: SPACING.md,
    },
    cardAvatar: {
        width: 52,
        height: 52,
        borderRadius: RADIUS.sm,
        backgroundColor: '#EEF2FF',
        alignItems: 'center',
        justifyContent: 'center',
    },
    cardAvatarMine: {
        backgroundColor: COLORS.primary,
    },
    cardLogo: {
        width: 52,
        height: 52,
        borderRadius: RADIUS.sm,
    },
    cardInitials: { fontSize: 18, fontWeight: '800', color: COLORS.primary },
    sectorBadge: {
        marginLeft: 'auto',
        backgroundColor: COLORS.primary + '18',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: RADIUS.full,
    },
    sectorBadgeText: {
        fontSize: 10,
        fontWeight: '700',
        color: COLORS.primary,
        letterSpacing: 0.5,
    },
    meBadge: {
        marginLeft: SPACING.xs,
        backgroundColor: COLORS.primary,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: RADIUS.full,
    },
    meBadgeText: { fontSize: 10, fontWeight: '700', color: '#fff', letterSpacing: 0.3 },

    cardName: {
        fontSize: 17,
        fontWeight: '800',
        color: COLORS.textPrimary,
        marginBottom: 6,
        letterSpacing: -0.2,
    },
    cardDesc: {
        fontSize: 13,
        color: COLORS.textSecondary,
        lineHeight: 19,
        marginBottom: SPACING.md,
    },

    detailBtn: {
        height: 44,
        borderRadius: RADIUS.full,
        backgroundColor: COLORS.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    detailBtnText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '700',
    },

    // Bottom-sheet
    modalWrapper: { ...StyleSheet.absoluteFillObject, justifyContent: 'flex-end', zIndex: 1000 },
    modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'transparent' },
    sheet: {
        height: height * 0.78,
        backgroundColor: '#fff',
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        overflow: 'hidden',
        borderWidth: 1, borderColor: '#F1F5F9',
    },
    handleWrap: { alignItems: 'center', paddingTop: 12, paddingBottom: 4, backgroundColor: '#fff' },
    handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: '#CBD5E1' },

    heroArea: {
        alignItems: 'center',
        paddingVertical: SPACING.lg,
        paddingHorizontal: SPACING.lg,
        backgroundColor: '#F8FAFC',
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    heroMeBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        backgroundColor: COLORS.primary + '12', paddingHorizontal: 10, paddingVertical: 4,
        borderRadius: RADIUS.full, marginBottom: SPACING.sm,
        borderWidth: 1, borderColor: COLORS.primary + '25',
    },
    heroMeBadgeText: { fontSize: 11, fontWeight: '600', color: COLORS.primary },
    heroLogoWrap: {
        width: 76, height: 76, borderRadius: 18, backgroundColor: COLORS.gray100,
        alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.sm,
        borderWidth: 1.5, borderColor: COLORS.border,
    },
    heroLogoWrapMine: { backgroundColor: COLORS.primary + '12', borderColor: COLORS.primary + '30' },
    heroLogo: { width: 56, height: 56, borderRadius: 12 },
    heroInitials: { fontSize: 28, fontWeight: '800', color: COLORS.textMuted },
    heroInitialsMine: { color: COLORS.primary },
    heroName: {
        fontSize: 20, fontWeight: '800', color: COLORS.textPrimary,
        textAlign: 'center', letterSpacing: -0.3,
    },
    heroCategoryBadge: {
        marginTop: 8, backgroundColor: COLORS.primary + '10',
        paddingHorizontal: 14, paddingVertical: 4, borderRadius: RADIUS.full,
        borderWidth: 1, borderColor: COLORS.primary + '20',
    },
    heroCategoryText: { fontSize: 12, fontWeight: '600', color: COLORS.primary },

    infoSection: {
        marginHorizontal: SPACING.lg, marginTop: SPACING.md, marginBottom: SPACING.sm,
        backgroundColor: '#F8FAFC', borderRadius: RADIUS.md,
        overflow: 'hidden', borderWidth: 1, borderColor: '#E2E8F0',
    },
    infoSectionTitle: {
        fontSize: 10, fontWeight: '700', color: COLORS.textMuted,
        textTransform: 'uppercase', letterSpacing: 1,
        paddingHorizontal: SPACING.md, paddingTop: 10, paddingBottom: SPACING.xs,
    },
    infoRow: {
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: SPACING.md, paddingVertical: 8,
        borderTopWidth: 1, borderTopColor: '#E2E8F0', backgroundColor: '#fff',
    },
    infoIconWrap: {
        width: 28, height: 28, borderRadius: 8, backgroundColor: COLORS.primary + '10',
        alignItems: 'center', justifyContent: 'center', marginRight: SPACING.sm,
    },
    infoTextWrap: { flex: 1 },
    infoLabel: { fontSize: 10, color: COLORS.textMuted, fontWeight: '600', letterSpacing: 0.3 },
    infoValue: { fontSize: 13, color: '#1E293B', fontWeight: '600', marginTop: 1 },
    infoLink: { color: COLORS.primary },

    descriptionBox: {
        marginHorizontal: SPACING.lg, marginBottom: SPACING.xs,
        backgroundColor: '#F8FAFC', borderRadius: RADIUS.md, padding: SPACING.md,
        borderWidth: 1, borderColor: '#E2E8F0',
    },
    descriptionText: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 20 },

    sheetFooter: {
        flexDirection: 'row', gap: SPACING.sm,
        paddingHorizontal: SPACING.lg, paddingTop: SPACING.sm, paddingBottom: 34,
    },
    teamBtn: { flex: 1, borderRadius: RADIUS.full, overflow: 'hidden' },
    teamBtnGradient: {
        height: 52, flexDirection: 'row', alignItems: 'center',
        justifyContent: 'center', gap: 8,
    },
    teamBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
    closeBtn: { flex: 1, borderRadius: RADIUS.full, overflow: 'hidden' },
    closeBtnGradient: { height: 52, alignItems: 'center', justifyContent: 'center' },
    closeBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
    closeBtnSecondary: {
        flex: 1, height: 52, backgroundColor: '#F1F5F9', borderRadius: RADIUS.full,
        alignItems: 'center', justifyContent: 'center',
        borderWidth: 1.5, borderColor: '#E2E8F0',
    },
    closeBtnSecondaryText: { color: '#1E293B', fontSize: 15, fontWeight: '600' },
});
