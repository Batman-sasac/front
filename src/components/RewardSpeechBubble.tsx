import React from 'react';
import {
  DimensionValue,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  ViewStyle,
} from 'react-native';
import SpeechBubbleShell from './SpeechBubbleShell';

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
  return (
    <SpeechBubbleShell width={width} style={style} bubbleStyle={bubbleStyle}>
      {(metrics) => (
        <>
          <Text
            style={[
              styles.title,
              {
                fontSize: metrics.horizontalPadding * (20 / 28),
                lineHeight: metrics.horizontalPadding * (30 / 28),
                marginBottom: metrics.horizontalPadding * (10 / 28),
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
                  fontSize: metrics.horizontalPadding * (16 / 28),
                  lineHeight: metrics.horizontalPadding * (26 / 28),
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
                  fontSize: metrics.horizontalPadding * (16 / 28),
                  lineHeight: metrics.horizontalPadding * (26 / 28),
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
        </>
      )}
    </SpeechBubbleShell>
  );
}

const styles = StyleSheet.create({
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
