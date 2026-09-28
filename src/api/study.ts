import { getOcrAuthHeaders, OCR_API_BASE } from "./ocrClient";
import type {
  GradeStudyRequest,
  GradeStudyResponse,
  HintResponse,
  ReviewStudyRequest,
  ReviewStudyResponse,
  SaveTestRequest,
} from "./ocrTypes";

export async function saveTest(payload: SaveTestRequest) {
  const response = await fetch(`${OCR_API_BASE}/ocr/save`, {
    method: "POST",
    headers: await getOcrAuthHeaders("application/json"),
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(`SAVE HTTP ${response.status}`);
  return response.json();
}

export async function gradeStudy(
  payload: GradeStudyRequest,
): Promise<GradeStudyResponse> {
  const response = await fetch(`${OCR_API_BASE}/study/grade`, {
    method: "POST",
    headers: await getOcrAuthHeaders("application/json"),
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Grade HTTP ${response.status}: ${errorText}`);
  }
  return response.json();
}

export async function submitReviewStudy(
  payload: ReviewStudyRequest,
): Promise<ReviewStudyResponse> {
  const response = await fetch(`${OCR_API_BASE}/study/review-study`, {
    method: "POST",
    headers: await getOcrAuthHeaders("application/json"),
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(`Review Study HTTP ${response.status}`);
  return response.json();
}

export async function getHint(quizId: number): Promise<HintResponse> {
  const response = await fetch(`${OCR_API_BASE}/study/hint/${quizId}`, {
    method: "GET",
    headers: await getOcrAuthHeaders("application/json"),
  });
  if (!response.ok) throw new Error(`Hint HTTP ${response.status}`);
  return response.json();
}
