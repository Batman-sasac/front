import React from 'react';
import {
    StyleProp,
    StyleSheet,
    TextStyle,
    ViewStyle,
} from 'react-native';
import { appColors, fontScale, scale } from '../../styles/theme';
import AppButton from './AppButton';

type Variant = 'primary' | 'ghost';

type Props = {
    label: string;
    onPress: () => void;
    variant?: Variant;
    style?: StyleProp<ViewStyle>;
    textStyle?: StyleProp<TextStyle>;
};

export default function CenteredActionButton({
    label,
    onPress,
    variant = 'primary',
    style,
    textStyle,
}: Props) {
    return (
        <AppButton
            style={[styles.button, styles[variant], style]}
            textStyle={[styles.text, styles[`${variant}Text`], textStyle]}
            onPress={onPress}
        >
            {label}
        </AppButton>
    );
}

const styles = StyleSheet.create({
    button: {
        width: '100%',
        maxWidth: scale(360),
        height: scale(48),
        borderRadius: scale(12),
        alignItems: 'center',
        justifyContent: 'center',
    },
    primary: {
        backgroundColor: appColors.primary,
        marginBottom: scale(10),
    },
    ghost: {
        backgroundColor: appColors.white,
        borderWidth: 1,
        borderColor: appColors.border,
    },
    text: {
        fontSize: fontScale(14),
        fontWeight: '900',
    },
    primaryText: {
        color: appColors.white,
    },
    ghostText: {
        color: appColors.text,
    },
});
