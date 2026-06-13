import React from 'react';
import {
    StyleProp,
    StyleSheet,
    TextStyle,
    ViewStyle,
} from 'react-native';
import { appColors, fontScale, scale } from '../../styles/theme';
import AppButton from './AppButton';

type Props = {
    label: string;
    onPress: () => void;
    disabled?: boolean;
    loading?: boolean;
    style?: StyleProp<ViewStyle>;
    disabledStyle?: StyleProp<ViewStyle>;
    textStyle?: StyleProp<TextStyle>;
};

export default function FormSubmitButton({
    label,
    onPress,
    disabled = false,
    loading = false,
    style,
    disabledStyle,
    textStyle,
}: Props) {
    return (
        <AppButton
            style={[styles.button, style]}
            disabledStyle={disabledStyle ?? styles.buttonDisabled}
            textStyle={[styles.buttonText, textStyle]}
            onPress={onPress}
            disabled={disabled}
            loading={loading}
        >
            {label}
        </AppButton>
    );
}

const styles = StyleSheet.create({
    button: {
        marginTop: scale(8),
        height: scale(64),
        borderRadius: scale(999),
        backgroundColor: appColors.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonDisabled: {
        backgroundColor: appColors.borderStrong,
    },
    buttonText: {
        color: appColors.white,
        fontSize: fontScale(35),
        fontWeight: '700',
    },
});
