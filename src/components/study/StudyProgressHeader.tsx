import React from "react";
import { StyleSheet, Text, View } from "react-native";
import AppBackButton from "../common/AppBackButton";
import { appColors, fontScale, scale } from "../../styles/theme";

type BarState = "idle" | "correct" | "wrong";

type Props = {
  title: string;
  roundLabel: string;
  correctCount: number;
  totalBars: number;
  barStates: BarState[];
  correctColor: string;
  wrongColor: string;
  onBack: () => void;
};

export default function StudyProgressHeader({
  title,
  roundLabel,
  correctCount,
  totalBars,
  barStates,
  correctColor,
  wrongColor,
  onBack,
}: Props) {
  return (
    <View style={styles.header}>
      <AppBackButton
        style={styles.backBtn}
        iconStyle={styles.backIcon}
        onPress={onBack}
      />

      <View style={styles.headerTopRow}>
        <View style={styles.titleRow}>
          <Text style={styles.headerTitle}>{title}</Text>
          <Text style={styles.headerSubtitle}>{roundLabel}</Text>
        </View>
        <Text style={styles.scoreText}>
          {correctCount}/{totalBars}
        </Text>
      </View>

      <View style={styles.barsRow}>
        {Array.from({ length: totalBars }).map((_, index) => {
          const state = barStates[index] ?? "idle";
          const backgroundColor =
            state === "correct"
              ? correctColor
              : state === "wrong"
                ? wrongColor
                : appColors.border;
          return (
            <View key={index} style={[styles.bar, { backgroundColor }]} />
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { backgroundColor: "transparent" },
  backBtn: {
    position: "absolute",
    left: scale(0),
    top: scale(-13),
    width: scale(36),
    height: scale(36),
    borderRadius: scale(18),
    backgroundColor: appColors.screenBgMuted,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  backIcon: {
    width: scale(16),
    height: scale(16),
  },
  headerTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: scale(10),
    paddingLeft: scale(44),
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(8),
    flex: 1,
  },
  headerTitle: {
    fontSize: fontScale(16),
    fontWeight: "900",
    color: appColors.text,
  },
  headerSubtitle: {
    fontSize: fontScale(12),
    fontWeight: "800",
    color: appColors.text,
    opacity: 0.75,
  },
  scoreText: {
    fontSize: fontScale(16),
    fontWeight: "900",
    color: appColors.textTertiary,
    paddingTop: scale(2),
  },
  barsRow: { marginTop: scale(8), flexDirection: "row", gap: scale(4) },
  bar: { flex: 1, height: scale(10), borderRadius: scale(3) },
});
