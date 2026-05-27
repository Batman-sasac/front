import type { ScaffoldingPayload } from '../api/ocr';
import type { StudySource } from '../screens/input_data/studySource';

export type SourceCropMap = Record<number, { px: number; py: number; pw: number; ph: number }>;

export type OcrProgressState = {
  completedPages: number;
  totalPages: number;
  activeSourceIndex: number;
  activeSourceName: string;
  activeSourceCompletedPages: number;
  activeSourceTotalPages: number;
};

export const createOcrJobId = () => `${Date.now()}_${Math.random().toString(16).slice(2)}`;

export const getSourceDisplayName = (source: StudySource | undefined, fallbackIndex: number) => {
  const trimmedName = source?.name?.trim();
  if (trimmedName) return trimmedName;
  const rawName = source?.uri?.split('/').pop()?.split('?')[0]?.trim();
  if (rawName) return rawName;
  return `${fallbackIndex + 1}번째 파일`;
};

export const buildReviewPayloadsByPage = (payload: ScaffoldingPayload): ScaffoldingPayload[] => {
  const pages = payload.pages ?? [];
  if (pages.length <= 1) return [payload];

  return pages.map((page, pageIndex) => {
    const pageBlankItems = (payload.blankItems ?? [])
      .filter((item) => (Number.isFinite(item.page_index) ? item.page_index : 0) === pageIndex)
      .map((item, blankIndex) => ({
        blank_index: blankIndex,
        word: item.word,
        page_index: 0,
        ...(item.candidate_id ? { candidate_id: item.candidate_id } : {}),
      }));
    const blanks = pageBlankItems.length > 0
      ? pageBlankItems.map((item) => ({
        id: item.blank_index,
        word: item.word,
        meaningLong: '',
      }))
      : (page.keywords ?? []).map((word, index) => ({
        id: index,
        word,
        meaningLong: '',
      }));

    return {
      ...payload,
      title: pages.length > 1 ? `${payload.title} (${pageIndex + 1}/${pages.length})` : payload.title,
      extractedText: page.original_text ?? '',
      pages: [{
        ...page,
        blank_candidates: page.blank_candidates?.map((candidate) => ({
          ...candidate,
          page_index: 0,
        })),
      }],
      blanks,
      blankItems: pageBlankItems.length > 0
        ? pageBlankItems
        : blanks.map((blank) => ({
          blank_index: blank.id,
          word: blank.word,
          page_index: 0,
        })),
    };
  });
};
