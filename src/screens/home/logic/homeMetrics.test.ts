import { describe, expect, test } from "@jest/globals";

import {
  getLeagueSummary,
  getLevelProgress,
  getWeeklyGrowthMessage,
} from "./homeMetrics";

describe("home metrics", () => {
  test("clamps experience to the current level range", () => {
    expect(getLevelProgress(2, 900)).toEqual({
      min: 100,
      max: 500,
      clampedExp: 500,
      progress: 1,
    });
  });

  test("uses the nearest higher league XP for the rank-up message", () => {
    expect(
      getLeagueSummary(3, 100, [{ xp: 80 }, { xp: 150 }, { xp: 120 }]),
    ).toEqual({ displayRank: 3, subText: "21XP만 획득하면 순위 UP!" });
  });

  test("preserves growth and decrease copy", () => {
    expect(getWeeklyGrowthMessage([10, 15])).toBe(
      " 이번주, 지난주보다 50% 성장했어요!",
    );
    expect(getWeeklyGrowthMessage([10, 8])).toContain("20% 감소");
  });
});
