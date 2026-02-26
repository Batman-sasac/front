import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import config from '../lib/config';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? config.apiBaseUrl;

export type NotificationSettingsPayload = {
    is_notify: boolean;
    remind_time: string; // "HH:MM" (24-hour)
};

/** 백엔드에 저장된 내 알림 설정·푸시 토큰 등록 여부 조회 (유저 확인용) */
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

export async function updatePushToken(authToken: string, pushToken: string) {
    const truncated = pushToken.length > 20 ? `${pushToken.slice(0, 10)}...${pushToken.slice(-8)}` : pushToken;
    console.log('[Push] Expo 푸시 토큰 전달 중 —', truncated);
    const response = await fetch(`${API_BASE_URL}/firebase/user/update-fcm-token`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fcm_token: pushToken }),
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        console.log('[Push] 토큰 전달 실패 —', response.status, error);
        throw new Error(error.message || error.error || '푸시 토큰 저장 실패');
    }
    const data = await response.json();
    console.log('[Push] 토큰 전달 완료 —', data?.message ?? data);
    return data;
}

/**
 * iOS 전용: expo-notifications로 ExponentPushToken 발급 후 백엔드에 전달.
 * - 웹/Android는 스킵. 권한 거부 시 false. 성공 시 true.
 */
export async function registerAndSyncPushToken(authToken: string): Promise<boolean> {
    try {
        console.log('[Push] 푸시 토큰 등록 시작 (iOS Expo 전용)');
        if (Platform.OS !== 'ios') {
            if (Platform.OS === 'web') console.log('[Push] 웹 — 스킵');
            else console.log('[Push] Android — 알림 미지원, 스킵');
            return false;
        }

        const permission = await Notifications.requestPermissionsAsync();
        if (permission.status !== 'granted') {
            console.log('[Push] 알림 권한 없음');
            return false;
        }

        const { data: pushToken } = await Notifications.getExpoPushTokenAsync();
        if (!pushToken) {
            throw new Error('Expo 푸시 토큰이 비어있음');
        }

        console.log('[Push] ExponentPushToken 발급 완료 | 앞 50자:', pushToken.slice(0, 50) + (pushToken.length > 50 ? '...' : ''));
        await updatePushToken(authToken, pushToken);
        return true;
    } catch (error) {
        console.error('[Push] 등록 과정 중 에러:', error);
        return false;
    }
}
