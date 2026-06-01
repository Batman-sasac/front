import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { fontScale, scale } from '../../styles/theme';

type Props = {
    visible: boolean;
    title: string;
    onClose: () => void;
    children: React.ReactNode;
    footer?: React.ReactNode;
};

export default function ErrorModalShell({
    visible,
    title,
    onClose,
    children,
    footer,
}: Props) {
    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <View style={styles.modalBackdrop}>
                <View style={styles.modalCard}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>{title}</Text>
                        <Pressable onPress={onClose}>
                            <Text style={styles.closeText}>×</Text>
                        </Pressable>
                    </View>
                    {children}
                    {footer}
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.44)',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: scale(16),
    },
    modalCard: {
        width: '100%',
        maxWidth: 560,
        borderRadius: scale(18),
        backgroundColor: '#F8F8FA',
        overflow: 'hidden',
    },
    modalHeader: {
        height: scale(74),
        borderBottomWidth: 1,
        borderBottomColor: '#D7DAE3',
        paddingHorizontal: scale(20),
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    modalTitle: {
        fontSize: fontScale(22),
        fontWeight: '800',
        color: '#111218',
        marginLeft: scale(8),
    },
    closeText: {
        fontSize: fontScale(44),
        lineHeight: fontScale(44),
        color: '#A9ABB4',
        marginTop: scale(-4),
    },
});
