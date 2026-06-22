import React from "react";
import {
  Pressable,
  Text,
  View,
  type LayoutChangeEvent,
  type ScrollView,
  type TextInput,
} from "react-native";
import { CORRECT_BG, HIGHLIGHT_BG, WRONG_BG } from "../logic/scaffoldingConstants";
import { styles } from "../styles/ScaffoldingScreen.styles";
import type {
  RenderTokenEntry,
  StructuredTextMetrics,
} from "../logic/scaffoldingRenderData";
import type { GradeState, ScaffoldingStep } from "../logic/scaffoldingTypes";
import type { LayoutBlock } from "../../../../api/ocr";
import ScaffoldingBlankInputContent from "./ScaffoldingBlankInputContent";

type TokenEntryOptions = {
  block?: LayoutBlock;
  compact?: boolean;
  metrics?: StructuredTextMetrics;
  spacingStyle?: Record<string, number>;
};

export default function ScaffoldingTokenEntry({
  entry,
  options,
  step,
  isReviewMode,
  graded,
  answers,
  activeBlankId,
  hintWord,
  hintType,
  selectedBlankSet,
  orderedSelectedBlanks,
  inputRefs,
  answerScrollRefs,
  blankRefs,
  setAnswers,
  setActiveBlankId,
  onToggleBlankSelection,
  onPressBlank,
  onLongPressBlank,
  focusAdjacentBlank,
  recordTokenLayout,
  getStructuredTextMetrics,
}: {
  entry: RenderTokenEntry;
  options?: TokenEntryOptions;
  step: ScaffoldingStep;
  isReviewMode: boolean;
  graded: Record<number, GradeState>;
  answers: Record<number, string>;
  activeBlankId: number | null;
  hintWord: number | null;
  hintType: "first" | "last" | "chosung" | null;
  selectedBlankSet: Set<number>;
  orderedSelectedBlanks: number[];
  inputRefs: React.MutableRefObject<Record<number, TextInput | null>>;
  answerScrollRefs: React.MutableRefObject<Record<number, ScrollView | null>>;
  blankRefs: React.MutableRefObject<Record<number, View | null>>;
  setAnswers: React.Dispatch<React.SetStateAction<Record<number, string>>>;
  setActiveBlankId: React.Dispatch<React.SetStateAction<number | null>>;
  onToggleBlankSelection: (instanceId: number) => void;
  onPressBlank: (instanceId: number) => void;
  onLongPressBlank: (instanceId: number) => void;
  focusAdjacentBlank: (instanceId: number, direction?: 1 | -1) => void;
  recordTokenLayout: (idx: number) => (event: LayoutChangeEvent) => void;
  getStructuredTextMetrics: (block?: LayoutBlock) => StructuredTextMetrics;
}) {
  const { token: t, globalIndex } = entry;
  const compact = options?.compact === true;
  const metrics = options?.metrics ?? getStructuredTextMetrics(options?.block);
  const bodyTextStyle = compact
    ? [
      styles.bodyText,
      styles.compactBodyText,
      {
        fontSize: metrics.bodyFontSize,
        lineHeight: metrics.bodyLineHeight,
      },
    ]
    : styles.bodyText;
  const wordTextStyle = compact
    ? [
      styles.wordText,
      styles.compactWordText,
      {
        fontSize: metrics.keywordFontSize,
        lineHeight: metrics.keywordLineHeight,
      },
    ]
    : styles.wordText;
  const wordPillStyle = compact
    ? [
      styles.wordPill,
      styles.compactWordPill,
      {
        borderRadius: metrics.borderRadius,
      },
    ]
    : styles.wordPill;
  const blankSpacingStyle = compact
    ? {
      marginHorizontal: metrics.marginHorizontal,
      paddingHorizontal: metrics.horizontalPadding,
      ...(options?.spacingStyle ?? {}),
    }
    : styles.blankTokenSpacing;

  if (t.type === "newline") {
    return <View style={styles.newline} />;
  }

  if (t.type === "space") {
    return (
      <Text onLayout={recordTokenLayout(globalIndex)}>
        {t.value}
      </Text>
    );
  }

  if (t.type === "text") {
    return (
      <Text
        style={bodyTextStyle}
        onLayout={recordTokenLayout(globalIndex)}
      >
        {t.value}
      </Text>
    );
  }

  const instanceId = t.instanceId;
  const grade = graded[instanceId] ?? "idle";
  const userValue = answers[instanceId] ?? "";
  const substep = step.split("-")[1];
  const isSelected = selectedBlankSet.has(instanceId);
  const shouldRenderPlainKeyword = isReviewMode && !isSelected;

  if (substep === "1") {
    if (shouldRenderPlainKeyword) {
      return (
        <Text
          style={bodyTextStyle}
          onLayout={recordTokenLayout(globalIndex)}
        >
          {t.value}
        </Text>
      );
    }

    if (isSelected) {
      return (
        <Pressable
          onPress={() => onToggleBlankSelection(instanceId)}
          style={[
            wordPillStyle,
            blankSpacingStyle,
            styles.blankBoxBase,
            { backgroundColor: HIGHLIGHT_BG },
          ]}
          onLayout={recordTokenLayout(globalIndex)}
        >
          <View style={{ position: "relative" }}>
            <Text style={[wordTextStyle, { opacity: 0 }]}>{t.value}</Text>
          </View>
        </Pressable>
      );
    }

    return (
      <Pressable
        onPress={() => onToggleBlankSelection(instanceId)}
        style={[
          wordPillStyle,
          blankSpacingStyle,
          styles.blankBoxBase,
          { backgroundColor: HIGHLIGHT_BG },
        ]}
        onLayout={recordTokenLayout(globalIndex)}
      >
        <Text style={wordTextStyle}>{t.value}</Text>
      </Pressable>
    );
  }

  if (substep === "2") {
    if (!isSelected) {
      if (shouldRenderPlainKeyword) {
        return (
          <Text
            style={bodyTextStyle}
            onLayout={recordTokenLayout(globalIndex)}
          >
            {t.value}
          </Text>
        );
      }

      return (
        <Pressable
          style={[
            wordPillStyle,
            blankSpacingStyle,
            styles.blankBoxBase,
            { backgroundColor: HIGHLIGHT_BG },
          ]}
          onLayout={recordTokenLayout(globalIndex)}
        >
          <Text style={wordTextStyle}>{t.value}</Text>
        </Pressable>
      );
    }

    const isActive = activeBlankId === instanceId;
    const currentHintType = hintWord === instanceId ? hintType : null;
    const textAlign = currentHintType === "last" ? "right" : "left";

    return (
      <View
        ref={(ref) => {
          if (ref) blankRefs.current[instanceId] = ref;
        }}
      >
        <Pressable
          onPress={() => onPressBlank(instanceId)}
          onLongPress={() => onLongPressBlank(instanceId)}
          delayLongPress={450}
          style={[
            wordPillStyle,
            blankSpacingStyle,
            styles.blankBoxBase,
            { backgroundColor: HIGHLIGHT_BG },
            isActive && styles.blankBoxActive,
          ]}
          onLayout={recordTokenLayout(globalIndex)}
        >
          <ScaffoldingBlankInputContent
            instanceId={instanceId}
            tokenValue={t.value}
            value={userValue}
            isActive={isActive}
            textAlign={textAlign}
            textStyle={wordTextStyle}
            inputTextStyle={
              compact
                ? {
                  fontSize: metrics.keywordFontSize,
                  lineHeight: metrics.keywordLineHeight,
                }
                : undefined
            }
            inputRefs={inputRefs}
            answerScrollRefs={answerScrollRefs}
            orderedSelectedBlanks={orderedSelectedBlanks}
            setAnswers={setAnswers}
            setActiveBlankId={setActiveBlankId}
            focusAdjacentBlank={focusAdjacentBlank}
          />
        </Pressable>
      </View>
    );
  }

  if (!isSelected) {
    if (shouldRenderPlainKeyword) {
      return (
        <Text
          style={bodyTextStyle}
          onLayout={recordTokenLayout(globalIndex)}
        >
          {t.value}
        </Text>
      );
    }

    return (
      <Pressable
        style={[
          wordPillStyle,
          blankSpacingStyle,
          styles.blankBoxBase,
          { backgroundColor: HIGHLIGHT_BG },
        ]}
        onLayout={recordTokenLayout(globalIndex)}
      >
        <Text style={wordTextStyle}>{t.value}</Text>
      </Pressable>
    );
  }

  const backgroundColor =
    grade === "correct"
      ? CORRECT_BG
      : grade === "wrong"
        ? WRONG_BG
        : HIGHLIGHT_BG;

  return (
    <View
      style={[
        wordPillStyle,
        blankSpacingStyle,
        styles.blankBoxBase,
        { backgroundColor },
      ]}
      onLayout={recordTokenLayout(globalIndex)}
    >
      <Text style={wordTextStyle}>{t.value}</Text>
    </View>
  );
}
