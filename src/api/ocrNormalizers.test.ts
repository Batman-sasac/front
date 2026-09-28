import { describe, expect, test } from "@jest/globals";

import {
  buildFallbackReviewBlankItems,
  normalizePageItem,
  normalizeStoredBlankItem,
} from "./ocrNormalizers";

describe("OCR response normalizers", () => {
  test("keeps valid layout and blank candidates while dropping malformed values", () => {
    const page = normalizePageItem({
      original_text: "alpha beta",
      keywords: [" alpha ", "beta"],
      layout_blocks: [
        { text: "alpha", x: 1, y: 2, width: 3, height: 4 },
        { text: "", x: 1, y: 2, width: 3, height: 4 },
      ],
      blank_candidates: [
        {
          id: "candidate-1",
          text: "alpha",
          page_index: 0,
          x: 1,
          y: 2,
          width: 3,
          height: 4,
        },
        { id: "", text: "beta", page_index: 0, x: 1, y: 2, width: 3, height: 4 },
      ],
    });

    expect(page.keywords).toEqual(["alpha", "beta"]);
    expect(page.layout_blocks).toHaveLength(1);
    expect(page.blank_candidates).toEqual([
      {
        id: "candidate-1",
        text: "alpha",
        page_index: 0,
        x: 1,
        y: 2,
        width: 3,
        height: 4,
      },
    ]);
  });

  test("restores saved references and falls back to matching candidate ids", () => {
    expect(
      normalizeStoredBlankItem(
        { word: "alpha", page_index: 2, candidate_id: "candidate-1" },
        3,
      ),
    ).toEqual({
      blank_index: 3,
      word: "alpha",
      page_index: 2,
      candidate_id: "candidate-1",
    });

    const restored = buildFallbackReviewBlankItems(
      [
        { id: 0, word: " Alpha " },
        { id: 1, word: "alpha" },
      ],
      [
        {
          original_text: "alpha alpha",
          keywords: ["alpha", "alpha"],
          blank_candidates: [
            {
              id: "candidate-1",
              text: "alpha",
              page_index: 0,
              x: 0,
              y: 0,
              width: 10,
              height: 10,
            },
            {
              id: "candidate-2",
              text: "alpha",
              page_index: 0,
              x: 10,
              y: 0,
              width: 10,
              height: 10,
            },
          ],
        },
      ],
    );

    expect(restored.map((item) => item.candidate_id)).toEqual([
      "candidate-1",
      "candidate-2",
    ]);
  });
});
