import React from 'react';
import { Image, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

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
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>사용량 소진 안내</Text>
            <Pressable onPress={onClose}>
              <Image source={require('../../../assets/subscribe/close.png')} style={styles.closeIcon} resizeMode="contain" />
            </Pressable>
          </View>

          <View style={styles.modalBody}>
            <Image source={require('../../../assets/character/bat-character.png')} style={styles.modalBat} resizeMode="contain" />
            <Text style={styles.modalDesc}>{message}</Text>
            <Text style={styles.modalDesc}>계속 학습하고 싶으시다면</Text>
            <Text style={styles.modalDesc}>프리미엄 요금제를 이용해 보세요.</Text>
          </View>

          <View style={styles.modalButtons}>
            <Pressable style={styles.modalBtn} onPress={onClose}>
              <Image source={require('../../../assets/subscribe/popup-cancel.png')} style={styles.modalBtnImg} resizeMode="stretch" />
            </Pressable>
            <Pressable style={styles.modalBtn} onPress={onSubscribe}>
              <Image source={require('../../../assets/subscribe/popup-subscribe.png')} style={styles.modalBtnImg} resizeMode="stretch" />
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
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
  },
  modalBtnImg: {
    width: '100%',
    height: 58,
  },
});
