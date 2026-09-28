import { describe, expect, test } from "@jest/globals";

import {
  changeNotificationTime,
  parseRemindTime,
  to24HourString,
} from "./notificationTime";

describe("notification time", () => {
  test("parses 24-hour server time and floors minutes to five-minute steps", () => {
    expect(parseRemindTime("00:59:00")).toEqual({
      ampm: "오전",
      hour: 12,
      minute: 55,
    });
    expect(parseRemindTime("19:32")).toEqual({
      ampm: "오후",
      hour: 7,
      minute: 30,
    });
  });

  test("serializes noon and midnight without changing the API shape", () => {
    expect(to24HourString({ ampm: "오전", hour: 12, minute: 5 })).toBe(
      "00:05",
    );
    expect(to24HourString({ ampm: "오후", hour: 12, minute: 5 })).toBe(
      "12:05",
    );
  });

  test("wraps picker hour and minute values", () => {
    expect(
      changeNotificationTime(
        { ampm: "오후", hour: 12, minute: 55 },
        "hour",
        1,
      ).hour,
    ).toBe(1);
    expect(
      changeNotificationTime(
        { ampm: "오후", hour: 12, minute: 55 },
        "minute",
        5,
      ).minute,
    ).toBe(0);
  });
});
