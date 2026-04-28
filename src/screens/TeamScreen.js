import { useState, useCallback, useEffect, useRef } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    TextInput, Modal, ActivityIndicator, Alert,
    KeyboardAvoidingView, Platform, Pressable, Dimensions,
} from 'react-native';
import Animated, {
    useSharedValue, useAnimatedStyle, withSpring, withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getTeam, addTeamMember, deleteTeamMember, updateTeamMember } from '../services/api';
import { COLORS, SPACING, RADIUS, BG_GRADIENT } from '../constants/theme';

const { height } = Dimensions.get('window');

// ─── Member card ──────────────────────────────────────────────────────────────

const MemberCard = ({ item, onEdit, onDelete }) => {
    const initials = item.name ? item.name.slice(0, 2).toUpperCase() : '??';
    return (
        <View style={styles.memberCard}>
            <LinearGradient
                colors={['#2563EB', '#0E4DA4']}
                style={styles.memberAvatar}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            >
                <Text style={styles.memberInitials}>{initials}</Text>
            </LinearGradient>
            <View style={styles.memberInfo}>
                <Text style={styles.memberName}>{item.name}</Text>
                {item.email ? (
                    <View style={styles.memberMetaRow}>
                        <Ionicons name="mail-outline" size={11} color={COLORS.textMuted} />
                        <Text style={styles.memberMeta}>{item.email}</Text>
                    </View>
                ) : null}
                {item.phone ? (
                    <View style={styles.memberMetaRow}>
                        <Ionicons name="call-outline" size={11} color={COLORS.textMuted} />
                        <Text style={styles.memberMeta}>{item.phone}</Text>
                    </View>
                ) : null}
                {item.badge_number ? (
                    <View style={styles.badgePill}>
                        <Ionicons name="qr-code-outline" size={10} color={COLORS.primary} />
                        <Text style={styles.badgePillText}>{item.badge_number}</Text>
                    </View>
                ) : null}
            </View>
            <View style={styles.cardActions}>
                <TouchableOpacity style={styles.editBtn} onPress={() => onEdit(item)} activeOpacity={0.7}>
                    <Ionicons name="pencil-outline" size={16} color={COLORS.primary} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.deleteBtn} onPress={() => onDelete(item)} activeOpacity={0.7}>
                    <Ionicons name="trash-outline" size={16} color={COLORS.danger} />
                </TouchableOpacity>
            </View>
        </View>
    );
};

// ─── Reusable field (must be at module level to avoid keyboard dismiss) ───────

const Field = ({ label, value, onChange, placeholder, keyboard, styles }) => {
    const [focused, setFocused] = useState(false);
    return (
        <View style={styles.fieldWrap}>
            <Text style={styles.fieldLabel}>{label}</Text>
            <TextInput
                style={[styles.fieldInput, focused && styles.fieldInputFocused]}
                value={value}
                onChangeText={onChange}
                placeholder={placeholder}
                placeholderTextColor={COLORS.textMuted}
                keyboardType={keyboard || 'default'}
                autoCapitalize={keyboard === 'email-address' ? 'none' : 'words'}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
            />
        </View>
    );
};

// ─── Add member bottom-sheet ──────────────────────────────────────────────────

const AddMemberSheet = ({ visible, onClose, onAdded }) => {
    const translateY = useSharedValue(height);
    const backdropOpacity = useSharedValue(0);

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

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

    const reset = () => { setName(''); setEmail(''); setPhone(''); setError(null); };
    const handleClose = () => { reset(); onClose(); };

    const handleSubmit = async () => {
        if (!name.trim() || !email.trim()) {
            setError('Le nom et l\'email sont obligatoires.');
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const res = await addTeamMember({ name: name.trim(), email: email.trim(), phone: phone.trim() || undefined });
            onAdded(res.data.data);
            reset();
            onClose();
        } catch (e) {
            const msg = e?.response?.data?.message
                || (e?.response?.data?.errors ? Object.values(e.response.data.errors)[0][0] : null)
                || 'Erreur lors de l\'ajout.';
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    if (!visible) return null;

    return (
        <Modal visible={visible} transparent animationType="none" onRequestClose={handleClose}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                <View style={styles.modalWrapper}>
                    <Animated.View style={[styles.modalBackdrop, backdropStyle]}>
                        <Pressable style={StyleSheet.absoluteFillObject} onPress={handleClose} />
                    </Animated.View>

                    <Animated.View style={[styles.sheet, sheetStyle]}>
                        <View style={styles.sheetHandleWrap}>
                            <View style={styles.handle} />
                        </View>
                        <View style={styles.sheetTitleRow}>
                            <View style={styles.sheetIconWrap}>
                                <Ionicons name="person-add-outline" size={18} color={COLORS.primary} />
                            </View>
                            <Text style={styles.sheetTitle}>Nouveau membre</Text>
                        </View>

                        <View style={styles.sheetBody}>
                            {error ? (
                                <View style={styles.errorBox}>
                                    <Ionicons name="alert-circle-outline" size={16} color="#D8000C" />
                                    <Text style={styles.errorText}>{error}</Text>
                                </View>
                            ) : null}
                            <Field label="Nom complet *" value={name} onChange={setName} placeholder="Prénom Nom" styles={styles} />
                            <Field label="Email *" value={email} onChange={setEmail} placeholder="email@exemple.com" keyboard="email-address" styles={styles} />
                            <Field label="Téléphone" value={phone} onChange={setPhone} placeholder="+212 6 00 00 00 00" keyboard="phone-pad" styles={styles} />
                        </View>

                        <View style={styles.sheetFooter}>
                            <TouchableOpacity style={styles.cancelBtn} onPress={handleClose}>
                                <Text style={styles.cancelBtnText}>Annuler</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.submitBtnWrap} onPress={handleSubmit} disabled={loading} activeOpacity={0.85}>
                                <LinearGradient
                                    colors={['#2563EB', '#0E4DA4']}
                                    style={styles.submitBtnGradient}
                                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                                >
                                    {loading
                                        ? <ActivityIndicator color="#fff" size="small" />
                                        : <Text style={styles.submitBtnText}>Ajouter</Text>
                                    }
                                </LinearGradient>
                            </TouchableOpacity>
                        </View>
                    </Animated.View>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
};

// ─── Edit member bottom-sheet ─────────────────────────────────────────────────

const EditMemberSheet = ({ member, visible, onClose, onUpdated }) => {
    const translateY = useSharedValue(height);
    const backdropOpacity = useSharedValue(0);

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (visible && member) {
            setName(member.name || '');
            setEmail(member.email || '');
            setPhone(member.phone || '');
            setError(null);
            backdropOpacity.value = withTiming(1, { duration: 350 });
            translateY.value = withSpring(0, { damping: 24, stiffness: 130 });
        } else {
            backdropOpacity.value = withTiming(0, { duration: 250 });
            translateY.value = withTiming(height, { duration: 350 });
        }
    }, [visible, member]);

    const backdropStyle = useAnimatedStyle(() => ({ opacity: backdropOpacity.value }));
    const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }));

    const handleClose = () => { setError(null); onClose(); };

    const handleSubmit = async () => {
        if (!name.trim() || !email.trim()) {
            setError('Le nom et l\'email sont obligatoires.');
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const res = await updateTeamMember(member.id, {
                name: name.trim(),
                email: email.trim(),
                phone: phone.trim() || null,
            });
            onUpdated(res.data.data);
            onClose();
        } catch (e) {
            const msg = e?.response?.data?.message
                || (e?.response?.data?.errors ? Object.values(e.response.data.errors)[0][0] : null)
                || 'Erreur lors de la modification.';
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    if (!visible) return null;

    return (
        <Modal visible={visible} transparent animationType="none" onRequestClose={handleClose}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                <View style={styles.modalWrapper}>
                    <Animated.View style={[styles.modalBackdrop, backdropStyle]}>
                        <Pressable style={StyleSheet.absoluteFillObject} onPress={handleClose} />
                    </Animated.View>

                    <Animated.View style={[styles.sheet, sheetStyle]}>
                        <View style={styles.sheetHandleWrap}>
                            <View style={styles.handle} />
                        </View>
                        <View style={styles.sheetTitleRow}>
                            <View style={[styles.sheetIconWrap, styles.sheetIconWrapEdit]}>
                                <Ionicons name="pencil-outline" size={18} color={COLORS.primary} />
                            </View>
                            <View>
                                <Text style={styles.sheetTitle}>Modifier le membre</Text>
                                {member?.name ? <Text style={styles.sheetSubtitle}>{member.name}</Text> : null}
                            </View>
                        </View>

                        <View style={styles.sheetBody}>
                            {error ? (
                                <View style={styles.errorBox}>
                                    <Ionicons name="alert-circle-outline" size={16} color="#D8000C" />
                                    <Text style={styles.errorText}>{error}</Text>
                                </View>
                            ) : null}
                            <Field label="Nom complet *" value={name} onChange={setName} placeholder="Prénom Nom" styles={styles} />
                            <Field label="Email *" value={email} onChange={setEmail} placeholder="email@exemple.com" keyboard="email-address" styles={styles} />
                            <Field label="Téléphone" value={phone} onChange={setPhone} placeholder="+212 6 00 00 00 00" keyboard="phone-pad" styles={styles} />
                        </View>

                        <View style={styles.sheetFooter}>
                            <TouchableOpacity style={styles.cancelBtn} onPress={handleClose}>
                                <Text style={styles.cancelBtnText}>Annuler</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.submitBtnWrap} onPress={handleSubmit} disabled={loading} activeOpacity={0.85}>
                                <LinearGradient
                                    colors={['#2563EB', '#0E4DA4']}
                                    style={styles.submitBtnGradient}
                                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                                >
                                    {loading
                                        ? <ActivityIndicator color="#fff" size="small" />
                                        : <Text style={styles.submitBtnText}>Enregistrer</Text>
                                    }
                                </LinearGradient>
                            </TouchableOpacity>
                        </View>
                    </Animated.View>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
};

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function TeamScreen({ navigation }) {
    const insets = useSafeAreaInsets();
    const [members, setMembers] = useState([]);
    const [companyName, setCompanyName] = useState('');
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [showAdd, setShowAdd] = useState(false);
    const [editMember, setEditMember] = useState(null);

    const searchTimer = useRef(null);

    const load = useCallback(async (q = '') => {
        try {
            const res = await getTeam(q);
            setMembers(res?.data?.data || []);
            if (res?.data?.exhibitor?.company_name) setCompanyName(res.data.exhibitor.company_name);
        } catch {
            setMembers([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useFocusEffect(useCallback(() => {
        setLoading(true);
        load();
    }, []));

    const onSearchChange = (text) => {
        setSearch(text);
        clearTimeout(searchTimer.current);
        searchTimer.current = setTimeout(() => load(text), 400);
    };

    const handleAdded = (member) => setMembers(prev => [member, ...prev]);

    const handleUpdated = (updated) =>
        setMembers(prev => prev.map(m => m.id === updated.id ? updated : m));

    const handleDelete = (item) => {
        Alert.alert(
            'Retirer ce membre',
            `Voulez-vous retirer ${item.name} de l'équipe ?`,
            [
                { text: 'Annuler', style: 'cancel' },
                {
                    text: 'Retirer', style: 'destructive',
                    onPress: async () => {
                        try {
                            await deleteTeamMember(item.id);
                            setMembers(prev => prev.filter(m => m.id !== item.id));
                        } catch {
                            Alert.alert('Erreur', 'Impossible de supprimer ce membre.');
                        }
                    },
                },
            ]
        );
    };

    return (
        <LinearGradient colors={BG_GRADIENT.colors} start={BG_GRADIENT.start} end={BG_GRADIENT.end} style={styles.root}>
            <View style={{ height: insets.top, backgroundColor: '#000000' }} />
            <StatusBar style="light" backgroundColor="#000000" />

            {/* Header */}
            <View style={[styles.header]}>
                <View style={styles.headerRow}>
                    <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.8}>
                        <Ionicons name="arrow-back" size={20} color={COLORS.textPrimary} />
                    </TouchableOpacity>
                    <View style={styles.headerText}>
                        <Text style={styles.headerTitle}>Mon Équipe</Text>
                        {companyName ? <Text style={styles.headerSub}>{companyName}</Text> : null}
                    </View>
                    <TouchableOpacity style={styles.addBtn} onPress={() => setShowAdd(true)} activeOpacity={0.85}>
                        <Ionicons name="person-add-outline" size={18} color="#fff" />
                    </TouchableOpacity>
                </View>

                {/* Search */}
                <View style={styles.searchBox}>
                    <Ionicons name="search-outline" size={16} color={COLORS.textMuted} style={{ marginRight: 8 }} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Rechercher un membre..."
                        placeholderTextColor={COLORS.textMuted}
                        value={search}
                        onChangeText={onSearchChange}
                        autoCorrect={false}
                    />
                    {search ? (
                        <TouchableOpacity onPress={() => { setSearch(''); load(''); }}>
                            <Ionicons name="close-circle" size={16} color={COLORS.textMuted} />
                        </TouchableOpacity>
                    ) : null}
                </View>
            </View>

            {/* Count label */}
            <View style={styles.countRow}>
                <Text style={styles.countLabel}>
                    {members.length} membre{members.length !== 1 ? 's' : ''}
                </Text>
            </View>

            {loading ? (
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                </View>
            ) : members.length === 0 ? (
                <View style={styles.centered}>
                    <View style={styles.emptyIconWrap}>
                        <Ionicons name="people-outline" size={40} color={COLORS.primary} />
                    </View>
                    <Text style={styles.emptyText}>Aucun membre pour l'instant</Text>
                    <Text style={styles.emptySub}>Ajoutez votre premier membre d'équipe.</Text>
                    <TouchableOpacity style={styles.emptyAddBtn} onPress={() => setShowAdd(true)} activeOpacity={0.85}>
                        <LinearGradient
                            colors={['#2563EB', '#0E4DA4']}
                            style={styles.emptyAddBtnGradient}
                            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                        >
                            <Ionicons name="person-add-outline" size={16} color="#fff" />
                            <Text style={styles.emptyAddBtnText}>Ajouter un membre</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
            ) : (
                <FlatList
                    data={members}
                    keyExtractor={(item) => String(item.id)}
                    contentContainerStyle={styles.list}
                    showsVerticalScrollIndicator={false}
                    renderItem={({ item }) => (
                        <MemberCard item={item} onEdit={setEditMember} onDelete={handleDelete} />
                    )}
                    ListFooterComponent={<View style={{ height: 40 }} />}
                />
            )}

            <AddMemberSheet
                visible={showAdd}
                onClose={() => setShowAdd(false)}
                onAdded={handleAdded}
            />

            <EditMemberSheet
                member={editMember}
                visible={!!editMember}
                onClose={() => setEditMember(null)}
                onUpdated={handleUpdated}
            />
        </LinearGradient>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    root: { flex: 1 },

    // Header
    header: {
        paddingTop: SPACING.md,
        paddingHorizontal: SPACING.lg,
        paddingBottom: SPACING.md,
        backgroundColor: 'transparent',
    },
    headerRow: {
        flexDirection: 'row', alignItems: 'center',
        gap: SPACING.sm, marginBottom: SPACING.md,
    },
    backBtn: {
        width: 38, height: 38, borderRadius: 12,
        backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center',
        borderWidth: 1, borderColor: COLORS.border,
    },
    headerText: { flex: 1 },
    headerTitle: { fontSize: 22, fontWeight: '800', color: COLORS.textPrimary, letterSpacing: -0.4 },
    headerSub: { fontSize: 12, color: COLORS.textMuted, fontWeight: '500', marginTop: 1 },
    addBtn: {
        width: 38, height: 38, borderRadius: 12,
        backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center',
    },
    searchBox: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: '#fff', borderRadius: RADIUS.full,
        paddingHorizontal: SPACING.md, paddingVertical: 4, minHeight: 34,
        borderWidth: 1, borderColor: COLORS.border,
    },
    searchInput: { flex: 1, fontSize: 14, color: COLORS.textPrimary },

    // Count
    countRow: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.sm, paddingBottom: 4 },
    countLabel: { fontSize: 11, fontWeight: '700', color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 0.8 },

    // States
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.xl },
    emptyIconWrap: {
        width: 80, height: 80, borderRadius: 40, backgroundColor: COLORS.primary + '12',
        alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.md,
    },
    emptyText: { fontSize: 16, fontWeight: '700', color: COLORS.textSecondary },
    emptySub: { fontSize: 13, color: COLORS.textMuted, textAlign: 'center', marginTop: 6, lineHeight: 20 },
    emptyAddBtn: { marginTop: SPACING.lg, borderRadius: RADIUS.full, overflow: 'hidden' },
    emptyAddBtnGradient: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        paddingHorizontal: SPACING.xl, paddingVertical: 14,
    },
    emptyAddBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

    // List
    list: { paddingHorizontal: SPACING.md, paddingTop: SPACING.sm },
    memberCard: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
        borderRadius: RADIUS.md, padding: SPACING.md, marginBottom: SPACING.sm,
        borderWidth: 1, borderColor: '#F1F5F9',
    },
    memberAvatar: {
        width: 46, height: 46, borderRadius: 14,
        alignItems: 'center', justifyContent: 'center', marginRight: SPACING.md,
    },
    memberInitials: { fontSize: 17, fontWeight: '800', color: '#fff' },
    memberInfo: { flex: 1 },
    memberName: { fontSize: 15, fontWeight: '700', color: '#1E293B', marginBottom: 3 },
    memberMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
    memberMeta: { fontSize: 12, color: COLORS.textSecondary },
    badgePill: {
        flexDirection: 'row', alignItems: 'center', gap: 3,
        marginTop: 5, alignSelf: 'flex-start',
        backgroundColor: COLORS.primary + '10', paddingHorizontal: 8, paddingVertical: 3,
        borderRadius: RADIUS.full, borderWidth: 1, borderColor: COLORS.primary + '20',
    },
    badgePillText: { fontSize: 10, fontWeight: '700', color: COLORS.primary },
    cardActions: { flexDirection: 'row', gap: 8, alignItems: 'center' },
    editBtn: {
        width: 34, height: 34, borderRadius: 10,
        backgroundColor: COLORS.primary + '10', alignItems: 'center', justifyContent: 'center',
        borderWidth: 1, borderColor: COLORS.primary + '25',
    },
    deleteBtn: {
        width: 34, height: 34, borderRadius: 10,
        backgroundColor: '#FEF2F2', alignItems: 'center', justifyContent: 'center',
        borderWidth: 1, borderColor: '#FECACA',
    },

    // Bottom sheet
    modalWrapper: { ...StyleSheet.absoluteFillObject, justifyContent: 'flex-end', zIndex: 1000 },
    modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'transparent' },
    sheet: {
        backgroundColor: '#fff', borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
    },
    sheetHandleWrap: { alignItems: 'center', paddingTop: 12, paddingBottom: 8 },
    handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: '#CBD5E1' },
    sheetTitleRow: {
        flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
        paddingHorizontal: SPACING.lg, paddingBottom: SPACING.md,
    },
    sheetIconWrap: {
        width: 36, height: 36, borderRadius: 10, backgroundColor: COLORS.primary + '12',
        alignItems: 'center', justifyContent: 'center',
    },
    sheetTitle: { fontSize: 17, fontWeight: '700', color: '#1E293B' },
    sheetSubtitle: { fontSize: 12, color: COLORS.textMuted, marginTop: 1 },
    sheetIconWrapEdit: { backgroundColor: COLORS.primary + '10', borderColor: COLORS.primary + '20' },
    sheetBody: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.sm },
    sheetFooter: {
        flexDirection: 'row', gap: SPACING.sm,
        padding: SPACING.lg, paddingBottom: 36,
    },

    errorBox: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        backgroundColor: '#FFF5F5', padding: 10, borderRadius: RADIUS.sm,
        marginBottom: SPACING.md, borderWidth: 1, borderColor: '#FECACA',
    },
    errorText: { color: '#D8000C', fontSize: 13, fontWeight: '600', flex: 1 },

    fieldWrap: { marginBottom: SPACING.md },
    fieldLabel: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 6, marginLeft: 2, textTransform: 'uppercase', letterSpacing: 0.5 },
    fieldInput: {
        height: 50, backgroundColor: '#F8FAFC', borderRadius: RADIUS.sm,
        paddingHorizontal: SPACING.md, color: '#1E293B', fontSize: 15,
        borderWidth: 1.5, borderColor: '#E2E8F0',
    },
    fieldInputFocused: { borderColor: COLORS.primary, backgroundColor: '#fff' },

    cancelBtn: {
        flex: 1, height: 52, backgroundColor: '#F1F5F9', borderRadius: RADIUS.full,
        alignItems: 'center', justifyContent: 'center',
        borderWidth: 1.5, borderColor: '#E2E8F0',
    },
    cancelBtnText: { color: '#1E293B', fontSize: 15, fontWeight: '600' },
    submitBtnWrap: { flex: 1, borderRadius: RADIUS.full, overflow: 'hidden' },
    submitBtnGradient: { height: 52, alignItems: 'center', justifyContent: 'center' },
    submitBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
