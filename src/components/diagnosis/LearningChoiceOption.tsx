import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { fontScale, scale } from '../../lib/layout';
import { appColors, appFontWeight } from '../../styles/theme';

type Props = {
    label: 'A' | 'B';
    text: string;
    variant: 'yes' | 'no';
    onPress: () => void;
};

export default function LearningChoiceOption({
    label,
    text,
    variant,
    onPress,
}: Props) {
    const isYes = variant === 'yes';

    return (
        <View style={styles.choiceCol}>
            <Pressable
                style={[styles.choiceButton, isYes ? styles.yesButton : styles.noButton]}
                onPress={onPress}
            >
                <Text style={[styles.choiceLabel, isYes ? styles.choiceLabelYes : styles.choiceLabelNo]}>
                    {label}
                </Text>
            </Pressable>
            <Text style={styles.choiceText}>{text}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    choiceCol: {
        alignItems: 'center',
        width: scale(130),
    },
    choiceButton: {
        width: scale(96),
        height: scale(96),
        borderRadius: scale(24),
        alignItems: 'center',
        justifyContent: 'center',
    },
    yesButton: {
        backgroundColor: appColors.successSoft,
    },
    noButton: {
        backgroundColor: appColors.dangerSoft,
    },
    choiceLabel: {
        fontSize: fontScale(40),
        fontWeight: appFontWeight.extraBold,
    },
    choiceLabelYes: {
        color: appColors.success,
    },
    choiceLabelNo: {
        color: appColors.dangerText,
    },
    choiceText: {
        marginTop: scale(8),
        fontSize: fontScale(12),
        color: appColors.textSubtle,
        textAlign: 'center',
        lineHeight: fontScale(16),
    },
});
