import React from 'react';
import {
    ActivityIndicator,
    Pressable,
    StyleProp,
    StyleSheet,
    Text,
    TextStyle,
    ViewStyle,
} from 'react-native';
import { fontScale, scale } from '../../styles/theme';

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
    const isDisabled = disabled || loading;

    return (
        <Pressable
            style={[styles.button, style, isDisabled && (disabledStyle ?? styles.buttonDisabled)]}
            onPress={onPress}
            disabled={isDisabled}
        >
            {loading ? (
                <ActivityIndicator color="#fff" />
            ) : (
                <Text style={[styles.buttonText, textStyle]}>{label}</Text>
            )}
        </Pressable>
    );
}

const styles = StyleSheet.create({
    button: {
        marginTop: scale(8),
        height: scale(64),
        borderRadius: scale(999),
        backgroundColor: '#5E82FF',
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonDisabled: {
        backgroundColor: '#D1D5DB',
    },
    buttonText: {
        color: '#ffffff',
        fontSize: fontScale(35),
        fontWeight: '700',
    },
});
