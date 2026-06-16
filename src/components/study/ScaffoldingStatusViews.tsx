import React from "react";
import { Pressable, Text, View } from "react-native";
import AppLoadingState from "../common/AppLoadingState";
import { scale } from "../../lib/layout";
import { styles } from "../../screens/study/ScaffoldingScreen.styles";

export function ScaffoldingLoadingView() {
  return (
    <AppLoadingState
      message="학습화면 불러오는 중입니다..."
      style={[styles.root, styles.center]}
      textStyle={styles.loadingText}
    />
  );
}

export function ScaffoldingErrorView({
  error,
  canRetry,
  onRetry,
  onBack,
}: {
  error: string | null;
  canRetry: boolean;
  onRetry: () => void;
  onBack: () => void;
}) {
  return (
    <View style={[styles.root, styles.center, { paddingHorizontal: scale(18) }]}>
      <Text style={styles.errorTitle}>데이터를 불러오지 못했습니다.</Text>
      {!!error && <Text style={styles.errorDesc}>{error}</Text>}

      {canRetry && (
        <Pressable style={styles.retryBtn} onPress={onRetry}>
          <Text style={styles.retryBtnText}>다시 시도</Text>
        </Pressable>
      )}

      <Pressable style={styles.backOnlyBtn} onPress={onBack}>
        <Text style={styles.backOnlyBtnText}>뒤로가기</Text>
      </Pressable>
    </View>
  );
}
