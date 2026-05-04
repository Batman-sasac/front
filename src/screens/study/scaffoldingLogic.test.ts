import { describe, expect, test } from '@jest/globals';
import {
    BlankItem,
    BlankItemSave,
    KeywordTokenWithId,
    buildKeywordInstances,
    buildOrderedStudySaveData,
} from './scaffoldingLogic';

describe('키워드 인스턴스 매핑', () => {
    test('중복 제거된 빈칸 정의여도 반복 키워드가 올바른 blankId로 매핑되어야 함', () => {
        const blankDefs: BlankItem[] = [
            { id: 0, word: '대표 결정 방식' },
            { id: 1, word: '의사 결정' },
        ];

        const tokens: KeywordTokenWithId[] = [
            { type: 'keyword', value: '대표 결정 방식', occ: 1, instanceId: 1, baseWord: '대표 결정 방식' },
            { type: 'keyword', value: '대표  결정 방식', occ: 2, instanceId: 2, baseWord: '대표  결정 방식' },
            { type: 'keyword', value: '의사 결정', occ: 1, instanceId: 3, baseWord: '의사 결정' },
        ];

        const instances = buildKeywordInstances(tokens, blankDefs);

        expect(instances.map((instance) => instance.blankId)).toEqual([0, 0, 1]);
        expect(instances.map((instance) => instance.instanceId)).toEqual([1, 2, 3]);
    });
});

test('candidate_id 값이 있으면 저장 데이터에 그대로 유지된다', () => {
    const blanks: BlankItem[] = [{ id: 4, word: '핵심 문장' }];
    const rawBlankItems: BlankItemSave[] = [
        { blank_index: 4, word: '핵심 문장', page_index: 2, candidate_id: '2-7' },
    ];

    const result = buildOrderedStudySaveData({
        selectedBlankIds: [4],
        blanks,
        rawBlankItems,
    });

    expect(result.blankItems).toEqual([
        { blank_index: 0, word: '핵심 문장', page_index: 2, candidate_id: '2-7' },
    ]);
});

describe('학습 저장 데이터 생성', () => {
    test('같은 blankId가 여러 번 선택되어도 3라운드 답안이 모두 채점되도록 유지되어야 함', () => {
        const blanks: BlankItem[] = [
            { id: 0, word: '대표 결정 방식' },
            { id: 1, word: '의사 결정' },
        ];
        const rawBlankItems: BlankItemSave[] = [
            { blank_index: 0, word: '대표 결정 방식', page_index: 0 },
            { blank_index: 1, word: '의사 결정', page_index: 0 },
        ];

        const result = buildOrderedStudySaveData({
            selectedBlankIds: [0, 0, 1, 0],
            blanks,
            rawBlankItems,
        });

        expect(result.keywords).toEqual([
            '대표 결정 방식',
            '대표 결정 방식',
            '의사 결정',
            '대표 결정 방식',
        ]);
        expect(result.blankItems).toEqual([
            { blank_index: 0, word: '대표 결정 방식', page_index: 0 },
            { blank_index: 1, word: '대표 결정 방식', page_index: 0 },
            { blank_index: 2, word: '의사 결정', page_index: 0 },
            { blank_index: 3, word: '대표 결정 방식', page_index: 0 },
        ]);
    });

    test('유효하지 않은 blankId가 하나 섞여도 나머지 저장 순서는 유지되어야 함', () => {
        const blanks: BlankItem[] = [{ id: 0, word: '대표 결정 방식' }];
        const rawBlankItems: BlankItemSave[] = [{ blank_index: 0, word: '대표 결정 방식', page_index: 0 }];

        const result = buildOrderedStudySaveData({
            selectedBlankIds: [0, 99, 0],
            blanks,
            rawBlankItems,
        });

        expect(result.keywords).toEqual(['대표 결정 방식', '대표 결정 방식']);
        expect(result.blankItems).toEqual([
            { blank_index: 0, word: '대표 결정 방식', page_index: 0 },
            { blank_index: 2, word: '대표 결정 방식', page_index: 0 },
        ]);
    });
});
