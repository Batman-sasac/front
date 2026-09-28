import { describe, expect, test } from "@jest/globals";

import {
  buildGradeStudyRequest,
  countCorrectAnswers,
  mergeReviewAnswers,
} from "./scaffoldingStudyData";

describe("scaffolding study data", () => {
  test("counts answers case-insensitively after trimming", () => {
    expect(countCorrectAnswers([" Alpha ", "wrong"], ["alpha", "beta"])).toBe(1);
  });

  test("merges pages, offsets blank references and calculates per-page scores", () => {
    const request = buildGradeStudyRequest({
      parts: {
        0: {
          pages: [{ original_text: "first", keywords: ["alpha"] }],
          blankItems: [
            {
              blank_index: 0,
              word: "alpha",
              page_index: 0,
              candidate_id: "first-alpha",
            },
          ],
          keywords: ["alpha"],
          userAnswers: ["alpha"],
          correctCount: 1,
        },
        1: {
          pages: [{ original_text: "second", keywords: ["beta"] }],
          blankItems: [
            {
              blank_index: 0,
              word: "beta",
              page_index: 0,
              candidate_id: "second-beta",
            },
          ],
          keywords: ["beta"],
          userAnswers: ["wrong"],
          correctCount: 0,
        },
      },
      sourceCount: 2,
      subjectName: "biology",
      fallbackTitle: "fallback",
    });

    expect(request.ocr_text.blanks).toEqual([
      {
        blank_index: 0,
        word: "alpha",
        page_index: 0,
        candidate_id: "first-alpha",
      },
      {
        blank_index: 1,
        word: "beta",
        page_index: 1,
        candidate_id: "second-beta",
      },
    ]);
    expect(request.page_question_counts).toEqual([1, 1]);
    expect(request.page_correct_counts).toEqual([1, 0]);
    expect(request.grade_cnt).toBe(1);
    expect(request.quiz_html).toBe("first\n\nsecond");
  });

  test("merges review answers in page order and rejects missing pages", () => {
    expect(
      mergeReviewAnswers(
        {
          1: { userAnswers: ["second"], correctCount: 0 },
          0: { userAnswers: ["first"], correctCount: 1 },
        },
        2,
      ),
    ).toEqual({ userAnswers: ["first", "second"], correctCount: 1 });
    expect(() =>
      mergeReviewAnswers({ 0: { userAnswers: [], correctCount: 0 } }, 2),
    ).toThrow("2번째 복습 답안이 없어 저장할 수 없습니다.");
  });
});
