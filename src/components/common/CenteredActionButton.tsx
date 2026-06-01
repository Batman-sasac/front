import React from 'react';
import {
    Pressable,
    StyleProp,
    StyleSheet,
    Text,
    TextStyle,
    ViewStyle,
} from 'react-native';
import { fontScale, scale } from '../../styles/theme';

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
        <Pressable
            style={[styles.button, styles[variant], style]}
            onPress={onPress}
        >
            <Text style={[styles.text, styles[`${variant}Text`], textStyle]}>
                {label}
            </Text>
        </Pressable>
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
        backgroundColor: '#5E82FF',
        marginBottom: scale(10),
    },
    ghost: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    text: {
        fontSize: fontScale(14),
        fontWeight: '900',
    },
    primaryText: {
        color: '#FFFFFF',
    },
    ghostText: {
        color: '#111827',
    },
});
