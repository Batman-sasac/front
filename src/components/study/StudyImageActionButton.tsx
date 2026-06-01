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

export default function StudyImageActionButton({ source, onPress }: Props) {
  return (
    <Pressable style={styles.imgBtnWrap} onPress={onPress}>
      <Image source={source} style={styles.startImg} resizeMode="contain" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  imgBtnWrap: { width: "100%", alignItems: "center" },
  startImg: { width: "100%", height: scale(110) },
});
