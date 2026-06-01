import React from "react";
import {
  Image,
  ImageStyle,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from "react-native";
import { fontScale, scale } from "../../styles/theme";
import {
  getStudySourceExtension,
  getStudySourceName,
  isImageStudySource,
  StudySource,
} from "../../screens/input_data/studySource";

type Props = {
  source: StudySource;
  style: StyleProp<ImageStyle>;
};

export default function StudySourcePreview({ source, style }: Props) {
  if (isImageStudySource(source)) {
    return <Image source={{ uri: source.uri }} style={style} />;
  }

  return (
    <View style={[style as StyleProp<ViewStyle>, styles.filePreview]}>
      <Text style={styles.filePreviewExt}>
        {getStudySourceExtension(source) || "FILE"}
      </Text>
      <Text style={styles.filePreviewName} numberOfLines={1}>
        {getStudySourceName(source)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  filePreview: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: scale(4),
    backgroundColor: "rgba(255,255,255,0.9)",
  },
  filePreviewExt: {
    color: "#111827",
    fontSize: fontScale(10),
    fontWeight: "800",
  },
  filePreviewName: {
    color: "#4B5563",
    fontSize: fontScale(7),
    fontWeight: "700",
    textAlign: "center",
    marginTop: scale(2),
    width: "100%",
  },
});
