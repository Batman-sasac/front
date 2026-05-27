import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useRef, useState } from 'react';

import { checkAttendanceReward, claimRandomEventReward } from '../api/reward';
import type { RewardType } from '../screens/reward/Reward';
import {
  DEFAULT_WEEK_ATTENDANCE,
  EXP_KEY,
  LAST_ATTENDANCE_KEY,
  LEVEL_KEY,
  MONTHLY_GOAL_KEY,
  STREAK_KEY,
  TYPE_LABEL_KEY,
  WEEK_ATTENDANCE_KEY,
  WEEK_ATTENDANCE_WEEK_KEY,
  getLevelForExp,
  getWeekStartKey,
  getWeekdayIndex,
} from './progress';

type UseLearningProgressParams = {
  onReward: (type: RewardType, xp: number, onClose?: () => void) => void;
  onGoHome: () => void;
  onRefreshRewardData: () => void;
};

const getTodayKey = () => new Date().toISOString().slice(0, 10);
const STREAK_REWARD_XP = 10;

export default function useLearningProgress({
  onReward,
  onGoHome,
  onRefreshRewardData,
}: UseLearningProgressParams) {
  const [typeLabel, setTypeLabel] = useState('');
  const [level, setLevel] = useState(1);
  const [exp, setExp] = useState(0);
  const [monthlyGoal, setMonthlyGoal] = useState<number | null>(null);
  const [streak, setStreak] = useState(0);
  const [lastAttendanceDate, setLastAttendanceDate] = useState<string | null>(null);
  const [weekAttendance, setWeekAttendance] = useState<boolean[]>([
    ...DEFAULT_WEEK_ATTENDANCE,
  ]);
  const [weekAttendanceWeekKey, setWeekAttendanceWeekKey] = useState('');
  const [progressLoaded, setProgressLoaded] = useState(false);
  const progressLoadedRef = useRef(false);

  useEffect(() => {
    const loadProgress = async () => {
      try {
        const [expRaw, levelRaw, lastAttendRaw, streakRaw, weekRaw, weekKeyRaw, monthlyGoalRaw, typeLabelRaw] = await AsyncStorage.multiGet([
          EXP_KEY,
          LEVEL_KEY,
          LAST_ATTENDANCE_KEY,
          STREAK_KEY,
          WEEK_ATTENDANCE_KEY,
          WEEK_ATTENDANCE_WEEK_KEY,
          MONTHLY_GOAL_KEY,
          TYPE_LABEL_KEY,
        ]);

        const expValue = expRaw[1] ? Number(expRaw[1]) : 0;
        const levelValue = levelRaw[1] ? Number(levelRaw[1]) : getLevelForExp(expValue);
        const streakValue = streakRaw[1] ? Number(streakRaw[1]) : 0;
        const storedWeekKey = weekKeyRaw[1] ?? '';
        const currentWeekKey = getWeekStartKey(new Date());
        const parsedWeekValue = weekRaw[1] ? (JSON.parse(weekRaw[1]) as boolean[]) : [...DEFAULT_WEEK_ATTENDANCE];
        const weekValue = storedWeekKey === currentWeekKey
          ? parsedWeekValue
          : [...DEFAULT_WEEK_ATTENDANCE];
        const monthlyGoalValue = monthlyGoalRaw[1] ? Number(monthlyGoalRaw[1]) : null;

        setExp(Number.isFinite(expValue) ? expValue : 0);
        setLevel(Number.isFinite(levelValue) ? levelValue : 1);
        setLastAttendanceDate(lastAttendRaw[1]);
        setStreak(Number.isFinite(streakValue) ? streakValue : 0);
        setWeekAttendance(Array.isArray(weekValue) ? weekValue : [...DEFAULT_WEEK_ATTENDANCE]);
        setWeekAttendanceWeekKey(currentWeekKey);
        setTypeLabel(typeLabelRaw[1] ?? '');
        if (monthlyGoalValue && Number.isFinite(monthlyGoalValue)) {
          setMonthlyGoal(monthlyGoalValue);
        }
      } catch (error) {
        console.error('출석/XP 로드 실패:', error);
      } finally {
        progressLoadedRef.current = true;
        setProgressLoaded(true);
      }
    };

    void loadProgress();
  }, []);

  useEffect(() => {
    if (!progressLoadedRef.current) return;

    AsyncStorage.multiSet([
      [EXP_KEY, String(exp)],
      [LEVEL_KEY, String(level)],
      [LAST_ATTENDANCE_KEY, lastAttendanceDate ?? ''],
      [STREAK_KEY, String(streak)],
      [WEEK_ATTENDANCE_KEY, JSON.stringify(weekAttendance)],
      [WEEK_ATTENDANCE_WEEK_KEY, weekAttendanceWeekKey],
      [MONTHLY_GOAL_KEY, monthlyGoal != null ? String(monthlyGoal) : ''],
      [TYPE_LABEL_KEY, typeLabel],
    ]).catch((error) => {
      console.error('출석/XP 저장 실패:', error);
    });
  }, [exp, level, lastAttendanceDate, streak, weekAttendance, weekAttendanceWeekKey, monthlyGoal, typeLabel]);

  useEffect(() => {
    setLevel(getLevelForExp(exp));
  }, [exp]);

  const hasCheckedInToday = lastAttendanceDate === getTodayKey();

  const handleDailyCheckIn = async () => {
    const today = new Date();
    const todayKey = today.toISOString().slice(0, 10);
    const currentWeekKey = getWeekStartKey(today);

    if (lastAttendanceDate === todayKey) return;

    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    const yesterdayKey = yesterday.toISOString().slice(0, 10);
    const nextStreak = lastAttendanceDate === yesterdayKey ? streak + 1 : 1;

    let baseXP = 10;
    const streakXP = nextStreak >= 2 ? STREAK_REWARD_XP : 0;
    let bonusXP = 0;
    let shouldReward = true;
    let totalPoints: number | null = null;

    try {
      const result = await checkAttendanceReward();
      if (result?.status === 'success') {
        shouldReward = result.is_new_reward;
        baseXP = result.baseXP ?? 0;
        bonusXP = result.bonusXP ?? 0;
        totalPoints = Number.isFinite(Number(result.total_points)) ? Number(result.total_points) : null;
      }
    } catch (error) {
      console.error('출석 보상 API 실패, 로컬 처리로 대체:', error);
    }

    try {
      const randomResult = await claimRandomEventReward();
      if (randomResult.status === 'success' && randomResult.is_new_reward) {
        bonusXP = Number.isFinite(Number(randomResult.reward_amount)) ? Number(randomResult.reward_amount) : 0;
        totalPoints = Number.isFinite(Number(randomResult.total_points)) ? Number(randomResult.total_points) : totalPoints;
      }
    } catch (error) {
      console.error('랜덤 리워드 API 실패:', error);
    }

    setStreak(nextStreak);
    setLastAttendanceDate(todayKey);

    const todayIdx = getWeekdayIndex(today);
    setWeekAttendanceWeekKey(currentWeekKey);
    setWeekAttendance((prev) => {
      const base = weekAttendanceWeekKey === currentWeekKey
        ? [...prev]
        : [...DEFAULT_WEEK_ATTENDANCE];
      const next = [...base];
      next[todayIdx] = true;
      return next;
    });

    if ((shouldReward && baseXP > 0) || bonusXP > 0) {
      if (totalPoints != null) {
        setExp(totalPoints + streakXP);
      } else {
        setExp((prev) => prev + baseXP + streakXP + bonusXP);
      }
      onRefreshRewardData();
      if (shouldReward && baseXP > 0) {
        onReward('attendance', baseXP, () => {
          if (streakXP > 0) {
            onReward('streak', streakXP, () => {
              if (bonusXP > 0) {
                onReward('randomBonus', bonusXP, onGoHome);
                return;
              }
              onGoHome();
            });
            return;
          }
          if (bonusXP > 0) {
            onReward('randomBonus', bonusXP, onGoHome);
            return;
          }
          onGoHome();
        });
        return;
      }

      if (bonusXP > 0) {
        onReward('randomBonus', bonusXP, onGoHome);
      }
    }
  };

  return {
    typeLabel,
    setTypeLabel,
    level,
    setLevel,
    exp,
    setExp,
    monthlyGoal,
    setMonthlyGoal,
    streak,
    setStreak,
    lastAttendanceDate,
    setLastAttendanceDate,
    weekAttendance,
    progressLoaded,
    hasCheckedInToday,
    handleDailyCheckIn,
  };
}
