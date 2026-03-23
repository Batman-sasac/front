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
      tailOverlap: tailSize * 0.36,
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

      <View
        style={[
          styles.tail,
          {
            width: metrics.tailSize,
            height: metrics.tailSize,
            marginTop: -metrics.tailOverlap,
            borderRadius: metrics.tailSize * 0.18,
            shadowRadius: metrics.shadowRadius * 0.7,
            shadowOffset: { width: 0, height: metrics.shadowOffsetY * 0.7 },
          },
        ]}
      />
    </View>
  );
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
  },
  tail: {
    backgroundColor: '#FFFFFF',
    transform: [{ rotate: '45deg' }],
    shadowColor: '#0F172A',
    shadowOpacity: 0.08,
    elevation: 4,
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
