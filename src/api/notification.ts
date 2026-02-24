import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import config from '../lib/config';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? config.apiBaseUrl;

export type NotificationSettingsPayload = {
    is_notify: boolean;
    remind_time: string; // "HH:MM" (24-hour)
};

/** 백엔드에 저장된 내 알림 설정·FCM 토큰 등록 여부 조회 (유저 확인용) */
export async function getMyNotificationStatus(authToken: string) {
    const res = await fetch(`${API_BASE_URL}/notification-push/me`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${authToken}` },
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail ?? err.message ?? '조회 실패');
    }
    return res.json();
}

/** 테스트 푸시 1통 발송 — 메시지 전달 여부 확인용 */
export async function sendTestNotification(authToken: string) {
    const res = await fetch(`${API_BASE_URL}/notification-push/test`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}` },
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail ?? err.message ?? '테스트 발송 실패');
    }
    return res.json();
}

export async function updateNotificationSettings(token: string, payload: NotificationSettingsPayload) {
    const formData = new FormData();
    formData.append('is_notify', String(payload.is_notify));
    formData.append('remind_time', payload.remind_time);

    const response = await fetch(`${API_BASE_URL}/notification-push/update`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
        },
        body: formData,
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || error.error || '알림 설정 저장 실패');
    }

    return response.json();
}

export async function updateFcmToken(token: string, fcmToken: string) {
    const truncated = fcmToken.length > 20 ? `${fcmToken.slice(0, 10)}...${fcmToken.slice(-8)}` : fcmToken;
    const tokenKind = fcmToken.startsWith('ExponentPushToken[') ? 'Expo' : 'FCM';
    console.log('[Push] 토큰 전달 중 —', tokenKind, truncated);
    const response = await fetch(`${API_BASE_URL}/firebase/user/update-fcm-token`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fcm_token: fcmToken }),
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        console.log('[FCM] 토큰 전달 실패 —', response.status, error);
        throw new Error(error.message || error.error || 'FCM 토큰 저장 실패');
    }
    const data = await response.json();
    console.log('[FCM] 토큰 전달 완료 —', data?.message ?? data);
    return data;
}

/**
 * 푸시 토큰 생성 후 백엔드로 전달.
 * - 가능하면 @react-native-firebase/messaging 의 getToken() 사용 (진짜 FCM 토큰, iOS/Android 공통).
 * - Firebase 미사용 시: iOS → ExponentPushToken(Expo), Android → getDevicePushTokenAsync(FCM).
 * - 웹이면 스킵. 권한 거부 시 false. 성공 시 true.
 */
export async function registerAndSyncPushToken(authToken: string): Promise<boolean> {
    try {
        console.log('[Push] 푸시 토큰 등록 시작');
        if (Platform.OS === 'web') return false;

        const permission = await Notifications.requestPermissionsAsync();
        if (permission.status !== 'granted') {
            console.log('[Push] 권한 없음');
            return false;
        }

        if (Platform.OS === 'android') {
            await Notifications.setNotificationChannelAsync('default', {
                name: 'default',
                importance: Notifications.AndroidImportance.DEFAULT,
            });
        }

        let pushToken: string | null = null;
        try {
            const messaging = (await import('@react-native-firebase/messaging')).default;
            const authStatus = await messaging().requestPermission();
            const enabled =
                authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
                authStatus === messaging.AuthorizationStatus.PROVISIONAL;
            if (!enabled) {
                console.log('[Push] Firebase 알림 권한 없음, Expo 토큰으로 fallback');
            } else {
                pushToken = await messaging().getToken();
                if (pushToken) console.log('[Push] Firebase FCM 토큰 사용 (진짜 FCM)');
            }
        } catch (_) {
            console.log('[Push] @react-native-firebase/messaging 없음 또는 오류 → Expo/디바이스 토큰 사용');
        }

        if (!pushToken) {
            // Fallback: iOS → Expo, Android → FCM(디바이스)
            pushToken =
                Platform.OS === 'ios'
                    ? (await Notifications.getExpoPushTokenAsync()).data
                    : (await Notifications.getDevicePushTokenAsync()).data;
        }

        if (!pushToken) {
            throw new Error('토큰 데이터가 비어있음');
        }

        const tokenType = pushToken.startsWith('ExponentPushToken[') ? 'Expo(iOS용)' : 'FCM';
        console.log('[Push] 플랫폼:', Platform.OS, '| 토큰 형식:', tokenType, '| 앞 50자:', pushToken.slice(0, 50) + (pushToken.length > 50 ? '...' : ''));

        await updateFcmToken(authToken, pushToken);
        return true;
    } catch (error) {
        console.error('[Push] 등록 과정 중 에러:', error);
        return false;
    }
}
