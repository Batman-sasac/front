import { useState } from 'react';

import { getHomeStats } from '../api/auth';
import {
  getMonthlyStats,
  getWeeklyGrowth,
  type MonthlyStatsResponse,
  type WeeklyGrowthResponse,
} from '../api/ocr';
import { getMyRewardRank, getRewardLeaderboard } from '../api/reward';
import { getToken } from '../lib/storage';
import type { LeagueTier, LeagueUser } from '../screens/league/LeagueScreen';

type MonthlyCompareStats = MonthlyStatsResponse['compare'];

export default function useHomeDashboardData() {
  const [myRewardRank, setMyRewardRank] = useState<number | null>(null);
  const [myRewardTotal, setMyRewardTotal] = useState<number | null>(null);
  const [totalStudyCount, setTotalStudyCount] = useState(0);
  const [continuousDays, setContinuousDays] = useState(0);
  const [leagueUsers, setLeagueUsers] = useState<LeagueUser[]>([]);
  const [weeklyGrowth, setWeeklyGrowth] = useState<WeeklyGrowthResponse | undefined>();
  const [monthlyStats, setMonthlyStats] = useState<MonthlyCompareStats | undefined>();

  const currentLeagueTier: LeagueTier = 'iron';
  const leagueRemainingText = '';

  const refreshLeagueLeaderboard = async () => {
    try {
      const response = await getRewardLeaderboard();
      if (response.status !== 'success' || !response.leaderboard) {
        return null;
      }

      const users: LeagueUser[] = response.leaderboard.map((item, idx) => ({
        id: `user_${idx}`,
        nickname: item.nickname,
        xp: item.total_reward,
      }));
      setLeagueUsers(users);
      return users;
    } catch (error) {
      console.error('리그 데이터 로드 실패:', error);
      return null;
    }
  };

  const refreshMyRewardRank = async () => {
    try {
      const response = await getMyRewardRank();
      if (response.status !== 'success') {
        return null;
      }

      setMyRewardRank(response.rank);
      setMyRewardTotal(response.total_reward);
      return response;
    } catch (error) {
      console.error('내 리그 순위 로드 실패:', error);
      return null;
    }
  };

  const loadMyPageStats = async () => {
    try {
      const stats = await getMonthlyStats();
      setTotalStudyCount(stats.compare?.this_month_count || 0);
      setContinuousDays(stats.compare?.diff || 0);
    } catch (error) {
      console.error('학습 통계 불러오기 실패:', error);
    }
  };

  const loadHomeDashboard = async (onMonthlyGoalChange: (goal: number) => void) => {
    try {
      const token = await getToken();
      const [weekly, monthly, homeStats, rank, leaderboard] = await Promise.all([
        getWeeklyGrowth(),
        getMonthlyStats(),
        token ? getHomeStats(token).catch(() => null) : Promise.resolve(null),
        token ? getMyRewardRank().catch(() => null) : Promise.resolve(null),
        token ? getRewardLeaderboard().catch(() => null) : Promise.resolve(null),
      ]);

      setWeeklyGrowth(weekly);

      if (rank?.status === 'success') {
        setMyRewardRank(rank.rank);
        setMyRewardTotal(rank.total_reward);
      }

      if (leaderboard?.status === 'success' && leaderboard.leaderboard) {
        setLeagueUsers(leaderboard.leaderboard.map((item, idx) => ({
          id: `user_${idx}`,
          nickname: item.nickname,
          xp: item.total_reward,
        })));
      }

      const compare = monthly.compare ?? {};
      setMonthlyStats({
        ...compare,
        this_month_count: homeStats?.data?.this_month_count ?? compare.this_month_count ?? 0,
      });

      if (homeStats?.data?.monthly_goal != null && homeStats.data.monthly_goal > 0) {
        onMonthlyGoalChange(homeStats.data.monthly_goal);
      } else if (compare?.target_count > 0) {
        onMonthlyGoalChange(compare.target_count);
      }
    } catch (error) {
      console.error('통계 데이터 로드 실패:', error);
    }
  };

  return {
    myRewardRank,
    myRewardTotal,
    totalStudyCount,
    continuousDays,
    leagueUsers,
    weeklyGrowth,
    monthlyStats,
    currentLeagueTier,
    leagueRemainingText,
    refreshLeagueLeaderboard,
    refreshMyRewardRank,
    loadMyPageStats,
    loadHomeDashboard,
  };
}
