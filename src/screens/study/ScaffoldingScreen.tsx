import React, { useMemo, useRef, useState, useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  Image,
  ScrollView,
  TextInput,
  Platform,
  Alert,
  PanResponder,
  Keyboard,
  LayoutChangeEvent,
} from "react-native";
import { scale, fontScale } from "../../lib/layout";
import type {
  BlankItemSave,
  LayoutBlock,
  PageItem,
} from "../../api/ocr";
import {
  buildKeywordInstances,
  gradeKeywordInstances,
  normalizeBlankWord,
  selectReviewKeywordInstanceIds,
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
  buildPageRenderData,
  clampNumber,
  getPageRenderTokenEntries,
  normalize,
  type CoordinateColumn,
  type CoordinateLine,
  type KeywordTokenWithId,
  type PageRenderPage,
  type PageRenderSection,
  type PageRenderTable,
  type RenderTokenEntry,
  type StructuredTextMetrics,
} from "./scaffoldingRenderData";
import { styles } from "./ScaffoldingScreen.styles";
import {
  CORRECT_BG,
  DEFAULT_PAGE_CANVAS_ASPECT_RATIO,
  HIGHLIGHT_BG,
  WRONG_BG,
} from "./scaffoldingConstants";
import type {
  BlankItem,
  GradeState,
  ScaffoldingScreenProps,
  ScaffoldingStep,
} from "./scaffoldingTypes";
import { useScaffoldingHints } from "./useScaffoldingHints";
import { useScaffoldingPopup } from "./useScaffoldingPopup";
import { useScaffoldingProgress } from "./useScaffoldingProgress";

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
  const [selectedBlanks, setSelectedBlanks] = useState<number[]>([]); // 사용자가 선택한 빈칸 instanceId
  const [selectionOrder, setSelectionOrder] = useState<Record<number, number>>(
    {},
  );
  const [blankDefsState, setBlankDefsState] = useState<BlankItem[]>([]);
  const [pageCanvasWidth, setPageCanvasWidth] = useState(0);
  const [pageCanvasAspectRatio, setPageCanvasAspectRatio] = useState(
    DEFAULT_PAGE_CANVAS_ASPECT_RATIO,
  );
  const [pendingSelection, setPendingSelection] = useState<{
    includeWord: string;
    excludeWords: string[];
  } | null>(null);
  const [dragConfirm, setDragConfirm] = useState<{
    text: string;
    box: { x: number; y: number; w: number; h: number };
  } | null>(null);
  const [dragSelection, setDragSelection] = useState<{
    text: string;
    box: { x: number; y: number; w: number; h: number };
  } | null>(null);

  const inputRefs = useRef<Record<number, TextInput | null>>({});
  const answerScrollRefs = useRef<Record<number, ScrollView | null>>({});
  const blankRefs = useRef<Record<number, View | null>>({}); // blankBox 위치 추적
  const selectionSeqRef = useRef(0);
  const reviewInitRef = useRef(false);
  const flowLayoutRef = useRef<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  const tokenLayoutsRef = useRef<
    Record<number, { x: number; y: number; width: number; height: number }>
  >({});
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const dragSelectionRef = useRef<{
    text: string;
    box: { x: number; y: number; w: number; h: number };
  } | null>(null);
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

  // 설명
  const title = payload?.title ?? "";
  const extractedText = payload?.extractedText ?? "";

  useEffect(() => {
    setBlankDefsState(payload?.blanks ?? []);
  }, [payload?.blanks, payload?.extractedText]);

  useEffect(() => {
    const fallback = () =>
      setPageCanvasAspectRatio(DEFAULT_PAGE_CANVAS_ASPECT_RATIO);

    const imageUri = payload?.imageUrl ?? sources[selectedIndex]?.uri;
    if (!imageUri) {
      fallback();
      return;
    }

    Image.getSize(
      imageUri,
      (width, height) => {
        if (width > 0 && height > 0) {
          setPageCanvasAspectRatio(width / height);
          return;
        }
        fallback();
      },
      () => fallback(),
    );
  }, [payload?.imageUrl, selectedIndex, sources]);

  const blankDefs = blankDefsState;

  /** 키워드 목록 */
  const keywordList = useMemo(() => blankDefs.map((b) => b.word), [blankDefs]);
  const baseInfoByWord = useMemo(() => {
    const m = new Map<string, BlankItem>();
    blankDefs.forEach((b) => {
      if (!m.has(b.word)) m.set(b.word, b);
    });
    return m;
  }, [blankDefs]);

  const sourcePages = useMemo<PageItem[]>(() => {
    if (payload?.pages && payload.pages.length > 0) {
      return payload.pages;
    }

    return [
      {
        original_text: extractedText,
        keywords: keywordList,
      },
    ];
  }, [payload?.pages, extractedText, keywordList]);

  const reviewBlankItems = useMemo<BlankItemSave[]>(
    () => (isReviewMode ? (payload?.blankItems ?? []) : []),
    [isReviewMode, payload?.blankItems],
  );

  useEffect(() => {
    if (!isReviewMode) return;
    reviewInitRef.current = false;
    setSelectedBlanks([]);
    setSelectionOrder({});
  }, [isReviewMode, reviewQuizId, payload]);

  const hasStructuredPages = useMemo(
    () =>
      sourcePages.some(
        (page) =>
          (page.layout_blocks?.length ?? 0) > 0 ||
          (page.tables?.length ?? 0) > 0,
      ),
    [sourcePages],
  );

  /** 중요: 중복 단어마다 instanceId를 부여해서 입력/채점을 분리 */
  const pageRenderData = useMemo(
    () => buildPageRenderData({ sourcePages, keywordList, isReviewMode }),
    [sourcePages, keywordList, isReviewMode],
  );

  const tokens = useMemo(
    () =>
      pageRenderData.flatMap((page) =>
        getPageRenderTokenEntries(page).map((entry) => entry.token),
      ),
    [pageRenderData],
  );

  const keywordInstances = useMemo(() => {
    const keywordTokens = tokens.filter(
      (t): t is KeywordTokenWithId => t.type === "keyword",
    );
    return buildKeywordInstances(keywordTokens, blankDefs).map((instance) => ({
      ...instance,
      base: instance.base ?? baseInfoByWord.get(instance.word) ?? null,
    }));
  }, [tokens, blankDefs, baseInfoByWord]);
  const keywordOccurrenceOrder = useMemo(
    () =>
      pageRenderData.flatMap((page) =>
        getPageRenderTokenEntries(page)
          .filter(
            (
              entry,
            ): entry is RenderTokenEntry & { token: KeywordTokenWithId } =>
              entry.token.type === "keyword",
          )
          .map((entry) => ({
            instanceId: entry.token.instanceId,
            pageIndex: entry.pageIndex,
            candidateId: entry.candidateId,
            normalizedWord: normalizeBlankWord(entry.token.baseWord),
          })),
      ),
    [pageRenderData],
  );

  useEffect(() => {
    if (!isReviewMode || reviewInitRef.current) return;
    if (keywordInstances.length === 0) return;

    const userAnswers = payload?.user_answers || [];
    let selected: number[] = [];
    const targetCount = Math.min(20, keywordInstances.length);

    if (reviewBlankItems.length > 0) {
      selected = selectReviewKeywordInstanceIds({
        reviewBlankItems,
        keywordOccurrences: keywordOccurrenceOrder,
        targetCount,
      });
    }

    // 1) 저장된 빈칸 정의를 최우선으로 사용
    const savedBlankIdSet = new Set(
      (payload?.blanks ?? []).map((b, idx) =>
        typeof b.id === "number" ? b.id : idx,
      ),
    );
    if (selected.length === 0 && savedBlankIdSet.size > 0) {
      selected = keywordInstances
        .filter((ki) => savedBlankIdSet.has(ki.blankId))
        .map((ki) => ki.instanceId);
    }

    // 2) 레거시 데이터: user_answers 기준 보정
    if (selected.length === 0 && userAnswers.length > 0) {
      const answeredBlankIds = new Set(
        userAnswers
          .map((ans, idx) => (ans && ans.trim() !== "" ? idx : -1))
          .filter((id) => id >= 0),
      );
      selected = keywordInstances
        .filter((ki) => answeredBlankIds.has(ki.blankId))
        .map((ki) => ki.instanceId);
    }

    // 3) 최종 안전장치: 복습은 항상 최대 20개 빈칸 표시
    if (selected.length === 0) {
      selected = keywordInstances
        .slice(0, targetCount)
        .map((ki) => ki.instanceId);
    } else if (selected.length < targetCount) {
      const selectedSet = new Set(selected);
      const supplements = keywordInstances
        .filter((instance) => !selectedSet.has(instance.instanceId))
        .slice(0, targetCount - selected.length)
        .map((instance) => instance.instanceId);
      selected = [...selected, ...supplements];
    } else if (selected.length > targetCount) {
      selected = selected.slice(0, targetCount);
    }

    setSelectedBlanks(selected);
    setSelectionOrder(() => {
      const next: Record<number, number> = {};
      selected.forEach((id, idx) => {
        next[id] = idx;
      });
      return next;
    });
    selectionSeqRef.current = selected.length;
    reviewInitRef.current = true;
  }, [
    isReviewMode,
    keywordInstances,
    keywordOccurrenceOrder,
    payload?.blanks,
    payload?.user_answers,
    reviewBlankItems,
  ]);

  useEffect(() => {
    if (!pendingSelection) return;
    const includeNorm = normalize(pendingSelection.includeWord);
    const excludeNorms = pendingSelection.excludeWords.map((w) => normalize(w));
    const includeIds = keywordInstances
      .filter((ki) => normalize(ki.base?.word ?? ki.word) === includeNorm)
      .map((ki) => ki.instanceId);

    const filtered = selectedBlanks.filter((id) => {
      const inst = keywordInstances.find((ki) => ki.instanceId === id);
      if (!inst) return false;
      return !excludeNorms.includes(normalize(inst.base?.word ?? inst.word));
    });

    const merged = [...filtered];
    includeIds.forEach((id) => {
      if (!merged.includes(id)) merged.push(id);
    });

    setSelectedBlanks(merged);
    setSelectionOrder(() => {
      const next: Record<number, number> = {};
      merged.forEach((id, idx) => {
        next[id] = idx;
      });
      return next;
    });
    selectionSeqRef.current = merged.length;

    setAnswers((prev) => {
      const next: Record<number, string> = {};
      merged.forEach((id) => {
        if (prev[id] != null) next[id] = prev[id];
      });
      return next;
    });

    setPendingSelection(null);
  }, [pendingSelection, keywordInstances, selectedBlanks]);

  const orderedSelectedBlanks = useMemo(() => {
    return [...selectedBlanks].sort((a, b) => {
      const ao = selectionOrder[a] ?? 0;
      const bo = selectionOrder[b] ?? 0;
      return ao - bo;
    });
  }, [selectedBlanks, selectionOrder]);
  const selectedBlankSet = useMemo(
    () => new Set(orderedSelectedBlanks),
    [orderedSelectedBlanks],
  );
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
  const pageCanvasHeight =
    pageCanvasWidth > 0 ? pageCanvasWidth / pageCanvasAspectRatio : 0;

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

  useEffect(() => {
    setDragConfirm(null);
  }, [step]);

  // 설명
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

  // 설명
  const onToggleBlankSelection = (instanceId: number) => {
    if (isReviewMode) return;
    setSelectedBlanks((prev) => {
      const lockedCount =
        currentRound === 1 ? 0 : currentRound === 2 ? round1Count : round2Count;
      const requiredTotal =
        currentRound === 1
          ? round1Count
          : currentRound === 2
            ? round2Count
            : round3Count;
      const existsIndex = prev.indexOf(instanceId);

      if (existsIndex >= 0) {
        // 설명
        if (existsIndex < lockedCount) return prev;
        setSelectionOrder((orderPrev) => {
          const nextOrder = { ...orderPrev };
          delete nextOrder[instanceId];
          return nextOrder;
        });
        return prev.filter((id) => id !== instanceId);
      }

      // 설명
      if (prev.length >= requiredTotal) return prev;

      setSelectionOrder((orderPrev) => {
        if (orderPrev[instanceId] != null) return orderPrev;
        return { ...orderPrev, [instanceId]: selectionSeqRef.current++ };
      });

      return [...prev, instanceId];
    });
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

  const recordTokenLayout = (idx: number) => (event: LayoutChangeEvent) => {
    const { x, y, width, height } = event.nativeEvent.layout;
    tokenLayoutsRef.current[idx] = { x, y, width, height };
  };

  const buildSelectedText = (indices: number[]) => {
    if (indices.length === 0) return "";
    const sorted = [...indices].sort((a, b) => a - b);
    const start = sorted[0];
    const end = sorted[sorted.length - 1];
    let text = "";
    for (let i = start; i <= end; i++) {
      const t = tokens[i];
      if (!t) continue;
      if (t.type === "newline") {
        text += " ";
        continue;
      }
      text += t.value;
    }
    return text.replace(/\s+/g, " ").trim();
  };

  const getSelectionBox = (indices: number[]) => {
    if (indices.length === 0) return null;
    let minX = Number.POSITIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;
    indices.forEach((idx) => {
      const box = tokenLayoutsRef.current[idx];
      if (!box) return;
      minX = Math.min(minX, box.x);
      minY = Math.min(minY, box.y);
      maxX = Math.max(maxX, box.x + box.width);
      maxY = Math.max(maxY, box.y + box.height);
    });
    if (!Number.isFinite(minX)) return null;
    return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
  };

  const applyCustomBlank = (rawText: string) => {
    const trimmed = rawText.replace(/\s+/g, " ").trim();
    if (!trimmed) return;

    const norm = normalize(trimmed);
    const overlapWords = blankDefs
      .filter((b) => {
        const bn = normalize(b.word);
        return norm.includes(bn) || bn.includes(norm);
      })
      .map((b) => b.word);

    const excludeWords = overlapWords.filter((w) => normalize(w) !== norm);
    const filtered = blankDefs.filter(
      (b) => !excludeWords.some((w) => normalize(w) === normalize(b.word)),
    );

    const existing = filtered.find((b) => normalize(b.word) === norm);
    if (existing) {
      setBlankDefsState(filtered);
      setPendingSelection({ includeWord: existing.word, excludeWords });
      return;
    }

    const nextId = filtered.reduce((max, b) => Math.max(max, b.id), -1) + 1;
    const nextBlank: BlankItem = { id: nextId, word: trimmed, meaningLong: "" };
    setBlankDefsState([...filtered, nextBlank]);
    setPendingSelection({ includeWord: trimmed, excludeWords });
  };

  // TODO: 드래그로 빈칸 생성 기능은 임시 비활성화
  // const dragEnabled = step.endsWith('-1') && !reviewQuizId;
  const dragEnabled = false;
  const dragResponder = useMemo(() => {
    if (!dragEnabled) return null;
    return PanResponder.create({
      onStartShouldSetPanResponder: () => dragEnabled,
      onMoveShouldSetPanResponder: (_, g) =>
        dragEnabled && Math.abs(g.dx) + Math.abs(g.dy) > 4,
      onPanResponderGrant: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        setDragConfirm(null);
        setDragSelection(null);
        dragSelectionRef.current = null;
        dragStartRef.current = { x: locationX, y: locationY };
      },
      onPanResponderMove: (evt) => {
        const start = dragStartRef.current;
        if (!start) return;
        const { locationX, locationY } = evt.nativeEvent;
        const left = Math.min(start.x, locationX);
        const right = Math.max(start.x, locationX);
        const top = Math.min(start.y, locationY);
        const bottom = Math.max(start.y, locationY);

        const indices = Object.keys(tokenLayoutsRef.current)
          .map((k) => Number(k))
          .filter((idx) => {
            const box = tokenLayoutsRef.current[idx];
            if (!box) return false;
            const bLeft = box.x;
            const bRight = box.x + box.width;
            const bTop = box.y;
            const bBottom = box.y + box.height;
            return (
              bLeft <= right &&
              bRight >= left &&
              bTop <= bottom &&
              bBottom >= top
            );
          });

        const text = buildSelectedText(indices);
        const box = getSelectionBox(indices);
        if (box && text) {
          const selection = { text, box };
          setDragSelection(selection);
          dragSelectionRef.current = selection;
        } else {
          setDragSelection(null);
          dragSelectionRef.current = null;
        }
      },
      onPanResponderRelease: () => {
        const selection = dragSelectionRef.current;
        if (!selection || !selection.text || !selection.box) {
          setDragSelection(null);
          return;
        }
        setDragConfirm({ text: selection.text, box: selection.box });
        setDragSelection(null);
      },
      onPanResponderTerminate: () => {
        setDragSelection(null);
      },
    });
  }, [dragEnabled, tokens]);

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

  const getStructuredTextMetrics = (block?: LayoutBlock) => {
    if (!block || pageCanvasHeight <= 0) {
      return {
        bodyFontSize: fontScale(11),
        bodyLineHeight: fontScale(14),
        keywordFontSize: fontScale(10),
        keywordLineHeight: fontScale(13),
        horizontalPadding: scale(1),
        marginHorizontal: scale(1),
        borderRadius: scale(2),
      };
    }

    const blockHeightPx = pageCanvasHeight * Math.max(block.height, 0.018);
    const blockWidthPx = pageCanvasWidth * Math.max(block.width, 0.04);
    const bodyFontSize = Math.max(15, Math.min(15, blockHeightPx * 0.58));
    const bodyLineHeight = Math.max(
      bodyFontSize + 2,
      Math.min(18, blockHeightPx * 0.82),
    );
    const keywordFontSize = Math.max(
      9,
      Math.min(bodyFontSize, blockHeightPx * 0.54),
    );
    const keywordLineHeight = Math.max(
      keywordFontSize + 1,
      Math.min(bodyLineHeight, blockHeightPx * 0.76),
    );
    const horizontalPadding = Math.max(
      0,
      Math.min(scale(3), blockWidthPx * 0.012),
    );
    const marginHorizontal = Math.max(
      0,
      Math.min(scale(1), blockWidthPx * 0.004),
    );

    return {
      bodyFontSize,
      bodyLineHeight,
      keywordFontSize,
      keywordLineHeight,
      horizontalPadding,
      marginHorizontal,
      borderRadius: scale(2),
    };
  };

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

  const getCoordinateBlockSections = (sections: PageRenderSection[]) =>
    sections
      .filter((section): section is PageRenderSection & { block: LayoutBlock } => !!section.block)
      .sort((a, b) => {
        const ay = a.block.y + a.block.height / 2;
        const by = b.block.y + b.block.height / 2;
        if (Math.abs(ay - by) > 0.006) return ay - by;
        return a.block.x - b.block.x;
      });

  const buildCoordinateColumns = (
    sections: PageRenderSection[],
    options?: { allowSplitColumns?: boolean },
  ): CoordinateColumn[] => {
    const blockSections = getCoordinateBlockSections(sections);

    if (blockSections.length === 0) return [];

    if (!options?.allowSplitColumns) {
      return [{ key: "coordinate-column-main", sections: blockSections, widthRatio: 1 }];
    }

    const left = blockSections.filter(
      (section) => section.block.x + section.block.width / 2 < 0.5,
    );
    const right = blockSections.filter(
      (section) => section.block.x + section.block.width / 2 >= 0.5,
    );
    const minColumnCount = Math.max(8, Math.floor(blockSections.length * 0.18));
    const crossingCenterCount = blockSections.filter(
      (section) => section.block.x < 0.5 && section.block.x + section.block.width > 0.5,
    ).length;
    const shouldSplitColumns =
      left.length >= minColumnCount &&
      right.length >= minColumnCount &&
      Math.min(left.length, right.length) / Math.max(left.length, right.length) >= 0.22 &&
      crossingCenterCount <= Math.max(2, blockSections.length * 0.04);

    if (!shouldSplitColumns) {
      return [{ key: "coordinate-column-main", sections: blockSections, widthRatio: 1 }];
    }

    return [
      { key: "coordinate-column-left", sections: left, widthRatio: 0.5 },
      { key: "coordinate-column-right", sections: right, widthRatio: 0.5 },
    ];
  };

  const buildCoordinateLines = (
    blockSections: Array<PageRenderSection & { block: LayoutBlock }>,
    containerWidthRatio = 1,
  ) => {
    blockSections.sort((a, b) => {
      const ay = a.block.y + a.block.height / 2;
      const by = b.block.y + b.block.height / 2;
      if (Math.abs(ay - by) > 0.006) return ay - by;
      return a.block.x - b.block.x;
    });

    if (blockSections.length === 0) return [];

    const heights = blockSections
      .map((section) => section.block.height)
      .filter((height) => Number.isFinite(height) && height > 0)
      .sort((a, b) => a - b);
    const medianHeight = heights[Math.floor(heights.length / 2)] ?? 0.02;
    const yThreshold = Math.max(0.012, medianHeight * 0.82);
    const lines: Array<Array<PageRenderSection & { block: LayoutBlock }>> = [];

    blockSections.forEach((section) => {
      const centerY = section.block.y + section.block.height / 2;
      const current = lines[lines.length - 1];
      if (!current || current.length === 0) {
        lines.push([section]);
        return;
      }

      const anchorY =
        current.reduce((sum, item) => sum + item.block.y + item.block.height / 2, 0) /
        current.length;
      if (Math.abs(centerY - anchorY) <= yThreshold) {
        current.push(section);
      } else {
        lines.push([section]);
      }
    });

    const minX = Math.min(...blockSections.map((section) => section.block.x));
    const maxX = Math.max(
      ...blockSections.map((section) => section.block.x + section.block.width),
    );
    const contentWidth = Math.max(maxX - minX, 0.1);

    return lines.map((line, lineIndex) => {
      const ordered = [...line].sort((a, b) => a.block.x - b.block.x);
      const lineMinX = Math.min(...ordered.map((section) => section.block.x));
      const lineMaxX = Math.max(
        ...ordered.map((section) => section.block.x + section.block.width),
      );
      const normalizedX = (lineMinX - minX) / contentWidth;
      const normalizedWidth = (lineMaxX - lineMinX) / contentWidth;
      const blockWidthSum = ordered.reduce((sum, section) => sum + section.block.width, 0);

      return {
        key: `coordinate-line-${lineIndex}`,
        sections: ordered,
        x: clampNumber(normalizedX, 0, 0.18),
        width: clampNumber(normalizedWidth, 0.18, 1),
        containerWidthRatio,
        density: blockWidthSum / Math.max(lineMaxX - lineMinX, 0.02),
      };
    });
  };

  const getCoordinateLineMetrics = (line: CoordinateLine): StructuredTextMetrics => {
    const availableWidth = Math.max(
      pageCanvasWidth * line.containerWidthRatio * line.width,
      scale(220),
    );
    const chars = Math.max(
      line.sections.reduce((sum, section) => sum + (section.block.text ?? "").length, 0),
      1,
    );
    const densityAdjustment =
      line.density > 0.78 ? 0.9 : line.density < 0.38 ? 1.08 : 1;
    const bodyFontSize = clampNumber(
      (availableWidth / Math.max(chars * 0.78, 1)) * densityAdjustment,
      fontScale(11),
      fontScale(15),
    );
    const bodyLineHeight = Math.round(bodyFontSize * 1.55);
    const keywordFontSize = clampNumber(bodyFontSize * 0.94, fontScale(10), fontScale(14));
    const keywordLineHeight = Math.round(keywordFontSize * 1.45);

    return {
      bodyFontSize,
      bodyLineHeight,
      keywordFontSize,
      keywordLineHeight,
      horizontalPadding: scale(4),
      marginHorizontal: 0,
      borderRadius: scale(4),
    };
  };

  const getCoordinateGap = (
    previous: LayoutBlock | undefined,
    current: LayoutBlock,
    line: CoordinateLine,
  ) => {
    if (!previous || pageCanvasWidth <= 0) return 0;
    const rawGap = Math.max(current.x - (previous.x + previous.width), 0);
    const pxGap = rawGap * pageCanvasWidth * line.containerWidthRatio;
    const maxGap = line.density < 0.42 ? scale(8) : scale(12);
    return clampNumber(pxGap, scale(3), maxGap);
  };

  const renderCoordinateColumn = (column: CoordinateColumn) => (
    <View key={column.key} style={styles.coordinateColumn}>
      {buildCoordinateLines(column.sections, column.widthRatio).map(renderCoordinateLine)}
    </View>
  );

  const renderCoordinateLine = (line: CoordinateLine) => {
    const metrics = getCoordinateLineMetrics(line);

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
          const gap = getCoordinateGap(previous, section.block, line);
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
          {dragSelection?.box && flowLayoutRef.current && dragEnabled && (
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
          {dragConfirm?.box && flowLayoutRef.current && dragEnabled && (
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
              onPress={() => {
                applyCustomBlank(dragConfirm.text);
                setDragConfirm(null);
              }}
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


