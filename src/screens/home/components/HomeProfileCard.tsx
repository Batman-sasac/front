import React from "react";
import { Image, Pressable, Text, View } from "react-native";

import HomeLevelProgress from "../../../components/home/HomeLevelProgress";
import HomeSurfaceCard from "../../../components/home/HomeSurfaceCard";
import { scale } from "../../../lib/layout";
import { getLevelUpCharacterSource } from "../../../lib/learningCharacter";
import { getLevelProgress } from "../logic/homeMetrics";
import { styles } from "../styles/HomeScreen.styles";

type HomeProfileCardProps = {
  typeLabel: string;
  level: number;
  exp: number;
  hasCheckedInToday: boolean;
  onCheckIn: () => void;
  onOpenReview: () => void;
};

export default function HomeProfileCard({
  typeLabel,
  level,
  exp,
  hasCheckedInToday,
  onCheckIn,
  onOpenReview,
}: HomeProfileCardProps) {
  const characterSource = getLevelUpCharacterSource(typeLabel, level);
  const characterAsset = Image.resolveAssetSource(characterSource);
  const characterAspectRatio =
    characterAsset?.width && characterAsset?.height
      ? characterAsset.width / characterAsset.height
      : 1;
  const characterHeight = scale(215);
  const characterWidth = Math.min(
    scale(380),
    characterHeight * characterAspectRatio,
  );
  const levelProgress = getLevelProgress(level, exp);

  const handleReviewPress = () => {
    if (!hasCheckedInToday) {
      onCheckIn();
    }
    onOpenReview();
  };

  return (
    <HomeSurfaceCard variant="big">
      <Text style={styles.levelText}>
        <Text style={styles.levelLabel}>Level </Text>
        <Text style={styles.levelValue}>{level} </Text>
        {typeLabel || "학습 유형 미지정"}
      </Text>

      <HomeLevelProgress
        progress={levelProgress.progress}
        label={`${levelProgress.clampedExp}/${levelProgress.max}`}
      />

      <View style={styles.characterWrapper}>
        <Image
          source={characterSource}
          style={[
            styles.characterImage,
            { width: characterWidth, height: characterHeight },
          ]}
          resizeMode="contain"
        />
      </View>

      <Pressable style={styles.todayButton} onPress={handleReviewPress}>
        <View style={styles.todayButtonInner}>
          <Image
            source={require("../../../../assets/homebutton/reft-shift.png")}
            style={styles.todayButtonIcon}
            resizeMode="contain"
          />
          <Text style={styles.todayButtonText}>오늘의 복습</Text>
        </View>
      </Pressable>
    </HomeSurfaceCard>
  );
}
