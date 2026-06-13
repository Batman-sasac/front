import React from 'react';
import {
    Modal,
    Pressable,
    StyleProp,
    StyleSheet,
    Text,
    TextStyle,
    View,
    ViewStyle,
} from 'react-native';
import { appColors, appRadius, fontScale, scale } from '../../styles/theme';

type Props = {
    visible: boolean;
    title?: string;
    onClose: () => void;
    children: React.ReactNode;
    footer?: React.ReactNode;
    animationType?: 'none' | 'slide' | 'fade';
    showCloseButton?: boolean;
    backdropStyle?: StyleProp<ViewStyle>;
    cardStyle?: StyleProp<ViewStyle>;
    headerStyle?: StyleProp<ViewStyle>;
    titleStyle?: StyleProp<TextStyle>;
    closeIconStyle?: StyleProp<TextStyle>;
};

export default function AppModalShell({
    visible,
    title,
    onClose,
    children,
    footer,
    animationType = 'fade',
    showCloseButton = Boolean(title),
    backdropStyle,
    cardStyle,
    headerStyle,
    titleStyle,
    closeIconStyle,
}: Props) {
    const showHeader = Boolean(title) || showCloseButton;

    return (
        <Modal visible={visible} transparent animationType={animationType} onRequestClose={onClose}>
            <View style={[styles.backdrop, backdropStyle]}>
                <View style={[styles.card, cardStyle]}>
                    {showHeader && (
                        <View style={[styles.header, headerStyle]}>
                            {title ? <Text style={[styles.title, titleStyle]}>{title}</Text> : <View />}
                            {showCloseButton && (
                                <Pressable onPress={onClose} hitSlop={10}>
                                    <Text style={[styles.closeIcon, closeIconStyle]}>×</Text>
                                </Pressable>
                            )}
                        </View>
                    )}
                    {children}
                    {footer}
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: appColors.overlay,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: scale(20),
    },
    card: {
        width: '100%',
        maxWidth: scale(420),
        borderRadius: scale(appRadius.xl),
        backgroundColor: appColors.white,
        overflow: 'hidden',
    },
    header: {
        minHeight: scale(64),
        borderBottomWidth: 1,
        borderBottomColor: appColors.border,
        paddingHorizontal: scale(20),
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    title: {
        flex: 1,
        fontSize: fontScale(20),
        fontWeight: '800',
        color: appColors.text,
    },
    closeIcon: {
        fontSize: fontScale(28),
        lineHeight: fontScale(32),
        color: appColors.textSecondary,
    },
});
