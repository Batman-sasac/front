import React, { useMemo, useState } from 'react';
import {
  DimensionValue,
  LayoutChangeEvent,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';

type Props = {
  title: string;
  messageTop?: string;
  highlightText?: string;
  messageBottom?: string;
  width?: DimensionValue;
  style?: StyleProp<ViewStyle>;
  bubbleStyle?: StyleProp<ViewStyle>;
  titleStyle?: StyleProp<TextStyle>;
  textStyle?: StyleProp<TextStyle>;
  highlightStyle?: StyleProp<TextStyle>;
};

const CARD_WIDTH_RATIO = 505;
const CARD_HEIGHT_RATIO = 210;
const TAIL_RATIO = 48;

export default function RewardSpeechBubble({
  title,
  messageTop,
  highlightText,
  messageBottom,
  width = '100%',
  style,
  bubbleStyle,
  titleStyle,
  textStyle,
  highlightStyle,
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
    const bubbleMinHeight = safeWidth * (CARD_HEIGHT_RATIO / CARD_WIDTH_RATIO);
    const tailSize = safeWidth * (TAIL_RATIO / CARD_WIDTH_RATIO);

    return {
      bubbleMinHeight,
      tailSize,
      tailWidth: tailSize * 1.5,
      tailHeight: tailSize * 1.02,
      tailOverlap: tailSize * 0.14,
      borderRadius: safeWidth * (24 / CARD_WIDTH_RATIO),
      horizontalPadding: safeWidth * (28 / CARD_WIDTH_RATIO),
      verticalPadding: safeWidth * (24 / CARD_WIDTH_RATIO),
      titleFontSize: safeWidth * (20 / CARD_WIDTH_RATIO),
      titleLineHeight: safeWidth * (30 / CARD_WIDTH_RATIO),
      titleMarginBottom: safeWidth * (10 / CARD_WIDTH_RATIO),
      bodyFontSize: safeWidth * (16 / CARD_WIDTH_RATIO),
      bodyLineHeight: safeWidth * (26 / CARD_WIDTH_RATIO),
      shadowRadius: safeWidth * (24 / CARD_WIDTH_RATIO),
      shadowOffsetY: safeWidth * (10 / CARD_WIDTH_RATIO),
    };
  }, [cardWidth]);

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
          },
          bubbleStyle,
        ]}
        onLayout={handleCardLayout}
      >
        <Text
          style={[
            styles.title,
            {
              fontSize: metrics.titleFontSize,
              lineHeight: metrics.titleLineHeight,
              marginBottom: metrics.titleMarginBottom,
            },
            titleStyle,
          ]}
        >
          {title}
        </Text>

        {!!messageTop && (
          <Text
            style={[
              styles.bodyText,
              {
                fontSize: metrics.bodyFontSize,
                lineHeight: metrics.bodyLineHeight,
              },
              textStyle,
            ]}
          >
            {messageTop}
          </Text>
        )}

        {(!!highlightText || !!messageBottom) && (
          <Text
            style={[
              styles.bodyText,
              {
                fontSize: metrics.bodyFontSize,
                lineHeight: metrics.bodyLineHeight,
              },
              textStyle,
            ]}
          >
            {!!highlightText && (
              <Text style={[styles.highlightText, highlightStyle]}>
                {highlightText}
              </Text>
            )}
            {messageBottom}
          </Text>
        )}
      </View>

      <Svg
        style={[
          styles.tailSvg,
          {
            width: metrics.tailWidth,
            height: metrics.tailHeight,
            marginTop: -metrics.tailOverlap,
          },
        ]}
        viewBox={`0 0 ${metrics.tailWidth} ${metrics.tailHeight}`}
      >
        <Path
          d={buildTailPath(metrics.tailWidth, metrics.tailHeight)}
          fill="#FFFFFF"
        />
      </Svg>
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
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0F172A',
    shadowOpacity: 0.12,
    elevation: 6,
    zIndex: 2,
  },
  tailSvg: {
    zIndex: 3,
  },
  title: {
    color: '#111827',
    fontWeight: '900',
    textAlign: 'center',
  },
  bodyText: {
    color: '#111827',
    fontWeight: '800',
    textAlign: 'center',
  },
  highlightText: {
    color: '#2563EB',
    fontWeight: '900',
  },
});
