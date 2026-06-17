import { useMemo } from "react";
import type { ScaffoldingStep } from "../logic/scaffoldingTypes";

export function useScaffoldingSelectionLimits({
  step,
  keywordCount,
}: {
  step: ScaffoldingStep;
  keywordCount: number;
}) {
  return useMemo(() => {
    const totalKeywordCount = Math.min(20, keywordCount);
    const currentRound = step.startsWith("2-")
      ? 2
      : step.startsWith("3-")
        ? 3
        : 1;

    return {
      currentRound,
      round1Count: Math.min(5, totalKeywordCount),
      round2Count: Math.min(12, totalKeywordCount),
      round3Count: Math.min(20, totalKeywordCount),
    };
  }, [keywordCount, step]);
}
