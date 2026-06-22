import React from 'react';
import { StyleSheet } from 'react-native';
import { scale } from '../../styles/theme';
import AppLoadingState from '../common/AppLoadingState';

export default function BrushupLoadingState() {
  return <AppLoadingState message="복습 카드를 불러오는 중." style={styles.loadingContainer} />;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    paddingVertical: scale(60),
  },
});
