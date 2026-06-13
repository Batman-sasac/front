import React from 'react';
import {
    Image,
    Modal,
    Pressable,
    StyleProp,
    StyleSheet,
    Text,
    TextStyle,
    View,
    ViewStyle,
} from 'react-native';
import { appColors, fontScale, scale } from '../../styles/theme';

type Props = {
    visible: boolean;
    title: string;
    onClose: () => void;
    children: React.ReactNode;
    contentStyle?: StyleProp<ViewStyle>;
    titleStyle?: StyleProp<TextStyle>;
};

export default function AppBottomSheetShell({
    visible,
    title,
    onClose,
    children,
    contentStyle,
    titleStyle,
}: Props) {
    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={styles.backdrop}>
                <View style={[styles.content, contentStyle]}>
                    <View style={styles.header}>
                        <Text style={[styles.title, titleStyle]}>{title}</Text>
                        <Pressable onPress={onClose} hitSlop={10}>
                            <Image
                                source={require('../../../assets/delete.png')}
                                style={styles.closeIcon}
                                resizeMode="contain"
                            />
                        </Pressable>
                    </View>
                    {children}
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: appColors.overlayStrong,
        justifyContent: 'flex-end',
    },
    content: {
        backgroundColor: appColors.white,
        borderTopLeftRadius: scale(24),
        borderTopRightRadius: scale(24),
        padding: scale(24),
        minHeight: scale(300),
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: scale(20),
    },
    title: {
        fontSize: fontScale(22),
        fontWeight: '800',
        color: appColors.text,
    },
    closeIcon: {
        width: scale(24),
        height: scale(24),
    },
});
