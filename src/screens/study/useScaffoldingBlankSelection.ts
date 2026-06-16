import { useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from "react";
import type { BlankItemSave } from "../../api/ocr";
import {
  normalizeBlankWord,
  selectReviewKeywordInstanceIds,
  type KeywordInstance,
  type KeywordOccurrence,
} from "./scaffoldingLogic";

type PendingSelection = {
  includeWord: string;
  excludeWords: string[];
};

export function useScaffoldingBlankSelection({
  isReviewMode,
  reviewQuizId,
  payloadKey,
  payloadBlanks,
  userAnswers,
  reviewBlankItems,
  keywordInstances,
  keywordOccurrenceOrder,
  currentRound,
  round1Count,
  round2Count,
  round3Count,
  setAnswers,
}: {
  isReviewMode: boolean;
  reviewQuizId: number | null;
  payloadKey: unknown;
  payloadBlanks: Array<{ id?: number }> | undefined;
  userAnswers: string[] | undefined;
  reviewBlankItems: BlankItemSave[];
  keywordInstances: KeywordInstance[];
  keywordOccurrenceOrder: KeywordOccurrence[];
  currentRound: number;
  round1Count: number;
  round2Count: number;
  round3Count: number;
  setAnswers: Dispatch<SetStateAction<Record<number, string>>>;
}) {
  const [selectedBlanks, setSelectedBlanks] = useState<number[]>([]);
  const [selectionOrder, setSelectionOrder] = useState<Record<number, number>>({});
  const [pendingSelection, setPendingSelection] = useState<PendingSelection | null>(null);
  const selectionSeqRef = useRef(0);
  const reviewInitRef = useRef(false);

  useEffect(() => {
    if (!isReviewMode) return;
    reviewInitRef.current = false;
    setSelectedBlanks([]);
    setSelectionOrder({});
  }, [isReviewMode, reviewQuizId, payloadKey]);

  useEffect(() => {
    if (!isReviewMode || reviewInitRef.current) return;
    if (keywordInstances.length === 0) return;

    const savedUserAnswers = userAnswers || [];
    let selected: number[] = [];
    const targetCount = Math.min(20, keywordInstances.length);

    if (reviewBlankItems.length > 0) {
      selected = selectReviewKeywordInstanceIds({
        reviewBlankItems,
        keywordOccurrences: keywordOccurrenceOrder,
        targetCount,
      });
    }

    const savedBlankIdSet = new Set(
      (payloadBlanks ?? []).map((blank, idx) =>
        typeof blank.id === "number" ? blank.id : idx,
      ),
    );
    if (selected.length === 0 && savedBlankIdSet.size > 0) {
      selected = keywordInstances
        .filter((instance) => savedBlankIdSet.has(instance.blankId))
        .map((instance) => instance.instanceId);
    }

    if (selected.length === 0 && savedUserAnswers.length > 0) {
      const answeredBlankIds = new Set(
        savedUserAnswers
          .map((answer, idx) => (answer && answer.trim() !== "" ? idx : -1))
          .filter((id) => id >= 0),
      );
      selected = keywordInstances
        .filter((instance) => answeredBlankIds.has(instance.blankId))
        .map((instance) => instance.instanceId);
    }

    if (selected.length === 0) {
      selected = keywordInstances
        .slice(0, targetCount)
        .map((instance) => instance.instanceId);
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
    payloadBlanks,
    userAnswers,
    reviewBlankItems,
  ]);

  useEffect(() => {
    if (!pendingSelection) return;
    const includeNorm = normalizeBlankWord(pendingSelection.includeWord);
    const excludeNorms = pendingSelection.excludeWords.map((word) =>
      normalizeBlankWord(word),
    );
    const includeIds = keywordInstances
      .filter(
        (instance) =>
          normalizeBlankWord(instance.base?.word ?? instance.word) === includeNorm,
      )
      .map((instance) => instance.instanceId);

    const filtered = selectedBlanks.filter((id) => {
      const instance = keywordInstances.find((item) => item.instanceId === id);
      if (!instance) return false;
      return !excludeNorms.includes(
        normalizeBlankWord(instance.base?.word ?? instance.word),
      );
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
  }, [pendingSelection, keywordInstances, selectedBlanks, setAnswers]);

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
        if (existsIndex < lockedCount) return prev;
        setSelectionOrder((orderPrev) => {
          const nextOrder = { ...orderPrev };
          delete nextOrder[instanceId];
          return nextOrder;
        });
        return prev.filter((id) => id !== instanceId);
      }

      if (prev.length >= requiredTotal) return prev;

      setSelectionOrder((orderPrev) => {
        if (orderPrev[instanceId] != null) return orderPrev;
        return { ...orderPrev, [instanceId]: selectionSeqRef.current++ };
      });

      return [...prev, instanceId];
    });
  };

  return {
    selectedBlanks,
    orderedSelectedBlanks,
    selectedBlankSet,
    setPendingSelection,
    onToggleBlankSelection,
  };
}
