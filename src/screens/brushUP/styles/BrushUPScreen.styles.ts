import { StyleSheet } from "react-native";

import { appColors, appShadow, fontScale, scale } from "../../../styles/theme";

export const styles = StyleSheet.create({
  root: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: appColors.screenBg,
  },
  mainContent: { flex: 1, paddingTop: scale(20) },
  loadMoreLoading: {
    alignSelf: "center",
    marginTop: scale(10),
    marginBottom: scale(24),
  },
  headerCard: {
    backgroundColor: appColors.white,
    marginHorizontal: scale(20),
    marginBottom: scale(20),
    borderRadius: scale(20),
    padding: scale(24),
    ...appShadow.card,
  },
  pageTitle: {
    fontSize: fontScale(28),
    fontWeight: "900",
    color: appColors.text,
    marginBottom: scale(20),
  },
  searchBar: { marginTop: scale(16) },
  subjectScroll: { paddingBottom: scale(4), gap: scale(10) },
  cardList: {
    paddingHorizontal: scale(20),
    paddingTop: scale(4),
    paddingBottom: scale(24),
    gap: scale(14),
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
});
