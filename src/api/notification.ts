import config from '../lib/config';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? config.apiBaseUrl;

export type NotificationSettingsPayload = {
    is_notify: boolean;
    remind_time: string; // "HH:MM" (24-hour)
};

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
        throw new Error(error.message || error.error || 'FCM 토큰 저장 실패');
    }

    return response.json();
}
