import type { OcrUsageResponse } from '../api/ocr';

export function getOcrUsageExhaustedMessage(
    usage: Pick<OcrUsageResponse, 'remaining' | 'message'> | null | undefined,
): string {
    if (usage?.remaining === 0 && usage.message) {
        return usage.message;
    }

    return '무료 AI 호출 사용량을 모두 사용했어요.';
}
