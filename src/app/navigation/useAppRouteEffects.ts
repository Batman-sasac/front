import { useEffect, type Dispatch, type SetStateAction } from 'react';

import type { OcrUsageResponse } from '../../api/ocr';
import type { AppStep } from '../../navigation/routes';

type UseAppRouteEffectsParams = {
  step: AppStep;
  isSubscribed: boolean;
  progressLoaded: boolean;
  setMonthlyGoal: Dispatch<SetStateAction<number | null>>;
  handleDailyCheckIn: () => Promise<void>;
  loadMyPageStats: () => Promise<void>;
  loadHomeDashboard: (onMonthlyGoalChange: (goal: number) => void) => Promise<void>;
  refreshLeagueLeaderboard: () => Promise<unknown>;
  refreshOcrUsage: () => Promise<OcrUsageResponse | null>;
};

export default function useAppRouteEffects({
  step,
  isSubscribed,
  progressLoaded,
  setMonthlyGoal,
  handleDailyCheckIn,
  loadMyPageStats,
  loadHomeDashboard,
  refreshLeagueLeaderboard,
  refreshOcrUsage,
}: UseAppRouteEffectsParams) {
  useEffect(() => {
    if (step === 'mypage') {
      void loadMyPageStats();
    }
  }, [step]);

  useEffect(() => {
    if (step === 'home' && progressLoaded) {
      handleDailyCheckIn();

      void loadHomeDashboard(setMonthlyGoal);
    }

    if (step === 'league') {
      void refreshLeagueLeaderboard();
    }
  }, [step, progressLoaded]);

  useEffect(() => {
    if (step !== 'home') return;
    void refreshOcrUsage();
  }, [step, isSubscribed]);
}
