import React from "react";
import { Text, View } from "react-native";
import { HIGHLIGHT_BG } from "../logic/scaffoldingConstants";
import { styles } from "../styles/ScaffoldingScreen.styles";

export default function ScaffoldingHelpChip({
  isReviewMode,
  step,
  currentRound,
  requiredSelectCount,
}: {
  isReviewMode: boolean;
  step: string;
  currentRound: number;
  requiredSelectCount: number;
}) {
  const substep = step.split("-")[1];

  if (isReviewMode) {
    return null;
  }

  if (substep === "2") {
    return (
      <>
        <View style={styles.helpBox}>
          <View style={[styles.helpHeader, { backgroundColor: HIGHLIGHT_BG }]}>
            <Text style={styles.helpTitle}>빈칸 채우기</Text>
          </View>
          <View style={styles.helpBody}>
            <Text style={styles.helpDesc}>빈칸에 정답을</Text>
            <Text style={[styles.helpDesc, styles.helpDescBottom]}>
              입력해 보세요
            </Text>
          </View>
        </View>
        <View style={styles.helpBox}>
          <View style={[styles.helpHeader, { backgroundColor: HIGHLIGHT_BG }]}>
            <Text style={styles.helpTitle}>힌트 버튼 누르기</Text>
          </View>
          <View style={styles.helpBody}>
            <Text style={styles.helpDesc}>H1을 누르면 첫 글자</Text>
            <Text style={[styles.helpDesc, styles.helpDescBottom]}>
              H2를 누르면 마지막 글자
            </Text>
            <Text style={[styles.helpDesc, styles.helpDescBottom]}>
              H3을 누르면 전체 단어 초성
            </Text>
            <Text style={[styles.helpDesc, styles.helpDescBottom]}>
              힌트가 제공됩니다!
            </Text>
          </View>
        </View>
      </>
    );
  }

  if (substep === "1") {
    const descText =
      currentRound === 1
        ? `${requiredSelectCount}개의 단어를 골라서\n학습할 빈칸을 만들어 보세요`
        : `${requiredSelectCount}개의 단어를\n추가로 선택해 주세요`;

    return (
      <View style={styles.helpBox}>
        <View style={styles.helpHeader}>
          <Text style={styles.helpTitle}>단어 고르기</Text>
        </View>
        <View style={styles.helpBody}>
          <Text style={[styles.helpDesc, { textAlign: "center" }]}>
            {descText}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.helpBox}>
      <View style={styles.helpHeader}>
        <Text style={styles.helpTitle}>결과 확인</Text>
      </View>
      <View style={styles.helpBody}>
        <Text style={styles.helpDesc}>단어를 다시 보고</Text>
        <Text style={[styles.helpDesc, styles.helpDescBottom]}>
          의미를 확인해 보세요
        </Text>
      </View>
    </View>
  );
}
