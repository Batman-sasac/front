import { describe, expect, test } from '@jest/globals';
import {
    BlankItem,
    BlankItemSave,
    KeywordTokenWithId,
    buildKeywordInstances,
    buildOrderedStudySaveData,
    selectReviewKeywordInstanceIds,
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

describe('복습 빈칸 복원', () => {
    const keywordOccurrences = [
        { instanceId: 1, pageIndex: 0, candidateId: 'layout-1', normalizedWord: '설계' },
        { instanceId: 2, pageIndex: 0, candidateId: 'table-0-1-0-0', normalizedWord: '설계' },
        { instanceId: 3, pageIndex: 0, candidateId: 'table-0-2-0-0', normalizedWord: '피드백' },
        { instanceId: 4, pageIndex: 0, candidateId: 'table-0-3-0-0', normalizedWord: '테스트' },
    ];

    test('저장된 표 위치 ID가 일치하면 동일한 표 빈칸을 우선 복원한다', () => {
        const selected = selectReviewKeywordInstanceIds({
            reviewBlankItems: [
                { blank_index: 0, word: '설계', page_index: 0, candidate_id: 'table-0-1-0-0' },
            ],
            keywordOccurrences,
            targetCount: 1,
        });

        expect(selected).toEqual([2]);
    });

    test('이전 위치 ID가 현재와 달라도 같은 페이지의 같은 단어로 복원하고 부족한 칸을 보충한다', () => {
        const selected = selectReviewKeywordInstanceIds({
            reviewBlankItems: [
                { blank_index: 0, word: '설계', page_index: 0, candidate_id: 'old-table-id' },
                { blank_index: 1, word: '피드백', page_index: 0, candidate_id: 'old-feedback-id' },
            ],
            keywordOccurrences,
            targetCount: 4,
        });

        expect(selected).toHaveLength(4);
        expect(selected.slice(0, 2)).toEqual([1, 3]);
        expect(new Set(selected).size).toBe(4);
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
