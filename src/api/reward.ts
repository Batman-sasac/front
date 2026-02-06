const API_BASE_URL = 'http://127.0.0.1:8000';

export async function getRewardSummary(token: string): Promise<{
    status: string;
    total_reward: number;
    nickname: string;
}> {
    const response = await fetch(`${API_BASE_URL}/reward/leaderboard`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
        },
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '리워드 조회 실패');
    }

    return await response.json();
}