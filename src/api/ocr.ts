// src/api/ocr.ts
export type BlankItem = {
    id: number;
    word: string;
    meaningLong?: string;
};

export type ScaffoldingPayload = {
    title: string;
    extractedText: string;
    blanks: BlankItem[];
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
};

const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:8000';

export async function runOcr(fileUri: string, cropInfo?: { px: number; py: number; pw: number; ph: number }): Promise<ScaffoldingPayload> {
    console.log('🔵 OCR 요청 시작 - fileUri:', fileUri, 'cropInfo:', cropInfo);

    const form = new FormData();

    // 웹 환경에서는 파일 URI를 Blob으로 변환해야 함
    const fileExtension = fileUri.split('.').pop()?.toLowerCase() || 'jpg';
    const mimeType = fileExtension === 'png' ? 'image/png' : 'image/jpeg';

    try {
        // 파일 URI를 fetch로 가져와서 Blob으로 변환
        const response = await fetch(fileUri);
        const blob = await response.blob();

        // Blob을 File 객체로 변환 (웹 표준)
        const file = new File([blob], `photo.${fileExtension}`, { type: mimeType });

        form.append('file', file);
        console.log('🔵 FormData 생성 완료 (Blob):', { name: file.name, type: file.type, size: file.size });
    } catch (blobError) {
        // Blob 변환 실패 시 폴백 (모바일 네이티브)
        console.log('⚠️ Blob 변환 실패, RN 형식 사용:', blobError);
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
        console.log('🔵 Crop 정보 추가:', cropInfo);
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

    console.log('🔵 응답 상태:', res.status);

    if (!res.ok) {
        const errorText = await res.text();
        console.error('🔴 OCR 오류 응답:', errorText);
        throw new Error(`OCR HTTP ${res.status}: ${errorText}`);
    }
    const data = (await res.json()) as any;

    if (data.status === 'limit_reached') {
        throw new Error(data.message || '이용가능한 무료 횟수를 다 사용하셨습니다');
    }

    if (data.status === 'error') throw new Error(data.message);

    const inner = data.data ?? data;

    let originalText: string;
    let keywords: string[];

    // 백엔드가 pages 배열 반환 (PDF/다중 이미지)
    if (Array.isArray(inner.pages) && inner.pages.length > 0) {
        originalText = inner.pages
            .map((p: { original_text?: string }) => p?.original_text ?? '')
            .join('\n\n');
        const kwSet = new Set<string>();
        for (const p of inner.pages) {
            const kws = Array.isArray(p.keywords) ? p.keywords : [];
            kws.forEach((w: string) => kwSet.add(String(w).trim()));
        }
        keywords = Array.from(kwSet).filter(Boolean);
    } else {
        // 하위 호환: 단일 original_text, keywords
        originalText = inner.original_text ?? '';
        keywords = Array.isArray(inner.keywords) ? inner.keywords : [];
    }

    const blanks = keywords.map((word, idx) => ({
        id: idx,
        word: word,
        meaningLong: `${word}의 뜻 (AI 생성 예정)`,
    }));

    return {
        title: '학습 자료',
        extractedText: originalText,
        blanks: blanks,
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



// ocr_app.py의 /ocr/save-test 스펙: 페이지·빈칸·사용자 답변 모두 JSON
export type PageItem = {
    original_text: string;
    keywords: string[];
};

export type BlankItemSave = {
    blank_index: number;
    word: string;
    page_index: number;
};

export type SaveTestRequest = {
    subject_name: string;
    study_name?: string;
    /** 단일 페이지 호환 */
    original?: string;
    answers?: string[];
    /** 페이지별 원문·키워드 (페이징 시 사용) */
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

    const res = await fetch(`${API_BASE}/ocr/save-test`, {
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
    user_answers: string[];
    answer: string[];
};

export async function gradeStudy(payload: GradeStudyRequest) {
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

/** 복습 시 DB에 저장된 퀴즈를 ScaffoldingPayload 형태로 가져오기 */
export type QuizForReviewResponse = {
    status: string;
    data?: {
        quiz_id: number;
        title: string;
        extractedText: string;
        blanks: BlankItem[];
        user_answers?: string[];
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
    return {
        title: d.title,
        extractedText: d.extractedText,
        blanks: d.blanks ?? [],
        user_answers: d.user_answers,
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

// 복습 완료 시 리워드 제공 & 사용자 답변 저장
export type ReviewStudyRequest = {
    quiz_id: number;
    user_answers: string[];
};

export async function submitReviewStudy(payload: ReviewStudyRequest) {
    const { getToken } = await import('../lib/storage');
    const token = await getToken();

    const res = await fetch(`${API_BASE}/review-study`, {
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
