export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radius = {
  sm: 10,
  md: 16,
  lg: 22,
  xl: 28,
  pill: 999,
} as const;

export const motion = {
  fast: 150,
  normal: 250,
  slow: 400,
} as const;

export type ColorScheme = 'light' | 'dark';

export type ThemeColors = {
  background: string;
  backgroundElevated: string;
  surface: string;
  surfaceMuted: string;
  border: string;
  borderSubtle: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  textInverse: string;
  accent: string;
  accentMuted: string;
  accentContrast: string;
  success: string;
  successBg: string;
  warning: string;
  warningBg: string;
  error: string;
  errorBg: string;
  tabBar: string;
  tabBarBorder: string;
  heroStart: string;
  heroMid: string;
  heroEnd: string;
  overlay: string;
  skeleton: string;
  flowDot: string;
  flowLine: string;
};

export const lightColors: ThemeColors = {
  background: '#F4F5F7',
  backgroundElevated: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceMuted: '#ECEEF2',
  border: '#E2E6EC',
  borderSubtle: '#ECEEF2',
  text: '#1A1F26',
  textSecondary: '#4A5568',
  textMuted: '#8A94A6',
  textInverse: '#F6F7F5',
  accent: '#C9A227',
  accentMuted: 'rgba(201, 162, 39, 0.14)',
  accentContrast: '#1A1F26',
  success: '#1F9D63',
  successBg: 'rgba(31, 157, 99, 0.1)',
  warning: '#D48806',
  warningBg: 'rgba(212, 136, 6, 0.1)',
  error: '#D64545',
  errorBg: 'rgba(214, 69, 69, 0.1)',
  tabBar: '#FFFFFF',
  tabBarBorder: '#E2E6EC',
  heroStart: '#1A2420',
  heroMid: '#243530',
  heroEnd: '#2F4A3D',
  overlay: 'rgba(26, 31, 38, 0.45)',
  skeleton: '#E2E6EC',
  flowDot: '#C9A227',
  flowLine: 'rgba(201, 162, 39, 0.45)',
};

export const darkColors: ThemeColors = {
  background: '#0E1116',
  backgroundElevated: '#151A22',
  surface: '#1A2029',
  surfaceMuted: '#222933',
  border: '#2A3240',
  borderSubtle: '#222933',
  text: '#F4F6FA',
  textSecondary: '#B8C0CC',
  textMuted: '#7A8494',
  textInverse: '#0E1116',
  accent: '#D4AF37',
  accentMuted: 'rgba(212, 175, 55, 0.14)',
  accentContrast: '#0E1116',
  success: '#3DD68C',
  successBg: 'rgba(61, 214, 140, 0.12)',
  warning: '#F5B942',
  warningBg: 'rgba(245, 185, 66, 0.12)',
  error: '#FF6B7A',
  errorBg: 'rgba(255, 107, 122, 0.12)',
  tabBar: '#151A22',
  tabBarBorder: '#2A3240',
  heroStart: '#0A0E12',
  heroMid: '#121820',
  heroEnd: '#1A2420',
  overlay: 'rgba(0, 0, 0, 0.55)',
  skeleton: '#2A3240',
  flowDot: '#D4AF37',
  flowLine: 'rgba(212, 175, 55, 0.4)',
};

export const gradients = {
  accent: ['#E8C96A', '#C9A227', '#A8861E'] as const,
  heroLight: ['#1A2420', '#243530', '#2F4A3D'] as const,
  heroDark: ['#0A0E12', '#121820', '#1A2420'] as const,
};

export function shadow(elevation: 'card' | 'floating' | 'button', isDark: boolean) {
  const color = isDark ? '#000' : '#0B2A20';
  const map = {
    card: { offset: { width: 0, height: 8 }, opacity: isDark ? 0.25 : 0.08, radius: 20, elevation: 4 },
    floating: { offset: { width: 0, height: 14 }, opacity: isDark ? 0.35 : 0.14, radius: 24, elevation: 10 },
    button: { offset: { width: 0, height: 8 }, opacity: isDark ? 0.4 : 0.28, radius: 14, elevation: 6 },
  };
  const s = map[elevation];
  return {
    shadowColor: color,
    shadowOffset: s.offset,
    shadowOpacity: s.opacity,
    shadowRadius: s.radius,
    elevation: s.elevation,
  };
}

export function typography(colors: ThemeColors) {
  return {
    display: { fontSize: 34, fontWeight: '800' as const, color: colors.text, letterSpacing: -0.6 },
    displayInverse: { fontSize: 34, fontWeight: '800' as const, color: colors.textInverse, letterSpacing: -0.6 },
    title: { fontSize: 26, fontWeight: '800' as const, color: colors.text, letterSpacing: -0.3 },
    titleInverse: { fontSize: 26, fontWeight: '800' as const, color: colors.textInverse, letterSpacing: -0.3 },
    heading: { fontSize: 19, fontWeight: '700' as const, color: colors.text },
    subtitle: { fontSize: 15, fontWeight: '600' as const, color: colors.textSecondary },
    body: { fontSize: 15, color: colors.text, lineHeight: 22 },
    caption: { fontSize: 13, color: colors.textMuted, lineHeight: 18 },
    label: {
      fontSize: 11,
      color: colors.textMuted,
      textTransform: 'uppercase' as const,
      letterSpacing: 1.1,
      fontWeight: '700' as const,
    },
    numeric: { fontSize: 32, fontWeight: '700' as const, color: colors.text, letterSpacing: -0.5 },
    numericInverse: { fontSize: 32, fontWeight: '700' as const, color: colors.textInverse, letterSpacing: -0.5 },
    financial: { fontSize: 28, fontWeight: '700' as const, color: colors.text, letterSpacing: -0.4 },
  };
}

export type Theme = {
  scheme: ColorScheme;
  colors: ThemeColors;
  type: ReturnType<typeof typography>;
  isDark: boolean;
};

export function buildTheme(scheme: ColorScheme): Theme {
  const colors = scheme === 'dark' ? darkColors : lightColors;
  return { scheme, colors, type: typography(colors), isDark: scheme === 'dark' };
}
