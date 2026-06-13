import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { appColors, fontScale, scale } from '../../styles/theme';

type Props = {
    children: string;
    visible: boolean;
};

export default function FormHelperText({ children, visible }: Props) {
    return (
        <Text style={[styles.helperText, !visible && { opacity: 0 }]}>
            {children || ' '}
        </Text>
    );
}

const styles = StyleSheet.create({
    helperText: {
        marginTop: scale(2),
        height: fontScale(14),
        fontSize: fontScale(14),
        color: appColors.danger,
        marginBottom: scale(4),
        paddingHorizontal: scale(8),
    },
});
