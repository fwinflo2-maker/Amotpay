import type { Theme, ThemeColors, ColorScheme } from './designTokens';
import {
  spacing,
  radius,
  motion,
  gradients as tokenGradients,
  shadow as tokenShadow,
  buildTheme,
  typography as createTypography,
  lightColors,
  darkColors,
} from './designTokens';

export {
  spacing,
  radius,
  motion,
  lightColors,
  darkColors,
  buildTheme,
  tokenGradients,
  tokenShadow,
  createTypography,
};
export type { Theme, ThemeColors, ColorScheme };
export { ThemeProvider, useTheme } from '../context/ThemeContext';

/** Legacy palette for Send / History screens until Phase 3C refactor */
export const colors = {
  deepGreen: '#0F3D2E',
  deepGreenDark: '#081F18',
  emerald: '#1B4332',
  forest: '#2F6F4E',
  anthracite: '#20242A',
  offWhite: '#F6F7F5',
  sand: '#E4C89A',
  gold: '#D4AF37',
  goldLight: '#F4D35E',
  goldDark: '#A9821E',
  white: '#FFFFFF',
  muted: '#7A8B85',
  mutedLight: '#AEB8C4',
  success: '#2ECC71',
  successBg: 'rgba(46, 204, 113, 0.12)',
  warning: '#F5A524',
  warningBg: 'rgba(245, 165, 36, 0.12)',
  error: '#EF4444',
  errorBg: 'rgba(239, 68, 68, 0.12)',
  cardBg: '#FFFFFF',
  border: '#EDEFEC',
  overlay: 'rgba(15, 61, 46, 0.55)',
};

export const gradients = {
  hero: [colors.deepGreenDark, colors.deepGreen, colors.forest] as const,
  gold: [colors.goldLight, colors.gold, colors.goldDark] as const,
  emerald: [colors.emerald, colors.deepGreen] as const,
  glass: ['rgba(255,255,255,0.14)', 'rgba(255,255,255,0.02)'] as const,
  sheen: ['rgba(255,255,255,0)', 'rgba(255,255,255,0.08)', 'rgba(255,255,255,0)'] as const,
};

export const shadow = {
  card: {
    shadowColor: '#0B2A20',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 4,
  },
  floating: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 10,
  },
  button: {
    shadowColor: colors.gold,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 6,
  },
};

export const typography = {
  display: { fontSize: 34, fontWeight: '800' as const, color: colors.offWhite, letterSpacing: -0.5 },
  title: { fontSize: 26, fontWeight: '800' as const, color: colors.offWhite, letterSpacing: -0.3 },
  heading: { fontSize: 19, fontWeight: '700' as const, color: colors.anthracite },
  subtitle: { fontSize: 15, fontWeight: '600' as const, color: colors.sand },
  body: { fontSize: 15, color: colors.anthracite },
  caption: { fontSize: 13, color: colors.muted },
  label: { fontSize: 11, color: colors.muted, textTransform: 'uppercase' as const, letterSpacing: 1.2, fontWeight: '700' as const },
};
