export type BlankItem = {
    id: number;
    word: string;
    meaningLong?: string;
};

export type BlankItemSave = {
    blank_index: number;
    word: string;
    page_index: number;
    candidate_id?: string;
};

export type KeywordTokenWithId = {
    type: 'keyword';
    value: string;
    occ: number;
    instanceId: number;
    baseWord: string;
};

export type KeywordInstance = {
    instanceId: number;
    blankId: number;
    word: string;
    base: BlankItem | null;
};

export type KeywordOccurrence = {
    instanceId: number;
    pageIndex: number;
    candidateId?: string;
    normalizedWord: string;
};

export function normalizeBlankWord(value: string) {
    return value.replace(/\s+/g, ' ').trim().toLowerCase();
}

export function buildKeywordInstances(
    tokens: KeywordTokenWithId[],
    blankDefs: BlankItem[],
): KeywordInstance[] {
    const baseInfoByWord = new Map<string, BlankItem>();
    const blankInfoByNormalizedWord = new Map<string, BlankItem>();

    blankDefs.forEach((blank) => {
        if (!baseInfoByWord.has(blank.word)) {
            baseInfoByWord.set(blank.word, blank);
        }
        const normalized = normalizeBlankWord(blank.word);
        if (!blankInfoByNormalizedWord.has(normalized)) {
            blankInfoByNormalizedWord.set(normalized, blank);
        }
    });

    return tokens.map((token, idx) => {
        const indexedBlankItem = blankDefs[idx] ?? null;
        const sameWordBlankItem =
            blankInfoByNormalizedWord.get(normalizeBlankWord(token.baseWord)) ?? null;
        const blankItem =
            indexedBlankItem &&
            normalizeBlankWord(indexedBlankItem.word) === normalizeBlankWord(token.baseWord)
                ? indexedBlankItem
                : sameWordBlankItem;

        return {
            instanceId: token.instanceId,
            blankId: blankItem?.id ?? idx,
            word: token.value,
            base: baseInfoByWord.get(token.baseWord) ?? sameWordBlankItem,
        };
    });
}

export function selectReviewKeywordInstanceIds({
    reviewBlankItems,
    keywordOccurrences,
    targetCount,
}: {
    reviewBlankItems: BlankItemSave[];
    keywordOccurrences: KeywordOccurrence[];
    targetCount: number;
}) {
    const remaining = [...keywordOccurrences];
    const selected: number[] = [];

    reviewBlankItems.forEach((item) => {
        const normalizedWord = normalizeBlankWord(item.word);
        let matchIndex = item.candidate_id
            ? remaining.findIndex(
                (occurrence) =>
                    occurrence.pageIndex === item.page_index
                    && occurrence.candidateId === item.candidate_id,
            )
            : -1;

        // 이전 저장본의 위치 ID가 현재 렌더링 ID와 달라도 같은 단어로 복원한다.
        if (matchIndex < 0) {
            matchIndex = remaining.findIndex(
                (occurrence) =>
                    occurrence.pageIndex === item.page_index
                    && occurrence.normalizedWord === normalizedWord,
            );
        }

        if (matchIndex < 0) return;
        const [matched] = remaining.splice(matchIndex, 1);
        selected.push(matched.instanceId);
    });

    for (const occurrence of remaining) {
        if (selected.length >= targetCount) break;
        selected.push(occurrence.instanceId);
    }

    return selected.slice(0, targetCount);
}

export function buildOrderedStudySaveData(params: {
    selectedBlankIds: number[];
    blanks: BlankItem[];
    rawBlankItems: BlankItemSave[];
}) {
    type OrderedEntry = {
        blank_index: number;
        blankId: number;
        word: string;
        page_index: number;
        candidate_id: string | undefined;
    };

    const { selectedBlankIds, blanks, rawBlankItems } = params;
    const blankById = new Map(blanks.map((blank) => [blank.id, blank] as const));
    const blankItemById = new Map(rawBlankItems.map((item) => [item.blank_index, item] as const));

    const orderedEntries = selectedBlankIds
        .map((blankId, index) => {
            const item = blankItemById.get(blankId);
            const blank = blankById.get(blankId);
            if (!item && !blank) return null;

            return {
                blank_index: index,
                blankId,
                word: item?.word ?? blank?.word ?? '',
                page_index: item?.page_index ?? 0,
                candidate_id: item?.candidate_id,
            };
        })
        .filter((entry): entry is OrderedEntry => entry != null);

    return {
        keywords: orderedEntries.map((entry) => entry.word),
        blankItems: orderedEntries.map(({ blank_index, word, page_index, candidate_id }) => ({
            blank_index,
            word,
            page_index,
            ...(candidate_id ? { candidate_id } : {}),
        })),
    };
}
