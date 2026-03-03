import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = '@bat_auth_token';
const USER_EMAIL_KEY = '@bat_user_email';
const USER_NICKNAME_KEY = '@bat_user_nickname';
const NOTIFICATION_CACHE_KEY = '@bat_notification_status';

/**
 * 로그인 정보 저장
 */
export async function saveAuthData(token: string, email: string, nickname: string) {
    try {
        console.log('토큰 저장 시작:', { token: token?.substring(0, 20) + '...', email, nickname });

        await AsyncStorage.multiSet([
            [TOKEN_KEY, token],
            [USER_EMAIL_KEY, email],
            [USER_NICKNAME_KEY, nickname],
        ]);

        // 저장 후 검증
        const savedToken = await AsyncStorage.getItem(TOKEN_KEY);
        console.log('✅ 토큰 저장 완료 (검증):', savedToken ? '저장됨' : '실패');
    } catch (error) {
        console.error('❌ 인증 정보 저장 실패:', error);
        throw error;
    }
}

/**
 * 토큰 가져오기
 */
export async function getToken(): Promise<string | null> {
    try {
        const token = await AsyncStorage.getItem(TOKEN_KEY);
        if (!token) {
            console.log('⚠️ 저장된 토큰 없음');
        } else {
            console.log('🔐 토큰 조회 성공:', token.substring(0, 20) + '...');
        }
        return token;
    } catch (error) {
        console.error('❌ 토큰 가져오기 실패:', error);
        return null;
    }
}

/**
 * 사용자 정보 가져오기
 */
export async function getUserInfo(): Promise<{
    email: string | null;
    nickname: string | null;
}> {
    try {
        const [email, nickname] = await AsyncStorage.multiGet([
            USER_EMAIL_KEY,
            USER_NICKNAME_KEY,
        ]);

        return {
            email: email[1],
            nickname: nickname[1],
        };
    } catch (error) {
        console.error('사용자 정보 가져오기 실패:', error);
        return { email: null, nickname: null };
    }
}

/**
 * 로그아웃 (모든 인증 정보 삭제)
 */
export async function clearAuthData() {
    try {
        await AsyncStorage.multiRemove([
            TOKEN_KEY,
            USER_EMAIL_KEY,
            USER_NICKNAME_KEY,
        ]);
    } catch (error) {
        console.error('인증 정보 삭제 실패:', error);
        throw error;
    }
}

/**
 * 닉네임만 로컬 저장소에 갱신
 */
export async function setStoredNickname(nickname: string): Promise<void> {
    try {
        await AsyncStorage.setItem(USER_NICKNAME_KEY, nickname);
    } catch (error) {
        console.error('닉네임 로컬 저장 실패:', error);
    }
}

/**
 * 로그인 여부 확인
 */
export async function isLoggedIn(): Promise<boolean> {
    const token = await getToken();
    return token !== null;
}

export type NotificationStatusCache = {
    is_notify: boolean;
    remind_time: string | null;
};

/** 알림 설정 캐시 조회 (로컬 저장소, 수십 ms 내 반환 → 즉시 표시용) */
export async function getCachedNotificationStatus(): Promise<NotificationStatusCache | null> {
    try {
        const raw = await AsyncStorage.getItem(NOTIFICATION_CACHE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as NotificationStatusCache;
        if (typeof parsed?.is_notify !== 'boolean') return null;
        return {
            is_notify: parsed.is_notify,
            remind_time: typeof parsed.remind_time === 'string' ? parsed.remind_time : null,
        };
    } catch {
        return null;
    }
}

/** 알림 설정 캐시 저장 (다음 진입 시 즉시 표시) */
export async function setCachedNotificationStatus(data: NotificationStatusCache): Promise<void> {
    try {
        await AsyncStorage.setItem(NOTIFICATION_CACHE_KEY, JSON.stringify(data));
    } catch (error) {
        console.error('알림 설정 캐시 저장 실패:', error);
    }
}
