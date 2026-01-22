import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = '@bat_auth_token';
const USER_EMAIL_KEY = '@bat_user_email';
const USER_NICKNAME_KEY = '@bat_user_nickname';

/**
 * 로그인 정보 저장
 */
export async function saveAuthData(token: string, email: string, nickname: string) {
    try {
        await AsyncStorage.multiSet([
            [TOKEN_KEY, token],
            [USER_EMAIL_KEY, email],
            [USER_NICKNAME_KEY, nickname],
        ]);
    } catch (error) {
        console.error('인증 정보 저장 실패:', error);
        throw error;
    }
}

/**
 * 토큰 가져오기
 */
export async function getToken(): Promise<string | null> {
    try {
        return await AsyncStorage.getItem(TOKEN_KEY);
    } catch (error) {
        console.error('토큰 가져오기 실패:', error);
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
 * 로그인 여부 확인
 */
export async function isLoggedIn(): Promise<boolean> {
    const token = await getToken();
    return token !== null;
}
