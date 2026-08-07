import React, { useEffect, useMemo, useState } from 'react';
import {
    Alert,
    StyleSheet,
    useWindowDimensions,
    View,
} from 'react-native';
import { redeemCoupon } from '../../api/coupon';
import { getSubscriptionStatus } from '../../api/iap';
import type { SubscriptionPlan } from '../../api/iap';
import { getOcrUsage, OcrUsageResponse } from '../../api/ocr';
import AppScreenHeader from '../../components/common/AppScreenHeader';
import SubscriptionCancelModal from '../../components/subscription/SubscriptionCancelModal';
import SubscriptionCouponModal from '../../components/subscription/SubscriptionCouponModal';
import SubscriptionPlanCards from '../../components/subscription/SubscriptionPlanCards';
import SubscriptionUsageCard from '../../components/subscription/SubscriptionUsageCard';
import { getToken } from '../../lib/storage';
import { figmaScale, subscriptionColors } from '../../styles/subscriptionStyles';

type Props = {
    isSubscribed: boolean;
    ocrUsage: OcrUsageResponse | null;
    onOcrUsageChange: (usage: OcrUsageResponse) => void;
    onBack: () => void;
    onSubscribe: (plan: Exclude<SubscriptionPlan, 'free'>) => void;
    onCancelSubscribe: () => void;
    onSubscriptionStatusChange: (isActive: boolean) => void;
    isSubscriptionProcessing: boolean;
};

export default function SubscribeScreen({
    isSubscribed,
    ocrUsage,
    onOcrUsageChange,
    onBack,
    onSubscribe,
    onCancelSubscribe,
    onSubscriptionStatusChange,
    isSubscriptionProcessing,
}: Props) {
    const { width: windowWidth } = useWindowDimensions();
    const isCompact = windowWidth < 700;
    const [usage, setUsage] = useState<OcrUsageResponse | null>(ocrUsage);
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [showCouponModal, setShowCouponModal] = useState(false);
    const [serverPlan, setServerPlan] = useState<SubscriptionPlan | null>(null);

    useEffect(() => {
        setUsage(ocrUsage);
        if (ocrUsage?.plan) setServerPlan(ocrUsage.plan);
    }, [ocrUsage]);

    useEffect(() => {
        if (ocrUsage) return;
        let cancelled = false;

        const loadUsage = async () => {
            try {
                const next = await getOcrUsage();
                if (!cancelled) setUsage(next);
            } catch {
                // ignore
            }
        };

        loadUsage();
        return () => {
            cancelled = true;
        };
    }, [ocrUsage]);

    useEffect(() => {
        let cancelled = false;

        const loadSubscriptionStatus = async () => {
            try {
                const token = await getToken();
                if (!token) return;
                const status = await getSubscriptionStatus(token);
                if (cancelled) return;
                setServerPlan(status.is_active ? status.plan : 'free');
                onSubscriptionStatusChange(status.is_active);
            } catch {
                // OCR 사용량 API의 pages_limit 기반 표시로 fallback
            }
        };

        loadSubscriptionStatus();
        return () => {
            cancelled = true;
        };
    }, [isSubscribed, onSubscriptionStatusChange]);

    const currentPlan = serverPlan ?? usage?.plan ?? (isSubscribed ? 'basic' : 'free');
    const resolvedSubscribed = currentPlan !== 'free';

    const fallbackLimit = currentPlan === 'pro' ? 250 : currentPlan === 'basic' ? 100 : 20;
    const pagesLimit = Math.max(usage?.pages_limit ?? fallbackLimit, 1);
    const pagesUsed = Math.max(usage?.pages_used ?? 0, 0);
    const remaining = usage?.remaining ?? Math.max(0, pagesLimit - pagesUsed);
    const isUnlimitedUser = usage?.is_unlimited === true;
    const limitReached = !isUnlimitedUser && (remaining <= 0 || usage?.status === 'limit_reached');

    const progress = useMemo(() => {
        const ratio = pagesUsed / pagesLimit;
        if (limitReached) return 1;
        return Math.max(0, Math.min(1, ratio));
    }, [pagesUsed, pagesLimit, limitReached]);

    const planBorderColor = !resolvedSubscribed && limitReached ? subscriptionColors.red : subscriptionColors.blue;
    const progressColor = limitReached ? subscriptionColors.red : subscriptionColors.blue;
    const layout = useMemo(() => {
        const rowMaxWidth = figmaScale(1160);
        const rowGap = figmaScale(20);
        const contentWidth = Math.max(figmaScale(402), windowWidth - figmaScale(116));
        const rowWidth = Math.min(contentWidth, rowMaxWidth);
        const cardWidth = isCompact ? rowWidth : (rowWidth - rowGap * 2) / 3;
        const freeCardHeight = isCompact ? Math.round(cardWidth * (480 / 448)) : figmaScale(480);
        const premiumCardHeight = isCompact ? Math.round(cardWidth * (544 / 448)) : figmaScale(544);
        return { rowWidth, rowGap, cardWidth, freeCardHeight, premiumCardHeight };
    }, [isCompact, windowWidth]);

    return (
        <View style={styles.root}>
            <AppScreenHeader title="구독 관리" onBack={onBack} />

            <View style={styles.content}>
                <SubscriptionUsageCard
                    pagesUsed={pagesUsed}
                    pagesLimit={pagesLimit}
                    limitReached={limitReached}
                    progress={progress}
                    progressColor={progressColor}
                />

                <SubscriptionPlanCards
                    isCompact={isCompact}
                    layout={layout}
                    currentPlan={currentPlan}
                    limitReached={limitReached}
                    planBorderColor={planBorderColor}
                    onFreePress={() => {
                        if (resolvedSubscribed) setShowCancelModal(true);
                    }}
                    onSubscribe={onSubscribe}
                    onManage={onCancelSubscribe}
                    onCouponPress={() => setShowCouponModal(true)}
                    isProcessing={isSubscriptionProcessing}
                />
            </View>

            <SubscriptionCancelModal
                visible={showCancelModal}
                onClose={() => setShowCancelModal(false)}
                onConfirmCancel={() => {
                    setShowCancelModal(false);
                    onCancelSubscribe();
                }}
            />

            <SubscriptionCouponModal
                visible={showCouponModal}
                onClose={() => setShowCouponModal(false)}
                onConfirm={async (couponCode) => {
                    const result = await redeemCoupon(couponCode);
                    const nextUsage: OcrUsageResponse = {
                        status: result.data.pages_remaining > 0 ? 'ok' : 'limit_reached',
                        pages_used: result.data.pages_used,
                        pages_limit: result.data.ocr_page_limit,
                        remaining: result.data.pages_remaining,
                    };

                    setUsage(nextUsage);
                    onOcrUsageChange(nextUsage);
                    setShowCouponModal(false);
                    Alert.alert('쿠폰 적용 완료', result.message);
                }}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: subscriptionColors.screenBg,
    },
    content: {
        flex: 1,
        paddingHorizontal: figmaScale(58),
        paddingTop: figmaScale(31),
        paddingBottom: figmaScale(24),
        overflow: 'hidden',
    },
});
