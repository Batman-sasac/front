// src/lib/auth.ts
import { Alert } from 'react-native';
import { clearAuthData } from './storage';
import { logout as apiLogout } from '../api/auth';

/**
 * 로그아웃 처리
 */
export async function handleLogout(onSuccess?: () => void) {
    try {
        // 백엔드에 로그아웃 알림 (선택적)
        await apiLogout();
    } catch (error) {
        console.error('로그아웃 API 호출 실패:', error);
        // 백엔드 실패해도 로컬 토큰은 삭제
    }

    try {
        // 로컬 저장소에서 토큰 삭제
        await clearAuthData();

        Alert.alert('로그아웃', '로그아웃되었습니다', [
            {
                text: '확인',
                onPress: () => {
                    onSuccess?.();
                }
            }
        ]);
    } catch (error) {
        Alert.alert('오류', '로그아웃 처리 중 문제가 발생했습니다');
    }
}

/**
 * 로그아웃 확인 다이얼로그
 */
export function confirmLogout(onSuccess?: () => void) {
    Alert.alert(
        '로그아웃',
        '정말 로그아웃하시겠습니까?',
        [
            {
                text: '취소',
                style: 'cancel'
            },
            {
                text: '로그아웃',
                onPress: () => handleLogout(onSuccess),
                style: 'destructive'
            }
        ]
    );
}
