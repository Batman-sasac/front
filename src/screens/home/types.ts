export type HomeWeeklyGrowth = {
  labels: string[];
  data: number[];
};

export type HomeMonthlyStats = {
  last_month_name: string;
  last_month_count: number;
  this_month_name: string;
  this_month_count: number;
  target_count: number;
  diff: number;
};

export type HomeLeagueUser = { xp: number };
