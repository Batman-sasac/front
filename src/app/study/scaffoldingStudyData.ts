import type {
  BlankItemSave,
  GradeStudyRequest,
  PageItem,
  ScaffoldingPayload,
} from "../../api/ocr";
import { buildOrderedStudySaveData } from "../../screens/study/scaffolding/logic/scaffoldingLogic";

export type PendingGradePart = {
  pages: PageItem[];
  blankItems: BlankItemSave[];
  keywords: string[];
  userAnswers: string[];
  correctCount: number;
};

export type PendingReviewPart = {
  userAnswers: string[];
  correctCount: number;
};

export function countCorrectAnswers(
  userAnswers: string[],
  correctAnswers: string[],
) {
  return userAnswers.reduce((count, answer, index) => {
    const normalizedAnswer = (answer ?? "").trim().toLowerCase();
    const normalizedCorrect = (correctAnswers[index] ?? "")
      .trim()
      .toLowerCase();
    return count + (normalizedAnswer === normalizedCorrect ? 1 : 0);
  }, 0);
}

export function prepareScaffoldingSaveData(params: {
  payload: ScaffoldingPayload;
  selectedBlankIds: number[];
  selectedBlankItems?: BlankItemSave[];
}) {
  const { payload, selectedBlankIds, selectedBlankItems } = params;
  const blanks = payload.blanks ?? [];
  const rawBlankItems =
    payload.blankItems && payload.blankItems.length > 0
      ? payload.blankItems
      : blanks.map((blank, index) => ({
          blank_index: index,
          word: blank.word,
          page_index: 0,
        }));
  const exactItems = (selectedBlankItems ?? [])
    .map((item, index) => ({
      blank_index: index,
      word: item.word,
      page_index: item.page_index ?? 0,
      ...(item.candidate_id ? { candidate_id: item.candidate_id } : {}),
    }))
    .filter((item) => item.word.trim().length > 0);
  const ordered =
    exactItems.length > 0
      ? {
          keywords: exactItems.map((item) => item.word),
          blankItems: exactItems,
        }
      : buildOrderedStudySaveData({
          selectedBlankIds,
          blanks,
          rawBlankItems,
        });
  return { ...ordered, rawBlankItems };
}

export function mergeReviewAnswers(
  parts: Record<number, PendingReviewPart>,
  pageCount: number,
) {
  const userAnswers: string[] = [];
  let correctCount = 0;
  for (let index = 0; index < pageCount; index += 1) {
    const part = parts[index];
    if (!part) {
      throw new Error(`${index + 1}번째 복습 답안이 없어 저장할 수 없습니다.`);
    }
    userAnswers.push(...part.userAnswers);
    correctCount += part.correctCount;
  }
  return { userAnswers, correctCount };
}

export function buildGradeStudyRequest(params: {
  parts: Record<number, PendingGradePart>;
  sourceCount: number;
  subjectName: string;
  fallbackTitle: string;
}): GradeStudyRequest {
  const { parts, sourceCount, subjectName, fallbackTitle } = params;
  const pages: PageItem[] = [];
  const blanks: BlankItemSave[] = [];
  const keywords: string[] = [];
  const userAnswers: string[] = [];
  let pageOffset = 0;
  let blankOffset = 0;
  let totalCorrect = 0;

  for (let index = 0; index < sourceCount; index += 1) {
    const part = parts[index];
    if (!part) {
      throw new Error(`${index + 1}페이지 학습 결과가 없어 저장할 수 없습니다.`);
    }
    totalCorrect += part.correctCount;
    pages.push(...part.pages);
    part.blankItems.forEach((item, blankIndex) => {
      blanks.push({
        blank_index: blankOffset + blankIndex,
        word: item.word,
        page_index: pageOffset + (item.page_index ?? 0),
        ...(item.candidate_id ? { candidate_id: item.candidate_id } : {}),
      });
    });
    keywords.push(...part.keywords);
    userAnswers.push(...part.userAnswers);
    pageOffset += part.pages.length;
    blankOffset += part.keywords.length;
  }

  const rawText = pages.map((page) => page.original_text ?? "").join("\n\n");
  const pageQuestionCounts = Array.from({ length: pages.length }, () => 0);
  const pageCorrectCounts = Array.from({ length: pages.length }, () => 0);
  blanks.forEach((blank, index) => {
    const pageIndex = blank.page_index ?? 0;
    if (pageIndex < 0 || pageIndex >= pageQuestionCounts.length) return;
    pageQuestionCounts[pageIndex] += 1;
    const answer = (userAnswers[index] ?? "").trim().toLowerCase();
    const correct = (keywords[index] ?? "").trim().toLowerCase();
    if (answer && correct && answer === correct) pageCorrectCounts[pageIndex] += 1;
  });

  return {
    quiz_id: 0,
    correct_answers: keywords,
    answer: keywords,
    user_answer: userAnswers,
    quiz_html: rawText,
    ocr_text: {
      pages,
      blanks,
      quiz: { raw: rawText },
      layout_meta: {
        selected_blank_refs: blanks.map((blank) => ({
          blank_index: blank.blank_index,
          word: blank.word,
          page_index: blank.page_index,
          ...(blank.candidate_id ? { candidate_id: blank.candidate_id } : {}),
        })),
      },
    },
    user_answers: userAnswers,
    subject_name: subjectName || fallbackTitle,
    study_name: subjectName || fallbackTitle,
    original_text: pages.map((page) => page.original_text ?? ""),
    keywords,
    grade_cnt: totalCorrect,
    page_correct_counts: pageCorrectCounts,
    page_question_counts: pageQuestionCounts,
  };
}
