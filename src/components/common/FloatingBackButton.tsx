import React from 'react';
import { Image, Pressable, StyleSheet } from 'react-native';
import { scale } from '../../styles/theme';

type Props = {
    onPress: () => void;
    hitSlop?: number;
};

export default function FloatingBackButton({ onPress, hitSlop = 10 }: Props) {
    return (
        <Pressable style={styles.backBtn} onPress={onPress} hitSlop={hitSlop}>
            <Image
                source={require('../../../assets/shift.png')}
                style={styles.backIcon}
                resizeMode="contain"
            />
        </Pressable>
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
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
        zIndex: 10,
    },
    backIcon: {
        width: scale(20),
        height: scale(20),
        transform: [{ rotate: '180deg' }],
    },
});
