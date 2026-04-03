import type { ScaffoldingPayload } from '../../api/ocr';

export const tableLayoutFixture: ScaffoldingPayload = {
    title: '프로그램 소개',
    extractedText:
        '프로그램 소개\n1. 커리어세션\n시간 직군 강연명\n10:30 공통 2025 넥토리얼 시작하기\n13:00 게임아트(3D) 게임개발에서의 3D 아티스트\n14:00 게임아트(2D) 2025년 2D 아티스트의 생존기\n15:00 게임프로그래밍 게임 프로그래머로 레벨업',
    blanks: [
        { id: 0, word: '프로그램 소개' },
        { id: 1, word: '커리어세션' },
        { id: 2, word: '게임프로그래밍' },
        { id: 3, word: '레벨업' },
    ],
    blankItems: [
        { blank_index: 0, word: '프로그램 소개', page_index: 0 },
        { blank_index: 1, word: '커리어세션', page_index: 0 },
        { blank_index: 2, word: '게임프로그래밍', page_index: 0 },
        { blank_index: 3, word: '레벨업', page_index: 0 },
    ],
    pages: [
        {
            original_text:
                '프로그램 소개\n1. 커리어세션\n10:30 공통 2025 넥토리얼 시작하기\n13:00 게임아트(3D) 게임개발에서의 3D 아티스트\n14:00 게임아트(2D) 2025년 2D 아티스트의 생존기\n15:00 게임프로그래밍 게임 프로그래머로 레벨업',
            keywords: ['프로그램 소개', '커리어세션', '게임프로그래밍', '레벨업'],
            tables: [
                {
                    rows: [
                        ['시간', '직군', '강연명'],
                        ['10:30', '공통', '2025 넥토리얼 시작하기'],
                        ['13:00', '게임아트(3D)', '게임개발에서의 3D 아티스트'],
                        ['14:00', '게임아트(2D)', '2025년 2D 아티스트의 생존기'],
                        ['15:00', '게임프로그래밍', '게임 프로그래머로 레벨업'],
                    ],
                },
            ],
            layout_blocks: [
                { text: '프로그램 소개', x: 0.08, y: 0.03, width: 0.28, height: 0.05 },
                { text: '1', x: 0.10, y: 0.13, width: 0.03, height: 0.04 },
                { text: '커리어세션', x: 0.16, y: 0.13, width: 0.18, height: 0.04 },
                { text: '시간', x: 0.11, y: 0.21, width: 0.12, height: 0.035 },
                { text: '직군', x: 0.31, y: 0.21, width: 0.12, height: 0.035 },
                { text: '강연명', x: 0.54, y: 0.21, width: 0.18, height: 0.035 },
                { text: '10:30', x: 0.11, y: 0.27, width: 0.12, height: 0.035 },
                { text: '공통', x: 0.31, y: 0.27, width: 0.10, height: 0.035 },
                { text: '2025 넥토리얼 시작하기', x: 0.54, y: 0.27, width: 0.31, height: 0.035 },
                { text: '13:00', x: 0.11, y: 0.33, width: 0.12, height: 0.035 },
                { text: '게임아트(3D)', x: 0.28, y: 0.33, width: 0.19, height: 0.035 },
                { text: '게임개발에서의 3D 아티스트', x: 0.54, y: 0.33, width: 0.30, height: 0.035 },
                { text: '14:00', x: 0.11, y: 0.39, width: 0.12, height: 0.035 },
                { text: '게임아트(2D)', x: 0.28, y: 0.39, width: 0.19, height: 0.035 },
                { text: '2025년 2D 아티스트의 생존기', x: 0.54, y: 0.39, width: 0.30, height: 0.035 },
                { text: '15:00', x: 0.11, y: 0.45, width: 0.12, height: 0.035 },
                { text: '게임프로그래밍', x: 0.26, y: 0.45, width: 0.20, height: 0.035 },
                { text: '게임 프로그래머로 레벨업', x: 0.54, y: 0.45, width: 0.27, height: 0.035 },
            ],
        },
    ],
};

export const centeredTitleFixture: ScaffoldingPayload = {
    title: '손글씨 메모',
    extractedText: '제목\n오늘은 벡터와 행렬을 정리한다.\n핵심은 좌표 변환이다.',
    blanks: [
        { id: 0, word: '제목' },
        { id: 1, word: '좌표 변환' },
    ],
    blankItems: [
        { blank_index: 0, word: '제목', page_index: 0 },
        { blank_index: 1, word: '좌표 변환', page_index: 0 },
    ],
    pages: [
        {
            original_text: '제목\n오늘은 벡터와 행렬을 정리한다.\n핵심은 좌표 변환이다.',
            keywords: ['제목', '좌표 변환'],
            layout_blocks: [
                { text: '제목', x: 0.40, y: 0.08, width: 0.16, height: 0.06 },
                { text: '오늘은 벡터와 행렬을 정리한다.', x: 0.14, y: 0.26, width: 0.54, height: 0.05 },
                { text: '핵심은 좌표 변환이다.', x: 0.22, y: 0.40, width: 0.38, height: 0.05 },
            ],
        },
    ],
};
