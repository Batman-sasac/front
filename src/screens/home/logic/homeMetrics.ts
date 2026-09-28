import type { HomeLeagueUser, HomeMonthlyStats } from "../types";

const LEVEL_THRESHOLDS = [0, 100, 500, 2000, 5000, 10000];

export function getLevelProgress(level: number, exp: number) {
  const thresholdIndex = Math.min(Math.max(level, 1), 5) - 1;
  const min = LEVEL_THRESHOLDS[thresholdIndex];
  const max =
    LEVEL_THRESHOLDS[
      Math.min(thresholdIndex + 1, LEVEL_THRESHOLDS.length - 1)
    ];
  const clampedExp = Math.max(min, Math.min(exp, max));
  const expNeeded = Math.max(max - min, 1);
  const progress = max === min ? 1 : Math.min((clampedExp - min) / expNeeded, 1);

  return { min, max, clampedExp, progress };
}

export function getLeagueSummary(
  rewardRank: number | null | undefined,
  rewardTotal: number | null | undefined,
  leagueUsers: HomeLeagueUser[],
) {
  const displayRank =
    typeof rewardRank === "number" && Number.isFinite(rewardRank)
      ? rewardRank
      : 5;

  if (displayRank <= 1) {
    return { displayRank, subText: "와 리그 1등이에요!" };
  }
  if (rewardTotal == null) {
    return { displayRank, subText: "학습하면 순위를 올릴 수 있어요!" };
  }

  const nextHigherUser = leagueUsers
    .filter((user) => user.xp > rewardTotal)
    .sort((left, right) => left.xp - right.xp)[0];
  if (!nextHigherUser) {
    return { displayRank, subText: "학습하면 순위를 올릴 수 있어요!" };
  }

  const xpToRankUp = Math.max(nextHigherUser.xp - rewardTotal + 1, 1);
  return {
    displayRank,
    subText: `${xpToRankUp}XP만 획득하면 순위 UP!`,
  };
}

export function getWeeklyGrowthMessage(data: number[]) {
  if (data.length < 2) return null;
  const thisWeek = data[data.length - 1] || 0;
  const lastWeek = data[data.length - 2] || 0;
  const growthPercent =
    lastWeek > 0
      ? Math.round(((thisWeek - lastWeek) / lastWeek) * 100)
      : 0;

  return growthPercent >= 0
    ? ` 이번주, 지난주보다 ${growthPercent}% 성장했어요!`
    : ` 이번주 지난주보다 ${Math.abs(growthPercent)}% 감소했어요. 조금만 더 힘내요! ✊`;
}

export function getWeeklyChartPoints(
  data: number[],
  graphWidth: number,
  graphHeight: number,
) {
  const maxValue = Math.max(...data, 1);
  const svgWidth = Math.max(graphWidth, 320);
  const paddingLeft = 20;
  const paddingRight = 20;
  const pointRadius = 4;
  const labelOffset = 12;
  const labelTopPadding = 18;
  const paddingTop = labelTopPadding + labelOffset + pointRadius + 4;
  const paddingBottom = 20;
  const chartWidth = Math.max(svgWidth - (paddingLeft + paddingRight), 1);
  const chartHeight = Math.max(graphHeight - (paddingTop + paddingBottom), 1);
  const pointSpacing = chartWidth / Math.max(data.length - 1, 1);

  return data.map((value, index) => ({
    x: paddingLeft + index * pointSpacing,
    y: Math.max(
      paddingTop,
      graphHeight - paddingBottom - (value / maxValue) * chartHeight,
    ),
    value,
  }));
}

export function getAccuracyAttendanceRate(
  monthlyStats: HomeMonthlyStats,
  weeklyData: number[],
) {
  return (
    Math.round(
      (monthlyStats.this_month_count || 0) *
        (weeklyData[weeklyData.length - 1] || 0),
    ) / 100
  );
}

export function getMondayBasedTodayIndex(date = new Date()) {
  return (date.getDay() + 6) % 7;
}
