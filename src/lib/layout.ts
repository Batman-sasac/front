// src/lib/layout.ts
import { Dimensions } from 'react-native';

const guidelineBaseWidth = 1024;

const getWindowWidth = () => Dimensions.get('window').width;

export const scale = (size: number) => (getWindowWidth() / guidelineBaseWidth) * size;

// Keep font growth softer than element scaling.
export const fontScale = (size: number) => {
    const factor = 0.25;
    const scaled = scale(size);
    return size + (scaled - size) * factor;
};
