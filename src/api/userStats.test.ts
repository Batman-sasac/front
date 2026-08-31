import { describe, expect, test } from "@jest/globals";

import { normalizeUserStats } from "./userStats";

describe("normalizeUserStats", () => {
  test("normalizes legacy aliases used by the backend", () => {
    expect(
      normalizeUserStats({
        data: {
          total_count: "12",
          continuous_days: "3",
          target_count: "20",
          exp: "450",
          plan_status: "SUBSCRIBED",
        },
      }),
    ).toEqual({
      status: "success",
      data: {
        total_learning_count: 12,
        consecutive_days: 3,
        monthly_goal: 20,
        total_points: 450,
        is_subscribed: true,
      },
    });
  });

  test("uses safe defaults for malformed responses", () => {
    expect(normalizeUserStats(null)).toEqual({
      status: "success",
      data: {
        total_learning_count: 0,
        consecutive_days: 0,
        monthly_goal: null,
        total_points: 0,
        is_subscribed: false,
      },
    });
  });
});
