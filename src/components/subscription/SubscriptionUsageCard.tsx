import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { figmaFontScale, figmaScale, subscriptionColors, subscriptionShadow } from '../../styles/subscriptionStyles';

type Props = {
    pagesUsed: number;
    pagesLimit: number;
    limitReached: boolean;
    progress: number;
    progressColor: string;
};

export default function SubscriptionUsageCard({
    pagesUsed,
    pagesLimit,
    limitReached,
    progress,
    progressColor,
}: Props) {
    return (
        <View style={styles.usageCard}>
            <View style={styles.usageTextColumn}>
                <Text style={styles.usageTitle}>AI 호출 사용량</Text>
                <Text style={[styles.usageValue, limitReached && { color: subscriptionColors.red }]}>{pagesUsed}/{pagesLimit}</Text>
            </View>

            <View style={styles.barTrack}>
                <View style={[styles.barFill, { width: `${progress * 100}%`, backgroundColor: progressColor }]} />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    usageCard: {
        width: '100%',
        maxWidth: figmaScale(1078),
        minHeight: figmaScale(72),
        alignSelf: 'center',
        flexDirection: 'row',
        alignItems: 'center',
        gap: figmaScale(16),
        backgroundColor: subscriptionColors.cardBg,
        borderRadius: figmaScale(16),
        paddingHorizontal: figmaScale(24),
        paddingVertical: figmaScale(8),
        marginBottom: figmaScale(52),
        ...subscriptionShadow,
    },
    usageTextColumn: {
        width: figmaScale(115),
        alignItems: 'center',
    },
    usageTitle: {
        width: '100%',
        fontSize: figmaFontScale(20),
        lineHeight: figmaFontScale(30),
        color: subscriptionColors.grey500,
        fontWeight: '500',
        textAlign: 'center',
    },
    usageValue: {
        width: '100%',
        fontSize: figmaFontScale(32),
        color: subscriptionColors.grey700,
        fontWeight: '700',
        lineHeight: figmaFontScale(38),
        textAlign: 'center',
    },
    barTrack: {
        flex: 1,
        height: figmaScale(24),
        borderRadius: figmaScale(12),
        backgroundColor: subscriptionColors.progressTrack,
        overflow: 'hidden',
    },
    barFill: {
        height: '100%',
        borderRadius: figmaScale(12),
    },
});
