import React from "react";
import {
  ScrollView,
  TextInput,
  View,
  type LayoutChangeEvent,
} from "react-native";
import type { LayoutBlock } from "../../../../api/ocr";
import type { GradeState, ScaffoldingStep } from "../logic/scaffoldingTypes";
import {
  getPageRenderTokenEntries,
  type PageRenderPage,
  type RenderTokenEntry,
  type StructuredTextMetrics,
} from "../logic/scaffoldingRenderData";
import { getStructuredTextMetrics as getStructuredTextMetricsForLayout } from "../logic/scaffoldingLayout";
import ScaffoldingStudyContent from "./ScaffoldingStudyContent";
import ScaffoldingStructuredPage from "./ScaffoldingStructuredPage";
import ScaffoldingTokenEntry from "./ScaffoldingTokenEntry";

type DragState = {
  text: string;
  box: { x: number; y: number; w: number; h: number };
};

type TokenEntryOptions = {
  block?: LayoutBlock;
  compact?: boolean;
  metrics?: StructuredTextMetrics;
  spacingStyle?: Record<string, number>;
};

export default function ScaffoldingContentPanel({
  hasStructuredPages,
  pageRenderData,
  sourcePageCount,
  pageCanvasWidth,
  pageCanvasHeight,
  setPageCanvasWidth,
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
  flowLayoutRef,
  dragResponder,
  dragSelection,
  dragConfirm,
  pageIndicatorLabel,
  onConfirmDragSelection,
}: {
  hasStructuredPages: boolean;
  pageRenderData: PageRenderPage[];
  sourcePageCount: number;
  pageCanvasWidth: number;
  pageCanvasHeight: number;
  setPageCanvasWidth: React.Dispatch<React.SetStateAction<number>>;
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
  flowLayoutRef: React.MutableRefObject<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>;
  dragResponder: React.ComponentProps<typeof ScaffoldingStudyContent>["dragResponder"];
  dragSelection: DragState | null;
  dragConfirm: DragState | null;
  pageIndicatorLabel: string;
  onConfirmDragSelection: () => void;
}) {
  const getStructuredTextMetrics = (block?: LayoutBlock) =>
    getStructuredTextMetricsForLayout({
      block,
      pageCanvasHeight,
      pageCanvasWidth,
    });

  const renderTokenEntry = (
    entry: RenderTokenEntry,
    options?: TokenEntryOptions,
  ) => (
    <ScaffoldingTokenEntry
      key={entry.key}
      entry={entry}
      options={options}
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
      getStructuredTextMetrics={getStructuredTextMetrics}
    />
  );

  const legacyTokenEntries = pageRenderData[0]?.sections[0]?.tokenEntries ?? [];

  return (
    <ScaffoldingStudyContent
      hasStructuredPages={hasStructuredPages}
      structuredContent={pageRenderData.map((pageRender) => (
        <ScaffoldingStructuredPage
          key={`page-${pageRender.pageIndex}`}
          pageRender={pageRender}
          sourcePageCount={sourcePageCount}
          pageCanvasWidth={pageCanvasWidth}
          pageCanvasHeight={pageCanvasHeight}
          setPageCanvasWidth={setPageCanvasWidth}
          renderTokenEntry={renderTokenEntry}
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
        />
      ))}
      legacyContent={legacyTokenEntries.map((entry) => renderTokenEntry(entry))}
      flowLayoutRef={flowLayoutRef}
      dragResponder={dragResponder}
      dragSelection={dragSelection}
      dragConfirm={dragConfirm}
      isReviewMode={isReviewMode}
      pageIndicatorLabel={pageIndicatorLabel}
      onFlowLayout={(layout) => {
        flowLayoutRef.current = layout;
      }}
      onConfirmDragSelection={onConfirmDragSelection}
    />
  );
}
