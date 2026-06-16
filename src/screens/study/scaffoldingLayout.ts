import type { LayoutBlock } from "../../api/ocr";
import { fontScale, scale } from "../../lib/layout";
import type {
  CoordinateColumn,
  CoordinateLine,
  PageRenderSection,
  StructuredTextMetrics,
} from "./scaffoldingRenderData";

export function clampNumber(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export function getStructuredTextMetrics({
  block,
  pageCanvasHeight,
  pageCanvasWidth,
}: {
  block?: LayoutBlock;
  pageCanvasHeight: number;
  pageCanvasWidth: number;
}): StructuredTextMetrics {
  if (!block || pageCanvasHeight <= 0) {
    return {
      bodyFontSize: fontScale(11),
      bodyLineHeight: fontScale(14),
      keywordFontSize: fontScale(10),
      keywordLineHeight: fontScale(13),
      horizontalPadding: scale(1),
      marginHorizontal: scale(1),
      borderRadius: scale(2),
    };
  }

  const blockHeightPx = pageCanvasHeight * Math.max(block.height, 0.018);
  const blockWidthPx = pageCanvasWidth * Math.max(block.width, 0.04);
  const bodyFontSize = Math.max(15, Math.min(15, blockHeightPx * 0.58));
  const bodyLineHeight = Math.max(
    bodyFontSize + 2,
    Math.min(18, blockHeightPx * 0.82),
  );
  const keywordFontSize = Math.max(
    9,
    Math.min(bodyFontSize, blockHeightPx * 0.54),
  );
  const keywordLineHeight = Math.max(
    keywordFontSize + 1,
    Math.min(bodyLineHeight, blockHeightPx * 0.76),
  );
  const horizontalPadding = Math.max(
    0,
    Math.min(scale(3), blockWidthPx * 0.012),
  );
  const marginHorizontal = Math.max(
    0,
    Math.min(scale(1), blockWidthPx * 0.004),
  );

  return {
    bodyFontSize,
    bodyLineHeight,
    keywordFontSize,
    keywordLineHeight,
    horizontalPadding,
    marginHorizontal,
    borderRadius: scale(2),
  };
}

export function getCoordinateBlockSections(sections: PageRenderSection[]) {
  return sections
    .filter((section): section is PageRenderSection & { block: LayoutBlock } => !!section.block)
    .sort((a, b) => {
      const ay = a.block.y + a.block.height / 2;
      const by = b.block.y + b.block.height / 2;
      if (Math.abs(ay - by) > 0.006) return ay - by;
      return a.block.x - b.block.x;
    });
}

export function buildCoordinateColumns(
  sections: PageRenderSection[],
  options?: { allowSplitColumns?: boolean },
): CoordinateColumn[] {
  const blockSections = getCoordinateBlockSections(sections);

  if (blockSections.length === 0) return [];

  if (!options?.allowSplitColumns) {
    return [{ key: "coordinate-column-main", sections: blockSections, widthRatio: 1 }];
  }

  const left = blockSections.filter(
    (section) => section.block.x + section.block.width / 2 < 0.5,
  );
  const right = blockSections.filter(
    (section) => section.block.x + section.block.width / 2 >= 0.5,
  );
  const minColumnCount = Math.max(8, Math.floor(blockSections.length * 0.18));
  const crossingCenterCount = blockSections.filter(
    (section) => section.block.x < 0.5 && section.block.x + section.block.width > 0.5,
  ).length;
  const shouldSplitColumns =
    left.length >= minColumnCount &&
    right.length >= minColumnCount &&
    Math.min(left.length, right.length) / Math.max(left.length, right.length) >= 0.22 &&
    crossingCenterCount <= Math.max(2, blockSections.length * 0.04);

  if (!shouldSplitColumns) {
    return [{ key: "coordinate-column-main", sections: blockSections, widthRatio: 1 }];
  }

  return [
    { key: "coordinate-column-left", sections: left, widthRatio: 0.5 },
    { key: "coordinate-column-right", sections: right, widthRatio: 0.5 },
  ];
}

export function buildCoordinateLines(
  blockSections: Array<PageRenderSection & { block: LayoutBlock }>,
  containerWidthRatio = 1,
) {
  blockSections.sort((a, b) => {
    const ay = a.block.y + a.block.height / 2;
    const by = b.block.y + b.block.height / 2;
    if (Math.abs(ay - by) > 0.006) return ay - by;
    return a.block.x - b.block.x;
  });

  if (blockSections.length === 0) return [];

  const heights = blockSections
    .map((section) => section.block.height)
    .filter((height) => Number.isFinite(height) && height > 0)
    .sort((a, b) => a - b);
  const medianHeight = heights[Math.floor(heights.length / 2)] ?? 0.02;
  const yThreshold = Math.max(0.012, medianHeight * 0.82);
  const lines: Array<Array<PageRenderSection & { block: LayoutBlock }>> = [];

  blockSections.forEach((section) => {
    const centerY = section.block.y + section.block.height / 2;
    const current = lines[lines.length - 1];
    if (!current || current.length === 0) {
      lines.push([section]);
      return;
    }

    const anchorY =
      current.reduce((sum, item) => sum + item.block.y + item.block.height / 2, 0) /
      current.length;
    if (Math.abs(centerY - anchorY) <= yThreshold) {
      current.push(section);
    } else {
      lines.push([section]);
    }
  });

  const minX = Math.min(...blockSections.map((section) => section.block.x));
  const maxX = Math.max(
    ...blockSections.map((section) => section.block.x + section.block.width),
  );
  const contentWidth = Math.max(maxX - minX, 0.1);

  return lines.map((line, lineIndex) => {
    const ordered = [...line].sort((a, b) => a.block.x - b.block.x);
    const lineMinX = Math.min(...ordered.map((section) => section.block.x));
    const lineMaxX = Math.max(
      ...ordered.map((section) => section.block.x + section.block.width),
    );
    const normalizedX = (lineMinX - minX) / contentWidth;
    const normalizedWidth = (lineMaxX - lineMinX) / contentWidth;
    const blockWidthSum = ordered.reduce((sum, section) => sum + section.block.width, 0);

    return {
      key: `coordinate-line-${lineIndex}`,
      sections: ordered,
      x: clampNumber(normalizedX, 0, 0.18),
      width: clampNumber(normalizedWidth, 0.18, 1),
      containerWidthRatio,
      density: blockWidthSum / Math.max(lineMaxX - lineMinX, 0.02),
    };
  });
}

export function getCoordinateLineMetrics({
  line,
  pageCanvasWidth,
}: {
  line: CoordinateLine;
  pageCanvasWidth: number;
}): StructuredTextMetrics {
  const availableWidth = Math.max(
    pageCanvasWidth * line.containerWidthRatio * line.width,
    scale(220),
  );
  const chars = Math.max(
    line.sections.reduce((sum, section) => sum + (section.block.text ?? "").length, 0),
    1,
  );
  const densityAdjustment =
    line.density > 0.78 ? 0.9 : line.density < 0.38 ? 1.08 : 1;
  const bodyFontSize = clampNumber(
    (availableWidth / Math.max(chars * 0.78, 1)) * densityAdjustment,
    fontScale(11),
    fontScale(15),
  );
  const bodyLineHeight = Math.round(bodyFontSize * 1.55);
  const keywordFontSize = clampNumber(bodyFontSize * 0.94, fontScale(10), fontScale(14));
  const keywordLineHeight = Math.round(keywordFontSize * 1.45);

  return {
    bodyFontSize,
    bodyLineHeight,
    keywordFontSize,
    keywordLineHeight,
    horizontalPadding: scale(4),
    marginHorizontal: 0,
    borderRadius: scale(4),
  };
}

export function getCoordinateGap({
  previous,
  current,
  line,
  pageCanvasWidth,
}: {
  previous: LayoutBlock | undefined;
  current: LayoutBlock;
  line: CoordinateLine;
  pageCanvasWidth: number;
}) {
  if (!previous || pageCanvasWidth <= 0) return 0;
  const rawGap = Math.max(current.x - (previous.x + previous.width), 0);
  const pxGap = rawGap * pageCanvasWidth * line.containerWidthRatio;
  const maxGap = line.density < 0.42 ? scale(8) : scale(12);
  return clampNumber(pxGap, scale(3), maxGap);
}
