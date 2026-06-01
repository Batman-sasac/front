import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { figmaFontScale, figmaScale, subscriptionColors } from '../../styles/subscriptionStyles';

type Props = {
    label: string;
    wide?: boolean;
    style?: StyleProp<ViewStyle>;
};

export default function SubscriptionBadge({ label, wide = false, style }: Props) {
    return (
        <View style={[styles.badge, wide && styles.badgeWide, style]}>
            <Text style={styles.badgeText} numberOfLines={1}>{label}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    badge: {
        minWidth: figmaScale(106),
        height: figmaScale(44),
        paddingHorizontal: figmaScale(16),
        paddingVertical: figmaScale(8),
        borderRadius: figmaScale(24),
        backgroundColor: subscriptionColors.primaryBlue,
        alignItems: 'center',
        justifyContent: 'center',
    },
    badgeWide: {
        minWidth: figmaScale(206),
    },
    badgeText: {
        color: '#FFFFFF',
        fontSize: figmaFontScale(20),
        lineHeight: figmaFontScale(30),
        fontWeight: '700',
        textAlign: 'center',
    },
});
