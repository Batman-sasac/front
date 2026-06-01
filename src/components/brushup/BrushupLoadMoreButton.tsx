import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { fontScale, scale } from '../../lib/layout';

type Props = {
  onPress: () => void;
};

export default function BrushupLoadMoreButton({ onPress }: Props) {
  return (
    <Pressable style={styles.loadMoreBtn} onPress={onPress}>
      <Text style={styles.loadMoreText}>더보기</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  loadMoreBtn: {
    alignSelf: 'center',
    marginTop: scale(10),
    marginBottom: scale(24),
    paddingHorizontal: scale(18),
    paddingVertical: scale(12),
    borderRadius: scale(12),
    backgroundColor: '#EEF2FF',
  },
  loadMoreText: {
    color: '#3B5BFF',
    fontWeight: '800',
    fontSize: fontScale(16),
  },
});
