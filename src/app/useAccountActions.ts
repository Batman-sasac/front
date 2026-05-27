import type { Dispatch, SetStateAction } from 'react';

import type { ResultStats } from '../data/learningTypeTest';
import type { AppStep } from '../navigation/routes';

type UseAccountActionsParams = {
  resetAuthIdentity: () => void;
  setTypeResult: Dispatch<SetStateAction<ResultStats | null>>;
  setLevel: Dispatch<SetStateAction<number>>;
  setExp: Dispatch<SetStateAction<number>>;
  setMonthlyGoal: Dispatch<SetStateAction<number | null>>;
  setStreak: Dispatch<SetStateAction<number>>;
  setLastAttendanceDate: Dispatch<SetStateAction<string | null>>;
  resetStudyInputState: () => void;
  resetBatchEarnedXp: () => void;
  setIsReviewMode: Dispatch<SetStateAction<boolean>>;
  setReviewQuizId: Dispatch<SetStateAction<number | null>>;
  clearTypeLabel: () => Promise<void>;
  setStep: (step: AppStep) => void;
};

export default function useAccountActions({
  resetAuthIdentity,
  setTypeResult,
  setLevel,
  setExp,
  setMonthlyGoal,
  setStreak,
  setLastAttendanceDate,
  resetStudyInputState,
  resetBatchEarnedXp,
  setIsReviewMode,
  setReviewQuizId,
  clearTypeLabel,
  setStep,
}: UseAccountActionsParams) {
  const handleWithdraw = () => {
    // 모든 상태 초기화
    resetAuthIdentity();
    setTypeResult(null);
    setLevel(1);
    setExp(0);
    setMonthlyGoal(null);
    setStreak(0);
    setLastAttendanceDate(null);
    resetStudyInputState();
    resetBatchEarnedXp();
    setIsReviewMode(false);
    setReviewQuizId(null);
    void clearTypeLabel();

    // 로그인 화면으로 이동
    setStep('login');
  };

  return {
    handleWithdraw,
  };
}
