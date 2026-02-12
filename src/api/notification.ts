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
    console.log('[FCM] 토큰 전달 중 —', truncated);
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
 * FCM 푸시 토큰 생성(Expo) 후 백엔드로 전달.
 * - 홈 진입 시(App.tsx) + 알림 설정 화면 진입 시 재시도용으로 사용.
 * - 웹이면 스킵. 권한 거부 시 false. 성공 시 true.
 */
export async function registerAndSyncPushToken(authToken: string): Promise<boolean> {
    console.log('[FCM] 푸시 토큰 등록 시작');
    if (Platform.OS === 'web') {
        console.log('[FCM] 웹 환경 — 스킵');
        return false;
    }
    const permission = await Notifications.requestPermissionsAsync();
    if (permission.status !== 'granted') {
        console.log('[FCM] 알림 권한 거부 —', permission.status);
        return false;
    }
    console.log('[FCM] 알림 권한 허용됨, 디바이스 토큰 요청 중...');
    if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
            name: 'default',
            importance: Notifications.AndroidImportance.DEFAULT,
        });
    }
    const deviceToken = await Notifications.getDevicePushTokenAsync();
    if (!deviceToken?.data) {
        console.log('[FCM] 디바이스 토큰 없음 —', deviceToken);
        return false;
    }
    console.log('[FCM] 디바이스 토큰 발급됨, 백엔드로 전달 중...');
    await updateFcmToken(authToken, deviceToken.data);
    console.log('[FCM] 푸시 토큰 등록·전달 완료');
    return true;
}
