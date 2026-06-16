import { useMemo } from "react";
import type { GradeState, ScaffoldingStep } from "./scaffoldingTypes";

export function useScaffoldingProgress({
  step,
  keywordCount,
  orderedSelectedBlanks,
  graded,
  currentStudyIndex,
  totalStudyCount,
}: {
  step: ScaffoldingStep;
  keywordCount: number;
  orderedSelectedBlanks: number[];
  graded: Record<number, GradeState>;
  currentStudyIndex: number;
  totalStudyCount: number;
}) {
  const totalKeywordCount = Math.min(20, keywordCount);
  const totalBars = 20;
  const round1Count = Math.min(5, totalKeywordCount);
  const round2Count = Math.min(12, totalKeywordCount);
  const round3Count = Math.min(20, totalKeywordCount);

  const currentRound = useMemo(() => {
    if (step.startsWith("1-")) return 1;
    if (step.startsWith("2-")) return 2;
    if (step.startsWith("3-")) return 3;
    return 1;
  }, [step]);

  const requiredSelectCount = useMemo(() => {
    if (currentRound === 1) return round1Count;
    if (currentRound === 2) return 7;
    return 8;
  }, [currentRound, round1Count]);

  const correctCount = useMemo(() => {
    return orderedSelectedBlanks.reduce((acc, instanceId) => {
      return graded[instanceId] === "correct" ? acc + 1 : acc;
    }, 0);
  }, [orderedSelectedBlanks, graded]);

  const barStates: GradeState[] = useMemo(() => {
    const arr: GradeState[] = Array.from({ length: totalBars }, () => "idle");
    const isFinalStep = step.endsWith("-3");
    if (!isFinalStep) return arr;

    orderedSelectedBlanks.slice(0, totalBars).forEach((instanceId, idx) => {
      arr[idx] = graded[instanceId] ?? "idle";
    });
    return arr;
  }, [orderedSelectedBlanks, graded, step]);

  const roundLabel = useMemo(() => {
    const [round, substep] = step.split("-");
    const label =
      substep === "1"
        ? "단어 확인"
        : substep === "2"
          ? "빈칸 학습"
          : "학습 채점";
    return `Round ${round} - ${label}`;
  }, [step]);

  const safeTotalStudyCount = Math.max(totalStudyCount, 1);
  const safeCurrentStudyIndex = Math.min(
    Math.max(currentStudyIndex, 0),
    safeTotalStudyCount - 1,
  );
  const pageIndicatorLabel = `${safeCurrentStudyIndex + 1}/${safeTotalStudyCount}`;

  return {
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
  };
}
