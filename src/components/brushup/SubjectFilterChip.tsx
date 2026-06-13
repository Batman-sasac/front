import React from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import { appColors, fontScale, scale } from "../../styles/theme";
import type { Subject } from "./types";

type Props = {
  subject: Subject;
  selected: boolean;
  onPress: () => void;
};

export default function SubjectFilterChip({
  subject,
  selected,
  onPress,
}: Props) {
  return (
    <Pressable
      style={[styles.subjectChip, selected && styles.subjectChipActive]}
      onPress={onPress}
    >
      <Text style={styles.subjectEmoji}>{subject.emoji}</Text>
      <Text style={[styles.subjectText, selected && styles.subjectTextActive]}>
        {subject.name}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  subjectChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: scale(18),
    paddingVertical: scale(10),
    borderRadius: scale(20),
    backgroundColor: appColors.screenBgMuted,
    borderWidth: 2,
    borderColor: appColors.screenBgMuted,
    gap: scale(6),
  },
  subjectChipActive: {
    backgroundColor: appColors.primarySoftAlt,
    borderColor: appColors.primary,
  },
  subjectEmoji: {
    fontSize: fontScale(16),
  },
  subjectText: {
    fontSize: fontScale(14),
    fontWeight: "600",
    color: appColors.textSecondary,
  },
  subjectTextActive: {
    color: appColors.primary,
    fontWeight: "700",
  },
});
