import { fetchWithTimeout } from "../lib/fetchWithTimeout";
import { getOcrAuthHeaders, OCR_API_BASE } from "./ocrClient";
import {
  isRecord,
  normalizePageItem,
  normalizeReviewWord,
} from "./ocrNormalizers";
import type {
  BlankItemSave,
  OcrProgressMessage,
  OcrUsageResponse,
  PageItem,
  ScaffoldingPayload,
} from "./ocrTypes";

export type * from "./ocrTypes";
export { getMonthlyStats, getWeeklyGrowth } from "./learningStats";
export {
  deleteReviewCard,
  getQuizForReview,
  getReviewCards,
} from "./ocrReview";
export { getHint, gradeStudy, saveTest, submitReviewStudy } from "./study";

type RunOcrOptions = {
  fileName?: string;
  mimeType?: string;
  jobId?: string;
  onProgress?: (message: OcrProgressMessage) => void;
};

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function getOcrWebSocketUrl(jobId: string) {
  const normalizedBase = OCR_API_BASE.trim().replace(/\/+$/, "");
  return `${normalizedBase
    .replace(/^https:\/\//i, "wss://")
    .replace(/^http:\/\//i, "ws://")}/ws/ocr/${jobId}`;
}

export async function runOcr(
  fileUri: string,
  cropInfo?: { px: number; py: number; pw: number; ph: number },
  options?: RunOcrOptions,
): Promise<ScaffoldingPayload> {
  console.log("OCR 요청 시작 - fileUri:", fileUri, "cropInfo:", cropInfo);
  const form = new FormData();
  const nameFromMeta = options?.fileName?.trim();
  const nameFromUri = fileUri.split("/").pop()?.split("?")[0] ?? "";
  const normalizedFileName = nameFromMeta || nameFromUri || "upload";
  const fileExtensionMatch = normalizedFileName.match(/\.([a-z0-9]+)$/i);
  const fileExtension =
    fileExtensionMatch?.[1]?.toLowerCase() ||
    fileUri.split(".").pop()?.toLowerCase() ||
    "jpg";
  const mimeType =
    options?.mimeType ||
    (fileExtension === "png"
      ? "image/png"
      : fileExtension === "pdf"
        ? "application/pdf"
        : "image/jpeg");
  const uploadFileName = normalizedFileName.includes(".")
    ? normalizedFileName
    : `upload.${fileExtension}`;

  try {
    const response = await fetch(fileUri);
    const blob = await response.blob();
    const file = new File([blob], uploadFileName, { type: mimeType });
    form.append("file", file);
    console.log("FormData 생성 완료 (Blob):", {
      name: file.name,
      type: file.type,
      size: file.size,
    });
  } catch (blobError) {
    console.log("Blob 변환 실패, RN 방식 사용:", blobError);
    form.append("file", {
      uri: fileUri,
      name: uploadFileName,
      type: mimeType,
    } as unknown as Blob);
  }

  if (cropInfo && mimeType.startsWith("image/")) {
    form.append("crop_x", String(cropInfo.px));
    form.append("crop_y", String(cropInfo.py));
    form.append("crop_width", String(cropInfo.pw));
    form.append("crop_height", String(cropInfo.ph));
    console.log("Crop 정보 추가:", cropInfo);
  }
  if (options?.jobId) form.append("job_id", options.jobId);

  const shouldTrackProgress =
    !!options?.jobId && typeof options?.onProgress === "function";
  let webSocket: WebSocket | null = null;

  if (shouldTrackProgress && options?.jobId) {
    try {
      webSocket = new WebSocket(getOcrWebSocketUrl(options.jobId));
      webSocket.onmessage = (event) => {
        try {
          const message = JSON.parse(
            String(event.data ?? ""),
          ) as OcrProgressMessage;
          if (message?.type === "ocr_progress") options.onProgress?.(message);
        } catch (error) {
          console.warn("OCR progress 메시지 파싱 실패:", error);
        }
      };
      webSocket.onerror = (event) => {
        console.warn("OCR progress WebSocket 오류:", event);
      };
      await new Promise<void>((resolve) => {
        let settled = false;
        const finish = () => {
          if (settled) return;
          settled = true;
          resolve();
        };
        const timeout = setTimeout(finish, 1200);
        webSocket!.onopen = () => {
          clearTimeout(timeout);
          finish();
        };
        webSocket!.onclose = () => {
          clearTimeout(timeout);
          finish();
        };
        webSocket!.onerror = () => {
          clearTimeout(timeout);
          finish();
        };
      });
    } catch (error) {
      console.warn("OCR progress WebSocket 연결 실패:", error);
      webSocket = null;
    }
  }

  try {
    let response: Response;
    try {
      response = await fetch(`${OCR_API_BASE}/ocr`, {
        method: "POST",
        body: form,
        headers: await getOcrAuthHeaders(),
      });
    } catch (error) {
      console.error("OCR 네트워크 실패:", {
        message: getErrorMessage(error),
        apiBase: OCR_API_BASE,
        url: `${OCR_API_BASE}/ocr`,
        fileUri,
        uploadFileName,
        mimeType,
        cropInfo,
      });
      throw error;
    }

    console.log("OCR 응답 상태:", response.status);
    if (!response.ok) {
      const errorText = await response.text();
      console.error("OCR 오류 응답:", errorText);
      throw new Error(`OCR HTTP ${response.status}: ${errorText}`);
    }

    const rawData: unknown = await response.json();
    const data = isRecord(rawData) ? rawData : {};
    if (data.status === "limit_reached") {
      throw new Error(
        typeof data.message === "string"
          ? data.message
          : "이용 가능한 무료 횟수를 모두 사용했습니다.",
      );
    }

    const inner = isRecord(data.data) ? data.data : data;
    let pages: PageItem[] = [];
    let originalText: string;
    let blankItems: BlankItemSave[] = [];

    if (Array.isArray(inner.pages) && inner.pages.length > 0) {
      pages = inner.pages.map(normalizePageItem);
      originalText = pages.map((page) => page.original_text ?? "").join("\n\n");

      for (let pageIndex = 0; pageIndex < pages.length; pageIndex += 1) {
        const page = pages[pageIndex];
        const pageCandidates = page.blank_candidates ?? [];
        const usedCandidateIndexes = new Set<number>();
        for (const keyword of page.keywords ?? []) {
          const normalizedKeyword = normalizeReviewWord(keyword);
          const matchedIndex = pageCandidates.findIndex(
            (candidate, candidateIndex) =>
              !usedCandidateIndexes.has(candidateIndex) &&
              normalizeReviewWord(candidate.text) === normalizedKeyword,
          );
          const matchedCandidate =
            matchedIndex >= 0 ? pageCandidates[matchedIndex] : null;
          if (matchedIndex >= 0) usedCandidateIndexes.add(matchedIndex);
          blankItems.push({
            blank_index: blankItems.length,
            word: keyword,
            page_index: matchedCandidate?.page_index ?? pageIndex,
            ...(matchedCandidate?.id
              ? { candidate_id: matchedCandidate.id }
              : {}),
          });
        }
      }
    } else {
      originalText =
        typeof inner.original_text === "string" ? inner.original_text : "";
      const rawKeywords = Array.isArray(inner.keywords)
        ? inner.keywords
            .map((value: unknown) => String(value ?? "").trim())
            .filter(Boolean)
        : [];
      const keywordSet = new Set<string>();
      const keywords = rawKeywords.filter((word: string) => {
        if (keywordSet.has(word)) return false;
        keywordSet.add(word);
        return true;
      });
      pages = [{ original_text: originalText, keywords }];
    }

    const blanks = blankItems.map((blank) => ({
      id: blank.blank_index,
      word: blank.word,
      meaningLong: `${blank.word} 뜻 (AI 생성 예정)`,
    }));
    return {
      title: "학습 자료",
      extractedText: originalText,
      blanks,
      pages,
      blankItems,
    };
  } finally {
    if (webSocket) {
      setTimeout(() => {
        try {
          webSocket?.close();
        } catch (error) {
          console.warn("OCR progress WebSocket 종료 실패:", error);
        }
      }, 300);
    }
  }
}

export async function getOcrUsage(): Promise<OcrUsageResponse> {
  const response = await fetchWithTimeout(`${OCR_API_BASE}/ocr/usage`, {
    method: "GET",
    headers: await getOcrAuthHeaders(),
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OCR Usage HTTP ${response.status}: ${errorText}`);
  }
  return response.json();
}
