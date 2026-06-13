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
import { appColors } from '../../styles/theme';

type Props = {
    children: React.ReactNode;
    onPress: () => void;
    disabled?: boolean;
    loading?: boolean;
    style?: StyleProp<ViewStyle>;
    disabledStyle?: StyleProp<ViewStyle>;
    textStyle?: StyleProp<TextStyle>;
    loadingColor?: string;
};

export default function AppButton({
    children,
    onPress,
    disabled = false,
    loading = false,
    style,
    disabledStyle,
    textStyle,
    loadingColor = appColors.white,
}: Props) {
    const isDisabled = disabled || loading;

    return (
        <Pressable
            style={[styles.button, style, isDisabled && disabledStyle]}
            onPress={onPress}
            disabled={isDisabled}
        >
            {loading ? (
                <ActivityIndicator color={loadingColor} />
            ) : (
                <Text style={textStyle}>{children}</Text>
            )}
        </Pressable>
    );
}

const styles = StyleSheet.create({
    button: {
        alignItems: 'center',
        justifyContent: 'center',
    },
});
