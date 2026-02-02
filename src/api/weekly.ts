// src/api/weekly.ts
const API_BASE_URL = 'http://127.0.0.1:8000';

export const fetchWeeklyGrowth = async (): Promise<{ labels: string[]; data: number[] } | null> => {
    try {
        const { getToken } = await import('../lib/storage');
        const token = await getToken();

        const response = await fetch(`${API_BASE_URL}/cycle/stats/weekly-growth`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token || ''}`,
            },
        });

        if (!response.ok) {
            throw new Error('주간 그래프 데이터 로드 실패');
        }

        const result = await response.json();

        if (result.error) {
            console.error('주간 그래프 에러:', result.error);
            return null;
        }

        return {
            labels: result.labels || [],
            data: result.data || [],
        };
    } catch (error) {
        console.error('fetchWeeklyGrowth 에러:', error);
        return null;
    }
};

export const fetchLearningStats = async (): Promise<{
    last_month_name: string;
    last_month_count: number;
    this_month_name: string;
    this_month_count: number;
    target_count: number;
    diff: number;
    remaining_count: number;
} | null> => {
    try {
        const { getToken } = await import('../lib/storage');
        const token = await getToken();

        const response = await fetch(`${API_BASE_URL}/cycle/learning-stats`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token || ''}`,
            },
        });

        if (!response.ok) {
            throw new Error('월간 통계 데이터 로드 실패');
        }

        const result = await response.json();

        if (result.status !== 'success') {
            console.error('월간 통계 에러:', result.message);
            return null;
        }

        const compare = result.compare;
        return {
            last_month_name: compare.last_month_name,
            last_month_count: compare.last_month_count,
            this_month_name: compare.this_month_name,
            this_month_count: compare.this_month_count,
            target_count: compare.target_count,
            diff: compare.diff,
            remaining_count: Math.max(0, compare.target_count - compare.this_month_count),
        };
    } catch (error) {
        console.error('fetchLearningStats 에러:', error);
        return null;
    }
};
