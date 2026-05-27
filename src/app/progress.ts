export const DEFAULT_WEEK_ATTENDANCE = [
  false,
  false,
  false,
  false,
  false,
  false,
  false,
] as const;

export const EXP_KEY = '@bat_exp';
export const LEVEL_KEY = '@bat_level';
export const LAST_ATTENDANCE_KEY = '@bat_last_attendance_date';
export const STREAK_KEY = '@bat_streak';
export const WEEK_ATTENDANCE_KEY = '@bat_week_attendance';
export const WEEK_ATTENDANCE_WEEK_KEY = '@bat_week_attendance_week';
export const MONTHLY_GOAL_KEY = '@bat_monthly_goal';
export const TYPE_LABEL_KEY = '@bat_type_label';

const LEVEL_THRESHOLDS = [0, 100, 500, 2000, 5000, 10000] as const;

export const getWeekdayIndex = (date: Date) => {
  const jsDay = date.getDay();
  return (jsDay + 6) % 7;
};

export const getWeekStartKey = (date: Date) => {
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  target.setDate(target.getDate() - getWeekdayIndex(target));
  const year = target.getFullYear();
  const month = String(target.getMonth() + 1).padStart(2, '0');
  const day = String(target.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const getLevelForExp = (value: number) => {
  if (value <= LEVEL_THRESHOLDS[1]) return 1;
  if (value <= LEVEL_THRESHOLDS[2]) return 2;
  if (value <= LEVEL_THRESHOLDS[3]) return 3;
  if (value <= LEVEL_THRESHOLDS[4]) return 4;
  return 5;
};
