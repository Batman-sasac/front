import React from 'react';
import { ActivityIndicator, StyleProp, StyleSheet, Text, TextStyle, View, ViewStyle } from 'react-native';
import { appColors, fontScale, scale } from '../../styles/theme';

type Props = {
    message?: string;
    size?: 'small' | 'large';
    style?: StyleProp<ViewStyle>;
    textStyle?: StyleProp<TextStyle>;
};

export default function AppLoadingState({
    message,
    size = 'large',
    style,
    textStyle,
}: Props) {
    return (
        <View style={[styles.container, style]}>
            <ActivityIndicator size={size} color={appColors.primary} />
            {message ? <Text style={[styles.text, textStyle]}>{message}</Text> : null}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
        gap: scale(16),
    },
    text: {
        fontSize: fontScale(15),
        color: appColors.textSecondary,
        fontWeight: '600',
    },
});
