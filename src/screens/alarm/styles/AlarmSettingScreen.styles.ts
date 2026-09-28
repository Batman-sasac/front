import { StyleSheet } from "react-native";

import { appColors, fontScale, scale } from "../../../styles/theme";

export const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: appColors.white },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: scale(32),
    paddingTop: scale(20),
    paddingBottom: scale(16),
  },
  backButton: { paddingRight: scale(16), paddingVertical: scale(4) },
  backIcon: { width: scale(18), height: scale(18) },
  headerTitle: { flex: 1, fontSize: fontScale(20), fontWeight: "800" },
  headerSpacer: { width: scale(24) },
  content: { paddingHorizontal: scale(32), paddingTop: scale(16) },
});
