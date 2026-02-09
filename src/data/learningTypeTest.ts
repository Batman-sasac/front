// src/data/learningTypeTest.ts

// 축: 장독립/장의존 + 숙고/충동
export type AxisScore = {
    field?: 1 | -1; // +1: 장독립, -1: 장의존
    tempo?: 1 | -1; // +1: 숙고, -1: 충동
};

export type Question = {
    id: number;
    text: string;
    aText: string;
    bText: string;
    a: AxisScore; // A 선택 시 반영
    b: AxisScore; // B 선택 시 반영
};

// 여기만 수정하면 질문/점수가 바뀜
export const questions: Question[] = [
    {
        id: 1,
        text: '학습 자료를 볼 때 더 편한 것은?',
        aText: '표, 도식 같이 구조가 명확한 자료',
        bText: '상황, 예시 설명이 풍부한 이야기형 자료',
        a: { field: 1 },
        b: { field: -1 },
    },
    {
        id: 2,
        text: '공부하다가 막혔을 때, 나는 주로…',
        aText: '누군가에게 설명을 듣거나 조언 구하기',
        bText: '혼자 다시 정리하거나 다른 자료 검색',
        a: { field: -1 },
        b: { field: 1 },
    },
    {
        id: 3,
        text: '시험 대비 공부할 때 더 편한 방식은?',
        aText: '스스로 계획을 세우고 진도를 조절',
        bText: '학원이나 스터디 진도대로 공부',
        a: { field: 1 },
        b: { field: -1 },
    },
    {
        id: 4,
        text: '학습 결과에 대해 평가받을 때 나는…',
        aText: '내가 어떤 사고 과정을 거쳤는지가 중요',
        bText: '다른 사람보다 잘하고 못하는지가 중요',
        a: { field: 1 },
        b: { field: -1 },
    },
    {
        id: 5,
        text: '낯선 과제나 새로운 환경에 놓이면 나는…',
        aText: '먼저 과제의 규칙과 구조를 파악',
        bText: '사람들이 어떻게 하는지 보고 따라하기',
        a: { field: 1 },
        b: { field: -1 },
    },
    {
        id: 6,
        text: '제한 시간이 없는 과제를 할 때 나는…',
        aText: '먼저 전체 계획을 세우고 순서대로 진행',
        bText: '일단 시작하고 상황에 맞게 조절',
        a: { tempo: 1 },
        b: { tempo: -1 },
    },
    {
        id: 7,
        text: '문제를 풀다가 막히면 보통…',
        aText: '풀이과정을 따라가며 틀린 부분 점검',
        bText: '처음부터 다시 풀거나 다른 문제 먼저 풀기',
        a: { tempo: 1 },
        b: { tempo: -1 },
    },
    {
        id: 8,
        text: '새로운 유형의 문제를 처음 접했을 때 나는…',
        aText: '문제를 분석하고 규칙을 이해한 뒤 풀이',
        bText: '몇 문제 직접 풀어보며 감을 잡기',
        a: { tempo: 1 },
        b: { tempo: -1 },
    },
    {
        id: 9,
        text: '시험을 보고 난 직후 나는 주로…',
        aText: '문제 풀이 분석과 오답노트 진행',
        bText: '결과 확인 및 다른 과제 시작',
        a: { tempo: 1 },
        b: { tempo: -1 },
    },
    {
        id: 10,
        text: '공부할 때 ‘속도’와 ‘정확도’ 중 더 중요한 것은?',
        aText: '느리더라도 정확하게 이해하는 것이 중요',
        bText: '완벽하지 않아도 빠르게 많이 푸는 것 선호',
        a: { tempo: 1 },
        b: { tempo: -1 },
    },
    {
        id: 11,
        text: '공부할 때, 어떤 환경이 더 집중이 잘 되나요?',
        aText: '혼자 조용한 공간',
        bText: '함께 이야기할 수 있는 카페 등의 공간',
        a: { field: 1 },
        b: { field: -1 },
    },
    {
        id: 12,
        text: '새로운 개념을 배울 때, 주로 어떤 방식으로 이해하나요?',
        aText: '구체적 예시 또는 주변 맥락 통해 이해',
        bText: '전체 구조 파악하고 단계적으로 이해',
        a: { field: -1 },
        b: { field: 1 },
    },
    {
        id: 13,
        text: '다른 사람이 설명하는 방식을 들을 때, 나는…',
        aText: '말투나 표정에서 힌트를 얻으면서 이해',
        bText: '나와 다른 부분에 대해 분석',
        a: { field: -1 },
        b: { field: 1 },
    },
    {
        id: 14,
        text: '문제를 풀 때 교사의 조언에 대해 어떻게 생각하나요?',
        aText: '조언 없으면 맞게하고 있는지 불안',
        bText: '조언 없이 스스로 판단하는 것이 편함',
        a: { field: -1 },
        b: { field: 1 },
    },
    {
        id: 15,
        text: '어떤 활동을 더 선호하나요?',
        aText: '혼자 주도적으로 이끌어가는 개인 프로젝트',
        bText: '사람들과 함께 문제를 해결하는 협동학습',
        a: { field: 1 },
        b: { field: -1 },
    },
    {
        id: 16,
        text: '문제를 풀 때, 어떻게 접근하나요?',
        aText: '문제를 여러 번 검토하고 답안 작성',
        bText: '먼저 생각나는 답을 적고 틀리면 수정',
        a: { field: 1 },
        b: { field: -1 },
    },
    {
        id: 17,
        text: '공부하다가 막혔을 때, 나는 주로…',
        aText: '누군가에게 설명을 듣거나 조언 구하기',
        bText: '혼자 다시 정리하거나 다른 자료 검색',
        a: { field: -1 },
        b: { field: 1 },
    },
    {
        id: 18,
        text: '시험 대비 공부할 때 더 편한 방식은?',
        aText: '스스로 계획을 세우고 진도를 조절',
        bText: '학원이나 스터디 진도대로 공부',
        a: { field: 1 },
        b: { field: -1 },
    },
    {
        id: 19,
        text: '학습 결과에 대해 평가받을 때 나는…',
        aText: '내가 어떤 사고 과정을 거쳤는지가 중요',
        bText: '다른 사람보다 잘하고 못하는지가 중요',
        a: { field: 1 },
        b: { field: -1 },
    },
    {
        id: 20,
        text: '낯선 과제나 새로운 환경에 놓이면 나는…',
        aText: '먼저 과제의 규칙과 구조를 파악',
        bText: '사람들이 어떻게 하는지 보고 따라하기',
        a: { field: 1 },
        b: { field: -1 },
    },
];

export type RawScore = {
    field: number; // +면 장독립 쪽, -면 장의존 쪽
    tempo: number; // +면 숙고, -면 충동
};

export type LearnerTypeKey = 'FI_R' | 'FD_R' | 'FI_I' | 'FD_I';

export type ResultStats = {
    fieldIndependent: number;
    fieldDependent: number;
    reflective: number;
    impulsive: number;
    typeKey: LearnerTypeKey;
};

const maxField = questions.reduce((sum, q) => {
    const a = Math.abs(q.a.field ?? 0);
    const b = Math.abs(q.b.field ?? 0);
    return sum + Math.max(a, b);
}, 0);

const maxTempo = questions.reduce((sum, q) => {
    const a = Math.abs(q.a.tempo ?? 0);
    const b = Math.abs(q.b.tempo ?? 0);
    return sum + Math.max(a, b);
}, 0);

export function applyAnswer(
    prev: RawScore,
    questionIndex: number,
    answer: 'a' | 'b',
): RawScore {
    const q = questions[questionIndex];
    const delta = answer === 'a' ? q.a : q.b;
    return {
        field: prev.field + (delta.field ?? 0),
        tempo: prev.tempo + (delta.tempo ?? 0),
    };
}

function scoreToPercent(score: number, max: number): number {
    if (max === 0) return 50;
    const clamped = Math.max(-max, Math.min(max, score));
    return Math.round(((clamped + max) / (2 * max)) * 100); // -max~+max → 0~100
}

export function toResult(raw: RawScore): ResultStats {
    const fieldIndependent = scoreToPercent(raw.field, maxField);
    const reflective = scoreToPercent(raw.tempo, maxTempo);
    const fieldDependent = 100 - fieldIndependent;
    const impulsive = 100 - reflective;

    const fieldType = fieldIndependent >= 50 ? 'FI' : 'FD';
    const tempoType = reflective >= 50 ? 'R' : 'I';
    const typeKey = `${fieldType}_${tempoType}` as LearnerTypeKey;

    return {
        fieldIndependent,
        fieldDependent,
        reflective,
        impulsive,
        typeKey,
    };
}

// --------- 결과 화면에서 쓸 프로필 정보 ---------

export type TypeProfile = {
    key: LearnerTypeKey;
    label: string;      // 예: "장독립·숙고형"
    title: string;      // 예: "분석형 학습자"
    tags: string[];     // 예: ["논리적", "자기주도", "탐구형"]
    summary: string;
};


export const typeProfiles: Record<LearnerTypeKey, TypeProfile> = {
    FI_R: {
        key: 'FI_R',
        label: '장독립·숙고형',
        title: '분석형 학습자',
        tags: ['자기주도', '신중함', '분석적'],
        summary:
            '혼자서도 공부 방향을 잘 잡는 편이에요.\n' +
            '바로 결정하기보다는 충분히 생각한 뒤 움직여요.\n' +
            '겉보기엔 느려 보여도, 한 번 이해하면 오래 가요.\n\n' +
            '공부할 때 이렇게 해보세요\n' +
            '• 전체 구조 → 세부 내용 순서로 공부하면 가장 잘 맞아요.\n' +
            '• 시작이 늦어질 수 있으니 “완벽하지 않아도 일단 시작”을 목표로 잡아보세요.\n' +
            '• 마지막 점검용 질문은 꼭 활용하면 좋아요.\n\n' +
            '연애할 때 이렇게 하면 좋아요\n' +
            '• 표현까지 시간이 오래 걸릴 수 있어요.\n' +
            '• “천천히 생각하는 편이야. 마음은 있어” 같은 말이 도움이 돼요.\n' +
            '• 감정 표현보다는 정리된 말, 진지한 대화가 편한 타입이에요.',
    },
    FD_R: {
        key: 'FD_R',
        label: '장의존·숙고형',
        title: '협력형 학습자',
        tags: ['맥락형', '신중함', '협력형'],
        summary:
            '예시, 설명, 주변 맥락이 있어야 이해가 잘 돼요.\n' +
            '혼자 고민을 오래 하는 편이에요.\n' +
            '확신이 생길 때까지 시간을 들여요.\n\n' +
            '공부할 때 이렇게 해보세요\n' +
            '• 사례·문제·설명과 함께 공부하면 훨씬 좋아요.\n' +
            '• 스터디나 질문을 활용하는 게 큰 도움이 돼요.\n' +
            '• “질문 하나만 정해서 물어보기”를 추천해요.\n\n' +
            '연애할 때 이렇게 하면 좋아요\n' +
            '• 상대의 말투, 반응에 민감한 편이에요.\n' +
            '• 생각할 시간이 필요할 수 있어요.\n' +
            '• “조금 생각해도 괜찮아?”라고 말해보세요.',
    },
    FI_I: {
        key: 'FI_I',
        label: '장독립·충동형',
        title: '창의형 학습자',
        tags: ['빠른추진', '도전형', '창의적'],
        summary:
            '혼자서 판단하고 바로 행동하는 편이에요.\n' +
            '생각보다 속도와 추진력이 강점이에요.\n' +
            '대신 실수가 생기기 쉬워요.\n\n' +
            '공부할 때 이렇게 해보세요\n' +
            '• 문제를 먼저 풀고 감을 잡는 방식이 잘 맞아요.\n' +
            '• “마무리 점검 시간 5분”을 꼭 확보해요.\n' +
            '• 왜 틀렸는지만 간단히 정리해도 충분해요.\n\n' +
            '연애할 때 이렇게 하면 좋아요\n' +
            '• 표현도 빠른 편이에요.\n' +
            '• “지금 이 말, 바로 해도 괜찮을까?” 한 번 멈추면 좋아요.\n' +
            '• 상대가 신중한 타입이면 속도 차이를 이해해주는 게 중요해요.',
    },
    FD_I: {
        key: 'FD_I',
        label: '장의존·충동형',
        title: '사회형 학습자',
        tags: ['활발함', '공감형', '즉흥형'],
        summary:
            '사람들과 함께할 때 에너지가 나요.\n' +
            '분위기와 감정에 영향을 많이 받아요.\n' +
            '바로 시작하고 바로 반응하는 타입이에요.\n\n' +
            '공부할 때 이렇게 해보세요\n' +
            '• 스터디, 같이 공부하는 환경이 잘 맞아요.\n' +
            '• 오늘 할 일 3가지만 정하기를 추천해요.\n' +
            '• 자주 나오는 실수 유형만 체크해도 효과가 커요.\n\n' +
            '연애할 때 이렇게 하면 좋아요\n' +
            '• 표현이 빠르고 솔직해서 매력이 커요.\n' +
            '• “바쁜 거야? 내가 좀 불안해졌어”라고 말해보세요.\n' +
            '• 혼자 상상하지 말고 감정을 나눠보는 게 좋아요.',
    },
};
