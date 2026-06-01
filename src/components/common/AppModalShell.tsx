import React from 'react';
import {
    Modal,
    Pressable,
    StyleProp,
    Text,
    TextStyle,
    View,
    ViewStyle,
} from 'react-native';

type Props = {
    visible: boolean;
    title: string;
    onClose: () => void;
    children: React.ReactNode;
    footer?: React.ReactNode;
    animationType?: 'none' | 'slide' | 'fade';
    backdropStyle: StyleProp<ViewStyle>;
    cardStyle: StyleProp<ViewStyle>;
    headerStyle: StyleProp<ViewStyle>;
    titleStyle: StyleProp<TextStyle>;
    closeIconStyle: StyleProp<TextStyle>;
};

export default function AppModalShell({
    visible,
    title,
    onClose,
    children,
    footer,
    animationType = 'fade',
    backdropStyle,
    cardStyle,
    headerStyle,
    titleStyle,
    closeIconStyle,
}: Props) {
    return (
        <Modal visible={visible} transparent animationType={animationType} onRequestClose={onClose}>
            <View style={backdropStyle}>
                <View style={cardStyle}>
                    <View style={headerStyle}>
                        <Text style={titleStyle}>{title}</Text>
                        <Pressable onPress={onClose}>
                            <Text style={closeIconStyle}>×</Text>
                        </Pressable>
                    </View>
                    {children}
                    {footer}
                </View>
            </View>
        </Modal>
    );
}
