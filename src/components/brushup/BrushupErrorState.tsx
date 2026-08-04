import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { appColors, appRadius, fontScale, scale } from '../../styles/theme';

type Props = {
  onRetry: () => void;
};

export default function BrushupErrorState({ onRetry }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>복습 카드를 불러오지 못했어요</Text>
      <Text style={styles.description}>서버 연결을 확인한 뒤 다시 시도해 주세요.</Text>
      <Pressable
        accessibilityRole="button"
        onPress={onRetry}
        style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
      >
        <Text style={styles.buttonText}>다시 시도</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: scale(60),
    gap: scale(12),
  },
  title: {
    color: appColors.text,
    fontSize: fontScale(18),
    fontWeight: '800',
  },
  description: {
    color: appColors.textTertiary,
    fontSize: fontScale(14),
    textAlign: 'center',
  },
  button: {
    marginTop: scale(8),
    paddingHorizontal: scale(22),
    paddingVertical: scale(12),
    borderRadius: appRadius.md,
    backgroundColor: appColors.primary,
  },
  buttonPressed: {
    opacity: 0.8,
  },
  buttonText: {
    color: appColors.white,
    fontSize: fontScale(14),
    fontWeight: '700',
  },
});
