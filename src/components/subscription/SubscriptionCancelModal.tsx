import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import AppModalShell from '../common/AppModalShell';
import { fontScale, scale } from '../../lib/layout';
import { subscriptionColors } from '../../styles/subscriptionStyles';
import SubscriptionButton from './SubscriptionButton';

type Props = {
    visible: boolean;
    onClose: () => void;
    onConfirmCancel: () => void;
};

export default function SubscriptionCancelModal({
    visible,
    onClose,
    onConfirmCancel,
}: Props) {
    return (
        <AppModalShell
            visible={visible}
            title="구독 취소"
            onClose={onClose}
            backdropStyle={styles.modalBackdrop}
            cardStyle={styles.modalCard}
            headerStyle={styles.modalHeader}
            titleStyle={styles.modalTitle}
            closeIconStyle={styles.modalCloseIcon}
            footer={(
                <View style={styles.modalButtons}>
                    <SubscriptionButton style={styles.modalBtnWrap} variant="secondary" onPress={onClose} textStyle={styles.modalSecondaryBtnText}>
                        더 써볼게요
                    </SubscriptionButton>
                    <SubscriptionButton style={styles.modalBtnWrap} variant="danger" onPress={onConfirmCancel}>
                        구독 취소
                    </SubscriptionButton>
                </View>
            )}
        >
            <View style={styles.modalBody}>
                <Image source={require('../../../assets/error/bat-error.png')} style={styles.modalBat} resizeMode="contain" />
                <Text style={styles.modalDesc}>구독을 취소하면 AI와 함께하는 학습은 여기까지예요.</Text>
                <Text style={styles.modalDesc}>이번 달 남은 사용량은 취소 후에도</Text>
                <Text style={styles.modalDesc}>사용하실 수 있어요.</Text>
                <Text style={styles.modalStrong}>정말 구독을 취소하시겠어요?</Text>
            </View>
        </AppModalShell>
    );
}

const styles = StyleSheet.create({
    modalBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.45)',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: scale(14),
    },
    modalCard: {
        width: '100%',
        maxWidth: scale(520),
        backgroundColor: subscriptionColors.modalBg,
        borderRadius: scale(20),
        overflow: 'hidden',
    },
    modalHeader: {
        height: scale(72),
        borderBottomWidth: 1,
        borderBottomColor: subscriptionColors.modalBorder,
        paddingHorizontal: scale(16),
        alignItems: 'center',
        justifyContent: 'space-between',
        flexDirection: 'row',
    },
    modalTitle: {
        fontSize: fontScale(22),
        fontWeight: '800',
        color: '#111218',
    },
    modalCloseIcon: {
        width: scale(34),
        height: scale(34),
        color: '#111218',
        fontSize: fontScale(30),
        fontWeight: '700',
        lineHeight: scale(34),
        textAlign: 'center',
    },
    modalBody: {
        alignItems: 'center',
        paddingHorizontal: scale(16),
        paddingTop: scale(16),
        paddingBottom: scale(8),
    },
    modalBat: {
        width: scale(180),
        height: scale(150),
        marginBottom: scale(8),
    },
    modalDesc: {
        fontSize: fontScale(12),
        fontWeight: '700',
        color: subscriptionColors.textStrong,
        textAlign: 'center',
        lineHeight: fontScale(20),
    },
    modalStrong: {
        marginTop: scale(10),
        fontSize: fontScale(18),
        fontWeight: '900',
        color: subscriptionColors.textStrong,
    },
    modalButtons: {
        flexDirection: 'row',
        gap: scale(8),
        paddingHorizontal: scale(16),
        paddingBottom: scale(16),
    },
    modalBtnWrap: {
        flex: 1,
        height: scale(54),
    },
    modalSecondaryBtnText: {
        color: '#11131A',
    },
});
