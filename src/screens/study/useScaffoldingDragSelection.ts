import { useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { PanResponder, type LayoutChangeEvent } from "react-native";
import type { BlankItem } from "./scaffoldingTypes";
import { normalizeBlankWord } from "./scaffoldingLogic";
import type { RenderToken } from "./scaffoldingRenderData";

type SelectionBox = { x: number; y: number; w: number; h: number };
type DragSelection = {
  text: string;
  box: SelectionBox;
};

export function useScaffoldingDragSelection({
  step,
  tokens,
  blankDefs,
  setBlankDefs,
  setPendingSelection,
}: {
  step: string;
  tokens: RenderToken[];
  blankDefs: BlankItem[];
  setBlankDefs: Dispatch<SetStateAction<BlankItem[]>>;
  setPendingSelection: (selection: { includeWord: string; excludeWords: string[] }) => void;
}) {
  const [dragConfirm, setDragConfirm] = useState<DragSelection | null>(null);
  const [dragSelection, setDragSelection] = useState<DragSelection | null>(null);
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
  const dragSelectionRef = useRef<DragSelection | null>(null);

  useEffect(() => {
    setDragConfirm(null);
  }, [step]);

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
      const token = tokens[i];
      if (!token) continue;
      if (token.type === "newline") {
        text += " ";
        continue;
      }
      text += token.value;
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

    const norm = normalizeBlankWord(trimmed);
    const overlapWords = blankDefs
      .filter((blank) => {
        const blankNorm = normalizeBlankWord(blank.word);
        return norm.includes(blankNorm) || blankNorm.includes(norm);
      })
      .map((blank) => blank.word);

    const excludeWords = overlapWords.filter((word) => normalizeBlankWord(word) !== norm);
    const filtered = blankDefs.filter(
      (blank) =>
        !excludeWords.some((word) => normalizeBlankWord(word) === normalizeBlankWord(blank.word)),
    );

    const existing = filtered.find((blank) => normalizeBlankWord(blank.word) === norm);
    if (existing) {
      setBlankDefs(filtered);
      setPendingSelection({ includeWord: existing.word, excludeWords });
      return;
    }

    const nextId = filtered.reduce((max, blank) => Math.max(max, blank.id), -1) + 1;
    const nextBlank: BlankItem = { id: nextId, word: trimmed, meaningLong: "" };
    setBlankDefs([...filtered, nextBlank]);
    setPendingSelection({ includeWord: trimmed, excludeWords });
  };

  const confirmDragSelection = () => {
    if (!dragConfirm?.text) return;
    applyCustomBlank(dragConfirm.text);
    setDragConfirm(null);
  };

  // TODO: 드래그로 빈칸 생성 기능은 임시 비활성화
  // const dragEnabled = step.endsWith("-1") && !reviewQuizId;
  const dragEnabled = false;
  const dragResponder = useMemo(() => {
    if (!dragEnabled) return null;
    return PanResponder.create({
      onStartShouldSetPanResponder: () => dragEnabled,
      onMoveShouldSetPanResponder: (_, gesture) =>
        dragEnabled && Math.abs(gesture.dx) + Math.abs(gesture.dy) > 4,
      onPanResponderGrant: (event) => {
        const { locationX, locationY } = event.nativeEvent;
        setDragConfirm(null);
        setDragSelection(null);
        dragSelectionRef.current = null;
        dragStartRef.current = { x: locationX, y: locationY };
      },
      onPanResponderMove: (event) => {
        const start = dragStartRef.current;
        if (!start) return;
        const { locationX, locationY } = event.nativeEvent;
        const left = Math.min(start.x, locationX);
        const right = Math.max(start.x, locationX);
        const top = Math.min(start.y, locationY);
        const bottom = Math.max(start.y, locationY);

        const indices = Object.keys(tokenLayoutsRef.current)
          .map((key) => Number(key))
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

  return {
    flowLayoutRef,
    recordTokenLayout,
    dragConfirm,
    dragSelection,
    dragResponder,
    confirmDragSelection,
  };
}
