import { Platform, type ViewStyle } from 'react-native';

export const Shadows = {
  card: Platform.select<ViewStyle>({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.4,
      shadowRadius: 8,
    },
    android: { elevation: 3 },
    default: {},
  }),
  soft: Platform.select<ViewStyle>({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.12,
      shadowRadius: 4,
    },
    android: { elevation: 2 },
    default: {},
  }),
  glow: Platform.select<ViewStyle>({
    ios: {
      shadowColor: '#818cf8',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.25,
      shadowRadius: 10,
    },
    android: { elevation: 4 },
    default: {},
  }),
};

/** Deep slate control-centre + indigo brand accent */
export const Colors = {
  bg: '#0f1419',
  bgCard: '#161b22',
  bgElevated: '#1c2430',
  bgSurface: '#243044',
  bgInput: '#1a222d',
  border: '#2d3548',
  borderLight: '#3d4a63',
  borderSubtle: '#141a22',

  /** Brand */
  primary: '#818cf8',
  primaryLight: '#a5b4fc',
  primaryBright: '#c7d2fe',
  primaryDim: '#3730a3',
  primaryMuted: 'rgba(129, 140, 248, 0.16)',
  primaryBorder: 'rgba(129, 140, 248, 0.4)',
  textOnPrimary: '#0f1419',

  /** Legacy names → same as primary (gradual migration) */
  gold: '#818cf8',
  goldLight: '#a5b4fc',
  goldBright: '#c7d2fe',
  goldDim: '#4c1d95',
  goldMuted: 'rgba(129, 140, 248, 0.16)',
  goldBorder: 'rgba(129, 140, 248, 0.4)',

  accent: '#818cf8',
  accentDim: 'rgba(129, 140, 248, 0.14)',

  text: '#f1f5f9',
  textSecondary: '#94a3b8',
  textMuted: '#64748b',
  textInverse: '#0f1419',

  success: '#34d399',
  successDim: 'rgba(52, 211, 153, 0.12)',
  successBorder: 'rgba(52, 211, 153, 0.28)',
  warning: '#fbbf24',
  warningDim: 'rgba(251, 191, 36, 0.12)',
  warningBorder: 'rgba(251, 191, 36, 0.28)',
  danger: '#f87171',
  dangerDim: 'rgba(248, 113, 113, 0.12)',
  dangerBorder: 'rgba(248, 113, 113, 0.28)',
  info: '#38bdf8',
  infoDim: 'rgba(56, 189, 248, 0.12)',
  infoBorder: 'rgba(56, 189, 248, 0.28)',
  purple: '#c084fc',
  purpleDim: 'rgba(192, 132, 252, 0.12)',
  statusColors: {
    active: '#34d399',
    suspended: '#f87171',
    pending: '#fbbf24',
    draft: '#94a3b8',
    published: '#34d399',
    archived: '#64748b',
    paid: '#34d399',
    processing: '#38bdf8',
    shipped: '#c084fc',
    delivered: '#34d399',
    cancelled: '#f87171',
    refunded: '#fbbf24',
    pending_payment: '#fbbf24',
    open: '#38bdf8',
    resolved: '#34d399',
    closed: '#64748b',
    low: '#34d399',
    medium: '#fbbf24',
    high: '#f87171',
    urgent: '#ef4444',
  } as Record<string, string>,
};

export const Typography = {
  displayLarge: { fontFamily: 'serif', fontSize: 34, fontWeight: '700' as const, letterSpacing: -0.8 },
  displayMedium: { fontFamily: 'serif', fontSize: 26, fontWeight: '600' as const, letterSpacing: -0.4 },
  heading: { fontSize: 20, fontWeight: '700' as const, letterSpacing: -0.4 },
  subheading: { fontSize: 16, fontWeight: '600' as const, letterSpacing: -0.2 },
  body: { fontSize: 14, fontWeight: '400' as const, lineHeight: 20 },
  bodySmall: { fontSize: 13, fontWeight: '400' as const, lineHeight: 18 },
  label: { fontSize: 12, fontWeight: '600' as const, letterSpacing: 0.3 },
  caption: { fontSize: 11, fontWeight: '500' as const, letterSpacing: 0.8, textTransform: 'uppercase' as const },
  mono: { fontFamily: 'monospace', fontSize: 13 },
  monoSmall: { fontFamily: 'monospace', fontSize: 11 },
  number: { fontSize: 28, fontWeight: '700' as const, letterSpacing: -1 },
  numberLg: { fontSize: 36, fontWeight: '800' as const, letterSpacing: -1.5 },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
};

export const Radii = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 14,
  xl: 16,
  xxl: 22,
  card: 12,
  full: 9999,
};
