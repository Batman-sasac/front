import React, { useEffect, useMemo, useState } from 'react';
import {
    ScrollView,
    StyleSheet,
    useWindowDimensions,
    View,
} from 'react-native';
import { getOcrUsage, OcrUsageResponse } from '../../api/ocr';
import AppScreenHeader from '../../components/common/AppScreenHeader';
import SubscriptionCancelModal from '../../components/subscription/SubscriptionCancelModal';
import SubscriptionPlanCards from '../../components/subscription/SubscriptionPlanCards';
import SubscriptionUsageCard from '../../components/subscription/SubscriptionUsageCard';
import { figmaScale, subscriptionColors } from '../../styles/subscriptionStyles';

type Props = {
    isSubscribed: boolean;
    ocrUsage: OcrUsageResponse | null;
    onBack: () => void;
    onSubscribe: () => void;
    onCancelSubscribe: () => void;
};

export default function SubscribeScreen({ isSubscribed, ocrUsage, onBack, onSubscribe, onCancelSubscribe }: Props) {
    const { width: windowWidth } = useWindowDimensions();
    const isCompact = windowWidth < 900;
    const [usage, setUsage] = useState<OcrUsageResponse | null>(ocrUsage);
    const [showCancelModal, setShowCancelModal] = useState(false);

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

    const inferredSubscribed = usage?.pages_limit != null ? usage.pages_limit > 50 : null;
    const resolvedSubscribed = inferredSubscribed == null ? isSubscribed : inferredSubscribed;

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
                    onSubscribe={onSubscribe}
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
