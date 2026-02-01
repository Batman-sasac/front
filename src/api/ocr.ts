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

const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:8000';

export async function runOcr(fileUri: string): Promise<ScaffoldingPayload> {
    console.log('🔵 OCR 요청 시작 - fileUri:', fileUri);

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

    const res = await fetch(`${API_BASE}/ocr`, {
        method: 'POST',
        body: form,
        headers: {
            'Accept': 'application/json',
        },
    });

    console.log('🔵 응답 상태:', res.status);

    if (!res.ok) {
        const errorText = await res.text();
        console.error('🔴 OCR 오류 응답:', errorText);
        throw new Error(`OCR HTTP ${res.status}: ${errorText}`);
    }
    const data = (await res.json()) as OcrResponse;

    if (data.status === 'error') throw new Error(data.message);

    // 백엔드 응답을 ScaffoldingPayload로 변환
    const blanks = data.keywords.map((word, idx) => ({
        id: idx,
        word: word,
        meaningLong: `${word}의 뜻 (AI 생성 예정)`,
    }));

    return {
        title: '학습 자료',
        extractedText: data.original_text,
        blanks: blanks,
    };
}



// ocr_app.py의 /ocr/save-test 스펙에 맞춤
export type SaveTestRequest = {
    subject_name: string;
    original: string;
    quiz: string;
    answers: string[];
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
