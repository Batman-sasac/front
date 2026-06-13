import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { appColors, fontScale, scale } from "../../styles/theme";
import AppModalShell from "./AppModalShell";

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
    <AppModalShell
      visible={visible}
      onClose={onCancel}
      showCloseButton={false}
      backdropStyle={styles.modalOverlay}
      cardStyle={styles.modalContent}
    >
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
    </AppModalShell>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    backgroundColor: appColors.overlayStrong,
  },
  modalContent: {
    borderRadius: scale(20),
    padding: scale(28),
    width: scale(300),
    alignItems: "center",
  },
  modalTitle: {
    fontSize: fontScale(20),
    fontWeight: "800",
    color: appColors.text,
    marginBottom: scale(12),
  },
  modalMessage: {
    fontSize: fontScale(15),
    fontWeight: "500",
    color: appColors.textSecondary,
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
    backgroundColor: appColors.screenBgMuted,
  },
  modalButtonConfirm: {
    backgroundColor: appColors.danger,
  },
  modalButtonTextCancel: {
    fontSize: fontScale(15),
    fontWeight: "700",
    color: appColors.textSecondary,
  },
  modalButtonTextConfirm: {
    fontSize: fontScale(15),
    fontWeight: "700",
    color: appColors.white,
  },
});
