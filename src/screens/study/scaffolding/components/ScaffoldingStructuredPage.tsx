import React from "react";
import {
  Pressable,
  ScrollView,
  Text,
  View,
  type TextInput,
} from "react-native";
import { scale } from "../../../../lib/layout";
import type { LayoutBlock } from "../../../../api/ocr";
import { normalizeBlankWord } from "../logic/scaffoldingLogic";
import {
  buildCoordinateColumns,
  buildCoordinateLines,
  getCoordinateGap,
  getCoordinateLineMetrics,
  getStructuredTextMetrics,
} from "../logic/scaffoldingLayout";
import {
  type CoordinateColumn,
  type CoordinateLine,
  type KeywordTokenWithId,
  type PageRenderPage,
  type PageRenderSection,
  type PageRenderTable,
  type RenderTokenEntry,
  type StructuredTextMetrics,
} from "../logic/scaffoldingRenderData";
import { HIGHLIGHT_BG } from "../logic/scaffoldingConstants";
import { styles } from "../styles/ScaffoldingScreen.styles";
import type { GradeState, ScaffoldingStep } from "../logic/scaffoldingTypes";
import ScaffoldingBlankInputContent from "./ScaffoldingBlankInputContent";

type RenderTokenEntryFn = (
  entry: RenderTokenEntry,
  options?: {
    block?: LayoutBlock;
    compact?: boolean;
    metrics?: StructuredTextMetrics;
    spacingStyle?: Record<string, number>;
  },
) => React.ReactNode;

export default function ScaffoldingStructuredPage({
  pageRender,
  sourcePageCount,
  pageCanvasWidth,
  pageCanvasHeight,
  setPageCanvasWidth,
  renderTokenEntry,
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
}: {
  pageRender: PageRenderPage;
  sourcePageCount: number;
  pageCanvasWidth: number;
  pageCanvasHeight: number;
  setPageCanvasWidth: React.Dispatch<React.SetStateAction<number>>;
  renderTokenEntry: RenderTokenEntryFn;
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
  recordTokenLayout: (idx: number) => (event: import("react-native").LayoutChangeEvent) => void;
}) {
  const getMetrics = (block?: LayoutBlock) =>
    getStructuredTextMetrics({
      block,
      pageCanvasHeight,
      pageCanvasWidth,
    });

  const renderCoordinateColumn = (column: CoordinateColumn) => (
    <View key={column.key} style={styles.coordinateColumn}>
      {buildCoordinateLines(column.sections, column.widthRatio).map(
        renderCoordinateLine,
      )}
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
    const metrics = getMetrics(block);
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
            <Text style={shouldRenderPlainKeyword ? textStyle : keywordTextStyle}>
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
            <ScaffoldingBlankInputContent
              instanceId={instanceId}
              tokenValue={token.value}
              value={userValue}
              isActive={isActive}
              textAlign={textAlign}
              textStyle={keywordTextStyle}
              inputTextStyle={{
                fontSize: metrics.keywordFontSize,
                lineHeight: metrics.keywordLineHeight,
              }}
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
        style={[keywordBoxStyle, { backgroundColor }]}
        onLayout={recordTokenLayout(entry.globalIndex)}
      >
        <Text style={keywordTextStyle}>{token.value}</Text>
      </View>
    );
  };

  const renderStructuredBlock = (section: PageRenderSection) => {
    const block = section.block;
    if (!block) return null;

    const metrics = getMetrics(block);
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

  const { page, sections, tables, pageIndex, hasLayoutBlocks } = pageRender;

  return (
    <View key={`page-${pageIndex}`} style={styles.pageCard}>
      {sourcePageCount > 1 && (
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
}
