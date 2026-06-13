import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import AppModalShell from '../common/AppModalShell';
import SubscriptionButton from './SubscriptionButton';

type UsageExhaustedModalProps = {
  visible: boolean;
  message: string;
  onClose: () => void;
  onSubscribe: () => void;
};

export default function UsageExhaustedModal({
  visible,
  message,
  onClose,
  onSubscribe,
}: UsageExhaustedModalProps) {
  return (
    <AppModalShell
      visible={visible}
      title="사용량 소진 안내"
      onClose={onClose}
      backdropStyle={styles.modalBackdrop}
      cardStyle={styles.modalCard}
      headerStyle={styles.modalHeader}
      titleStyle={styles.modalTitle}
      closeIconStyle={styles.closeIcon}
      footer={(
        <View style={styles.modalButtons}>
          <SubscriptionButton style={styles.modalBtn} variant="secondary" onPress={onClose} textStyle={styles.modalBtnSecondaryText}>
            다음에 할게요
          </SubscriptionButton>
          <SubscriptionButton style={styles.modalBtn} onPress={onSubscribe}>
            구독하기
          </SubscriptionButton>
        </View>
      )}
    >
      <View style={styles.modalBody}>
        <Image source={require('../../../assets/character/bat-character.png')} style={styles.modalBat} resizeMode="contain" />
        <Text style={styles.modalDesc}>{message}</Text>
        <Text style={styles.modalDesc}>계속 학습하고 싶으시다면</Text>
        <Text style={styles.modalDesc}>프리미엄 요금제를 이용해 보세요.</Text>
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
    paddingHorizontal: 16,
  },
  modalCard: {
    width: '100%',
    maxWidth: 540,
    backgroundColor: '#F8F8FA',
    borderRadius: 20,
    overflow: 'hidden',
  },
  modalHeader: {
    height: 72,
    borderBottomWidth: 1,
    borderBottomColor: '#D7DAE3',
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'space-between',
    flexDirection: 'row',
  },
  modalTitle: {
    fontSize: 34,
    fontWeight: '800',
    color: '#111218',
    marginLeft: 6,
  },
  closeIcon: {
    width: 36,
    height: 36,
    color: '#111218',
    fontSize: 32,
    fontWeight: '700',
    lineHeight: 36,
    textAlign: 'center',
  },
  modalBody: {
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingTop: 22,
    paddingBottom: 10,
  },
  modalBat: {
    width: 220,
    height: 180,
    marginBottom: 10,
  },
  modalDesc: {
    fontSize: 16,
    lineHeight: 26,
    fontWeight: '700',
    color: '#111218',
    textAlign: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 18,
    paddingBottom: 18,
  },
  modalBtn: {
    flex: 1,
    height: 58,
  },
  modalBtnSecondaryText: {
    color: '#11131A',
  },
});
