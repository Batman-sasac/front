import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { appColors, fontScale, scale } from '../../styles/theme';

export default function BrushupEmptyState() {
  return (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>📚</Text>
      <Text style={styles.emptyTitle}>복습할 카드가 없어요</Text>
      <Text style={styles.emptyDesc}>학습을 완료하면 여기에 표시돼요!</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: scale(60),
    gap: scale(12),
  },
  emptyIcon: {
    fontSize: fontScale(48),
    marginBottom: scale(8),
  },
  emptyTitle: {
    fontSize: fontScale(18),
    fontWeight: '800',
    color: appColors.text,
  },
  emptyDesc: {
    fontSize: fontScale(14),
    color: appColors.textTertiary,
    textAlign: 'center',
  },
});
