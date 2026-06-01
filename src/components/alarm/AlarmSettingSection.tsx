import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { fontScale, scale } from '../../lib/layout';

type Props = {
    title: string;
    children: React.ReactNode;
};

export default function AlarmSettingSection({ title, children }: Props) {
    return (
        <View style={styles.section}>
            <Text style={styles.sectionTitle}>{title}</Text>
            {children}
        </View>
    );
}

const styles = StyleSheet.create({
    section: {
        marginBottom: scale(32),
    },
    sectionTitle: {
        fontSize: fontScale(18),
        fontWeight: '800',
        marginBottom: scale(12),
    },
});
