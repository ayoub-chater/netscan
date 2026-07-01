// Logiterre — Logistics Event Management Design System
export const COLORS = {
    // Backgrounds — Industrial Navy (dark-first)
    bg: '#0B1120',
    bgCard: '#111827',
    bgSurface: '#1A2236',
    bgInput: '#1E2A3D',

    // Navy shades
    navy50: '#F0F4FF',
    navy100: '#DDE6FF',
    navy200: '#BAC8FF',
    navy300: '#8DA3FF',
    navy400: '#617AFF',
    navy500: '#3B52DB',
    navy600: '#2A3BAA',
    navy700: '#1E2A7A',
    navy800: '#141D52',
    navy900: '#0B1120',

    // Neutral grays (cool-tinted)
    gray100: '#F1F5FB',
    gray200: '#E2E8F4',
    gray300: '#BCC5D6',
    gray400: '#8A96AE',
    gray500: '#60708A',
    gray600: '#435068',
    gray700: '#2E3A50',
    gray800: '#1E2A3D',
    gray900: '#111827',

    // Brand — Logistics Amber
    primary: '#F59E0B',       // Electric Amber (accent)
    secondary: '#3B6EFF',     // Steel Blue (secondary actions)
    accent: '#F59E0B',

    // UI States
    success: '#22C55E',
    danger: '#EF4444',
    warning: '#F59E0B',
    info: '#3B82F6',

    // Text
    textPrimary: '#F0F4FF',
    textSecondary: '#8A96AE',
    textMuted: '#60708A',
    textInvert: '#0B1120',

    // Border
    border: '#2E3A50',
    borderLight: '#1E2A3D',
    borderStrong: '#435068',

    // Role Mapping — logistics color coding
    exposant: '#F59E0B',      // Amber for exhibitors
    visiteur: '#3B6EFF',      // Steel blue for visitors
    other: '#60708A',

    // Gradients
    gradientDark: ['#1A2236', '#0B1120'],
    gradientPrimary: ['#FBBF24', '#F59E0B'],   // Amber gradient
    gradientSecondary: ['#60A5FA', '#3B6EFF'], // Blue gradient
    gradientSuccess: ['#4ADE80', '#22C55E'],
    gradientDanger: ['#F87171', '#EF4444'],
    gradientExposant: ['#FBBF24', '#F59E0B'],  // Amber
    gradientVisiteur: ['#60A5FA', '#3B6EFF'],  // Steel blue
};

export const FONTS = {
    light: 'Inter_300Light',
    regular: 'Inter_400Regular',
    medium: 'Inter_500Medium',
    semiBold: 'Inter_600SemiBold',
    bold: 'Inter_700Bold',
    extraBold: 'Inter_800ExtraBold',
};

export const SPACING = {
    xxs: 4,
    xs: 8,
    sm: 12,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
    xxxl: 64,
};

export const RADIUS = {
    xs: 6,
    sm: 10,
    md: 16,
    lg: 24,
    xl: 32,
    full: 9999,
};

export const SHADOWS = {
    soft: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    medium: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
        elevation: 8,
    },
};

export const BG_GRADIENT = {
    colors: ['#0B1120', '#111827', '#1A2236'],
    start: { x: 0, y: 0 },
    end: { x: 0, y: 1 },
};

export const getRoleColor = (role = '') => {
    const r = role.toLowerCase();
    if (r === 'exposant') return COLORS.exposant;
    if (r === 'visiteur') return COLORS.visiteur;
    return COLORS.other;
};

export const getRoleGradient = (role = '') => {
    const r = role.toLowerCase();
    if (r === 'exposant') return COLORS.gradientExposant;
    if (r === 'visiteur') return COLORS.gradientVisiteur;
    return ['#1A2236', '#111827'];
};
