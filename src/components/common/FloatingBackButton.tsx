import React from 'react';
import { StyleSheet } from 'react-native';
import { appColors, scale } from '../../styles/theme';
import AppBackButton from './AppBackButton';

type Props = {
    onPress: () => void;
    hitSlop?: number;
};

export default function FloatingBackButton({ onPress, hitSlop = 10 }: Props) {
    return (
        <AppBackButton
            style={styles.backBtn}
            iconStyle={styles.backIcon}
            onPress={onPress}
            hitSlop={hitSlop}
        />
    );
}

const styles = StyleSheet.create({
    backBtn: {
        position: 'absolute',
        left: scale(18),
        top: scale(22),
        width: scale(44),
        height: scale(44),
        borderRadius: scale(22),
        backgroundColor: appColors.white,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 2,
        shadowColor: appColors.black,
        shadowOpacity: 0.08,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
        zIndex: 10,
    },
    backIcon: {
        width: scale(20),
        height: scale(20),
    },
});
