import { describe, expect, test } from '@jest/globals';
import { getOcrUsageExhaustedMessage } from '../../lib/ocrUsage';

describe('OCR 사용량 소진 메시지', () => {
    test('남은 횟수가 0이고 백엔드 메시지가 있으면 그 문구를 그대로 사용해야 함', () => {
        const message = getOcrUsageExhaustedMessage({
            remaining: 0,
            message: '이용가능한 무료 횟수를 다 사용하셨습니다',
        });

        expect(message).toBe('이용가능한 무료 횟수를 다 사용하셨습니다');
    });

    test('남은 횟수가 0이 아니면 기본 문구를 사용해야 함', () => {
        const message = getOcrUsageExhaustedMessage({
            remaining: 3,
            message: '이용가능한 무료 횟수를 다 사용하셨습니다',
        });

        expect(message).toBe('무료 AI 호출 사용량을 모두 사용했어요.');
    });

    test('백엔드 메시지가 없으면 기본 문구를 사용해야 함', () => {
        const message = getOcrUsageExhaustedMessage({
            remaining: 0,
            message: undefined,
        });

        expect(message).toBe('무료 AI 호출 사용량을 모두 사용했어요.');
    });
});
