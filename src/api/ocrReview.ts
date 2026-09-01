import { fetchWithTimeout } from "../lib/fetchWithTimeout";
import { getOcrAuthHeaders, OCR_API_BASE } from "./ocrClient";
import {
  buildFallbackReviewBlankItems,
  normalizePageItem,
  normalizeStoredBlankItem,
} from "./ocrNormalizers";
import type {
  BlankItemSave,
  QuizForReviewResponse,
  ReviewCardListResponse,
  ScaffoldingPayload,
} from "./ocrTypes";

export async function getReviewCards(
  page: number,
  size: number,
): Promise<ReviewCardListResponse> {
  const response = await fetchWithTimeout(
    `${OCR_API_BASE}/ocr/list?page=${page}&size=${size}`,
    { headers: await getOcrAuthHeaders() },
  );
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`복습 카드 조회 HTTP ${response.status}: ${errorText}`);
  }
  const result = (await response.json()) as ReviewCardListResponse;
  if (result.status === "error") {
    throw new Error(result.message || "복습 카드를 불러오지 못했습니다.");
  }
  return result;
}

export async function deleteReviewCard(quizId: number): Promise<void> {
  const response = await fetch(
    `${OCR_API_BASE}/ocr/ocr-data/delete/${quizId}`,
    { method: "DELETE", headers: await getOcrAuthHeaders() },
  );
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`복습 카드 삭제 HTTP ${response.status}: ${errorText}`);
  }
}

export async function getQuizForReview(
  quizId: number,
): Promise<ScaffoldingPayload & { user_answers?: string[] }> {
  const response = await fetch(`${OCR_API_BASE}/ocr/quiz/${quizId}`, {
    method: "GET",
    headers: await getOcrAuthHeaders(),
  });
  if (!response.ok) throw new Error(`퀴즈 조회 HTTP ${response.status}`);
  const result = (await response.json()) as QuizForReviewResponse;
  if (result.status !== "success" || !result.data) {
    throw new Error(result.message ?? "퀴즈를 불러올 수 없습니다.");
  }

  const data = result.data;
  const pages = Array.isArray(data.pages)
    ? data.pages.map(normalizePageItem)
    : undefined;
  const selectedRefs = Array.isArray(
    (data.layout_meta as { selected_blank_refs?: unknown } | undefined)
      ?.selected_blank_refs,
  )
    ? (data.layout_meta as { selected_blank_refs?: unknown[] })
        .selected_blank_refs ?? []
    : [];
  const normalizedRefs = selectedRefs
    .map((item, index) => normalizeStoredBlankItem(item, index))
    .filter((item): item is BlankItemSave => item != null);
  const blankItems =
    normalizedRefs.length > 0
      ? normalizedRefs
      : buildFallbackReviewBlankItems(data.blanks ?? [], pages);

  return {
    title: data.title,
    extractedText: data.extractedText,
    blanks: data.blanks ?? [],
    user_answers: data.user_answers,
    pages,
    blankItems,
    layoutMeta: data.layout_meta,
    imageUrl: data.image_url ?? null,
  };
}
