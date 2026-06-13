import React from 'react';
import { StyleSheet } from 'react-native';
import { fontScale, scale } from '../../styles/theme';
import AppModalShell from '../common/AppModalShell';

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
        <AppModalShell
            visible={visible}
            title={title}
            onClose={onClose}
            footer={footer}
            backdropStyle={styles.modalBackdrop}
            cardStyle={styles.modalCard}
            headerStyle={styles.modalHeader}
            titleStyle={styles.modalTitle}
            closeIconStyle={styles.closeText}
        >
            {children}
        </AppModalShell>
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
