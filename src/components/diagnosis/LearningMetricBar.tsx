import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { fontScale, scale } from '../../lib/layout';
import { appColors } from '../../styles/theme';

type Props = {
  label: string;
  value: number;
  variant?: 'primary' | 'secondary';
};

export default function LearningMetricBar({
  label,
  value,
  variant = 'primary',
}: Props) {
  return (
    <View style={styles.barRow}>
      <Text style={styles.barLabel}>{label}</Text>
      <View style={styles.barBackground}>
        <View
          style={[
            styles.barFill,
            variant === 'secondary' && styles.barFillSecondary,
            { width: `${value}%` },
          ]}
        />
      </View>
      <Text style={styles.barValue}>{value}%</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: scale(4),
  },
  barLabel: {
    width: scale(52),
    fontSize: fontScale(12),
    color: appColors.textMuted,
  },
  barBackground: {
    flex: 1,
    height: scale(8),
    borderRadius: scale(999),
    backgroundColor: appColors.border,
    overflow: 'hidden',
    marginHorizontal: scale(8),
  },
  barFill: {
    height: '100%',
    borderRadius: scale(999),
    backgroundColor: appColors.primary,
  },
  barFillSecondary: {
    backgroundColor: appColors.textTertiary,
  },
  barValue: {
    width: scale(40),
    textAlign: 'right',
    fontSize: fontScale(11),
    color: appColors.textMuted,
  },
});
