import React from "react";
import {
  ScrollView,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextStyle,
} from "react-native";
import { styles } from "../styles/ScaffoldingScreen.styles";

export default function ScaffoldingBlankInputContent({
  instanceId,
  tokenValue,
  value,
  isActive,
  textAlign,
  textStyle,
  inputTextStyle,
  inputRefs,
  answerScrollRefs,
  orderedSelectedBlanks,
  setAnswers,
  setActiveBlankId,
  focusAdjacentBlank,
}: {
  instanceId: number;
  tokenValue: string;
  value: string;
  isActive: boolean;
  textAlign: "left" | "right";
  textStyle: StyleProp<TextStyle>;
  inputTextStyle?: StyleProp<TextStyle>;
  inputRefs: React.MutableRefObject<Record<number, TextInput | null>>;
  answerScrollRefs: React.MutableRefObject<Record<number, ScrollView | null>>;
  orderedSelectedBlanks: number[];
  setAnswers: React.Dispatch<React.SetStateAction<Record<number, string>>>;
  setActiveBlankId: React.Dispatch<React.SetStateAction<number | null>>;
  focusAdjacentBlank: (instanceId: number, direction?: 1 | -1) => void;
}) {
  return (
    <>
      <Text style={[textStyle, { opacity: 0 }]}>{tokenValue}</Text>
      <View style={styles.blankInputOverlay}>
        <ScrollView
          ref={(ref) => {
            if (ref) answerScrollRefs.current[instanceId] = ref;
          }}
          horizontal
          showsHorizontalScrollIndicator={false}
          onContentSizeChange={() =>
            answerScrollRefs.current[instanceId]?.scrollToEnd({
              animated: false,
            })
          }
          contentContainerStyle={styles.blankAnswerScrollContent}
          style={styles.blankAnswerScroll}
        >
          <Text
            numberOfLines={1}
            style={[
              textStyle,
              inputTextStyle,
              { textAlign },
            ]}
          >
            {value}
          </Text>
        </ScrollView>
        <TextInput
          pointerEvents="none"
          ref={(ref) => {
            if (ref) inputRefs.current[instanceId] = ref;
          }}
          value={value}
          onChangeText={(nextValue) =>
            setAnswers((prev) => ({ ...prev, [instanceId]: nextValue }))
          }
          onFocus={() => setActiveBlankId(instanceId)}
          onKeyPress={(event) => {
            if (event.nativeEvent.key === "Tab") {
              focusAdjacentBlank(instanceId, 1);
            }
          }}
          onSubmitEditing={() => focusAdjacentBlank(instanceId, 1)}
          style={[
            styles.blankInput,
            styles.blankHiddenInput,
            inputTextStyle,
            { textAlign },
          ]}
          selectTextOnFocus={isActive}
          autoCapitalize="none"
          autoCorrect={false}
          spellCheck={false}
          multiline={false}
          scrollEnabled
          blurOnSubmit={false}
          onBlur={() => {
            requestAnimationFrame(() => {
              const hasFocusedInput = orderedSelectedBlanks.some((id) =>
                inputRefs.current[id]?.isFocused?.(),
              );
              if (!hasFocusedInput) {
                setActiveBlankId((prev) => (prev === instanceId ? null : prev));
              }
            });
          }}
          maxFontSizeMultiplier={1.0}
        />
      </View>
    </>
  );
}
