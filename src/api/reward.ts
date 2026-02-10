const API_BASE_URL = 'http://127.0.0.1:8000';

export type RewardLeaderboardItem = {
    total_reward: number;
    nickname: string;
};

export type AttendanceRewardResponse = {
    status: string;
    is_new_reward: boolean;
    baseXP: number;
    bonusXP: number;
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