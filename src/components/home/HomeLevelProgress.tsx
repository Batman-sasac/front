import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { appColors, fontScale, scale } from "../../styles/theme";

type Props = {
  progress: number;
  label: string;
};

export default function HomeLevelProgress({ progress, label }: Props) {
  return (
    <View style={styles.progressWrapper}>
      <View style={styles.progressBarBackground}>
        <View
          style={[
            styles.progressBarFill,
            { width: `${Math.round(progress * 100)}%` },
          ]}
        />
      </View>
      <Text style={styles.expText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  progressWrapper: {
    marginBottom: scale(16),
    position: "relative",
  },
  progressBarBackground: {
    width: "100%",
    height: scale(6),
    borderRadius: 999,
    backgroundColor: appColors.border,
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: appColors.primary,
  },
  expText: {
    position: "absolute",
    right: 0,
    top: -18,
    fontSize: fontScale(12),
    fontWeight: "600",
    color: appColors.textSecondary,
  },
});
