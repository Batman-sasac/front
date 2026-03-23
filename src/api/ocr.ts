// src/api/ocr.ts
export type BlankItem = {
    id: number;
    word: string;
    meaningLong?: string;
};

/** 클로바 enableTableDetection → 백엔드가 내려주는 표 블록 (셀 문자열 그리드) */
export type OcrTableBlock = {
    rows: string[][];
};

/** OCR 필드별 박스(페이지 대비 0~1 정규화). 읽기 순서와 동일 → 원문 레이아웃 재현용 */
export type LayoutBlock = {
    text: string;
    x: number;
    y: number;
    width: number;
    height: number;
};

// ocr_app.py의 /ocr/save 스펙: 페이지, 빈칸, 사용자 답변 모두 JSON
export type PageItem = {
    original_text: string;
    keywords: string[];
    /** General OCR 표 인식 결과; 없으면 생략 */
    tables?: OcrTableBlock[];
    /** 필드 단위 좌표(정규화); 없으면 생략 */
    layout_blocks?: LayoutBlock[];
};

export type BlankItemSave = {
    blank_index: number;
    word: string;
    page_index: number;
};

/** DB `ocr_text.layout_meta` — 복습 시 원본 좌표 복원용 */
export type LayoutMeta = {
    /** 학습 저장 시 이미지 인덱스별 크롭(px). JSON 직렬화 시 키는 문자열 */
    crops_by_source_index?: Record<string, { px: number; py: number; pw: number; ph: number }>;
};

export type ScaffoldingPayload = {
    title: string;
    extractedText: string;
    blanks: BlankItem[];
    pages?: PageItem[];
    blankItems?: BlankItemSave[];
    /** 복습 조회 등 */
    user_answers?: string[];
    /** 복습용 원본 이미지 URL (OCR 좌표 스케일 계산에 필요) */
    image_url?: string;
    /** 채점 저장 시 함께 보관, 복습 시 layout + 크롭 복원 */
    layout_meta?: LayoutMeta;
};

/**
 * Clova layout_blocks는 OCR에 넣은 이미지(크롭 영역) 기준 0~1 정규화.
 * 원본 전체 이미지 위에 겹칠 때는 크롭(px,py,pw,ph)을 반영해 원본 픽셀 기준 0~1로 변환한다.
 * 크롭 없이 전체를 OCR했으면 crop을 생략하면 된다.
 */
export function layoutBlocksToFullImageCoords(
    blocks: LayoutBlock[],
    crop: { px: number; py: number; pw: number; ph: number } | undefined,
    imageNaturalWidth: number,
    imageNaturalHeight: number,
): LayoutBlock[] {
    if (!blocks.length || imageNaturalWidth <= 0 || imageNaturalHeight <= 0) return [];
    const px = crop?.px ?? 0;
    const py = crop?.py ?? 0;
    const pw = crop?.pw ?? imageNaturalWidth;
    const ph = crop?.ph ?? imageNaturalHeight;
    return blocks.map((b) => ({
        text: b.text,
        x: (px + b.x * pw) / imageNaturalWidth,
        y: (py + b.y * ph) / imageNaturalHeight,
        width: (b.width * pw) / imageNaturalWidth,
        height: (b.height * ph) / imageNaturalHeight,
    }));
}

/** 컨테이너 안에서 이미지를 contain 할 때의 표시 사각형 (좌상단 dx,dy / 크기 dw,dh) */
export function getOcrDisplayRect(containerW: number, containerH: number, iw: number, ih: number) {
    if (containerW <= 0 || containerH <= 0) return { dx: 0, dy: 0, dw: 0, dh: 0 };
    if (iw <= 0 || ih <= 0) return { dx: 0, dy: 0, dw: containerW, dh: containerH };
    const s = Math.min(containerW / iw, containerH / ih);
    const dw = iw * s;
    const dh = ih * s;
    const dx = (containerW - dw) / 2;
    const dy = (containerH - dh) / 2;
    return { dx, dy, dw, dh };
}

export type OcrResponse =
    | { status: 'success'; original_text: string; keywords: string[] }
    | { status: 'error'; message: string };

export type OcrUsageResponse = {
    status: 'ok' | 'limit_reached' | 'error';
    pages_used: number;
    pages_limit: number;
    remaining: number;
    message?: string;
    /** 백엔드에서 화이트리스트 유저인 경우 내려주는 플래그 */
    is_unlimited?: boolean;
};

import config from '../lib/config';

const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL ?? config.apiBaseUrl;

/** POST /ocr 의 pages[].tables 정규화 */
function normalizeOcrTables(raw: unknown): OcrTableBlock[] | undefined {
    if (!Array.isArray(raw) || raw.length === 0) return undefined;
    const out: OcrTableBlock[] = [];
    for (const t of raw) {
        if (!t || typeof t !== 'object') continue;
        const rows = (t as { rows?: unknown }).rows;
        if (!Array.isArray(rows) || rows.length === 0) continue;
        const grid = rows.map((r) =>
            Array.isArray(r) ? r.map((c) => String(c ?? '')) : [],
        );
        if (grid.some((row) => row.length > 0)) {
            out.push({ rows: grid });
        }
    }
    return out.length > 0 ? out : undefined;
}

function normalizeLayoutBlocks(raw: unknown): LayoutBlock[] | undefined {
    if (!Array.isArray(raw) || raw.length === 0) return undefined;
    const out: LayoutBlock[] = [];
    for (const b of raw) {
        if (!b || typeof b !== 'object') continue;
        const o = b as Record<string, unknown>;
        const text = String(o.text ?? '').trim();
        if (!text) continue;
        const x = Number(o.x);
        const y = Number(o.y);
        const width = Number(o.width);
        const height = Number(o.height);
        if ([x, y, width, height].some((n) => Number.isNaN(n))) continue;
        out.push({ text, x, y, width, height });
    }
    return out.length > 0 ? out : undefined;
}

/** DB/API에서 온 page 한 줄을 PageItem으로 (layout_blocks·tables 유지) */
export function normalizePageItemFromApi(raw: unknown): PageItem | null {
    if (!raw || typeof raw !== 'object') return null;
    const o = raw as Record<string, unknown>;
    const original_text = String(o.original_text ?? '');
    const rawKw = o.keywords;
    const keywords = Array.isArray(rawKw)
        ? rawKw.map((k) => String(k ?? '').trim()).filter(Boolean)
        : [];
    const tables = normalizeOcrTables(o.tables);
    const layout_blocks = normalizeLayoutBlocks(o.layout_blocks);
    const page: PageItem = {
        original_text,
        keywords,
        ...(tables ? { tables } : {}),
        ...(layout_blocks ? { layout_blocks } : {}),
    };
    return page;
}

export async function runOcr(fileUri: string, cropInfo?: { px: number; py: number; pw: number; ph: number }): Promise<ScaffoldingPayload> {
    console.log('OCR 요청 시작 - fileUri:', fileUri, 'cropInfo:', cropInfo);

    const form = new FormData();

    // 모바일 환경에서 파일 URI를 Blob으로 변환 시도
    const fileExtension = fileUri.split('.').pop()?.toLowerCase() || 'jpg';
    const mimeType = fileExtension === 'png' ? 'image/png' : 'image/jpeg';

    try {
        // 모바일 환경에서 파일 URI를 Blob으로 변환 시도
        const response = await fetch(fileUri);
        const blob = await response.blob();

        // Blob을 File 객체로 변환 (웹 호환)
        const file = new File([blob], `photo.${fileExtension}`, { type: mimeType });

        form.append('file', file);
        console.log('FormData 생성 완료 (Blob):', { name: file.name, type: file.type, size: file.size });
    } catch (blobError) {
        // Blob 변환 실패 시 RN 방식으로 fallback
        console.log('Blob 변환 실패, RN 방식 사용:', blobError);
        form.append('file', {
            uri: fileUri,
            name: `photo.${fileExtension}`,
            type: mimeType,
        } as any);
    }

    // crop 정보가 있으면 form에 추가
    if (cropInfo) {
        form.append('crop_x', String(cropInfo.px));
        form.append('crop_y', String(cropInfo.py));
        form.append('crop_width', String(cropInfo.pw));
        form.append('crop_height', String(cropInfo.ph));
        console.log('Crop 정보 추가:', cropInfo);
    }

    // 토큰 가져오기
    const { getToken } = await import('../lib/storage');
    const token = await getToken();

    const res = await fetch(`${API_BASE}/ocr`, {
        method: 'POST',
        body: form,
        headers: {
            'Accept': 'application/json',
            'Authorization': `Bearer ${token || ''}`,
        },
    });

    console.log('OCR 응답 상태:', res.status);

    if (!res.ok) {
        const errorText = await res.text();
        console.error('OCR 오류 응답:', errorText);
        throw new Error(`OCR HTTP ${res.status}: ${errorText}`);
    }
    const data = (await res.json()) as any;

    if (data.status === 'limit_reached') {
        throw new Error(data.message || '이용 가능한 무료 횟수를 모두 사용했습니다.');
    }

    const inner = data.data ?? data;

    let pages: PageItem[] = [];
    let originalText: string;
    let blankItems: BlankItemSave[] = [];
    const normalizeKeyword = (value: unknown) => String(value ?? '').trim();

    // 백엔드가 pages 배열 반환 (PDF/다중 이미지)
    if (Array.isArray(inner.pages) && inner.pages.length > 0) {
        pages = inner.pages.map(
            (p: {
                original_text?: string;
                keywords?: string[];
                tables?: unknown;
                layout_blocks?: unknown;
            }) => ({
                original_text: p?.original_text ?? '',
                keywords: Array.isArray(p?.keywords)
                    ? p.keywords.map(normalizeKeyword).filter(Boolean)
                    : [],
                tables: normalizeOcrTables(p?.tables),
                layout_blocks: normalizeLayoutBlocks(p?.layout_blocks),
            }),
        );

        originalText = pages
            .map((p) => p.original_text ?? '')
            .join('\n\n');

        const kwSet = new Set<string>();
        for (let pageIndex = 0; pageIndex < pages.length; pageIndex += 1) {
            const page = pages[pageIndex];
            for (const word of page.keywords) {
                if (kwSet.has(word)) continue;
                kwSet.add(word);
                blankItems.push({
                    blank_index: blankItems.length,
                    word,
                    page_index: pageIndex,
                });
            }
        }
    } else {
        // 하위 호환: 단일 original_text, keywords
        originalText = inner.original_text ?? '';
        const rawKeywords = Array.isArray(inner.keywords)
            ? inner.keywords.map(normalizeKeyword).filter(Boolean)
            : [];
        const kwSet = new Set<string>();
        const keywords = rawKeywords.filter((word: string) => {
            if (kwSet.has(word)) return false;
            kwSet.add(word);
            return true;
        });
        pages = [{ original_text: originalText, keywords }];
        blankItems = keywords.map((word: string, idx: number) => ({
            blank_index: idx,
            word,
            page_index: 0,
        }));
    }

    const blanks = blankItems.map((blank) => ({
        id: blank.blank_index,
        word: blank.word,
        meaningLong: `${blank.word} 뜻 (AI 생성 예정)`,
    }));

    return {
        title: '학습 자료',
        extractedText: originalText,
        blanks: blanks,
        pages,
        blankItems,
    };
}

export async function getOcrUsage(): Promise<OcrUsageResponse> {
    const { getToken } = await import('../lib/storage');
    const token = await getToken();

    const res = await fetch(`${API_BASE}/ocr/usage`, {
        method: 'GET',
        headers: {
            'Accept': 'application/json',
            'Authorization': `Bearer ${token || ''}`,
        },
    });

    if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`OCR Usage HTTP ${res.status}: ${errorText}`);
    }

    return res.json();
}

export type SaveTestRequest = {
    subject_name: string;
    study_name?: string;
    /** 단일 페이지 호환 */
    original?: string;
    answers?: string[];
    /** 페이지별 원문/키워드 (페이지 사용 시) */
    pages?: PageItem[];
    /** 빈칸 정의 (blank_index 순서 = user_answers 인덱스) */
    blanks?: BlankItemSave[];
    /** 사용자 작성 답변 (빈칸 순서대로) */
    user_answers?: string[];
    quiz?: string;
};

export async function saveTest(payload: SaveTestRequest) {
    const { getToken } = await import('../lib/storage');
    const token = await getToken();

    const res = await fetch(`${API_BASE}/ocr/save`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token || ''}`,
        },
        body: JSON.stringify(payload),
    });

    if (!res.ok) throw new Error(`SAVE HTTP ${res.status}`);
    return res.json();
}

export type GradeStudyRequest = {
    quiz_id: number;
    correct_answers: string[];
    answer: string[];
    user_answer: string[];
    quiz_html: string;
    ocr_text: {
        pages: PageItem[];
        blanks: BlankItemSave[];
        quiz: { raw: string };
        layout_meta?: LayoutMeta;
    };
    /** 페이지별 정답 수 (pages index 기준) */
    page_correct_counts?: number[];
    /** 페이지별 문항 수 (pages index 기준) */
    page_question_counts?: number[];
    // 백엔드 호환용 추가 필드
    user_answers?: string[];
    study_name?: string;
    subject_name?: string;
    original_text?: string[];
    keywords?: string[];
    grade_cnt?: number;
};

/** 백엔드 POST /study/grade 응답 */
export type GradeStudyResponse = {
    status: 'success' | 'error';
    score?: number;
    reward_given?: number;
    /** 성공 시 누적 포인트 (grade_cnt 0이면 null) */
    new_points?: number | null;
    message?: string;
};

export async function gradeStudy(payload: GradeStudyRequest): Promise<GradeStudyResponse> {
    const { getToken } = await import('../lib/storage');
    const token = await getToken();

    const res = await fetch(`${API_BASE}/study/grade`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token || ''}`,
        },
        body: JSON.stringify(payload),
    });

    if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Grade HTTP ${res.status}: ${errorText}`);
    }
    return res.json();
}

/** 복습 시 DB에 저장한 퀴즈를 ScaffoldingPayload 형태로 조회 */
export type QuizForReviewResponse = {
    status: string;
    data?: {
        quiz_id: number;
        title: string;
        extractedText: string;
        blanks: BlankItem[];
        user_answers?: string[];
        image_url?: string;
        /** ocr_data.ocr_text.pages — layout_blocks·tables 포함 */
        pages?: unknown[];
        layout_meta?: LayoutMeta;
    };
    message?: string;
};

export async function getQuizForReview(quizId: number): Promise<ScaffoldingPayload & { user_answers?: string[] }> {
    const { getToken } = await import('../lib/storage');
    const token = await getToken();

    const res = await fetch(`${API_BASE}/ocr/quiz/${quizId}`, {
        method: 'GET',
        headers: {
            'Accept': 'application/json',
            'Authorization': `Bearer ${token || ''}`,
        },
    });

    if (!res.ok) throw new Error(`퀴즈 조회 HTTP ${res.status}`);
    const json = (await res.json()) as QuizForReviewResponse;
    if (json.status !== 'success' || !json.data) throw new Error(json.message ?? '퀴즈를 불러올 수 없습니다.');

    const d = json.data;
    let pages: PageItem[] | undefined;
    if (Array.isArray(d.pages) && d.pages.length > 0) {
        const parsed = d.pages.map((p) => normalizePageItemFromApi(p)).filter((p): p is PageItem => p != null);
        if (parsed.length > 0) pages = parsed;
    }
    return {
        title: d.title,
        extractedText: d.extractedText,
        blanks: d.blanks ?? [],
        user_answers: d.user_answers,
        image_url: d.image_url,
        pages,
        layout_meta: d.layout_meta,
    };
}

// 홈화면 주간/월간 데이터
export type WeeklyGrowthResponse = {
    labels: string[];
    data: number[];
};

export type MonthlyStatsResponse = {
    status: string;
    compare: {
        last_month_name: string;
        last_month_count: number;
        this_month_name: string;
        this_month_count: number;
        target_count: number;
        diff: number;
    };
};

export async function getWeeklyGrowth(): Promise<WeeklyGrowthResponse> {
    const { getToken } = await import('../lib/storage');
    const token = await getToken();

    const res = await fetch(`${API_BASE}/cycle/stats/weekly-growth`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token || ''}`,
        },
    });

    if (!res.ok) throw new Error(`Weekly Stats HTTP ${res.status}`);
    return res.json();
}

// 복습 완료 시 리워드 지급 및 사용자 답변 저장
export type ReviewStudyRequest = {
    quiz_id: number;
    user_answers: string[];
};

/** 백엔드 POST /study/review-study 응답 */
export type ReviewStudyResponse = {
    status: 'success' | 'error';
    new_points?: number;
    message?: string;
};

export async function submitReviewStudy(payload: ReviewStudyRequest): Promise<ReviewStudyResponse> {
    const { getToken } = await import('../lib/storage');
    const token = await getToken();

    const res = await fetch(`${API_BASE}/study/review-study`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token || ''}`,
        },
        body: JSON.stringify(payload),
    });

    if (!res.ok) throw new Error(`Review Study HTTP ${res.status}`);
    return res.json();
}

// 힌트 가져오기
export type HintResponse = {
    status: string;
    quiz_id: number;
    data: Array<{
        h1: string; // 초성
        h2: string; // 첫 글자
        h3: string; // 마지막 글자
    }>;
};

export async function getHint(quizId: number): Promise<HintResponse> {
    const { getToken } = await import('../lib/storage');
    const token = await getToken();

    const res = await fetch(`${API_BASE}/study/hint/${quizId}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token || ''}`,
        },
    });

    if (!res.ok) throw new Error(`Hint HTTP ${res.status}`);
    return res.json();
}

export async function getMonthlyStats(): Promise<MonthlyStatsResponse> {
    const { getToken } = await import('../lib/storage');
    const token = await getToken();

    const res = await fetch(`${API_BASE}/cycle/learning-stats`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token || ''}`,
        },
    });

    if (!res.ok) throw new Error(`Monthly Stats HTTP ${res.status}`);
    return res.json();
}

