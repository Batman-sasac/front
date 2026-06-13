import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { appColors, scale } from '../../styles/theme';

type Props = {
  total: number;
  activeCount: number;
  style?: StyleProp<ViewStyle>;
  segmentStyle?: StyleProp<ViewStyle>;
  activeSegmentStyle?: StyleProp<ViewStyle>;
};

export default function SegmentedProgressBar({
  total,
  activeCount,
  style,
  segmentStyle,
  activeSegmentStyle,
}: Props) {
  return (
    <View style={[styles.row, style]}>
      {Array.from({ length: total }).map((_, index) => (
        <View
          key={index}
          style={[
            styles.segment,
            segmentStyle,
            index < activeCount && styles.segmentActive,
            index < activeCount && activeSegmentStyle,
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    width: '100%',
    gap: scale(4),
  },
  segment: {
    flex: 1,
    height: scale(12),
    borderRadius: scale(4),
    backgroundColor: appColors.border,
  },
  segmentActive: {
    backgroundColor: appColors.primary,
  },
});
