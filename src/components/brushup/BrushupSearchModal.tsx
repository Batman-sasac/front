import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { appColors, fontScale, scale } from "../../styles/theme";
import AppBottomSheetShell from "../common/AppBottomSheetShell";

type Props = {
  visible: boolean;
  onClose: () => void;
};

export default function BrushupSearchModal({ visible, onClose }: Props) {
  return (
    <AppBottomSheetShell
      visible={visible}
      title="카드 검색"
      onClose={onClose}
    >
      <View style={styles.inputContainer}>
        <Text style={styles.searchIcon}>🔎</Text>
        <Text style={styles.placeholder}>검색어를 입력하세요.</Text>
      </View>

      <Text style={styles.hint}>
        제목, 과목명, 설명에서 검색할 수 있어요.
      </Text>
    </AppBottomSheetShell>
  );
}

const styles = StyleSheet.create({
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: appColors.screenBgMuted,
    borderRadius: scale(12),
    padding: scale(16),
    gap: scale(12),
    marginBottom: scale(12),
  },
  searchIcon: {
    fontSize: fontScale(20),
  },
  placeholder: {
    fontSize: fontScale(16),
    color: appColors.textTertiary,
    flex: 1,
  },
  hint: {
    fontSize: fontScale(13),
    color: appColors.textTertiary,
    textAlign: "center",
  },
});
