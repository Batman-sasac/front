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
    /** OCR 레이아웃 블록; 없으면 생략 */
    layout_blocks?: LayoutBlock[];
};

export type BlankItemSave = {
    blank_index: number;
    word: string;
    page_index: number;
};

export type ScaffoldingPayload = {
    title: string;
    extractedText: string;
    blanks: BlankItem[];
    pages?: PageItem[];
    blankItems?: BlankItemSave[];
    layoutMeta?: Record<string, unknown>;
    imageUrl?: string | null;
    user_answers?: string[];
};

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

export type OcrProgressMessage = {
    type: 'ocr_progress';
    status: 'page_done' | 'page_error';
    page: number;
    total_pages: number;
    filename?: string;
};

type RunOcrOptions = {
    fileName?: string;
    mimeType?: string;
    jobId?: string;
    onProgress?: (message: OcrProgressMessage) => void;
};

function getOcrWebSocketUrl(jobId: string) {
    const normalizedBase = (API_BASE ?? '').trim().replace(/\/+$/, '');
    return normalizedBase
        .replace(/^https:\/\//i, 'wss://')
        .replace(/^http:\/\//i, 'ws://') + `/ws/ocr/${jobId}`;
}

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
    for (const block of raw) {
        if (!block || typeof block !== 'object') continue;
        const candidate = block as {
            text?: unknown;
            x?: unknown;
            y?: unknown;
            width?: unknown;
            height?: unknown;
        };
        const text = String(candidate.text ?? '').trim();
        const x = Number(candidate.x);
        const y = Number(candidate.y);
        const width = Number(candidate.width);
        const height = Number(candidate.height);

        if (!text) continue;
        if (
            !Number.isFinite(x)
            || !Number.isFinite(y)
            || !Number.isFinite(width)
            || !Number.isFinite(height)
        ) {
            continue;
        }

        out.push({
            text,
            x,
            y,
            width,
            height,
        });
    }

    return out.length > 0 ? out : undefined;
}

function normalizePageItem(raw: {
    original_text?: string;
    keywords?: string[];
    tables?: unknown;
    layout_blocks?: unknown;
}): PageItem {
    const normalizeKeyword = (value: unknown) => String(value ?? '').trim();

    return {
        original_text: raw?.original_text ?? '',
        keywords: Array.isArray(raw?.keywords)
            ? raw.keywords.map(normalizeKeyword).filter(Boolean)
            : [],
        tables: normalizeOcrTables(raw?.tables),
        layout_blocks: normalizeLayoutBlocks(raw?.layout_blocks),
    };
}

export async function runOcr(
    fileUri: string,
    cropInfo?: { px: number; py: number; pw: number; ph: number },
    options?: RunOcrOptions,
): Promise<ScaffoldingPayload> {
    console.log('OCR 요청 시작 - fileUri:', fileUri, 'cropInfo:', cropInfo);

    const form = new FormData();

    const nameFromMeta = options?.fileName?.trim();
    const nameFromUri = fileUri.split('/').pop()?.split('?')[0] ?? '';
    const normalizedFileName = nameFromMeta || nameFromUri || 'upload';
    const fileExtensionMatch = normalizedFileName.match(/\.([a-z0-9]+)$/i);
    const fileExtension = fileExtensionMatch?.[1]?.toLowerCase()
        || fileUri.split('.').pop()?.toLowerCase()
        || 'jpg';
    const mimeType = options?.mimeType
        || (fileExtension === 'png'
            ? 'image/png'
            : fileExtension === 'pdf'
                ? 'application/pdf'
                : 'image/jpeg');
    const uploadFileName = normalizedFileName.includes('.')
        ? normalizedFileName
        : `upload.${fileExtension}`;

    try {
        // 모바일 환경에서 파일 URI를 Blob으로 변환 시도
        const response = await fetch(fileUri);
        const blob = await response.blob();

        // Blob을 File 객체로 변환 (웹 호환)
        const file = new File([blob], uploadFileName, { type: mimeType });

        form.append('file', file);
        console.log('FormData 생성 완료 (Blob):', { name: file.name, type: file.type, size: file.size });
    } catch (blobError) {
        // Blob 변환 실패 시 RN 방식으로 fallback
        console.log('Blob 변환 실패, RN 방식 사용:', blobError);
        form.append('file', {
            uri: fileUri,
            name: uploadFileName,
            type: mimeType,
        } as any);
    }

    // crop 정보가 있으면 form에 추가 (서버에서 crop)
    // 참고: 상위에서 "크롭된 파일 자체"를 만들어 넘기는 경우 cropInfo는 undefined로 들어온다.
    if (cropInfo && mimeType.startsWith('image/')) {
        form.append('crop_x', String(cropInfo.px));
        form.append('crop_y', String(cropInfo.py));
        form.append('crop_width', String(cropInfo.pw));
        form.append('crop_height', String(cropInfo.ph));
        console.log('Crop 정보 추가:', cropInfo);
    }

    if (options?.jobId) {
        form.append('job_id', options.jobId);
    }

    // 토큰 가져오기
    const { getToken } = await import('../lib/storage');
    const token = await getToken();
    const shouldTrackProgress = !!options?.jobId && typeof options?.onProgress === 'function';
    let ws: WebSocket | null = null;

    if (shouldTrackProgress && options?.jobId) {
        try {
            ws = new WebSocket(getOcrWebSocketUrl(options.jobId));
            ws.onmessage = (event) => {
                try {
                    const parsed = JSON.parse(String(event.data ?? '')) as OcrProgressMessage;
                    if (parsed?.type === 'ocr_progress') {
                        options.onProgress?.(parsed);
                    }
                } catch (error) {
                    console.warn('OCR progress 메시지 파싱 실패:', error);
                }
            };
            ws.onerror = (event) => {
                console.warn('OCR progress WebSocket 오류:', event);
            };

            await new Promise<void>((resolve) => {
                let settled = false;
                const finish = () => {
                    if (settled) return;
                    settled = true;
                    resolve();
                };

                const timeout = setTimeout(finish, 1200);

                ws!.onopen = () => {
                    clearTimeout(timeout);
                    finish();
                };
                ws!.onclose = () => {
                    clearTimeout(timeout);
                    finish();
                };
                ws!.onerror = () => {
                    clearTimeout(timeout);
                    finish();
                };
            });
        } catch (error) {
            console.warn('OCR progress WebSocket 연결 실패:', error);
            ws = null;
        }
    }

    try {
        let res: Response;
        try {
            res = await fetch(`${API_BASE}/ocr`, {
            method: 'POST',
            body: form,
            headers: {
                'Accept': 'application/json',
                'Authorization': `Bearer ${token || ''}`,
            },
            });
        } catch (e: any) {
            // React Native/Expo에서 네트워크 레벨 실패는 "Network request failed"로 뭉뚱그려진다.
            // URL/파일정보만이라도 남겨서 원인 파악을 쉽게 한다.
            console.error('OCR 네트워크 실패:', {
                message: e?.message ?? String(e),
                apiBase: API_BASE,
                url: `${API_BASE}/ocr`,
                fileUri,
                uploadFileName,
                mimeType,
                cropInfo,
            });
            throw e;
        }

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

        // 백엔드가 pages 배열 반환 (PDF/다중 이미지)
        if (Array.isArray(inner.pages) && inner.pages.length > 0) {
            pages = inner.pages.map(normalizePageItem);

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
                ? inner.keywords.map((value: unknown) => String(value ?? '').trim()).filter(Boolean)
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
    } finally {
        if (ws) {
            setTimeout(() => {
                try {
                    ws?.close();
                } catch (error) {
                    console.warn('OCR progress WebSocket 종료 실패:', error);
                }
            }, 300);
        }
    }
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
        pages?: PageItem[];
        layout_meta?: Record<string, unknown>;
        image_url?: string | null;
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
    const pages = Array.isArray(d.pages)
        ? d.pages.map(normalizePageItem)
        : undefined;

    return {
        title: d.title,
        extractedText: d.extractedText,
        blanks: d.blanks ?? [],
        user_answers: d.user_answers,
        pages,
        blankItems: (d.blanks ?? []).map((blank, index) => ({
            blank_index: typeof blank.id === 'number' ? blank.id : index,
            word: blank.word,
            page_index: 0,
        })),
        layoutMeta: d.layout_meta,
        imageUrl: d.image_url ?? null,
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
