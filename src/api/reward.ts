import config from '../lib/config';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? config.apiBaseUrl;

export type RewardLeaderboardItem = {
    total_reward: number;
    nickname: string;
};

export type MyRewardRankResponse = {
    status: string;
    rank: number | null;
    total_reward: number;
    message?: string;
};

export type AttendanceRewardResponse = {
    status: string;
    is_new_reward: boolean;
    baseXP: number;
    bonusXP: number;
    total_points: number;
    message?: string;
};

export type RandomEventRewardResponse = {
    status: string;
    today_is_event_day: boolean;
    is_new_reward: boolean;
    reward_amount: number;
    total_points: number;
    message?: string;
};

export async function checkAttendanceReward(): Promise<AttendanceRewardResponse> {
    const { getToken } = await import('../lib/storage');
    const token = await getToken();

    const response = await fetch(`${API_BASE_URL}/reward/attendance`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token || ''}`,
        },
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || error.message || '출석 보상 조회 실패');
    }

    return await response.json();
}

export async function claimRandomEventReward(): Promise<RandomEventRewardResponse> {
    const { getToken } = await import('../lib/storage');
    const token = await getToken();

    const response = await fetch(`${API_BASE_URL}/reward/random-event`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token || ''}`,
        },
    });

    const json = await response.json().catch(() => ({}));

    if (!response.ok || json.status === 'error') {
        throw new Error(json.error || json.message || '랜덤 리워드 조회 실패');
    }

    return {
        status: json.status ?? 'success',
        today_is_event_day: Boolean(json.today_is_event_day),
        is_new_reward: Boolean(json.is_new_reward),
        reward_amount: Number(json.reward_amount ?? 0),
        total_points: Number(json.total_points ?? 0),
        message: json.message,
    };
}

export async function getRewardLeaderboard(): Promise<{
    status: string;
    leaderboard: RewardLeaderboardItem[];
}> {
    // 토큰 가져오기 (동적 import로 순환 참조 방지)
    const { getToken } = await import('../lib/storage');
    const token = await getToken();

    const response = await fetch(`${API_BASE_URL}/reward/leaderboard`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token || ''}`,
        },
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '리워드 조회 실패');
    }

    return await response.json();
}

export async function getMyRewardRank(): Promise<MyRewardRankResponse> {
    const { getToken } = await import('../lib/storage');
    const token = await getToken();

    const response = await fetch(`${API_BASE_URL}/reward/my-rank`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token || ''}`,
        },
    });

    const json = await response.json().catch(() => ({}));

    if (!response.ok || json.status === 'error') {
        throw new Error(json.error || json.message || '내 리그 순위 조회 실패');
    }

    return {
        status: json.status ?? 'success',
        rank: Number.isFinite(Number(json.rank)) ? Number(json.rank) : null,
        total_reward: Number(json.total_reward ?? 0),
        message: json.message,
    };
}
