import { useEffect, useState } from "react";
import { Alert } from "react-native";

import { getUserStats } from "../../../api/auth";
import { getMonthlyStats } from "../../../api/ocr";
import {
  getCachedMyPageStats,
  getToken,
  setCachedMyPageStats,
} from "../../../lib/storage";

type UseMyPageStatsParams = {
  totalStudyCount: number;
  continuousDays: number;
  monthlyGoal: number | null;
  onMonthlyGoalChange?: (goal: number) => void;
};

export function useMyPageStats({
  totalStudyCount,
  continuousDays,
  monthlyGoal,
  onMonthlyGoalChange,
}: UseMyPageStatsParams) {
  const [totalStudyCountState, setTotalStudyCountState] =
    useState(totalStudyCount);
  const [continuousDaysState, setContinuousDaysState] =
    useState(continuousDays);
  const [monthlyGoalState, setMonthlyGoalState] = useState<number | null>(
    monthlyGoal,
  );
  const [tempGoal, setTempGoal] = useState(monthlyGoal || 20);
  const [showMonthlyGoalModal, setShowMonthlyGoalModal] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadStats = async () => {
      try {
        const cached = await getCachedMyPageStats();
        if (cached && !cancelled) {
          setTotalStudyCountState(cached.totalStudyCount);
          setContinuousDaysState(cached.continuousDays);
          setMonthlyGoalState(cached.monthlyGoal);
          setTempGoal(cached.monthlyGoal ?? 20);
        }
      } catch (error) {
        console.error("마이페이지 캐시 로드 실패:", error);
      }

      try {
        const token = await getToken();
        if (!token) {
          Alert.alert("오류", "로그인이 필요합니다.");
          return;
        }

        const [stats, monthlyStats] = await Promise.all([
          getUserStats(token),
          getMonthlyStats(),
        ]);
        const monthlyGoalValue =
          stats.data.monthly_goal ?? monthlyStats?.compare?.target_count;
        const fallbackGoal = typeof monthlyGoal === "number" ? monthlyGoal : null;
        const resolvedGoal =
          monthlyGoalValue && monthlyGoalValue > 0
            ? monthlyGoalValue
            : (fallbackGoal ?? monthlyGoalValue);
        const total = Number(stats.data.total_learning_count ?? 0);
        const consecutive = Number(stats.data.consecutive_days ?? 0);
        const resolvedGoalNumber = resolvedGoal ?? 0;

        if (!cancelled) {
          setTotalStudyCountState(total);
          setContinuousDaysState(consecutive);
          setMonthlyGoalState(resolvedGoalNumber);
          setTempGoal(resolvedGoalNumber || 20);
        }

        await setCachedMyPageStats({
          totalStudyCount: total,
          continuousDays: consecutive,
          monthlyGoal: resolvedGoalNumber,
        });
      } catch (error) {
        console.error("계정 정보 로드 실패:", error);
        if (!cancelled) {
          Alert.alert("오류", "계정 정보를 불러오지 못했습니다.");
        }
      }
    };

    void loadStats();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleConfirmMonthlyGoal = () => {
    onMonthlyGoalChange?.(tempGoal);
    setMonthlyGoalState(tempGoal);
    setShowMonthlyGoalModal(false);
  };

  return {
    totalStudyCountState,
    continuousDaysState,
    monthlyGoalState,
    tempGoal,
    setTempGoal,
    showMonthlyGoalModal,
    setShowMonthlyGoalModal,
    handleConfirmMonthlyGoal,
  };
}
