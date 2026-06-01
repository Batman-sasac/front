import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { fontScale, scale } from '../../lib/layout';

type Props = {
    value: string | number;
    onIncrement: () => void;
    onDecrement: () => void;
};

export default function TimeStepperColumn({
    value,
    onIncrement,
    onDecrement,
}: Props) {
    return (
        <View style={styles.timeColumn}>
            <Pressable onPress={onIncrement}>
                <Text style={styles.arrow}>▲</Text>
            </Pressable>
            <Text style={styles.timeValue}>{value}</Text>
            <Pressable onPress={onDecrement}>
                <Text style={styles.arrow}>▼</Text>
            </Pressable>
        </View>
    );
}

const styles = StyleSheet.create({
    timeColumn: {
        alignItems: 'center',
        paddingHorizontal: scale(8),
    },
    arrow: {
        fontSize: fontScale(16),
        marginVertical: scale(4),
    },
    timeValue: {
        fontSize: fontScale(16),
        fontWeight: '700',
        paddingHorizontal: scale(12),
        paddingVertical: scale(8),
        borderRadius: scale(16),
        backgroundColor: '#F3F4FF',
        minWidth: scale(64),
        textAlign: 'center',
    },
});
