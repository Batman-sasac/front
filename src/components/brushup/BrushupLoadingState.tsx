import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { fontScale, scale } from '../../lib/layout';

export default function BrushupLoadingState() {
  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#5E82FF" />
      <Text style={styles.loadingText}>복습 카드를 불러오는 중.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: scale(60),
    gap: scale(16),
  },
  loadingText: {
    fontSize: fontScale(15),
    color: '#6B7280',
    fontWeight: '600',
  },
});
