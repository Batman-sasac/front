import React from "react";
import {
  Image,
  ImageSourcePropType,
  Pressable,
  StyleSheet,
} from "react-native";
import { scale } from "../../styles/theme";

type Props = {
  source: ImageSourcePropType;
  onPress: () => void;
};

export default function CameraIconButton({ source, onPress }: Props) {
  return (
    <Pressable style={styles.iconBtn} onPress={onPress}>
      <Image source={source} style={styles.icon} resizeMode="contain" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  iconBtn: {
    width: scale(48),
    height: scale(48),
    alignItems: "center",
    justifyContent: "center",
  },
  icon: {
    width: scale(40),
    height: scale(40),
  },
});
