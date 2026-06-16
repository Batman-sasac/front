import React from "react";
import { Pressable, Text, View } from "react-native";
import { styles } from "../../screens/study/ScaffoldingScreen.styles";

export default function ScaffoldingPopup({
  visible,
  title,
  message,
  onConfirm,
}: {
  visible: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
}) {
  if (!visible) return null;

  return (
    <View style={styles.popupOverlay}>
      <Pressable style={styles.popupBackdrop} onPress={onConfirm}>
        <View style={styles.popupCard}>
          <Text style={styles.popupTitle}>{title}</Text>
          <Text style={styles.popupMessage}>{message}</Text>
          <Pressable style={styles.popupConfirmBtn} onPress={onConfirm}>
            <Text style={styles.popupConfirmText}>확인</Text>
          </Pressable>
        </View>
      </Pressable>
    </View>
  );
}
