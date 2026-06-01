import React from 'react';
import { Animated, LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';
import { fontScale, scale } from '../../styles/theme';

type Props = {
  progressLabel: string;
  fillWidth: Animated.AnimatedInterpolation<number>;
  onTrackLayout: (event: LayoutChangeEvent) => void;
};

export default function StudyFlowProgressCard({
  progressLabel,
  fillWidth,
  onTrackLayout,
}: Props) {
  return (
    <View style={styles.progressCard}>
      <Text style={styles.progressText}>{progressLabel}</Text>
      <View style={styles.progressTrack} onLayout={onTrackLayout}>
        <Animated.View style={[styles.progressFill, { width: fillWidth }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  progressCard: {
    width: '100%',
    maxWidth: scale(560),
    backgroundColor: '#FFFFFF',
    borderRadius: scale(18),
    paddingHorizontal: scale(18),
    paddingVertical: scale(14),
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(14),
    shadowColor: '#4B5563',
    shadowOpacity: 0.1,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },
  progressText: {
    minWidth: scale(62),
    fontSize: fontScale(22),
    fontWeight: '900',
    color: '#111827',
    textAlign: 'center',
  },
  progressTrack: {
    flex: 1,
    minWidth: scale(220),
    height: scale(18),
    borderRadius: scale(999),
    backgroundColor: '#D1D5DB',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: scale(999),
    backgroundColor: '#7C93FF',
  },
});
