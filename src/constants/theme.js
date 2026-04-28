// NetScan — Cold Luxury Design System (Logiterre Professional Aesthetic)
export const COLORS = {
    // Backgrounds - Clean & Crisp
    bg: '#F8FAFC',         // Slate White (Professional & Cold)
    bgCard: '#FFFFFF',     // Pure White
    bgSurface: '#FDFCFB',
    bgInput: '#FFFFFF',

    // Neutral colors
    gray100: '#F1F5F9',
    gray200: '#E2E8F0',
    gray300: '#CBD5E1',
    gray400: '#94A3B8',
    gray500: '#64748B',
    gray600: '#475569',
    gray700: '#334155',
    gray800: '#1E293B',
    gray900: '#0F172A',

    // Brand - Professional Cold
    primary: '#0E4DA4',     // Logiterre Blue
    secondary: '#1A934E',   // Logiterre Green
    accent: '#334155',      // Slate Blue/Gray

    // UI States
    success: '#1A934E',
    danger: '#EF4444',
    warning: '#F59E0B',
    info: '#3B82F6',

    // Text (Cold Slate Grays)
    textPrimary: '#1E293B',
    textSecondary: '#475569',
    textMuted: '#94A3B8',
    textInvert: '#FFFFFF',

    // Border
    border: '#E2E8F0',
    borderLight: '#F1F5F9',
    borderStrong: '#CBD5E1',

    // Role Mapping
    exposant: '#0E4DA4',    // Blue
    visiteur: '#1A934E',    // Green
    other: '#64748B',

    // Gradients
    gradientDark: ['#1E293B', '#0F172A'],
    gradientPrimary: ['#2563EB', '#0E4DA4'], // Deep Blue Gradient
    gradientSecondary: ['#22C55E', '#1A934E'], // Professional Green Gradient
    gradientSuccess: ['#22C55E', '#1A934E'],
    gradientDanger: ['#F87171', '#EF4444'],
    gradientExposant: ['#2563EB', '#0E4DA4'],
    gradientVisiteur: ['#22C55E', '#1A934E']
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
    soft: {},
    medium: {},
};

export const BG_GRADIENT = {
    colors: ['#F5F9FF', '#E8F5F0', '#C8E8DC'],
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
    return ['#FDFCFB', '#F5F3F1'];
};
