import { useState, useRef } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, StyleSheet,
    KeyboardAvoidingView, Platform, ActivityIndicator,
    ScrollView, Animated, Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { register } from '../services/api';
import { COLORS, SPACING, RADIUS, BG_GRADIENT } from '../constants/theme';

const ROLES = [
    {
        key: 'Visiteur',
        icon: 'person-outline',
        label: 'Visiteur',
        desc: 'Je viens explorer l\'événement',
        color: COLORS.secondary,
        gradient: ['#22C55E', '#1A934E'],
    },
    {
        key: 'Exposant',
        icon: 'storefront-outline',
        label: 'Exposant',
        desc: 'Je représente une entreprise',
        color: COLORS.primary,
        gradient: ['#2563EB', '#0E4DA4'],
    },
];

// Outlined field with floating label
const Field = ({ label, value, onChangeText, placeholder, keyboardType, secureTextEntry, autoCapitalize, style }) => {
    const [focused, setFocused] = useState(false);
    return (
        <View style={[styles.fieldWrap, focused && styles.fieldWrapFocused, style]}>
            <Text style={styles.fieldLabel}>{label}</Text>
            <TextInput
                style={styles.fieldInput}
                value={value}
                onChangeText={onChangeText}
                placeholder={placeholder}
                placeholderTextColor={COLORS.textMuted}
                keyboardType={keyboardType || 'default'}
                secureTextEntry={secureTextEntry}
                autoCapitalize={autoCapitalize || 'words'}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
            />
        </View>
    );
};

// Section header with left blue bar
const SectionHeader = ({ title }) => (
    <View style={styles.sectionHeader}>
        <View style={styles.sectionBar} />
        <Text style={styles.sectionTitle}>{title}</Text>
    </View>
);

export default function RegisterScreen({ navigation }) {
    const insets = useSafeAreaInsets();
    const { signIn } = useAuth();
    const [step, setStep] = useState('role'); // 'role' | 'form'
    const [role, setRole] = useState(null);
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState(null);
    const [acceptCgu, setAcceptCgu] = useState(false);

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [phone, setPhone] = useState('');
    const [company, setCompany] = useState('');
    const [ville, setVille] = useState('');
    const [pays, setPays] = useState('');
    const [secteur, setSecteur] = useState('');
    const [website, setWebsite] = useState('');

    const buttonScale = useRef(new Animated.Value(1)).current;
    const handlePressIn = () => Animated.spring(buttonScale, { toValue: 0.98, useNativeDriver: true }).start();
    const handlePressOut = () => Animated.spring(buttonScale, { toValue: 1, useNativeDriver: true }).start();

    const handleRegister = async () => {
        if (!name.trim() || !email.trim() || !password) {
            setErrorMsg('Veuillez remplir les champs obligatoires.');
            return;
        }
        if (!acceptCgu) {
            setErrorMsg('Veuillez accepter les Conditions Générales d\'Utilisation.');
            return;
        }
        setLoading(true);
        setErrorMsg(null);
        try {
            await register({
                name: name.trim(),
                email: email.trim(),
                password,
                role,
                phone: phone.trim() || undefined,
                company: company.trim() || undefined,
                website: website.trim() || undefined,
                ville: ville.trim() || undefined,
                pays: pays.trim() || undefined,
                secteur_activite: secteur.trim() || undefined,
            });
            await signIn(email.trim(), password);
        } catch (e) {
            const msg = e?.response?.data?.message
                || (e?.response?.data?.errors ? Object.values(e.response.data.errors)[0][0] : null)
                || 'Erreur lors de l\'inscription.';
            setErrorMsg(msg);
        } finally {
            setLoading(false);
        }
    };

    // ── Role selection ──────────────────────────────────────────────────────────
    if (step === 'role') {
        return (
            <LinearGradient colors={BG_GRADIENT.colors} start={BG_GRADIENT.start} end={BG_GRADIENT.end} style={styles.gradient}>
                <View style={{ height: insets.top, backgroundColor: '#000000' }} />
                <StatusBar style="light" backgroundColor="#000000" />
                <View style={[styles.mainContainer]}>
                    <ScrollView contentContainerStyle={styles.roleScrollContent} showsVerticalScrollIndicator={false}>
                        {/* Back button */}
                        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                            <Ionicons name="chevron-back" size={22} color={COLORS.textPrimary} />
                        </TouchableOpacity>

                        {/* Logo */}
                        <View style={styles.logoWrap}>
                            <Image
                                source={require('../../assets/logiterre-logo.png')}
                                style={styles.logo}
                                resizeMode="contain"
                            />
                        </View>

                        <Text style={styles.rolePageTitle}>Inscription</Text>
                        <Text style={styles.rolePageSub}>choisissez votre profile</Text>

                        <View style={styles.roleCardsWrap}>
                            {ROLES.map((r) => {
                                const isSelected = role === r.key;
                                return (
                                    <TouchableOpacity
                                        key={r.key}
                                        style={[
                                            styles.roleCard,
                                            isSelected && { borderColor: r.color, borderWidth: 2 },
                                        ]}
                                        onPress={() => setRole(r.key)}
                                        activeOpacity={0.8}
                                    >
                                        <View style={[styles.roleIconCircle, { backgroundColor: r.color + '20' }]}>
                                            <Ionicons name={r.icon} size={26} color={r.color} />
                                        </View>
                                        <View style={styles.roleCardInfo}>
                                            <Text style={[styles.roleCardLabel, { color: COLORS.textPrimary }]}>
                                                {r.label}
                                            </Text>
                                            <Text style={styles.roleCardDesc}>{r.desc}</Text>
                                        </View>
                                        {isSelected && (
                                            <View style={[styles.roleCheckmark, { backgroundColor: r.color }]}>
                                                <Ionicons name="checkmark" size={14} color="#fff" />
                                            </View>
                                        )}
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        <Animated.View style={{ transform: [{ scale: buttonScale }], marginTop: SPACING.xl }}>
                            <TouchableOpacity
                                style={[styles.continueBtn, !role && styles.continueBtnDisabled]}
                                onPressIn={handlePressIn}
                                onPressOut={handlePressOut}
                                onPress={() => role && setStep('form')}
                                activeOpacity={0.9}
                                disabled={!role}
                            >
                                <Text style={styles.continueBtnText}>Se connecter</Text>
                            </TouchableOpacity>
                        </Animated.View>

                        <TouchableOpacity
                            style={styles.loginLink}
                            onPress={() => navigation.goBack()}
                        >
                            <Text style={styles.loginLinkText}>
                                Pas encore de compte?{' '}
                                <Text style={styles.loginLinkBold}>S'inscrire</Text>
                            </Text>
                        </TouchableOpacity>
                    </ScrollView>
                </View>
            </LinearGradient>
        );
    }

    // ── Form ────────────────────────────────────────────────────────────────────
    const roleData = ROLES.find(r => r.key === role);
    const roleColor = roleData?.color || COLORS.primary;

    return (
        <LinearGradient colors={BG_GRADIENT.colors} start={BG_GRADIENT.start} end={BG_GRADIENT.end} style={styles.gradient}>
            <View style={{ height: insets.top, backgroundColor: '#000000' }} />
            <StatusBar style="light" backgroundColor="#000000" />
            <View style={[styles.mainContainer]}>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                    <ScrollView
                        contentContainerStyle={styles.formScrollContent}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="always"
                    >
                        {/* Top row: back + role badge */}
                        <View style={styles.formTopRow}>
                            <TouchableOpacity style={styles.backBtn} onPress={() => setStep('role')}>
                                <Ionicons name="chevron-back" size={22} color={COLORS.textPrimary} />
                            </TouchableOpacity>
                            <View style={[styles.roleBadge, { backgroundColor: roleColor + '20' }]}>
                                <Ionicons name={roleData?.icon} size={16} color={roleColor} />
                                <Text style={[styles.roleBadgeText, { color: roleColor }]}>
                                    {role?.toUpperCase()}
                                </Text>
                            </View>
                            <View style={{ width: 36 }} />
                        </View>

                        <Text style={styles.formTitle}>Créer un compte{'\n'}{role}</Text>

                        {errorMsg ? (
                            <View style={styles.errorBox}>
                                <Text style={styles.errorText}>{errorMsg}</Text>
                            </View>
                        ) : null}

                        {/* Personal Info */}
                        <SectionHeader title="Informations Personneles" />
                        <Field label="Nom complet" value={name} onChangeText={setName} placeholder="votre nom" />
                        <Field label="Email" value={email} onChangeText={setEmail} placeholder="votre@email.fr" keyboardType="email-address" autoCapitalize="none" />
                        <Field label="Mot de passe" value={password} onChangeText={setPassword} placeholder="8 caractère minimum" secureTextEntry autoCapitalize="none" />
                        <Field label="Téléphone" value={phone} onChangeText={setPhone} placeholder="+212 6 00 00 00 00" keyboardType="phone-pad" autoCapitalize="none" />

                        {/* Exposant-only section */}
                        {role === 'Exposant' && (
                            <>
                                <SectionHeader title="Informations entreprise" />
                                <Field label="Entreprise" value={company} onChangeText={setCompany} placeholder="Nom de votre société" />
                                <Field label="Secteur d'activité" value={secteur} onChangeText={setSecteur} placeholder="Ex: Technologie, Agriculture..." />
                                <Field label="Site web" value={website} onChangeText={setWebsite} placeholder="https://votre-site.com" autoCapitalize="none" />
                            </>
                        )}

                        {/* Localisation */}
                        <SectionHeader title="Localisation" />
                        <View style={styles.rowFields}>
                            <Field label="Ville" value={ville} onChangeText={setVille} placeholder="votre ville" style={styles.halfField} />
                            <Field label="Pays" value={pays} onChangeText={setPays} placeholder="votre pays" style={styles.halfField} />
                        </View>

                        {/* CGU checkbox */}
                        <TouchableOpacity
                            style={styles.cguRow}
                            onPress={() => setAcceptCgu(v => !v)}
                            activeOpacity={0.7}
                        >
                            <View style={[styles.checkbox, acceptCgu && { backgroundColor: COLORS.warning, borderColor: COLORS.warning }]}>
                                {acceptCgu && <Ionicons name="checkmark" size={12} color="#fff" />}
                            </View>
                            <Text style={styles.cguText}>
                                J'accepte les Conditions Générales d'Utilisation et la politique de confidentialité.
                            </Text>
                        </TouchableOpacity>

                        {/* Submit */}
                        <Animated.View style={{ transform: [{ scale: buttonScale }], marginTop: SPACING.lg, marginBottom: SPACING.xl }}>
                            <TouchableOpacity
                                style={[styles.submitBtn, { backgroundColor: COLORS.primary }]}
                                onPressIn={handlePressIn}
                                onPressOut={handlePressOut}
                                onPress={handleRegister}
                                disabled={loading}
                                activeOpacity={0.9}
                            >
                                {loading
                                    ? <ActivityIndicator color="#fff" />
                                    : <Text style={styles.submitBtnText}>S'inscrire</Text>
                                }
                            </TouchableOpacity>
                        </Animated.View>
                    </ScrollView>
                </KeyboardAvoidingView>
            </View>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    gradient: { flex: 1 },
    mainContainer: { flex: 1 },

    backBtn: {
        width: 36,
        height: 36,
        alignItems: 'center',
        justifyContent: 'center',
    },

    // ── Role selection ──
    roleScrollContent: {
        paddingHorizontal: SPACING.lg,
        paddingTop: SPACING.md,
        paddingBottom: 40,
    },
    logoWrap: { alignItems: 'center', marginBottom: SPACING.xl },
    logo: { width: 200, height: 80 },

    rolePageTitle: {
        fontSize: 30,
        fontWeight: '800',
        color: COLORS.textPrimary,
        textAlign: 'center',
        letterSpacing: -0.5,
    },
    rolePageSub: {
        fontSize: 15,
        color: COLORS.textSecondary,
        textAlign: 'center',
        marginBottom: SPACING.xl,
        marginTop: 4,
    },

    roleCardsWrap: { gap: SPACING.md },
    roleCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: RADIUS.lg,
        padding: SPACING.lg,
        borderWidth: 1.5,
        borderColor: COLORS.border,
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 2,
    },
    roleIconCircle: {
        width: 52,
        height: 52,
        borderRadius: RADIUS.full,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: SPACING.md,
    },
    roleCardInfo: { flex: 1 },
    roleCardLabel: { fontSize: 17, fontWeight: '700', marginBottom: 3 },
    roleCardDesc: { fontSize: 13, color: COLORS.textMuted },
    roleCheckmark: {
        width: 26,
        height: 26,
        borderRadius: RADIUS.full,
        alignItems: 'center',
        justifyContent: 'center',
    },

    continueBtn: {
        height: 56,
        borderRadius: RADIUS.full,
        backgroundColor: COLORS.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    continueBtnDisabled: { backgroundColor: COLORS.gray300 },
    continueBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },

    loginLink: {
        alignItems: 'center',
        paddingTop: SPACING.xl * 2,
        paddingBottom: SPACING.md,
    },
    loginLinkText: { fontSize: 14, color: COLORS.textSecondary },
    loginLinkBold: { color: COLORS.primary, fontWeight: '700' },

    // ── Form ──
    formScrollContent: {
        paddingHorizontal: SPACING.lg,
        paddingTop: SPACING.md,
        paddingBottom: 40,
    },
    formTopRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: SPACING.lg,
    },
    roleBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 14,
        paddingVertical: 7,
        borderRadius: RADIUS.full,
    },
    roleBadgeText: { fontSize: 13, fontWeight: '700' },

    formTitle: {
        fontSize: 26,
        fontWeight: '800',
        color: COLORS.textPrimary,
        marginBottom: SPACING.lg,
        letterSpacing: -0.3,
        lineHeight: 34,
    },

    errorBox: {
        backgroundColor: '#FFE5E5',
        padding: 12,
        borderRadius: RADIUS.sm,
        marginBottom: SPACING.md,
        borderWidth: 1,
        borderColor: '#FFBABA',
    },
    errorText: { color: '#D8000C', fontSize: 14, fontWeight: '600' },

    // Section header
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: SPACING.md,
        marginTop: SPACING.md,
    },
    sectionBar: {
        width: 4,
        height: 20,
        borderRadius: 2,
        backgroundColor: COLORS.primary,
        marginRight: SPACING.sm,
    },
    sectionTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: COLORS.primary,
    },

    // Outlined field
    fieldWrap: {
        borderWidth: 1.5,
        borderColor: COLORS.border,
        borderRadius: RADIUS.md,
        paddingHorizontal: SPACING.md,
        paddingTop: SPACING.xs,
        paddingBottom: 4,
        backgroundColor: '#fff',
        marginBottom: SPACING.md,
    },
    fieldWrapFocused: { borderColor: COLORS.primary },
    fieldLabel: {
        fontSize: 12,
        fontWeight: '700',
        color: COLORS.primary,
        marginBottom: 2,
    },
    fieldInput: {
        fontSize: 15,
        color: COLORS.textPrimary,
        height: 36,
        paddingVertical: 0,
    },

    // Side-by-side location fields
    rowFields: {
        flexDirection: 'row',
        gap: SPACING.sm,
    },
    halfField: { flex: 1, marginBottom: SPACING.md },

    // CGU
    cguRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: SPACING.sm,
        marginBottom: SPACING.md,
        marginTop: SPACING.xs,
    },
    checkbox: {
        width: 20,
        height: 20,
        borderRadius: 4,
        borderWidth: 1.5,
        borderColor: COLORS.border,
        backgroundColor: '#fff',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 1,
        flexShrink: 0,
    },
    cguText: {
        flex: 1,
        fontSize: 13,
        color: COLORS.textSecondary,
        lineHeight: 19,
    },

    submitBtn: {
        height: 56,
        borderRadius: RADIUS.full,
        alignItems: 'center',
        justifyContent: 'center',
    },
    submitBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});
