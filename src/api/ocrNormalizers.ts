import type {
  BlankCandidate,
  BlankItem,
  BlankItemSave,
  LayoutBlock,
  OcrTableBlock,
  PageItem,
} from "./ocrTypes";

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizeOcrTables(raw: unknown): OcrTableBlock[] | undefined {
  if (!Array.isArray(raw) || raw.length === 0) return undefined;
  const tables: OcrTableBlock[] = [];
  for (const table of raw) {
    if (!isRecord(table) || !Array.isArray(table.rows) || table.rows.length === 0) {
      continue;
    }
    const rows = table.rows.map((row) =>
      Array.isArray(row) ? row.map((cell) => String(cell ?? "")) : [],
    );
    if (rows.some((row) => row.length > 0)) tables.push({ rows });
  }
  return tables.length > 0 ? tables : undefined;
}

function normalizeLayoutBlocks(raw: unknown): LayoutBlock[] | undefined {
  if (!Array.isArray(raw) || raw.length === 0) return undefined;
  const blocks: LayoutBlock[] = [];
  for (const block of raw) {
    if (!isRecord(block)) continue;
    const text = String(block.text ?? "").trim();
    const x = Number(block.x);
    const y = Number(block.y);
    const width = Number(block.width);
    const height = Number(block.height);
    if (
      !text ||
      !Number.isFinite(x) ||
      !Number.isFinite(y) ||
      !Number.isFinite(width) ||
      !Number.isFinite(height)
    ) {
      continue;
    }
    blocks.push({ text, x, y, width, height });
  }
  return blocks.length > 0 ? blocks : undefined;
}

function normalizeBlankCandidates(raw: unknown): BlankCandidate[] | undefined {
  if (!Array.isArray(raw) || raw.length === 0) return undefined;
  const candidates: BlankCandidate[] = [];
  for (const candidate of raw) {
    if (!isRecord(candidate)) continue;
    const id = String(candidate.id ?? "").trim();
    const text = String(candidate.text ?? "").trim();
    const pageIndex = Number(candidate.page_index);
    const x = Number(candidate.x);
    const y = Number(candidate.y);
    const width = Number(candidate.width);
    const height = Number(candidate.height);
    if (
      !id ||
      !text ||
      !Number.isFinite(pageIndex) ||
      !Number.isFinite(x) ||
      !Number.isFinite(y) ||
      !Number.isFinite(width) ||
      !Number.isFinite(height)
    ) {
      continue;
    }
    candidates.push({
      id,
      text,
      page_index: pageIndex,
      x,
      y,
      width,
      height,
    });
  }
  return candidates.length > 0 ? candidates : undefined;
}

export function normalizePageItem(raw: {
  original_text?: string;
  keywords?: string[];
  tables?: unknown;
  layout_blocks?: unknown;
  blank_candidates?: unknown;
}): PageItem {
  return {
    original_text: raw?.original_text ?? "",
    keywords: Array.isArray(raw?.keywords)
      ? raw.keywords.map((value) => String(value ?? "").trim()).filter(Boolean)
      : [],
    tables: normalizeOcrTables(raw?.tables),
    layout_blocks: normalizeLayoutBlocks(raw?.layout_blocks),
    blank_candidates: normalizeBlankCandidates(raw?.blank_candidates),
  };
}

export function normalizeReviewWord(value: unknown) {
  return String(value ?? "").replace(/\s+/g, " ").trim().toLowerCase();
}

export function normalizeStoredBlankItem(
  raw: unknown,
  fallbackIndex: number,
): BlankItemSave | null {
  if (!isRecord(raw)) return null;
  const word = String(raw.word ?? "").trim();
  if (!word) return null;
  const blankIndex = Number(raw.blank_index);
  const pageIndex = Number(raw.page_index);
  const candidateId = String(raw.candidate_id ?? "").trim();
  return {
    blank_index: Number.isFinite(blankIndex) ? blankIndex : fallbackIndex,
    word,
    page_index: Number.isFinite(pageIndex) ? pageIndex : 0,
    ...(candidateId ? { candidate_id: candidateId } : {}),
  };
}

export function buildFallbackReviewBlankItems(
  blanks: BlankItem[],
  pages?: PageItem[],
): BlankItemSave[] {
  const candidatePool: Array<{
    word: string;
    page_index: number;
    candidate_id?: string;
  }> = [];

  (pages ?? []).forEach((page, pageIndex) => {
    const pageCandidates = page.blank_candidates ?? [];
    if (pageCandidates.length > 0) {
      pageCandidates.forEach((candidate) => {
        candidatePool.push({
          word: candidate.text,
          page_index: candidate.page_index ?? pageIndex,
          candidate_id: candidate.id,
        });
      });
      return;
    }
    page.keywords.forEach((word) => candidatePool.push({ word, page_index: pageIndex }));
  });

  const usedCandidateIndexes = new Set<number>();
  return blanks.map((blank, index) => {
    const blankIndex = typeof blank.id === "number" ? blank.id : index;
    const normalizedWord = normalizeReviewWord(blank.word);
    const matchedIndex = candidatePool.findIndex(
      (candidate, candidateIndex) =>
        !usedCandidateIndexes.has(candidateIndex) &&
        normalizeReviewWord(candidate.word) === normalizedWord,
    );
    if (matchedIndex < 0) {
      return { blank_index: blankIndex, word: blank.word, page_index: 0 };
    }
    usedCandidateIndexes.add(matchedIndex);
    const matched = candidatePool[matchedIndex];
    return {
      blank_index: blankIndex,
      word: matched.word || blank.word,
      page_index: matched.page_index,
      ...(matched.candidate_id ? { candidate_id: matched.candidate_id } : {}),
    };
  });
}
