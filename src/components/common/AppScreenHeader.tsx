import React from 'react';
import {
    ImageStyle,
    StyleProp,
    StyleSheet,
    Text,
    TextStyle,
    View,
    ViewStyle,
} from 'react-native';
import { figmaFontScale, figmaScale, subscriptionColors } from '../../styles/subscriptionStyles';
import AppBackButton from './AppBackButton';

type Props = {
    title: string;
    onBack: () => void;
    right?: React.ReactNode;
    style?: StyleProp<ViewStyle>;
    backButtonStyle?: StyleProp<ViewStyle>;
    backIconStyle?: StyleProp<ImageStyle>;
    titleStyle?: StyleProp<TextStyle>;
    hitSlop?: number;
};

export default function AppScreenHeader({
    title,
    onBack,
    right,
    style,
    backButtonStyle,
    backIconStyle,
    titleStyle,
    hitSlop = 10,
}: Props) {
    return (
        <View style={[styles.header, style]}>
            <AppBackButton
                style={[styles.backBtn, backButtonStyle]}
                iconStyle={[styles.backIcon, backIconStyle]}
                onPress={onBack}
                hitSlop={hitSlop}
            />
            <Text style={[styles.headerTitle, titleStyle]}>{title}</Text>
            {right}
        </View>
    );
}

const styles = StyleSheet.create({
    header: {
        height: figmaScale(72),
        paddingHorizontal: figmaScale(10),
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: subscriptionColors.surface,
    },
    backBtn: {
        width: figmaScale(44),
        height: figmaScale(44),
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: figmaScale(8),
    },
    backIcon: {
        width: figmaScale(44),
        height: figmaScale(44),
    },
    headerTitle: {
        fontSize: figmaFontScale(28),
        lineHeight: figmaFontScale(42),
        fontWeight: '700',
        color: subscriptionColors.grey700,
    },
});
