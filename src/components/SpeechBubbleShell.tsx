import React, { ReactNode, useMemo, useState } from 'react';
import {
  DimensionValue,
  LayoutChangeEvent,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';

export type SpeechBubbleMetrics = {
  bubbleMinHeight: number;
  tailWidth: number;
  tailHeight: number;
  tailOverlap: number;
  borderRadius: number;
  horizontalPadding: number;
  verticalPadding: number;
  shadowRadius: number;
  shadowOffsetY: number;
};

type Props = {
  children: ReactNode | ((metrics: SpeechBubbleMetrics) => ReactNode);
  width?: DimensionValue;
  style?: StyleProp<ViewStyle>;
  bubbleStyle?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  minHeightRatio?: number;
  tailRatio?: number;
  backgroundColor?: string;
};

const CARD_WIDTH_RATIO = 505;
const DEFAULT_HEIGHT_RATIO = 210;
const DEFAULT_TAIL_RATIO = 48;

export default function SpeechBubbleShell({
  children,
  width = '100%',
  style,
  bubbleStyle,
  contentStyle,
  minHeightRatio = DEFAULT_HEIGHT_RATIO / CARD_WIDTH_RATIO,
  tailRatio = DEFAULT_TAIL_RATIO / CARD_WIDTH_RATIO,
  backgroundColor = '#FFFFFF',
}: Props) {
  const [cardWidth, setCardWidth] = useState(0);

  const handleCardLayout = (event: LayoutChangeEvent) => {
    const nextWidth = event.nativeEvent.layout.width;
    if (nextWidth > 0 && nextWidth !== cardWidth) {
      setCardWidth(nextWidth);
    }
  };

  const metrics = useMemo(() => {
    const safeWidth = Math.max(cardWidth, 1);
    const tailSize = safeWidth * tailRatio;

    return {
      bubbleMinHeight: safeWidth * minHeightRatio,
      tailWidth: tailSize * 1.5,
      tailHeight: tailSize * 1.02,
      tailOverlap: tailSize * 0.14,
      borderRadius: safeWidth * (24 / CARD_WIDTH_RATIO),
      horizontalPadding: safeWidth * (28 / CARD_WIDTH_RATIO),
      verticalPadding: safeWidth * (24 / CARD_WIDTH_RATIO),
      shadowRadius: safeWidth * (24 / CARD_WIDTH_RATIO),
      shadowOffsetY: safeWidth * (10 / CARD_WIDTH_RATIO),
    } satisfies SpeechBubbleMetrics;
  }, [cardWidth, minHeightRatio, tailRatio]);

  return (
    <View style={[styles.root, { width }, style]}>
      <View
        style={[
          styles.bubble,
          {
            minHeight: metrics.bubbleMinHeight,
            borderRadius: metrics.borderRadius,
            paddingHorizontal: metrics.horizontalPadding,
            paddingVertical: metrics.verticalPadding,
            shadowRadius: metrics.shadowRadius,
            shadowOffset: { width: 0, height: metrics.shadowOffsetY },
            backgroundColor,
          },
          bubbleStyle,
        ]}
        onLayout={handleCardLayout}
      >
        <View style={[styles.content, contentStyle]}>
          {typeof children === 'function' ? children(metrics) : children}
        </View>
      </View>

      <View
        style={[
          styles.tailWrap,
          {
            width: metrics.tailWidth,
            height: metrics.tailHeight,
            marginTop: -Math.max(metrics.tailHeight * 0.04, 1),
          },
        ]}
      >
        <Svg
          style={[
            styles.tailSvg,
            {
              width: metrics.tailWidth,
              height: metrics.tailHeight,
            },
          ]}
          viewBox={`0 0 ${metrics.tailWidth} ${metrics.tailHeight}`}
        >
          <Path
            d={buildTailPath(metrics.tailWidth, metrics.tailHeight)}
            fill={backgroundColor}
          />
        </Svg>
      </View>
    </View>
  );
}

function buildTailPath(width: number, height: number) {
  const topY = 0;
  const leftTopX = width * 0.04;
  const rightTopX = width * 0.96;
  const leftShoulderX = width * 0.24;
  const rightShoulderX = width * 0.76;
  const shoulderY = height * 0.48;
  const tipX = width * 0.5;
  const tipY = height;

  return [
    `M ${leftTopX} ${topY}`,
    `Q ${width * 0.12} ${height * 0.22} ${leftShoulderX} ${shoulderY}`,
    `L ${tipX} ${tipY}`,
    `L ${rightShoulderX} ${shoulderY}`,
    `Q ${width * 0.88} ${height * 0.22} ${rightTopX} ${topY}`,
    'Z',
  ].join(' ');
}

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
  },
  bubble: {
    width: '100%',
    shadowColor: '#0F172A',
    shadowOpacity: 0.12,
    elevation: 6,
    zIndex: 2,
  },
  content: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tailWrap: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  tailSvg: {
    zIndex: 3,
  },
});
