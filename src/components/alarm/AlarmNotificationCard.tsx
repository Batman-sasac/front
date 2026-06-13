import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { appColors, fontScale, scale } from '../../styles/theme';

export type AlarmNotificationItem = {
    id: string;
    title: string;
    description: string;
    timeLabel: string;
    read: boolean;
};

type Props = {
    alarm: AlarmNotificationItem;
    onPress: () => void;
};

export default function AlarmNotificationCard({ alarm, onPress }: Props) {
    return (
        <Pressable
            style={[styles.card, alarm.read && styles.cardRead]}
            onPress={onPress}
        >
            <View style={styles.cardLeft}>
                <Text
                    style={[styles.cardTitle, alarm.read && styles.cardTitleRead]}
                    numberOfLines={1}
                >
                    {alarm.title}
                </Text>
                <Text
                    style={[styles.cardDesc, alarm.read && styles.cardDescRead]}
                    numberOfLines={1}
                >
                    {alarm.description}
                </Text>
            </View>

            <View style={styles.cardRight}>
                <Text style={styles.cardTime}>{alarm.timeLabel}</Text>
                <Image
                    source={require('../../../assets/shift.png')}
                    style={styles.cardArrowImage}
                    resizeMode="contain"
                />
            </View>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: appColors.white,
        borderRadius: scale(20),
        paddingVertical: scale(18),
        paddingHorizontal: scale(20),
        marginBottom: scale(8),
        elevation: 2,
    },
    cardRead: {
        backgroundColor: appColors.readSurface,
    },
    cardLeft: {
        flex: 1,
    },
    cardTitle: {
        fontSize: fontScale(16),
        fontWeight: '800',
        marginBottom: scale(4),
    },
    cardTitleRead: {
        color: appColors.textTertiary,
    },
    cardDesc: {
        fontSize: fontScale(13),
        color: appColors.textSecondary,
    },
    cardDescRead: {
        color: appColors.textTertiary,
    },
    cardRight: {
        marginLeft: scale(12),
        alignItems: 'flex-end',
    },
    cardTime: {
        fontSize: fontScale(12),
        color: appColors.textSecondary,
        marginBottom: scale(8),
    },
    cardArrowImage: {
        width: scale(18),
        height: scale(18),
        tintColor: appColors.textTertiary,
    },
});
