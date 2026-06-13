import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { appColors, fontScale, scale } from '../../styles/theme';

type Props = {
    label: string;
    description?: string;
    right: React.ReactNode;
};

export default function AlarmSettingRow({ label, description, right }: Props) {
    return (
        <View style={styles.row}>
            {description ? (
                <View>
                    <Text style={styles.label}>{label}</Text>
                    <Text style={styles.subLabel}>{description}</Text>
                </View>
            ) : (
                <Text style={styles.label}>{label}</Text>
            )}
            {right}
        </View>
    );
}

const styles = StyleSheet.create({
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: scale(12),
    },
    label: {
        fontSize: fontScale(14),
        fontWeight: '600',
    },
    subLabel: {
        fontSize: fontScale(12),
        color: appColors.textSecondary,
        marginTop: scale(4),
    },
});
