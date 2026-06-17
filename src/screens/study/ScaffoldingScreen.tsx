import React, { useRef, useState } from "react";
import { View, ScrollView, TextInput } from "react-native";
import StudyProgressHeader from "../../components/study/StudyProgressHeader";
import ScaffoldingHelpChip from "./scaffolding/components/ScaffoldingHelpChip";
import ScaffoldingActionButtons from "./scaffolding/components/ScaffoldingActionButtons";
import ScaffoldingContentPanel from "./scaffolding/components/ScaffoldingContentPanel";
import ScaffoldingHintModal from "./scaffolding/components/ScaffoldingHintModal";
import ScaffoldingPopup from "./scaffolding/components/ScaffoldingPopup";
import {
  ScaffoldingErrorView,
  ScaffoldingLoadingView,
} from "./scaffolding/components/ScaffoldingStatusViews";
import { styles } from "./scaffolding/styles/ScaffoldingScreen.styles";
import { CORRECT_BG, WRONG_BG } from "./scaffolding/logic/scaffoldingConstants";
import type {
  GradeState,
  ScaffoldingScreenProps,
  ScaffoldingStep,
} from "./scaffolding/logic/scaffoldingTypes";
import { useScaffoldingHints } from "./scaffolding/hooks/useScaffoldingHints";
import { useScaffoldingPopup } from "./scaffolding/hooks/useScaffoldingPopup";
import { useScaffoldingProgress } from "./scaffolding/hooks/useScaffoldingProgress";
import { useScaffoldingBlankSelection } from "./scaffolding/hooks/useScaffoldingBlankSelection";
import { useScaffoldingDragSelection } from "./scaffolding/hooks/useScaffoldingDragSelection";
import { useScaffoldingRenderModel } from "./scaffolding/hooks/useScaffoldingRenderModel";
import { useScaffoldingRoundActions } from "./scaffolding/hooks/useScaffoldingRoundActions";
import { useScaffoldingBlankFocus } from "./scaffolding/hooks/useScaffoldingBlankFocus";
import { useScaffoldingCompletionSave } from "./scaffolding/hooks/useScaffoldingCompletionSave";
import { useScaffoldingSelectionLimits } from "./scaffolding/hooks/useScaffoldingSelectionLimits";
import { useScaffoldingSaveLookup } from "./scaffolding/hooks/useScaffoldingSaveLookup";

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

  const selectionLimits = useScaffoldingSelectionLimits({
    step,
    keywordCount: keywordInstances.length,
  });
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
    currentRound: selectionLimits.currentRound,
    round1Count: selectionLimits.round1Count,
    round2Count: selectionLimits.round2Count,
    round3Count: selectionLimits.round3Count,
    setAnswers,
  });
  const { blankIdByInstance, keywordInstanceById } =
    useScaffoldingSaveLookup(keywordInstances);
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
  const {
    onReselectWords,
    onStartLearning,
    onGrade,
    onMoveToRound2,
    onMoveToRound3,
  } = useScaffoldingRoundActions({
    step,
    setStep,
    isReviewMode,
    orderedSelectedBlanks,
    currentRound,
    round1Count,
    round2Count,
    round3Count,
    keywordInstances,
    answers,
    graded,
    setGraded,
    setAnswers,
    showPopup: popup.showPopup,
  });
  const {
    onLongPressBlank,
    onPressBlank,
    focusAdjacentBlank,
  } = useScaffoldingBlankFocus({
    orderedSelectedBlanks,
    inputRefs,
    blankRefs,
    setActiveBlankId,
    setHintWord,
    setHintType,
    setHintPosition,
    closeHint,
  });
  const { onFinishStudy } = useScaffoldingCompletionSave({
    isReviewMode,
    orderedSelectedBlanks,
    answers,
    blankIdByInstance,
    keywordOccurrenceOrder,
    keywordInstanceById,
    onSave,
    correctCount,
    accumulatedEarnedXp,
    currentStudyIndex,
    totalStudyCount,
    onBack,
    onBackFromCompletion,
    showPopup: popup.showPopup,
  });

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

          <ScaffoldingActionButtons
            step={step}
            onStartLearning={onStartLearning}
            onGrade={onGrade}
            onMoveToRound2={onMoveToRound2}
            onMoveToRound3={onMoveToRound3}
            onFinishStudy={onFinishStudy}
          />
        </View>

        <ScaffoldingContentPanel
          hasStructuredPages={hasStructuredPages}
          pageRenderData={pageRenderData}
          sourcePageCount={sourcePages.length}
          pageCanvasWidth={pageCanvasWidth}
          pageCanvasHeight={pageCanvasHeight}
          setPageCanvasWidth={setPageCanvasWidth}
          step={step}
          isReviewMode={isReviewMode}
          graded={graded}
          answers={answers}
          activeBlankId={activeBlankId}
          hintWord={hintWord}
          hintType={hintType}
          selectedBlankSet={selectedBlankSet}
          orderedSelectedBlanks={orderedSelectedBlanks}
          inputRefs={inputRefs}
          answerScrollRefs={answerScrollRefs}
          blankRefs={blankRefs}
          setAnswers={setAnswers}
          setActiveBlankId={setActiveBlankId}
          onToggleBlankSelection={onToggleBlankSelection}
          onPressBlank={onPressBlank}
          onLongPressBlank={onLongPressBlank}
          focusAdjacentBlank={focusAdjacentBlank}
          recordTokenLayout={recordTokenLayout}
          flowLayoutRef={flowLayoutRef}
          dragResponder={dragResponder}
          dragSelection={dragSelection}
          dragConfirm={dragConfirm}
          pageIndicatorLabel={pageIndicatorLabel}
          onConfirmDragSelection={confirmDragSelection}
        />
      </View>

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
