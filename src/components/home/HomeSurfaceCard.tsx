import React from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { scale } from "../../styles/theme";

type Variant = "big" | "small" | "bottom";

type Props = {
  variant: Variant;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

export default function HomeSurfaceCard({ variant, children, style }: Props) {
  return <View style={[styles[variant], style]}>{children}</View>;
}

const CARD_SHADOW = {
  shadowColor: "#0F172A",
  shadowOpacity: 0.1,
  shadowRadius: 18,
  shadowOffset: { width: 0, height: 8 },
  elevation: 5,
};

const styles = StyleSheet.create({
  big: {
    backgroundColor: "#ffffff",
    borderRadius: scale(24),
    padding: scale(18),
    ...CARD_SHADOW,
    marginBottom: scale(14),
  },
  small: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    paddingVertical: 20,
    paddingHorizontal: 14,
    ...CARD_SHADOW,
    marginBottom: scale(12),
  },
  bottom: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    paddingTop: scale(20),
    paddingBottom: scale(6),
    paddingHorizontal: 14,
    ...CARD_SHADOW,
  },
});
