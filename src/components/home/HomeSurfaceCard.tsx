import React from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { appColors, appShadow, scale } from "../../styles/theme";

type Variant = "big" | "small" | "bottom";

type Props = {
  variant: Variant;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

export default function HomeSurfaceCard({ variant, children, style }: Props) {
  return <View style={[styles[variant], style]}>{children}</View>;
}

const styles = StyleSheet.create({
  big: {
    backgroundColor: appColors.white,
    borderRadius: scale(24),
    padding: scale(18),
    ...appShadow.card,
    marginBottom: scale(14),
  },
  small: {
    backgroundColor: appColors.white,
    borderRadius: 20,
    paddingVertical: 20,
    paddingHorizontal: 14,
    ...appShadow.card,
    marginBottom: scale(12),
  },
  bottom: {
    backgroundColor: appColors.white,
    borderRadius: 20,
    paddingTop: scale(20),
    paddingBottom: scale(6),
    paddingHorizontal: 14,
    ...appShadow.card,
  },
});
