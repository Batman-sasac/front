import React from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { fontScale, scale } from "../../styles/theme";

type Props = {
  visible: boolean;
  title: string;
  message: React.ReactNode;
  cancelLabel: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
};

export default function AppConfirmDialog({
  visible,
  title,
  message,
  cancelLabel,
  confirmLabel,
  onCancel,
  onConfirm,
}: Props) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <Pressable style={styles.modalOverlay} onPress={onCancel}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>{title}</Text>
          <Text style={styles.modalMessage}>{message}</Text>

          <View style={styles.modalButtons}>
            <Pressable
              style={[styles.modalButton, styles.modalButtonCancel]}
              onPress={onCancel}
            >
              <Text style={styles.modalButtonTextCancel}>{cancelLabel}</Text>
            </Pressable>
            <Pressable
              style={[styles.modalButton, styles.modalButtonConfirm]}
              onPress={onConfirm}
            >
              <Text style={styles.modalButtonTextConfirm}>{confirmLabel}</Text>
            </Pressable>
          </View>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: scale(20),
    padding: scale(28),
    width: scale(300),
    alignItems: "center",
  },
  modalTitle: {
    fontSize: fontScale(20),
    fontWeight: "800",
    color: "#111827",
    marginBottom: scale(12),
  },
  modalMessage: {
    fontSize: fontScale(15),
    fontWeight: "500",
    color: "#6B7280",
    textAlign: "center",
    lineHeight: fontScale(22),
    marginBottom: scale(24),
  },
  modalButtons: {
    flexDirection: "row",
    gap: scale(12),
    width: "100%",
  },
  modalButton: {
    flex: 1,
    paddingVertical: scale(14),
    borderRadius: scale(12),
    alignItems: "center",
    justifyContent: "center",
  },
  modalButtonCancel: {
    backgroundColor: "#F3F4F6",
  },
  modalButtonConfirm: {
    backgroundColor: "#EF4444",
  },
  modalButtonTextCancel: {
    fontSize: fontScale(15),
    fontWeight: "700",
    color: "#6B7280",
  },
  modalButtonTextConfirm: {
    fontSize: fontScale(15),
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
