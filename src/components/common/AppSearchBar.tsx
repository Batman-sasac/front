import React from "react";
import {
  Image,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from "react-native";
import { appColors, fontScale, scale } from "../../styles/theme";

type Props = {
  placeholder: string;
  onSearchPress: () => void;
  style?: StyleProp<ViewStyle>;
};

export default function AppSearchBar({
  placeholder,
  onSearchPress,
  style,
}: Props) {
  return (
    <View style={[styles.searchBar, style]}>
      <Text style={styles.searchBarPlaceholder}>{placeholder}</Text>
      <Pressable style={styles.searchButton} onPress={onSearchPress}>
        <Image
          source={require("../../../assets/serch.png")}
          style={styles.searchButtonIcon}
          resizeMode="contain"
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: appColors.screenBgMuted,
    borderRadius: scale(12),
    paddingLeft: scale(16),
    paddingRight: scale(6),
    paddingVertical: scale(6),
    gap: scale(10),
  },
  searchBarPlaceholder: {
    fontSize: fontScale(15),
    color: appColors.textTertiary,
    flex: 1,
  },
  searchButton: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(10),
    backgroundColor: appColors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  searchButtonIcon: {
    width: scale(24),
    height: scale(24),
    tintColor: appColors.white,
  },
});
