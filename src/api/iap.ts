import config from '../lib/config';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? config.apiBaseUrl;

export type SubscriptionStatus = {
    status: 'none' | 'active' | 'grace_period' | 'billing_retry' | 'expired' | 'revoked' | string;
    is_active: boolean;
    product_id: string | null;
    expires_at: string | null;
    auto_renew: boolean | null;
};

type VerifySubscriptionPayload = {
    transaction_id: string;
    product_id?: string;
};

async function readErrorMessage(response: Response, fallback: string): Promise<string> {
    const error = await response.json().catch(() => ({}));
    if (typeof error.detail === 'string') return error.detail;
    if (typeof error.message === 'string') return error.message;
    if (typeof error.error === 'string') return error.error;
    return fallback;
}

export async function getSubscriptionStatus(token: string): Promise<SubscriptionStatus> {
    const response = await fetch(`${API_BASE_URL}/iap/subscription-status`, {
        method: 'GET',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
    });

    if (!response.ok) {
        throw new Error(await readErrorMessage(response, '구독 상태 조회 실패'));
    }

    return response.json();
}

export async function verifySubscription(
    token: string,
    payload: VerifySubscriptionPayload
): Promise<SubscriptionStatus> {
    const response = await fetch(`${API_BASE_URL}/iap/verify-subscription`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        throw new Error(await readErrorMessage(response, '구독 검증 실패'));
    }

    return response.json();
}
