import { describe, expect, test } from "@jest/globals";

import { buildBrushupSubjects, mapReviewCardItems } from "./reviewCards";

describe("brushup review cards", () => {
  test("maps API cards and calculates elapsed days", () => {
    expect(
      mapReviewCardItems(
        [
          {
            id: 3,
            study_name: "영단어",
            subject_name: "영어",
            ocr_preview: "preview",
            created_at: "2026-08-28T00:00:00.000Z",
          },
        ],
        new Date("2026-08-31T00:00:00.000Z"),
      ),
    ).toEqual([
      {
        id: "3",
        title: "영단어",
        subject: "영어",
        description: "preview",
        progress: 100,
        daysAgo: 3,
        quiz_id: 3,
      },
    ]);
  });

  test("shows custom categories only when a loaded card uses them", () => {
    const subjects = buildBrushupSubjects(
      [
        {
          id: "1",
          title: "헌법",
          subject: "행정법",
          description: "",
          progress: 100,
          daysAgo: 0,
          quiz_id: 1,
        },
      ],
      ["행정법", "회계"],
    );

    expect(subjects.some((subject) => subject.name === "행정법")).toBe(true);
    expect(subjects.some((subject) => subject.name === "회계")).toBe(false);
  });
});
