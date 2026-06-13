import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { fontScale, scale } from "../../styles/theme";
import type { StudySource } from "../../screens/input_data/studySource";
import StudySourcePreview from "./StudySourcePreview";

type Props = {
  sources: StudySource[];
  width: number;
  getSourceKey: (source: StudySource, index: number) => string;
  onRemove: (index: number) => void;
};

export default function SelectedSourceStrip({
  sources,
  width,
  getSourceKey,
  onRemove,
}: Props) {
  return (
    <View style={[styles.selectedShotsRow, { width }]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.selectedShotsContent}
      >
        {sources.map((source, index) => (
          <View key={getSourceKey(source, index)} style={styles.selectedShotItem}>
            <StudySourcePreview source={source} style={styles.selectedShotImage} />
            <Pressable
              style={styles.removeShotBtn}
              onPress={() => onRemove(index)}
            >
              <Text style={styles.removeShotText}>x</Text>
            </Pressable>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  selectedShotsRow: {
    position: "absolute",
    right: scale(52),
    top: scale(-2),
    zIndex: 5,
  },
  selectedShotsContent: {
    flexDirection: "row-reverse",
    paddingVertical: scale(4),
    paddingHorizontal: scale(4),
    alignItems: "center",
  },
  selectedShotItem: {
    width: scale(44),
    height: scale(44),
    marginRight: scale(8),
    marginTop: scale(2),
  },
  selectedShotImage: {
    width: "100%",
    height: "100%",
    borderRadius: scale(8),
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.35)",
    backgroundColor: "rgba(0,0,0,0.1)",
  },
  removeShotBtn: {
    position: "absolute",
    top: scale(-5),
    right: scale(-5),
    width: scale(16),
    height: scale(16),
    borderRadius: scale(8),
    backgroundColor: "rgba(0,0,0,0.8)",
    borderWidth: 1,
    borderColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  removeShotText: {
    color: "#fff",
    fontSize: fontScale(11),
    fontWeight: "800",
    lineHeight: scale(12),
    textTransform: "lowercase",
  },
});
