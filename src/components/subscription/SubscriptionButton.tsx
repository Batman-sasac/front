import React from 'react';
import { Pressable, StyleProp, StyleSheet, Text, TextStyle, ViewStyle } from 'react-native';
import { figmaFontScale, figmaScale, subscriptionColors } from '../../styles/subscriptionStyles';

type Variant = 'primary' | 'muted' | 'danger' | 'secondary';

type Props = {
    children: React.ReactNode;
    onPress?: () => void;
    variant?: Variant;
    disabled?: boolean;
    style?: StyleProp<ViewStyle>;
    textStyle?: StyleProp<TextStyle>;
};

export default function SubscriptionButton({
    children,
    onPress,
    variant = 'primary',
    disabled = false,
    style,
    textStyle,
}: Props) {
    return (
        <Pressable
            style={[styles.base, styles[variant], disabled && styles.disabled, style]}
            onPress={disabled ? undefined : onPress}
            disabled={disabled}
        >
            <Text style={[styles.text, styles[`${variant}Text`], textStyle]}>{children}</Text>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    base: {
        width: '100%',
        height: figmaScale(64),
        borderRadius: figmaScale(16),
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: figmaScale(10),
    },
    primary: {
        backgroundColor: subscriptionColors.primaryBlue,
    },
    muted: {
        backgroundColor: subscriptionColors.grey300,
    },
    danger: {
        backgroundColor: subscriptionColors.red,
    },
    secondary: {
        backgroundColor: '#E5E7EB',
    },
    disabled: {
        opacity: 1,
    },
    text: {
        fontSize: figmaFontScale(24),
        lineHeight: figmaFontScale(36),
        fontWeight: '700',
        color: '#FFFFFF',
        textAlign: 'center',
    },
    primaryText: {
        color: '#FFFFFF',
    },
    mutedText: {
        color: '#FFFFFF',
    },
    dangerText: {
        color: '#FFFFFF',
    },
    secondaryText: {
        color: '#11131A',
    },
});
