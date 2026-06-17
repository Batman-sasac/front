import type { Dispatch, SetStateAction } from "react";
import {
  gradeKeywordInstances,
  type KeywordInstance,
} from "../logic/scaffoldingLogic";
import type { GradeState, ScaffoldingStep } from "../logic/scaffoldingTypes";

export function useScaffoldingRoundActions({
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
  showPopup,
}: {
  step: ScaffoldingStep;
  setStep: Dispatch<SetStateAction<ScaffoldingStep>>;
  isReviewMode: boolean;
  orderedSelectedBlanks: number[];
  currentRound: number;
  round1Count: number;
  round2Count: number;
  round3Count: number;
  keywordInstances: KeywordInstance[];
  answers: Record<number, string>;
  graded: Record<number, GradeState>;
  setGraded: Dispatch<SetStateAction<Record<number, GradeState>>>;
  setAnswers: Dispatch<SetStateAction<Record<number, string>>>;
  showPopup: (title: string, message: string, onConfirm?: () => void) => void;
}) {
  const onReselectWords = () => {
    if (isReviewMode) return;
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
      showPopup("복습 불가", "복습할 빈칸을 불러오지 못했습니다.");
      return;
    }
    if (orderedSelectedBlanks.length < requiredTotal) {
      showPopup("알림", `${requiredTotal}개가 아직 설정되지 않았어요!`);
      return;
    }

    if (step === "1-1") setStep("1-2");
    else if (step === "2-1") setStep("2-2");
    else if (step === "3-1") setStep("3-2");
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

  const onMoveToRound2 = () => {
    setAnswers({});
    setStep("2-1");
  };

  const onMoveToRound3 = () => {
    setAnswers({});
    setStep("3-1");
  };

  return {
    onReselectWords,
    onStartLearning,
    onGrade,
    onMoveToRound2,
    onMoveToRound3,
  };
}
