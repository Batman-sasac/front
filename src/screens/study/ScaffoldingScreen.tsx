import React, { useMemo, useRef, useState, useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  TextInput,
  Platform,
  Alert,
  Keyboard,
} from "react-native";
import { scale } from "../../lib/layout";
import type { BlankItemSave, LayoutBlock } from "../../api/ocr";
import {
  gradeKeywordInstances,
  normalizeBlankWord,
} from "./scaffoldingLogic";
import StudyImageActionButton from "../../components/study/StudyImageActionButton";
import StudyProgressHeader from "../../components/study/StudyProgressHeader";
import ScaffoldingHelpChip from "../../components/study/ScaffoldingHelpChip";
import { getErrorMessage } from "../../app/error/errors";
import ScaffoldingHintModal from "../../components/study/ScaffoldingHintModal";
import ScaffoldingPopup from "../../components/study/ScaffoldingPopup";
import {
  ScaffoldingErrorView,
  ScaffoldingLoadingView,
} from "../../components/study/ScaffoldingStatusViews";
import {
  getPageRenderTokenEntries,
  type CoordinateColumn,
  type CoordinateLine,
  type KeywordTokenWithId,
  type PageRenderPage,
  type PageRenderSection,
  type PageRenderTable,
  type RenderTokenEntry,
  type StructuredTextMetrics,
} from "./scaffoldingRenderData";
import {
  buildCoordinateColumns,
  buildCoordinateLines,
  getCoordinateGap,
  getCoordinateLineMetrics,
  getStructuredTextMetrics as getStructuredTextMetricsForLayout,
} from "./scaffoldingLayout";
import { styles } from "./ScaffoldingScreen.styles";
import {
  CORRECT_BG,
  HIGHLIGHT_BG,
  WRONG_BG,
} from "./scaffoldingConstants";
import type {
  GradeState,
  ScaffoldingScreenProps,
  ScaffoldingStep,
} from "./scaffoldingTypes";
import { useScaffoldingHints } from "./useScaffoldingHints";
import { useScaffoldingPopup } from "./useScaffoldingPopup";
import { useScaffoldingProgress } from "./useScaffoldingProgress";
import { useScaffoldingBlankSelection } from "./useScaffoldingBlankSelection";
import { useScaffoldingDragSelection } from "./useScaffoldingDragSelection";
import { useScaffoldingRenderModel } from "./useScaffoldingRenderModel";

export default function ScaffoldingScreen({
  onBack,
  onBackFromCompletion,
  sources,
  selectedIndex,
  payload,
  loading,
  error,
  onRetry,
  onSave,
  initialRound = "1-1", // 기본값 1라운드
  reviewQuizId = null, // 복습 quiz ID
  currentStudyIndex = 0,
  totalStudyCount = 1,
  accumulatedEarnedXp = 0,
}: ScaffoldingScreenProps) {
  const [step, setStep] = useState<ScaffoldingStep>(initialRound);
  const isReviewMode = reviewQuizId != null;

  // 설명
  const [activeBlankId, setActiveBlankId] = useState<number | null>(null);
  const [answers, setAnswers] = useState<Record<number, string>>({}); // instanceId 기반
  const [graded, setGraded] = useState<Record<number, GradeState>>({}); // instanceId 기반
  const inputRefs = useRef<Record<number, TextInput | null>>({});
  const answerScrollRefs = useRef<Record<number, ScrollView | null>>({});
  const blankRefs = useRef<Record<number, View | null>>({}); // blankBox 위치 추적
  const suppressPressAfterLongPressRef = useRef(false);
  const popup = useScaffoldingPopup();
  const {
    hintWord,
    hintType,
    hintPosition,
    setHintWord,
    setHintType,
    setHintPosition,
    closeHint,
    applyHint,
  } = useScaffoldingHints({
    setAnswers,
  });

  const {
    title,
    blankDefs,
    setBlankDefs,
    sourcePages,
    reviewBlankItems,
    hasStructuredPages,
    pageRenderData,
    tokens,
    keywordInstances,
    keywordOccurrenceOrder,
    pageCanvasWidth,
    setPageCanvasWidth,
    pageCanvasHeight,
  } = useScaffoldingRenderModel({
    payload,
    sources,
    selectedIndex,
    isReviewMode,
  });

  const selectionTotalKeywordCount = Math.min(20, keywordInstances.length);
  const selectionRound1Count = Math.min(5, selectionTotalKeywordCount);
  const selectionRound2Count = Math.min(12, selectionTotalKeywordCount);
  const selectionRound3Count = Math.min(20, selectionTotalKeywordCount);
  const selectionCurrentRound = step.startsWith("2-")
    ? 2
    : step.startsWith("3-")
      ? 3
      : 1;
  const {
    selectedBlanks,
    orderedSelectedBlanks,
    selectedBlankSet,
    setPendingSelection,
    onToggleBlankSelection,
  } = useScaffoldingBlankSelection({
    isReviewMode,
    reviewQuizId,
    payloadKey: payload,
    payloadBlanks: payload?.blanks,
    userAnswers: payload?.user_answers,
    reviewBlankItems,
    keywordInstances,
    keywordOccurrenceOrder,
    currentRound: selectionCurrentRound,
    round1Count: selectionRound1Count,
    round2Count: selectionRound2Count,
    round3Count: selectionRound3Count,
    setAnswers,
  });
  const blankIdByInstance = useMemo(() => {
    const m = new Map<number, number>();
    keywordInstances.forEach((ki) => m.set(ki.instanceId, ki.blankId));
    return m;
  }, [keywordInstances]);
  const keywordInstanceById = useMemo(() => {
    const map = new Map<number, (typeof keywordInstances)[number]>();
    keywordInstances.forEach((instance) => {
      map.set(instance.instanceId, instance);
    });
    return map;
  }, [keywordInstances]);
  const {
    totalBars,
    round1Count,
    round2Count,
    round3Count,
    currentRound,
    requiredSelectCount,
    correctCount,
    barStates,
    roundLabel,
    pageIndicatorLabel,
  } = useScaffoldingProgress({
    step,
    keywordCount: keywordInstances.length,
    orderedSelectedBlanks,
    graded,
    currentStudyIndex,
    totalStudyCount,
  });
  const {
    flowLayoutRef,
    recordTokenLayout,
    dragConfirm,
    dragSelection,
    dragResponder,
    confirmDragSelection,
  } = useScaffoldingDragSelection({
    step,
    tokens,
    blankDefs,
    setBlankDefs,
    setPendingSelection,
  });

  useEffect(() => {
    if (hintWord === null && hintType !== null) {
      // 설명
      setAnswers((prev) => {
        const newAnswers = { ...prev };
        Object.keys(newAnswers).forEach((keyStr) => {
          const key = parseInt(keyStr, 10);
          const val = newAnswers[key];
          // 설명
          if (val && (val.length === 1 || /^[ㄱ-ㅎ]+$/.test(val))) {
            delete newAnswers[key];
          }
        });
        return newAnswers;
      });
    }
  }, [hintWord]);

  const onReselectWords = () => {
    if (isReviewMode) return;
    // 설명
    if (step === "1-2") setStep("1-1");
    else if (step === "2-2") setStep("2-1");
    else if (step === "3-2") setStep("3-1");
  };

  const onStartLearning = () => {
    const requiredTotal =
      isReviewMode
        ? orderedSelectedBlanks.length
        : currentRound === 1
        ? round1Count
        : currentRound === 2
          ? round2Count
          : round3Count;
    if (isReviewMode && requiredTotal === 0) {
      popup.showPopup("복습 불가", "복습할 빈칸을 불러오지 못했습니다.");
      return;
    }
    if (orderedSelectedBlanks.length < requiredTotal) {
      popup.showPopup("알림", `${requiredTotal}개가 아직 설정되지 않았어요!`);
      return;
    }

    if (step === "1-1") setStep("1-2");
    else if (step === "2-1") setStep("2-2");
    else if (step === "3-1") setStep("3-2");
  };

  /** 로딩/에러 UI (모든 Hook 선언 이후) */
  if (loading) {
    return <ScaffoldingLoadingView />;
  }
  if (error || !payload) {
    return (
      <ScaffoldingErrorView
        error={error}
        canRetry={!reviewQuizId}
        onRetry={onRetry}
        onBack={onBack}
      />
    );
  }

  const onLongPressBlank = (instanceId: number) => {
    suppressPressAfterLongPressRef.current = true;
    Keyboard.dismiss();
    inputRefs.current[instanceId]?.blur();
    setActiveBlankId(null);
    setHintWord(instanceId);
    setHintType(null);

    // 설명
    const blankRef = blankRefs.current[instanceId];
    if (blankRef) {
      blankRef.measure((fx, fy, width, height, px, py) => {
        setHintPosition({
          x: px + width / 2,
          y: py - 80, // 빈칸 상단에 힌트 모달 표시
        });
      });
    }
  };
  const onPressBlank = (instanceId: number) => {
    if (suppressPressAfterLongPressRef.current) {
      suppressPressAfterLongPressRef.current = false;
      return;
    }
    setActiveBlankId(instanceId);
    closeHint();
    requestAnimationFrame(() => inputRefs.current[instanceId]?.focus());
  };

  const focusAdjacentBlank = (instanceId: number, direction: 1 | -1 = 1) => {
    const currentIndex = orderedSelectedBlanks.indexOf(instanceId);
    if (currentIndex < 0) return;

    const nextInstanceId = orderedSelectedBlanks[currentIndex + direction];
    if (typeof nextInstanceId !== "number") {
      setActiveBlankId(null);
      inputRefs.current[instanceId]?.blur();
      return;
    }

    setActiveBlankId(nextInstanceId);
    closeHint();
    requestAnimationFrame(() => inputRefs.current[nextInstanceId]?.focus());
  };

  const onGrade = () => {
    setGraded(
      gradeKeywordInstances({
        selectedInstanceIds: orderedSelectedBlanks,
        keywordInstances,
        answers,
        previousGrades: graded,
      }),
    );

    if (step === "1-2") setStep("1-3");
    else if (step === "2-2") setStep("2-3");
    else if (step === "3-2") setStep("3-3");
  };

  const getStructuredTextMetrics = (block?: LayoutBlock) =>
    getStructuredTextMetricsForLayout({
      block,
      pageCanvasHeight,
      pageCanvasWidth,
    });

  const renderTokenEntry = (
    entry: RenderTokenEntry,
    options?: {
      block?: LayoutBlock;
      compact?: boolean;
      metrics?: StructuredTextMetrics;
      spacingStyle?: Record<string, number>;
    },
  ) => {
    const { token: t, globalIndex, key } = entry;
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
          paddingHorizontal: metrics.horizontalPadding,
          marginHorizontal: metrics.marginHorizontal,
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
      return <View key={key} style={styles.newline} />;
    }

    if (t.type === "space") {
      return (
        <Text key={key} onLayout={recordTokenLayout(globalIndex)}>
          {t.value}
        </Text>
      );
    }

    if (t.type === "text") {
      return (
        <Text
          key={key}
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
            key={key}
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
            key={key}
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
          key={key}
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
              key={key}
              style={bodyTextStyle}
              onLayout={recordTokenLayout(globalIndex)}
            >
              {t.value}
            </Text>
          );
        }

        return (
          <Pressable
            key={key}
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
          key={key}
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
            <View style={{ position: "relative" }}>
              <Text style={[wordTextStyle, { opacity: 0 }]}>{t.value}</Text>
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
                      wordTextStyle,
                      compact && {
                        fontSize: metrics.keywordFontSize,
                        lineHeight: metrics.keywordLineHeight,
                      },
                      { textAlign },
                    ]}
                  >
                    {userValue}
                  </Text>
                </ScrollView>
                <TextInput
                  pointerEvents="none"
                  ref={(ref) => {
                    if (ref) inputRefs.current[instanceId] = ref;
                  }}
                  value={userValue}
                  onChangeText={(value) =>
                    setAnswers((prev) => ({ ...prev, [instanceId]: value }))
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
                    compact && {
                      fontSize: metrics.keywordFontSize,
                      lineHeight: metrics.keywordLineHeight,
                    },
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
                        setActiveBlankId((prev) =>
                          prev === instanceId ? null : prev,
                        );
                      }
                    });
                  }}
                  maxFontSizeMultiplier={1.0}
                />
              </View>
            </View>
          </Pressable>
        </View>
      );
    }

    if (!isSelected) {
      if (shouldRenderPlainKeyword) {
        return (
          <Text
            key={key}
            style={bodyTextStyle}
            onLayout={recordTokenLayout(globalIndex)}
          >
            {t.value}
          </Text>
        );
      }

      return (
        <Pressable
          key={key}
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
        key={key}
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
  };

  const renderCoordinateColumn = (column: CoordinateColumn) => (
    <View key={column.key} style={styles.coordinateColumn}>
      {buildCoordinateLines(column.sections, column.widthRatio).map(renderCoordinateLine)}
    </View>
  );

  const renderCoordinateLine = (line: CoordinateLine) => {
    const metrics = getCoordinateLineMetrics({ line, pageCanvasWidth });

    return (
      <View
        key={line.key}
        style={[
          styles.coordinateLine,
          {
            marginLeft: `${line.x * 100}%`,
            minHeight: metrics.bodyLineHeight,
            marginBottom: Math.max(scale(4), metrics.bodyLineHeight * 0.22),
          },
        ]}
      >
        {line.sections.map((section, sectionIndex) => {
          const previous = line.sections[sectionIndex - 1]?.block;
          const gap = getCoordinateGap({
            previous,
            current: section.block,
            line,
            pageCanvasWidth,
          });
          return (
            <View
              key={section.key}
              style={[
                styles.coordinateWord,
                sectionIndex > 0 && { marginLeft: gap },
              ]}
            >
              {section.tokenEntries.map((entry) =>
                renderTokenEntry(entry, {
                  block: section.block,
                  compact: true,
                  metrics,
                  spacingStyle: { paddingHorizontal: scale(4) },
                }),
              )}
            </View>
          );
        })}
      </View>
    );
  };

  const renderStructuredKeywordBlock = (
    entry: RenderTokenEntry,
    block: LayoutBlock,
  ) => {
    const token = entry.token;
    if (token.type !== "keyword") return null;

    const instanceId = token.instanceId;
    const grade = graded[instanceId] ?? "idle";
    const userValue = answers[instanceId] ?? "";
    const substep = step.split("-")[1];
    const isSelected = selectedBlankSet.has(instanceId);
    const shouldRenderPlainKeyword = isReviewMode && !isSelected;
    const metrics = getStructuredTextMetrics(block);
    const keywordTextStyle = [
      styles.wordText,
      styles.compactWordText,
      {
        fontSize: metrics.keywordFontSize,
        lineHeight: metrics.keywordLineHeight,
      },
    ];
    const keywordBoxStyle = [
      styles.structuredKeywordInlineBox,
      styles.blankBoxBase,
      {
        backgroundColor: HIGHLIGHT_BG,
        paddingHorizontal: metrics.horizontalPadding,
        borderRadius: metrics.borderRadius,
      },
    ];
    const textStyle = [
      styles.structuredBlockText,
      {
        fontSize: metrics.bodyFontSize,
        lineHeight: metrics.bodyLineHeight,
      },
    ];

    if (substep === "1") {
      if (shouldRenderPlainKeyword) {
        return (
          <Text
            key={entry.key}
            style={textStyle}
            onLayout={recordTokenLayout(entry.globalIndex)}
          >
            {token.value}
          </Text>
        );
      }

      return (
        <Pressable
          key={entry.key}
          onPress={() => onToggleBlankSelection(instanceId)}
          style={keywordBoxStyle}
          onLayout={recordTokenLayout(entry.globalIndex)}
        >
          <Text style={[keywordTextStyle, isSelected && { opacity: 0 }]}>
            {token.value}
          </Text>
        </Pressable>
      );
    }

    if (substep === "2") {
      if (!isSelected || shouldRenderPlainKeyword) {
        return (
          <View
            key={entry.key}
            style={!shouldRenderPlainKeyword ? keywordBoxStyle : undefined}
            onLayout={recordTokenLayout(entry.globalIndex)}
          >
            <Text
              style={shouldRenderPlainKeyword ? textStyle : keywordTextStyle}
            >
              {token.value}
            </Text>
          </View>
        );
      }

      const isActive = activeBlankId === instanceId;
      const currentHintType = hintWord === instanceId ? hintType : null;
      const textAlign = currentHintType === "last" ? "right" : "left";

      return (
        <View
          key={entry.key}
          ref={(ref) => {
            if (ref) blankRefs.current[instanceId] = ref;
          }}
        >
          <Pressable
            onPress={() => onPressBlank(instanceId)}
            onLongPress={() => onLongPressBlank(instanceId)}
            delayLongPress={450}
            style={[
              ...keywordBoxStyle,
              styles.structuredKeywordInputBox,
              isActive && styles.structuredKeywordInputBoxActive,
            ]}
            onLayout={recordTokenLayout(entry.globalIndex)}
          >
            <Text style={[keywordTextStyle, { opacity: 0 }]}>
              {token.value}
            </Text>
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
                  style={[keywordTextStyle, { textAlign }]}
                >
                  {userValue}
                </Text>
              </ScrollView>
              <TextInput
                pointerEvents="none"
                ref={(ref) => {
                  if (ref) inputRefs.current[instanceId] = ref;
                }}
                value={userValue}
                onChangeText={(value) =>
                  setAnswers((prev) => ({ ...prev, [instanceId]: value }))
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
                  {
                    textAlign,
                    fontSize: metrics.keywordFontSize,
                    lineHeight: metrics.keywordLineHeight,
                  },
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
                      setActiveBlankId((prev) =>
                        prev === instanceId ? null : prev,
                      );
                    }
                  });
                }}
                maxFontSizeMultiplier={1.0}
              />
            </View>
          </Pressable>
        </View>
      );
    }

    if (shouldRenderPlainKeyword) {
      return (
        <Text
          key={entry.key}
          style={textStyle}
          onLayout={recordTokenLayout(entry.globalIndex)}
        >
          {token.value}
        </Text>
      );
    }

    const backgroundColor = !isSelected
      ? "transparent"
      : grade === "correct"
        ? "rgba(197, 255, 186, 0.45)"
        : grade === "wrong"
          ? "rgba(255, 156, 173, 0.5)"
          : "rgba(199, 207, 255, 0.35)";

    return (
      <View
        key={entry.key}
        style={[
          keywordBoxStyle,
          { backgroundColor },
        ]}
        onLayout={recordTokenLayout(entry.globalIndex)}
      >
        <Text style={keywordTextStyle}>{token.value}</Text>
      </View>
    );
  };

  const renderStructuredBlock = (section: PageRenderSection) => {
    const block = section.block;
    if (!block) return null;

    const metrics = getStructuredTextMetrics(block);
    const hasKeywordEntries = section.tokenEntries.some(
      (entry) => entry.token.type === "keyword",
    );
    const keywordEntries = section.tokenEntries.filter(
      (entry): entry is RenderTokenEntry & { token: KeywordTokenWithId } =>
        entry.token.type === "keyword",
    );
    const singleKeywordEntry =
      section.blankCandidate &&
        keywordEntries.length === 1 &&
        normalizeBlankWord(section.blankCandidate.text) ===
        normalizeBlankWord(keywordEntries[0].token.value)
        ? keywordEntries[0]
        : null;

    return (
      <View
        key={section.key}
        style={[
          styles.layoutBlock,
          {
            left: `${Math.max(block.x, 0) * 100}%`,
            top: `${Math.max(block.y, 0) * 100}%`,
            width: `${Math.max(block.width, 0.04) * 100}%`,
            height: `${Math.max(block.height, 0.028) * 100}%`,
          },
        ]}
      >
        {singleKeywordEntry ? (
          renderStructuredKeywordBlock(singleKeywordEntry, block)
        ) : hasKeywordEntries ? (
          <View style={styles.layoutBlockFlow}>
            {section.tokenEntries.map((entry) =>
              renderTokenEntry(entry, { block, compact: true }),
            )}
          </View>
        ) : (
          <Text
            style={[
              styles.structuredBlockText,
              {
                fontSize: metrics.bodyFontSize,
                lineHeight: metrics.bodyLineHeight,
              },
            ]}
          >
            {block.text}
          </Text>
        )}
      </View>
    );
  };

  const renderTable = (table: PageRenderTable, tableIndex: number) => {
    const columnCount = Math.max(...table.rows.map((row) => row.length), 0);
    if (columnCount === 0) return null;

    return (
      <View key={table.key} style={styles.pageTableWrap}>
        <Text style={styles.pageTableTitle}>표 {tableIndex + 1}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.pageTable}>
            {table.rows.map((row, rowIndex) => {
              const normalizedRow = Array.from(
                { length: columnCount },
                (_, colIndex) => row[colIndex],
              );

              return (
                <View
                  key={`${table.key}-row-${rowIndex}`}
                  style={styles.pageTableRow}
                >
                  {normalizedRow.map((cell, colIndex) => (
                    <View
                      key={
                        cell?.key ??
                        `${table.key}-empty-${rowIndex}-${colIndex}`
                      }
                      style={[
                        styles.pageTableCell,
                        rowIndex === 0 && styles.pageTableHeaderCell,
                      ]}
                    >
                      {cell ? (
                        <View style={styles.pageTableCellFlow}>
                          {cell.tokenEntries.map((entry) =>
                            renderTokenEntry(entry, {
                              compact: true,
                              spacingStyle: { paddingHorizontal: scale(2) },
                            }),
                          )}
                        </View>
                      ) : null}
                    </View>
                  ))}
                </View>
              );
            })}
          </View>
        </ScrollView>
      </View>
    );
  };

  const renderStructuredPage = (pageRender: PageRenderPage) => {
    const { page, sections, tables, pageIndex, hasLayoutBlocks } = pageRender;

    return (
      <View key={`page-${pageIndex}`} style={styles.pageCard}>
        {sourcePages.length > 1 && (
          <Text style={styles.pageCardTitle}>페이지 {pageIndex + 1}</Text>
        )}

        <View style={styles.pageSheet}>
          {hasLayoutBlocks ? (
            <View
              style={styles.coordinatePage}
              onLayout={(event) => {
                const nextWidth = event.nativeEvent.layout.width;
                if (nextWidth > 0 && nextWidth !== pageCanvasWidth) {
                  setPageCanvasWidth(nextWidth);
                }
              }}
            >
              <View style={styles.coordinateColumns}>
                {buildCoordinateColumns(sections, {
                  allowSplitColumns: (page.tables?.length ?? 0) > 0,
                }).map(renderCoordinateColumn)}
              </View>
            </View>
          ) : (
            <View style={styles.flow}>
              {sections
                .flatMap((section) => section.tokenEntries)
                .map((entry) => renderTokenEntry(entry))}
            </View>
          )}

          {tables.map(renderTable)}
        </View>
      </View>
    );
  };

  const legacyTokenEntries = pageRenderData[0]?.sections[0]?.tokenEntries ?? [];

  return (
    <View style={styles.root}>
      {/* 설명 */}
      <StudyProgressHeader
        title={title}
        roundLabel={roundLabel}
        correctCount={correctCount}
        totalBars={totalBars}
        barStates={barStates}
        correctColor={CORRECT_BG}
        wrongColor={WRONG_BG}
        onBack={onBack}
      />

      <View style={styles.content}>
        {/* 설명 */}
        <View style={styles.leftCard}>
          <ScaffoldingHelpChip
            isReviewMode={isReviewMode}
            step={step}
            currentRound={currentRound}
            requiredSelectCount={requiredSelectCount}
          />

          {(step === "1-1" || step === "2-1" || step === "3-1") && (
            <View style={styles.buttonGroup}>
              <StudyImageActionButton
                source={require("../../../assets/study/start-study-button.png")}
                onPress={onStartLearning}
              />
            </View>
          )}

          {(step === "1-2" || step === "2-2" || step === "3-2") && (
            <View style={styles.buttonGroup}>
              <StudyImageActionButton
                source={require("../../../assets/study/grade-button.png")}
                onPress={onGrade}
              />
            </View>
          )}

          {step === "1-3" && (
            <View style={styles.buttonGroup}>
              <StudyImageActionButton
                source={require("../../../assets/study/Round2.png")}
                onPress={() => {
                  setAnswers({});
                  setStep("2-1");
                }}
              />
            </View>
          )}

          {step === "2-3" && (
            <View style={styles.buttonGroup}>
              <StudyImageActionButton
                source={require("../../../assets/study/Round3.png")}
                onPress={() => {
                  setAnswers({});
                  setStep("3-1");
                }}
              />
            </View>
          )}

          {step === "3-3" && (
            <View style={styles.buttonGroup}>
              <StudyImageActionButton
                source={require("../../../assets/study/finish_study.png")}
                onPress={async () => {
                  if (onSave) {
                    try {
                      // 페이지/등장 순서 기반으로 instance를 그대로 저장한다.
                      // 같은 단어(같은 blankId)가 여러 번 나오더라도 dedupe 하지 않아야
                      // 페이지별 문항 수/정답 수가 정확히 집계된다.
                      const answerPairs = orderedSelectedBlanks
                        .map((instanceId, index) => {
                          const blankId = blankIdByInstance.get(instanceId);
                          const occurrence = keywordOccurrenceOrder.find(
                            (item) => item.instanceId === instanceId,
                          );
                          const instance = keywordInstanceById.get(instanceId);
                          if (typeof blankId !== "number") return null;
                          return {
                            blankId,
                            answer: answers[instanceId] ?? "",
                            blankItem: {
                              blank_index: index,
                              word: instance?.word ?? occurrence?.normalizedWord ?? "",
                              page_index: occurrence?.pageIndex ?? 0,
                              ...(occurrence?.candidateId
                                ? { candidate_id: occurrence.candidateId }
                                : {}),
                            },
                          };
                        })
                        .filter(
                          (
                            pair,
                          ): pair is {
                            blankId: number;
                            answer: string;
                            blankItem: BlankItemSave;
                          } =>
                            pair != null,
                        );
                      const orderedBlankIds = answerPairs.map(
                        (pair) => pair.blankId,
                      );
                      const answerList = answerPairs.map((pair) => pair.answer);
                      const saveResult = await onSave({
                        answers: answerList,
                        selectedBlankIds: orderedBlankIds,
                        selectedBlankItems: answerPairs.map(
                          (pair) => pair.blankItem,
                        ),
                      });
                      if (isReviewMode && saveResult?.handledCompletion) {
                        return;
                      }
                      if (saveResult?.handledCompletion) {
                        return;
                      }
                      const earnedXp = saveResult?.earnedXp ?? correctCount * 2;
                      const totalEarnedXp =
                        saveResult?.totalEarnedXp ??
                        accumulatedEarnedXp + earnedXp;
                      const isLastStudy =
                        currentStudyIndex >= totalStudyCount - 1;
                      popup.showPopup(
                        isLastStudy ? "축하합니다" : "다음 학습으로 이동",
                        isLastStudy
                          ? `학습을 완료해서 총 ${totalEarnedXp}xp를 획득했어요`
                          : `${currentStudyIndex + 1}번 학습을 완료했습니다. ${currentStudyIndex + 2}번 학습을 시작합니다.`,
                        () => {
                          if (onBackFromCompletion) {
                            onBackFromCompletion();
                          } else {
                            onBack();
                          }
                        },
                      );
                      return;
                    } catch (error) {
                      Alert.alert(
                        "저장 실패",
                        getErrorMessage(error, "알 수 없는 오류가 발생했습니다."),
                      );
                      return;
                    }
                  }

                  const earnedXp = correctCount * 2;
                  const isLastStudy = currentStudyIndex >= totalStudyCount - 1;
                  const totalEarnedXp = accumulatedEarnedXp + earnedXp;
                  popup.showPopup(
                    isLastStudy ? "축하합니다" : "다음 학습으로 이동",
                    isLastStudy
                      ? `학습을 완료해서 총 ${totalEarnedXp}xp를 획득했어요`
                      : `${currentStudyIndex + 1}번 학습을 완료했습니다. ${currentStudyIndex + 2}번 학습을 시작합니다.`,
                    () => {
                      if (onBackFromCompletion) {
                        onBackFromCompletion();
                      } else {
                        onBack();
                      }
                    },
                  );
                }}
              />
            </View>
          )}
        </View>

        {/* 설명 */}
        <View style={styles.rightCard}>
          <ScrollView
            contentContainerStyle={styles.textContainer}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode={
              Platform.OS === "ios" ? "interactive" : "on-drag"
            }
          >
            {hasStructuredPages ? (
              <View style={styles.pageList}>
                {pageRenderData.map(renderStructuredPage)}
              </View>
            ) : (
              <View
                style={styles.flow}
                onLayout={(e) => {
                  flowLayoutRef.current = e.nativeEvent.layout;
                }}
                {...(dragResponder ? dragResponder.panHandlers : {})}
              >
                {legacyTokenEntries.map((entry) => renderTokenEntry(entry))}
              </View>
            )}
          </ScrollView>
          {dragSelection?.box && flowLayoutRef.current && (
            <View
              style={[
                styles.dragSelectionBox,
                {
                  left: flowLayoutRef.current.x + dragSelection.box.x,
                  top: flowLayoutRef.current.y + dragSelection.box.y,
                  width: dragSelection.box.w,
                  height: dragSelection.box.h,
                },
              ]}
              pointerEvents="none"
            />
          )}
          {dragConfirm?.box && flowLayoutRef.current && (
            <Pressable
              style={[
                styles.dragConfirmBtn,
                {
                  left:
                    flowLayoutRef.current.x +
                    dragConfirm.box.x +
                    dragConfirm.box.w / 2 -
                    scale(52),
                  top: Math.max(
                    0,
                    flowLayoutRef.current.y + dragConfirm.box.y - scale(34),
                  ),
                },
              ]}
              onPress={confirmDragSelection}
            >
              <Text style={styles.dragConfirmText}>빈칸 만들기</Text>
            </Pressable>
          )}
        </View>
      </View>
      {!isReviewMode && (
        <View pointerEvents="none" style={styles.pageIndicatorWrap}>
          <Text style={styles.pageIndicatorText}>{pageIndicatorLabel}</Text>
        </View>
      )}

      <ScaffoldingHintModal
        target={
          hintWord === null
            ? null
            : (() => {
              const hintInstance = keywordInstances.find(
                (ki) => ki.instanceId === hintWord,
              );
              return hintInstance
                ? { instanceId: hintWord, word: hintInstance.word }
                : null;
            })()
        }
        hintType={hintType}
        hintPosition={hintPosition}
        onClose={closeHint}
        onApplyHint={applyHint}
      />
      <ScaffoldingPopup
        visible={popup.visible}
        title={popup.title}
        message={popup.message}
        onConfirm={popup.handleConfirm}
      />
    </View>
  );
}


