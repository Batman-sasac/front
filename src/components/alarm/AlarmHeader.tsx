import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { fontScale, scale } from '../../styles/theme';

type Props = {
    title: string;
    onBack: () => void;
    onSettingPress: () => void;
};

export default function AlarmHeader({ title, onBack, onSettingPress }: Props) {
    return (
        <View style={styles.header}>
            <Pressable style={styles.backButton} onPress={onBack}>
                <Image
                    source={require('../../../assets/shift.png')}
                    style={styles.backIcon}
                    resizeMode="contain"
                />
            </Pressable>

            <Text style={styles.headerTitle}>{title}</Text>

            <Pressable style={styles.settingButton} onPress={onSettingPress}>
                <Image
                    source={require('../../../assets/alarm/alarm-setting.png')}
                    style={styles.settingIcon}
                    resizeMode="contain"
                />
            </Pressable>
        </View>
    );
}

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: scale(32),
        paddingTop: scale(20),
        paddingBottom: scale(16),
        backgroundColor: '#FFFFFF',
    },
    backButton: {
        paddingVertical: scale(4),
        paddingRight: scale(16),
        paddingLeft: 0,
    },
    backIcon: {
        width: scale(18),
        height: scale(18),
        transform: [{ rotate: '180deg' }],
    },
    headerTitle: {
        flex: 1,
        fontSize: fontScale(20),
        fontWeight: '800',
    },
    settingButton: {
        paddingHorizontal: scale(4),
        paddingVertical: scale(4),
    },
    settingIcon: {
        width: scale(24),
        height: scale(24),
    },
});
