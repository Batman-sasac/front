import React from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { appColors, appShadow, fontScale, scale } from "../../styles/theme";
import type { Card } from "./types";

type Props = {
  card: Card;
  subjectIcon: string;
  suppressPress: boolean;
  onPress: (card: Card) => void;
  onDeletePress: (card: Card) => void;
  onDeletePressIn: () => void;
};

export default function ReviewCard({
  card,
  subjectIcon,
  suppressPress,
  onPress,
  onDeletePress,
  onDeletePressIn,
}: Props) {
  return (
    <View style={styles.card}>
      <Pressable
        style={styles.closeBtn}
        hitSlop={10}
        onPressIn={onDeletePressIn}
        onPress={() => onDeletePress(card)}
      >
        <Image
          source={require("../../../assets/delete.png")}
          style={styles.closeIcon}
          resizeMode="contain"
        />
      </Pressable>

      <Pressable
        style={styles.cardPressable}
        onPress={() => {
          if (suppressPress) return;
          onPress(card);
        }}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.cardSubjectIcon}>{subjectIcon}</Text>
          <Text style={styles.cardTitle}>{card.title}</Text>
        </View>

        <Text style={styles.cardDesc} numberOfLines={2}>
          {card.description}
        </Text>

        <View style={styles.cardFooter}>
          <Text />
          <Text style={styles.cardDays}>{card.daysAgo}일 전</Text>
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: appColors.white,
    borderRadius: scale(16),
    borderWidth: 1,
    borderColor: appColors.border,
    position: "relative",
    ...appShadow.subtle,
    width: "48%",
  },
  cardPressable: {
    padding: scale(16),
  },
  closeBtn: {
    position: "absolute",
    right: scale(14),
    top: scale(14),
    width: scale(30),
    height: scale(30),
    borderRadius: scale(15),
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: appColors.screenBgMuted,
    zIndex: 10,
    elevation: 10,
  },
  closeIcon: {
    width: scale(14),
    height: scale(14),
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: scale(6),
    gap: scale(6),
  },
  cardTitle: {
    fontSize: fontScale(15),
    fontWeight: "800",
    color: appColors.text,
    flex: 1,
  },
  cardSubjectIcon: {
    fontSize: fontScale(18),
  },
  cardDesc: {
    fontSize: fontScale(12),
    fontWeight: "500",
    color: appColors.textSubtle,
    lineHeight: fontScale(18),
    marginBottom: scale(10),
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: scale(8),
    borderTopWidth: 1,
    borderTopColor: appColors.screenBgMuted,
  },
  cardDays: {
    fontSize: fontScale(10),
    fontWeight: "600",
    color: appColors.textTertiary,
  },
});
