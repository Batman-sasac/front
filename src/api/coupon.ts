import config from '../lib/config';
import { getToken } from '../lib/storage';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? config.apiBaseUrl;

export type CouponRedeemResponse = {
    status: 'success';
    message: string;
    data: {
        benefit_type: string;
        pages_added: number;
        ocr_page_limit: number;
        pages_used: number;
        pages_remaining: number;
        base_limit: number;
    };
};

async function readErrorMessage(response: Response): Promise<string> {
    const body = await response.json().catch(() => null) as {
        detail?: unknown;
        message?: unknown;
    } | null;

    if (typeof body?.detail === 'string') return body.detail;
    if (typeof body?.message === 'string') return body.message;
    return '쿠폰을 적용하지 못했습니다.';
}

export async function redeemCoupon(code: string): Promise<CouponRedeemResponse> {
    const token = await getToken();
    if (!token) throw new Error('로그인이 필요합니다.');

    const response = await fetch(`${API_BASE_URL}/coupons/redeem`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code }),
    });

    if (!response.ok) {
        throw new Error(await readErrorMessage(response));
    }

    return response.json() as Promise<CouponRedeemResponse>;
}
