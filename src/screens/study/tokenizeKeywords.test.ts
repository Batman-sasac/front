import { describe, expect, test } from '@jest/globals';
import { tokenizeWithKeywords } from './tokenizeKeywords';

describe('tokenizeWithKeywords', () => {
    test('공백 수 차이는 허용하고 동일 구문은 keyword로 인식한다', () => {
        const tokens = tokenizeWithKeywords('대표  결정 방식과 의사 결정', ['대표 결정 방식', '의사 결정']);

        expect(tokens.filter((token) => token.type === 'keyword')).toEqual([
            { type: 'keyword', value: '대표  결정 방식', occ: 1, baseWord: '대표 결정 방식' },
            { type: 'keyword', value: '의사 결정', occ: 1, baseWord: '의사 결정' },
        ]);
    });

    test('공백이 사라진 결합어는 띄어쓰기 있는 keyword와 매칭하지 않는다', () => {
        const tokens = tokenizeWithKeywords('대표결정 방식', ['대표 결정 방식']);

        expect(tokens.some((token) => token.type === 'keyword')).toBe(false);
        expect(tokens).toEqual([
            { type: 'text', value: '대표결정' },
            { type: 'space', value: ' ' },
            { type: 'text', value: '방식' },
        ]);
    });

    test('본문에 공백이 있는데 keyword에 없으면 다른 단어로 본다', () => {
        const tokens = tokenizeWithKeywords('공부 방법', ['공부방법']);

        expect(tokens.some((token) => token.type === 'keyword')).toBe(false);
        expect(tokens).toEqual([
            { type: 'text', value: '공부' },
            { type: 'space', value: ' ' },
            { type: 'text', value: '방법' },
        ]);
    });
});
