import { fontScale, scale } from '../lib/layout';

const FIGMA_FRAME_WIDTH = 1194;
const LAYOUT_BASE_WIDTH = 1024;
const FIGMA_TO_LAYOUT = LAYOUT_BASE_WIDTH / FIGMA_FRAME_WIDTH;

export const figmaScale = (size: number) => scale(size * FIGMA_TO_LAYOUT);
export const figmaFontScale = (size: number) => fontScale(size);

export const subscriptionColors = {
    screenBg: '#F6F7FB',
    surface: '#FFFFFF',
    cardBg: '#FFFFFF',
    progressTrack: '#D2D2D4',
    blue: '#92A6FF',
    primaryBlue: '#5789FC',
    grey300: '#AAABB0',
    grey500: '#606168',
    grey600: '#3F4045',
    grey700: '#212124',
    black: '#000000',
    red: '#D90054',
    modalBg: '#F8F8FA',
    modalBorder: '#D7DAE3',
    textStrong: '#11131A',
} as const;

export const subscriptionShadow = {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: figmaScale(16) },
    shadowOpacity: 0.06,
    shadowRadius: figmaScale(20),
    elevation: 8,
} as const;
