import config from '../lib/config';

// API Base URL - 실제 백엔드 서버 주소로 변경 필요
const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? config.apiBaseUrl;

import { getToken, getUserInfo as getStoredUserInfo } from '../lib/storage';

export interface LoginResponse {
    status: 'success' | 'nickname_required' | 'NICKNAME_REQUIRED';
    token?: string;
    email: string;
    nickname?: string;
    social_id?: string;
    message?: string;
}

export interface SetNicknameResponse {
    status: 'success';
    token: string;
    email: string;
    nickname: string;
    message: string;
}

/**
 * 백엔드 OAuth 엔드포인트에 인가 코드 전송
 */
export async function loginWithOAuth(
    provider: 'kakao' | 'naver',
    code: string
): Promise<LoginResponse> {
    if (provider === 'naver') {
        throw new Error('현재 네이버 로그인은 지원되지 않습니다.');
    }
    const endpoint = `${API_BASE_URL}/auth/${provider}/mobile`;

    const formData = new FormData();
    formData.append('code', code);

    const response = await fetch(endpoint, {
        method: 'POST',
        body: formData,
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '로그인 실패');
    }

    return await response.json();
}


export async function setNickname(
    nickname: string,
    email: string,
    socialId: string
): Promise<SetNicknameResponse> {
    const token = await getToken();
    if (!token) {
        throw new Error('로그인이 필요합니다. 토큰이 없습니다.');
    }
    const endpoint = `${API_BASE_URL}/auth/set-nickname`;
    const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
            nickname,
            email,
            social_id: socialId,
        }),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || error.error || '닉네임 설정 실패');
    }

    return await response.json();
}

/**
 * 토큰 검증
 */
export async function verifyToken(token: string): Promise<{
    status: string;
    email: string;
    social_id: string;
}> {
    const response = await fetch(`${API_BASE_URL}/auth/user-info`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || error.message || '토큰 검증 실패');
    }

    const data = await response.json();
    return {
        status: 'success',
        email: data.email ?? '',
        social_id: data.social_id ?? '',
    };
}

/**
 * OAuth URL 생성
 */
export function getOAuthUrl(provider: 'kakao' | 'naver'): string {
    if (provider === 'naver') {
        throw new Error('현재 네이버 로그인은 지원되지 않습니다.');
    }
    // 카카오/네이버 API 키
    const KAKAO_REST_API_KEY = '5202f1b3b542b79fdf499d766362bef6';
    const NAVER_CLIENT_ID = 'DRk2JpSbhKJO6ImkKIE9';

    const REDIRECT_URI = `${API_BASE_URL}/auth/${provider}/mobile`;

    if (provider === 'kakao') {
        return `https://kauth.kakao.com/oauth/authorize?client_id=${KAKAO_REST_API_KEY}&redirect_uri=${REDIRECT_URI}&response_type=code`;
    } else {
        return `https://nid.naver.com/oauth2.0/authorize?client_id=${NAVER_CLIENT_ID}&redirect_uri=${REDIRECT_URI}&response_type=code`;
    }
}

/**
 * 사용자 정보 조회 (계정 연결 상태 포함)
 */
export async function getUserInfo(token: string): Promise<{
    status: string;
    email: string;
    nickname: string;
    kakao_connected: boolean;
    naver_connected: boolean;
    kakao_email: string | null;
    naver_email: string | null;
}> {
    const endpoint = `${API_BASE_URL}/auth/user-info`;

    const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
    });

    if (!response.ok) {
        if (response.status === 404) {
            const stored = await getStoredUserInfo();
            const email = stored.email ?? '';
            const nickname = stored.nickname ?? '';
            return {
                status: 'success',
                email,
                nickname,
                kakao_connected: !!email,
                naver_connected: false,
                kakao_email: email || null,
                naver_email: null,
            };
        }

        let message = '사용자 정보 조회 실패';
        try {
            const error = await response.json();
            message = error.error || error.message || message;
        } catch {
            // ignore json parse error
        }
        throw new Error(message);
    }

    return await response.json();
}

/**
 * 소셜 계정 연동
 */
export async function connectAccount(
    token: string,
    provider: 'kakao' | 'naver',
    code: string
): Promise<{
    status: string;
    message: string;
    connected_email: string;
}> {
    if (provider === 'naver') {
        throw new Error('현재 네이버 계정 연동은 지원되지 않습니다.');
    }
    void token;
    // 백엔드에는 connect-account가 없어서 OAuth 로그인 엔드포인트를 그대로 사용
    const result = await loginWithOAuth(provider, code);

    if (result.status !== 'success') {
        throw new Error(result.message || '계정 연동 실패');
    }

    return {
        status: 'success',
        message: '계정이 연동되었습니다.',
        connected_email: result.email,
    };
}

/**
 * 소셜 계정 연동 해제
 */
export async function disconnectAccount(
    token: string,
    provider: 'kakao' | 'naver'
): Promise<{
    status: string;
    message: string;
}> {
    void token;
    void provider;
    throw new Error('백엔드에서 연동 해제를 지원하지 않습니다.');
}

/**
 * 회원 탈퇴
 */
export async function withdrawAccount(token: string): Promise<{
    status: string;
    message: string;
}> {
    void token;
    throw new Error('백엔드에 회원 탈퇴 API가 없습니다.');
}

/**
 * 로그아웃
 */
export async function logout(): Promise<{
    status: string;
    message: string;
}> {
    return {
        status: 'success',
        message: '로그아웃은 클라이언트에서 처리됩니다.',
    };
}

/**
 * 닉네임 변경
 */
export async function updateNickname(
    token: string,
    nickname: string
): Promise<{
    status: string;
    message: string;
}> {
    const endpoint = `${API_BASE_URL}/auth/set-nickname`;

    const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ nickname }),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '닉네임 변경 실패');
    }

    return await response.json();
}

/**
 * 사용자 통계 조회
 */
export async function getUserStats(token: string): Promise<{
    status: string;
    data: {
        total_learning_count: number;
        consecutive_days: number;
        monthly_goal: number | null;
    };
}> {
    const endpoint = `${API_BASE_URL}/auth/user/stats`;

    const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '사용자 통계 조회 실패');
    }

    return await response.json();
}
