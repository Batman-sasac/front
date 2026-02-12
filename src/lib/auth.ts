// src/lib/auth.ts
import { Alert, Platform } from 'react-native';

/**
 * 로그아웃 처리
 */
export async function handleLogout(onSuccess?: () => void) {
    onSuccess?.();
}

/**
 * 로그아웃 확인 다이얼로그
 */
export function confirmLogout(onSuccess?: () => void) {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
        const confirmed = window.confirm('정말 로그아웃하시겠습니까?');
        if (confirmed) {
            void handleLogout(onSuccess);
        }
        return;
    }

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
                onPress: () => {
                    void handleLogout(onSuccess);
                },
                style: 'destructive'
            }
        ]
    );
}
