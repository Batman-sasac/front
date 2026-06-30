import React, { useEffect, useMemo, useState } from 'react';
import {
    ScrollView,
    StyleSheet,
    useWindowDimensions,
    View,
} from 'react-native';
import { getSubscriptionStatus } from '../../api/iap';
import { getOcrUsage, OcrUsageResponse } from '../../api/ocr';
import AppScreenHeader from '../../components/common/AppScreenHeader';
import SubscriptionCancelModal from '../../components/subscription/SubscriptionCancelModal';
import SubscriptionPlanCards from '../../components/subscription/SubscriptionPlanCards';
import SubscriptionUsageCard from '../../components/subscription/SubscriptionUsageCard';
import { getToken } from '../../lib/storage';
import { figmaScale, subscriptionColors } from '../../styles/subscriptionStyles';

type Props = {
    isSubscribed: boolean;
    ocrUsage: OcrUsageResponse | null;
    onBack: () => void;
    onSubscribe: () => void;
    onCancelSubscribe: () => void;
    onSubscriptionStatusChange: (isActive: boolean) => void;
    isSubscriptionProcessing: boolean;
};

export default function SubscribeScreen({
    isSubscribed,
    ocrUsage,
    onBack,
    onSubscribe,
    onCancelSubscribe,
    onSubscriptionStatusChange,
    isSubscriptionProcessing,
}: Props) {
    const { width: windowWidth } = useWindowDimensions();
    const isCompact = windowWidth < 900;
    const [usage, setUsage] = useState<OcrUsageResponse | null>(ocrUsage);
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [serverSubscribed, setServerSubscribed] = useState<boolean | null>(null);

    useEffect(() => {
        setUsage(ocrUsage);
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
                setServerSubscribed(status.is_active);
                onSubscriptionStatusChange(status.is_active);
            } catch {
                // OCR 사용량 API의 pages_limit 기반 표시로 fallback
            }
        };

        loadSubscriptionStatus();
        return () => {
            cancelled = true;
        };
    }, [onSubscriptionStatusChange]);

    const inferredSubscribed = usage?.pages_limit != null ? usage.pages_limit > 50 : null;
    const resolvedSubscribed = serverSubscribed ?? inferredSubscribed ?? isSubscribed;

    const pagesLimit = Math.max(usage?.pages_limit ?? (resolvedSubscribed ? 1000 : 50), 1);
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
        const rowMaxWidth = figmaScale(928);
        const rowGap = figmaScale(32);
        const contentWidth = Math.max(figmaScale(402), windowWidth - figmaScale(116));
        const rowWidth = Math.min(contentWidth, rowMaxWidth);
        const cardWidth = isCompact ? rowWidth : Math.min(figmaScale(448), Math.max(figmaScale(300), (rowWidth - rowGap) / 2));
        const freeCardHeight = isCompact ? Math.round(cardWidth * (480 / 448)) : figmaScale(480);
        const premiumCardHeight = isCompact ? Math.round(cardWidth * (544 / 448)) : figmaScale(544);
        return { rowWidth, rowGap, cardWidth, freeCardHeight, premiumCardHeight };
    }, [isCompact, windowWidth]);

    return (
        <View style={styles.root}>
            <AppScreenHeader title="구독 관리" onBack={onBack} />

            <ScrollView contentContainerStyle={styles.scrollContent}>
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
                    resolvedSubscribed={resolvedSubscribed}
                    limitReached={limitReached}
                    planBorderColor={planBorderColor}
                    onFreePress={() => {
                        if (resolvedSubscribed) setShowCancelModal(true);
                    }}
                    onSubscribe={resolvedSubscribed ? onCancelSubscribe : onSubscribe}
                    isProcessing={isSubscriptionProcessing}
                />
            </ScrollView>

            <SubscriptionCancelModal
                visible={showCancelModal}
                onClose={() => setShowCancelModal(false)}
                onConfirmCancel={() => {
                    setShowCancelModal(false);
                    onCancelSubscribe();
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
    scrollContent: {
        paddingHorizontal: figmaScale(58),
        paddingTop: figmaScale(31),
        paddingBottom: figmaScale(56),
    },
});
