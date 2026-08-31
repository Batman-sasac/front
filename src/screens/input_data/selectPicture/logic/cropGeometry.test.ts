import { describe, expect, test } from "@jest/globals";

import {
  getCropOverlayLayout,
  getDisplayRect,
  getPixelCrop,
} from "./cropGeometry";

describe("select picture crop geometry", () => {
  test("fits a landscape image inside the preview while preserving its ratio", () => {
    expect(getDisplayRect(500, 400, 1000, 500)).toEqual({
      dx: 0,
      dy: 75,
      dw: 500,
      dh: 250,
    });
  });

  test("converts a display crop into original image pixels", () => {
    expect(
      getPixelCrop(
        { dx: 0, dy: 75, dw: 500, dh: 250 },
        { x: 50, y: 100, w: 200, h: 100 },
        1000,
        500,
      ),
    ).toEqual({ px: 100, py: 50, pw: 400, ph: 200 });
  });

  test("clamps the crop overlay to the preview bounds", () => {
    expect(
      getCropOverlayLayout(
        { x: -10, y: 20, w: 550, h: 500 },
        500,
        400,
      ),
    ).toEqual({
      top: { height: 20 },
      bottom: { top: 400, height: 0 },
      left: { top: 20, height: 380, width: 0 },
      right: { left: 500, top: 20, height: 380, width: 0 },
      frame: { left: 0, top: 20, width: 500, height: 380 },
    });
  });
});
