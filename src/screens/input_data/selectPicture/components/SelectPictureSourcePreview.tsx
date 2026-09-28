import React from "react";
import { Image, Text, View } from "react-native";

import {
  getStudySourceExtension,
  getStudySourceName,
  isImageStudySource,
  type StudySource,
} from "../../studySource";
import { styles } from "../styles/SelectPicture.styles";

type SelectPictureSourcePreviewProps = {
  source: StudySource;
  isThumbnail?: boolean;
};

export default function SelectPictureSourcePreview({
  source,
  isThumbnail = false,
}: SelectPictureSourcePreviewProps) {
  if (isImageStudySource(source)) {
    return (
      <Image
        source={{ uri: source.uri }}
        style={isThumbnail ? styles.thumb : styles.previewImage}
        resizeMode="contain"
      />
    );
  }

  return (
    <View style={isThumbnail ? styles.fileThumb : styles.fileCard}>
      <Text style={isThumbnail ? styles.fileThumbExt : styles.fileExt}>
        {getStudySourceExtension(source) || "FILE"}
      </Text>
      <Text
        style={isThumbnail ? styles.fileThumbName : styles.fileName}
        numberOfLines={isThumbnail ? 2 : 3}
      >
        {getStudySourceName(source)}
      </Text>
      {!isThumbnail && (
        <Text style={styles.fileHint}>
          파일 자료는 크롭 없이 그대로 텍스트 추출에 사용됩니다.
        </Text>
      )}
    </View>
  );
}
