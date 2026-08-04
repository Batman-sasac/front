import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { appColors, appRadius, fontScale, scale } from '../../styles/theme';

type Props = {
  title?: string;
  message?: string;
  retryLabel?: string;
  onRetry: () => void;
};

export default function AppRecoveryScreen({
  title = '화면을 불러오지 못했어요',
  message = '잠시 후 다시 시도해 주세요.',
  retryLabel = '홈으로 이동',
  onRetry,
}: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      <Pressable
        accessibilityRole="button"
        onPress={onRetry}
        style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
      >
        <Text style={styles.buttonText}>{retryLabel}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: scale(24),
    backgroundColor: appColors.screenBg,
  },
  title: {
    color: appColors.text,
    fontSize: fontScale(20),
    fontWeight: '700',
  },
  message: {
    marginTop: scale(10),
    color: appColors.textSecondary,
    fontSize: fontScale(14),
    textAlign: 'center',
  },
  button: {
    marginTop: scale(24),
    minWidth: scale(160),
    alignItems: 'center',
    paddingHorizontal: scale(20),
    paddingVertical: scale(13),
    borderRadius: appRadius.md,
    backgroundColor: appColors.primary,
  },
  buttonPressed: {
    opacity: 0.8,
  },
  buttonText: {
    color: appColors.white,
    fontSize: fontScale(15),
    fontWeight: '700',
  },
});
