import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { fontScale, scale } from '../../lib/layout';

type Props = {
    label: string;
    onPress: () => void;
    disabled?: boolean;
};

export default function AlarmTimeChip({ label, onPress, disabled = false }: Props) {
    return (
        <Pressable
            style={styles.timeChip}
            onPress={onPress}
            disabled={disabled}
        >
            <Text style={styles.timeText}>{label}</Text>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    timeChip: {
        paddingHorizontal: scale(16),
        paddingVertical: scale(8),
        borderRadius: 999,
        borderWidth: 1,
        borderColor: '#D1D5DB',
        backgroundColor: '#F3F4F6',
    },
    timeText: {
        fontSize: fontScale(13),
        fontWeight: '600',
    },
});
