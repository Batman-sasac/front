type TextToken = { type: 'text'; value: string };
type SpaceToken = { type: 'space'; value: string };
type NewlineToken = { type: 'newline'; value: '\n' };
type KeywordToken = { type: 'keyword'; value: string; occ: number; baseWord: string };

export type Token = TextToken | SpaceToken | NewlineToken | KeywordToken;

function isInlineWhitespace(char: string) {
    return char === ' ' || char === '\t';
}

function skipInlineWhitespace(text: string, start: number) {
    let index = start;
    while (index < text.length && isInlineWhitespace(text[index])) {
        index += 1;
    }
    return index;
}

/**
 * 공백 개수 차이는 허용하되, 공백 유무 자체는 유지해서 단어 경계를 보존한다.
 * 예: "대표  결정 방식" ~= "대표 결정 방식", 하지만 "대표결정 방식" != "대표 결정 방식"
 */
function matchKeywordWithFlexibleWhitespace(
    text: string,
    textLower: string,
    pos: number,
    keyword: string,
) {
    const keywordLower = keyword.toLowerCase();
    let textIndex = pos;
    let keywordIndex = 0;

    while (keywordIndex < keywordLower.length && textIndex < text.length) {
        const keywordChar = keywordLower[keywordIndex];
        const textChar = text[textIndex];
        const keywordIsWhitespace = isInlineWhitespace(keywordChar);
        const textIsWhitespace = isInlineWhitespace(textChar);

        if (keywordIsWhitespace || textIsWhitespace) {
            if (!keywordIsWhitespace || !textIsWhitespace) {
                return 0;
            }

            keywordIndex = skipInlineWhitespace(keywordLower, keywordIndex);
            textIndex = skipInlineWhitespace(text, textIndex);
            continue;
        }

        if (textLower[textIndex] !== keywordChar) {
            return 0;
        }

        textIndex += 1;
        keywordIndex += 1;
    }

    return keywordIndex === keywordLower.length ? textIndex - pos : 0;
}

export function tokenizeWithKeywords(text: string, keywords: string[]): Token[] {
    const normalized = [...keywords]
        .map((keyword) => (keyword && typeof keyword === 'string' ? keyword.trim() : ''))
        .filter(Boolean);
    const sorted = [...normalized].sort((a, b) => b.length - a.length);
    const textLower = text.toLowerCase();
    const out: Token[] = [];
    const occMap = new Map<string, number>();
    let index = 0;

    while (index < text.length) {
        const char = text[index];

        if (char === '\n') {
            out.push({ type: 'newline', value: '\n' });
            index += 1;
            continue;
        }

        if (isInlineWhitespace(char)) {
            let nextIndex = index;
            while (nextIndex < text.length && isInlineWhitespace(text[nextIndex])) {
                nextIndex += 1;
            }
            out.push({ type: 'space', value: text.slice(index, nextIndex) });
            index = nextIndex;
            continue;
        }

        let matched: string | null = null;
        let matchedLen = 0;

        for (const keyword of sorted) {
            if (!keyword) continue;
            const len = matchKeywordWithFlexibleWhitespace(text, textLower, index, keyword);
            if (len > 0) {
                matched = keyword;
                matchedLen = len;
                break;
            }
        }

        if (matched !== null && matchedLen > 0) {
            const sliceFromText = text.slice(index, index + matchedLen);
            const prev = occMap.get(matched) ?? 0;
            const nextOcc = prev + 1;
            occMap.set(matched, nextOcc);
            out.push({ type: 'keyword', value: sliceFromText, occ: nextOcc, baseWord: matched });
            index += matchedLen;
            continue;
        }

        let nextIndex = index + 1;
        while (nextIndex < text.length) {
            if (text[nextIndex] === '\n' || isInlineWhitespace(text[nextIndex])) break;

            let shouldBreak = false;
            for (const keyword of sorted) {
                if (keyword && matchKeywordWithFlexibleWhitespace(text, textLower, nextIndex, keyword) > 0) {
                    shouldBreak = true;
                    break;
                }
            }
            if (shouldBreak) break;
            nextIndex += 1;
        }

        out.push({ type: 'text', value: text.slice(index, nextIndex) });
        index = nextIndex;
    }

    return out;
}
