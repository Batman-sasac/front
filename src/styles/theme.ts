import { fontScale, scale } from '../lib/layout';

export const appColors = {
  screenBg: '#F6F7FB',
  screenBgMuted: '#F3F4F6',
  surface: '#FFFFFF',
  primary: '#5E82FF',
  primaryStrong: '#3B5BFF',
  primarySoft: '#EEF2FF',
  primarySoftAlt: '#EEF3FF',
  primaryTint: '#F0F4FF',
  text: '#111827',
  textSubtle: '#374151',
  textMuted: '#4B5563',
  textSecondary: '#6B7280',
  textTertiary: '#9CA3AF',
  border: '#E5E7EB',
  borderStrong: '#D1D5DB',
  success: '#10B981',
  successSoft: '#BBF7D0',
  danger: '#EF4444',
  dangerText: '#F97373',
  dangerSoft: '#FECACA',
  indigo: '#4F46E5',
  white: '#FFFFFF',
  black: '#000000',
} as const;

export const appRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  pill: 999,
} as const;

export const appFontWeight = {
  medium: '500',
  semibold: '600',
  bold: '700',
  extraBold: '800',
  black: '900',
} as const;

export const appShadow = {
  card: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  subtle: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
} as const;

export { fontScale, scale };
