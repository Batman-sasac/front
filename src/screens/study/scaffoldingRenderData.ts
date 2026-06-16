import type { BlankCandidate, LayoutBlock, PageItem } from "../../api/ocr";
import { normalizeBlankWord } from "./scaffoldingLogic";
import { tokenizeWithKeywords } from "./tokenizeKeywords";

/** Tokenize */
type TextToken = { type: "text"; value: string };
type SpaceToken = { type: "space"; value: string };
type NewlineToken = { type: "newline"; value: "\n" };
type KeywordToken = {
  type: "keyword";
  value: string;
  occ: number;
  baseWord: string;
};

type Token = TextToken | SpaceToken | NewlineToken | KeywordToken;
export type KeywordTokenWithId = KeywordToken & { instanceId: number };
export type RenderToken = TextToken | SpaceToken | NewlineToken | KeywordTokenWithId;
export type RenderTokenEntry = {
  key: string;
  globalIndex: number;
  pageIndex: number;
  candidateId?: string;
  token: RenderToken;
};
export type StructuredTextMetrics = {
  bodyFontSize: number;
  bodyLineHeight: number;
  keywordFontSize: number;
  keywordLineHeight: number;
  horizontalPadding: number;
  marginHorizontal: number;
  borderRadius: number;
};
export type PageRenderSection = {
  key: string;
  block?: LayoutBlock;
  blankCandidate?: BlankCandidate;
  tokenEntries: RenderTokenEntry[];
};
type PageRenderTableCell = {
  key: string;
  tokenEntries: RenderTokenEntry[];
};
export type PageRenderTable = {
  key: string;
  rows: PageRenderTableCell[][];
};
export type PageRenderPage = {
  pageIndex: number;
  page: PageItem;
  sections: PageRenderSection[];
  tables: PageRenderTable[];
  hasLayoutBlocks: boolean;
};

export function getPageRenderTokenEntries(page: PageRenderPage) {
  return [
    ...page.sections.flatMap((section) => section.tokenEntries),
    ...page.tables.flatMap((table) =>
      table.rows.flatMap((row) =>
        row.flatMap((cell) => cell.tokenEntries),
      ),
    ),
  ];
}

function buildTableCandidateId({
  tableIndex,
  rowIndex,
  colIndex,
  tokenIndex,
}: {
  tableIndex: number;
  rowIndex: number;
  colIndex: number;
  tokenIndex: number;
}) {
  return `table-${tableIndex}-${rowIndex}-${colIndex}-${tokenIndex}`;
}

export type CoordinateLine = {
  key: string;
  sections: Array<PageRenderSection & { block: LayoutBlock }>;
  x: number;
  width: number;
  containerWidthRatio: number;
  density: number;
};
export type CoordinateColumn = {
  key: string;
  sections: Array<PageRenderSection & { block: LayoutBlock }>;
  widthRatio: number;
};

/**
 * keyword가 text의 pos 위치에서 시작하는지 확인.
 * OCR 단어 중간에 공백이 끼는 경우("연 구")를 매칭하기 위해 텍스트의 공백을 건너뛰며 비교.
 * 반환: 매칭 시 원문 기준 길이(공백 포함), 아니면 0.
 */
export function normalize(s: string) {
  return normalizeBlankWord(s);
}

export function buildPageRenderData({
  sourcePages,
  keywordList,
  isReviewMode,
}: {
  sourcePages: PageItem[];
  keywordList: string[];
  isReviewMode: boolean;
}): PageRenderPage[] {
let nextInstanceId = 1;
let nextTokenIndex = 0;

return sourcePages.map((page, pageIndex) => {
  const allPageCandidates = page.blank_candidates ?? [];
  const pageKeywords =
    isReviewMode
      ? keywordList
      : page.keywords?.length
        ? page.keywords
        : keywordList;
  const blankCandidateByText = new Map<string, BlankCandidate>(
    allPageCandidates.map(
      (candidate) =>
        [normalizeBlankWord(candidate.text), candidate] as const,
    ),
  );
  const findBlockCandidate = (block: LayoutBlock, fallbackIndex: number) => {
    const blockText = normalizeBlankWord(block.text ?? "");
    const matchedCandidates = allPageCandidates.filter(
      (candidate) => normalizeBlankWord(candidate.text) === blockText,
    );

    if (matchedCandidates.length === 0) {
      return allPageCandidates[fallbackIndex];
    }

    const blockCenterX = block.x + block.width / 2;
    const blockCenterY = block.y + block.height / 2;
    return matchedCandidates
      .map((candidate) => {
        const candidateCenterX = candidate.x + candidate.width / 2;
        const candidateCenterY = candidate.y + candidate.height / 2;
        return {
          candidate,
          distance:
            Math.abs(candidateCenterX - blockCenterX) +
            Math.abs(candidateCenterY - blockCenterY),
        };
      })
      .sort((a, b) => a.distance - b.distance)[0]?.candidate;
  };
  const sectionsSource =
    page.layout_blocks && page.layout_blocks.length > 0
      ? page.layout_blocks.map((block, blockIndex) => ({
        key: `page-${pageIndex}-block-${blockIndex}`,
        block,
        text: block.text ?? "",
        blankCandidate:
          findBlockCandidate(block, blockIndex) ??
          blankCandidateByText.get(normalizeBlankWord(block.text ?? "")),
      }))
      : [
        {
          key: `page-${pageIndex}-flow`,
          block: undefined,
          text: page.original_text ?? "",
          blankCandidate: undefined,
        },
      ];

  const sections = sectionsSource.map((section) => {
    const rawTokens = tokenizeWithKeywords(section.text, pageKeywords);
    const tokenEntries = rawTokens.map((token) => {
      const renderToken: RenderToken =
        token.type === "keyword"
          ? { ...token, instanceId: nextInstanceId++ }
          : token;

      return {
        key: `${section.key}-token-${nextTokenIndex}`,
        globalIndex: nextTokenIndex++,
        pageIndex,
        candidateId:
          token.type === "keyword" ? section.blankCandidate?.id : undefined,
        token: renderToken,
      };
    });

    return {
      key: section.key,
      block: section.block,
      blankCandidate: section.blankCandidate,
      tokenEntries,
    };
  });
  const tables = (page.tables ?? []).map((table, tableIndex) => ({
    key: `page-${pageIndex}-table-${tableIndex}`,
    rows: table.rows.map((row, rowIndex) =>
      row.map((cell, colIndex) => {
        const tokenEntries = tokenizeWithKeywords(cell, pageKeywords).map(
          (token, tokenIndex) => {
            const renderToken: RenderToken =
              token.type === "keyword"
                ? { ...token, instanceId: nextInstanceId++ }
                : token;

            return {
              key: `page-${pageIndex}-table-${tableIndex}-row-${rowIndex}-cell-${colIndex}-token-${nextTokenIndex}`,
              globalIndex: nextTokenIndex++,
              pageIndex,
              candidateId:
                token.type === "keyword"
                  ? buildTableCandidateId({
                    tableIndex,
                    rowIndex,
                    colIndex,
                    tokenIndex,
                  })
                  : undefined,
              token: renderToken,
            };
          },
        );

        return {
          key: `page-${pageIndex}-table-${tableIndex}-row-${rowIndex}-cell-${colIndex}`,
          tokenEntries,
        };
      }),
    ),
  }));

  return {
    pageIndex,
    page,
    sections,
    tables,
    hasLayoutBlocks: (page.layout_blocks?.length ?? 0) > 0,
  };
});
}
