import React, { useState, useRef } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, StyleSheet,
    KeyboardAvoidingView, Platform, ActivityIndicator,
    Animated, Alert, Image, ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { COLORS, SPACING, RADIUS, BG_GRADIENT } from '../constants/theme';

export default function LoginScreen({ navigation }) {
    const insets = useSafeAreaInsets();
    const { signIn } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [focusedField, setFocusedField] = useState(null);
    const [passwordVisible, setPasswordVisible] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const [errorMsg, setErrorMsg] = useState(null);

    const buttonScale = useRef(new Animated.Value(1)).current;

    const handlePressIn = () =>
        Animated.spring(buttonScale, { toValue: 0.98, useNativeDriver: true }).start();
    const handlePressOut = () =>
        Animated.spring(buttonScale, { toValue: 1, useNativeDriver: true }).start();

    const handleLogin = async () => {
        if (!email.trim() || !password) {
            Alert.alert('Champs requis', 'Veuillez saisir votre email et mot de passe.');
            return;
        }
        setLoading(true);
        setErrorMsg(null);
        try {
            await signIn(email.trim(), password);
        } catch (e) {
            const msg = e?.response?.data?.message || 'Identifiants incorrects. Veuillez réessayer.';
            setErrorMsg(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <LinearGradient colors={BG_GRADIENT.colors} start={BG_GRADIENT.start} end={BG_GRADIENT.end} style={styles.gradient}>
            <View style={{ height: insets.top, backgroundColor: '#000000' }} />
            <StatusBar style="light" backgroundColor="#000000" />
            <View style={[styles.mainContainer]}>

                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.kav}
                    keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 50}
                >
                    <ScrollView
                        contentContainerStyle={styles.scrollContent}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="always"
                        keyboardDismissMode="none"
                    >
                        {/* Back button */}
                        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.canGoBack() && navigation.goBack()}>
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

                        {/* Title */}
                        <Text style={styles.title}>Bienvenue de retour</Text>
                        <Text style={styles.subtitle}>
                            Saisissez vos identifiants de connexion{'\n'}corrects pour continuer
                        </Text>

                        {/* Error */}
                        {errorMsg && (
                            <View style={styles.errorContainer}>
                                <Text style={styles.errorText}>{errorMsg}</Text>
                            </View>
                        )}

                        {/* Email Field */}
                        <View style={[styles.fieldWrap, focusedField === 'email' && styles.fieldWrapFocused]}>
                            <Text style={styles.fieldLabel}>Email</Text>
                            <TextInput
                                style={styles.fieldInput}
                                placeholder="votre@email.fr"
                                placeholderTextColor={COLORS.textMuted}
                                value={email}
                                onChangeText={setEmail}
                                keyboardType="email-address"
                                autoCapitalize="none"
                                onFocus={() => setFocusedField('email')}
                                onBlur={() => setFocusedField(null)}
                            />
                        </View>

                        {/* Password Field */}
                        <View style={[styles.fieldWrap, focusedField === 'password' && styles.fieldWrapFocused]}>
                            <Text style={styles.fieldLabel}>Mot de passe</Text>
                            <View style={styles.passwordRow}>
                                <TextInput
                                    style={[styles.fieldInput, { flex: 1 }]}
                                    placeholder="**********"
                                    placeholderTextColor={COLORS.textMuted}
                                    value={password}
                                    onChangeText={setPassword}
                                    secureTextEntry={!passwordVisible}
                                    onFocus={() => setFocusedField('password')}
                                    onBlur={() => setFocusedField(null)}
                                />
                                <TouchableOpacity
                                    onPress={() => setPasswordVisible(v => !v)}
                                    style={styles.eyeBtn}
                                >
                                    <Ionicons
                                        name={passwordVisible ? 'eye-outline' : 'eye-off-outline'}
                                        size={20}
                                        color={COLORS.textMuted}
                                    />
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Remember me */}
                        <TouchableOpacity
                            style={styles.rememberRow}
                            onPress={() => setRememberMe(v => !v)}
                            activeOpacity={0.7}
                        >
                            <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
                                {rememberMe && <Ionicons name="checkmark" size={12} color="#fff" />}
                            </View>
                            <Text style={styles.rememberText}>Se souvenir de moi</Text>
                        </TouchableOpacity>

                        {/* Login Button */}
                        <Animated.View style={{ transform: [{ scale: buttonScale }], marginTop: SPACING.xl }}>
                            <TouchableOpacity
                                onPressIn={handlePressIn}
                                onPressOut={handlePressOut}
                                onPress={handleLogin}
                                activeOpacity={0.9}
                                disabled={loading}
                                style={styles.loginBtn}
                            >
                                {loading
                                    ? <ActivityIndicator color="#fff" />
                                    : <Text style={styles.loginBtnText}>Se connecter</Text>
                                }
                            </TouchableOpacity>
                        </Animated.View>



                        {/* Register link */}
                        <TouchableOpacity
                            style={styles.registerLink}
                            onPress={() => navigation.navigate('Register')}
                        >
                            <Text style={styles.registerLinkText}>
                                Pas encore de compte?{' '}
                                <Text style={styles.registerLinkBold}>S'inscrire</Text>
                            </Text>
                        </TouchableOpacity>
                    </ScrollView>
                </KeyboardAvoidingView>
            </View>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    gradient: { flex: 1 },
    mainContainer: { flex: 1 },
    kav: { flex: 1 },
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: SPACING.lg,
        paddingTop: SPACING.md,
        paddingBottom: 40,
    },

    backBtn: {
        width: 36,
        height: 36,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: SPACING.lg,
    },

    logoWrap: {
        alignItems: 'center',
        marginBottom: SPACING.xl,
    },
    logo: {
        width: 200,
        height: 80,
    },

    title: {
        fontSize: 30,
        fontWeight: '800',
        color: COLORS.textPrimary,
        textAlign: 'center',
        marginBottom: SPACING.sm,
        letterSpacing: -0.5,
    },
    subtitle: {
        fontSize: 15,
        color: COLORS.textSecondary,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: SPACING.xl,
    },

    errorContainer: {
        backgroundColor: '#FFE5E5',
        padding: 10,
        borderRadius: RADIUS.sm,
        marginBottom: SPACING.md,
        borderWidth: 1,
        borderColor: '#FFBABA',
    },
    errorText: {
        color: '#D8000C',
        fontSize: 14,
        fontWeight: '600',
        textAlign: 'center',
    },

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
    fieldWrapFocused: {
        borderColor: COLORS.primary,
    },
    fieldLabel: {
        fontSize: 13,
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
    passwordRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    eyeBtn: {
        paddingLeft: SPACING.sm,
        paddingVertical: 4,
    },

    rememberRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
        gap: SPACING.sm,
    },
    checkbox: {
        width: 18,
        height: 18,
        borderRadius: 4,
        borderWidth: 1.5,
        borderColor: COLORS.border,
        backgroundColor: '#fff',
        alignItems: 'center',
        justifyContent: 'center',
    },
    checkboxChecked: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
    },
    rememberText: {
        fontSize: 14,
        color: COLORS.textSecondary,
    },

    loginBtn: {
        height: 56,
        borderRadius: RADIUS.full,
        backgroundColor: COLORS.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    loginBtnText: {
        color: '#fff',
        fontSize: 17,
        fontWeight: '700',
    },

    registerLink: {
        alignItems: 'center',
        marginTop: 'auto',
        paddingTop: SPACING.xl * 2,
        paddingBottom: SPACING.md,
    },
    registerLinkText: {
        fontSize: 14,
        color: COLORS.textSecondary,
    },
    registerLinkBold: {
        color: COLORS.primary,
        fontWeight: '700',
    },

});
// forced update 2
