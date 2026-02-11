import config from '../lib/config';

// API Base URL - 실제 백엔드 서버 주소
const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? config.apiBaseUrl;
const ENV_KAKAO_REST_API_KEY = process.env.EXPO_PUBLIC_KAKAO_REST_API_KEY ?? '';
const ENV_NAVER_CLIENT_ID = process.env.EXPO_PUBLIC_NAVER_CLIENT_ID ?? '';
const ENV_KAKAO_REDIRECT_URI = process.env.EXPO_PUBLIC_KAKAO_REDIRECT_URI ?? '';
const ENV_NAVER_REDIRECT_URI = process.env.EXPO_PUBLIC_NAVER_REDIRECT_URI ?? '';

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

export async function loginWithOAuth(
    provider: 'kakao' | 'naver',
    code: string
): Promise<LoginResponse> {
    const endpoint = `${API_BASE_URL}/auth/${provider}/mobile`;

    const formData = new FormData();
    formData.append('code', code);
    if (provider === 'naver') {
        formData.append('state', 'naver_mobile');
    }

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
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || error.error || '닉네임 설정 실패');
    }

    return await response.json();
}

export interface OAuthConfig {
    kakao_rest_api_key?: string;
    kakao_redirect_uri?: string;
    naver_client_id?: string;
    naver_redirect_uri?: string;
}

export async function fetchOAuthConfig(): Promise<OAuthConfig> {
    const res = await fetch(`${API_BASE_URL}/config`);
    if (!res.ok) throw new Error('OAuth 설정 정보를 불러오지 못했습니다.');
    return res.json();
}

/**
 * OAuth URL 생성 (.env/config fallback)
 */
export async function getOAuthUrl(provider: 'kakao' | 'naver'): Promise<string> {
    let kakaoRestApiKey = ENV_KAKAO_REST_API_KEY;
    let naverClientId = ENV_NAVER_CLIENT_ID;
    let kakaoRedirectUri = ENV_KAKAO_REDIRECT_URI || `${API_BASE_URL}/auth/kakao/mobile`;
    let naverRedirectUri = ENV_NAVER_REDIRECT_URI || `${API_BASE_URL}/auth/naver/mobile`;

    if (!kakaoRestApiKey || !naverClientId || !ENV_KAKAO_REDIRECT_URI || !ENV_NAVER_REDIRECT_URI) {
        const serverConfig = await fetchOAuthConfig();
        kakaoRestApiKey = kakaoRestApiKey || serverConfig.kakao_rest_api_key || '';
        naverClientId = naverClientId || serverConfig.naver_client_id || '';
        kakaoRedirectUri = ENV_KAKAO_REDIRECT_URI || serverConfig.kakao_redirect_uri || kakaoRedirectUri;
        naverRedirectUri = ENV_NAVER_REDIRECT_URI || serverConfig.naver_redirect_uri || naverRedirectUri;
    }

    if (provider === 'kakao') {
        if (!kakaoRestApiKey) {
            throw new Error('KAKAO_REST_API_KEY가 없습니다. .env 파일 또는 서버 설정을 확인하세요.');
        }
        return `https://kauth.kakao.com/oauth/authorize?client_id=${encodeURIComponent(kakaoRestApiKey)}&redirect_uri=${encodeURIComponent(kakaoRedirectUri)}&response_type=code`;
    }

    if (!naverClientId) {
        throw new Error('NAVER_CLIENT_ID가 없습니다. .env 파일 또는 서버 설정을 확인하세요.');
    }
    return `https://nid.naver.com/oauth2.0/authorize?client_id=${encodeURIComponent(naverClientId)}&redirect_uri=${encodeURIComponent(naverRedirectUri)}&response_type=code&state=naver_mobile`;
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
 * 외부 계정 연동
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
    void token;
    // 백엔드에 connect-account가 없어 OAuth 로그인 엔드포인트를 그대로 사용
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
 * 외부 계정 연동 해제
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
        message: '로그아웃은 클라이언트에서 처리합니다.',
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
