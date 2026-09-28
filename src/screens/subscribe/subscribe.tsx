import React, { useMemo } from "react";
import { StyleSheet, useWindowDimensions, View } from "react-native";

import type {
  SubscriptionPlan,
  SubscriptionPrices,
} from "../../api/iap";
import type { OcrUsageResponse } from "../../api/ocr";
import AppScreenHeader from "../../components/common/AppScreenHeader";
import SubscriptionCancelModal from "../../components/subscription/SubscriptionCancelModal";
import SubscriptionCouponModal from "../../components/subscription/SubscriptionCouponModal";
import SubscriptionPlanCards from "../../components/subscription/SubscriptionPlanCards";
import SubscriptionUsageCard from "../../components/subscription/SubscriptionUsageCard";
import {
  figmaScale,
  subscriptionColors,
} from "../../styles/subscriptionStyles";
import { useSubscriptionScreenState } from "./hooks/useSubscriptionScreenState";

type Props = {
  isSubscribed: boolean;
  ocrUsage: OcrUsageResponse | null;
  onOcrUsageChange: (usage: OcrUsageResponse) => void;
  onBack: () => void;
  onSubscribe: (plan: Exclude<SubscriptionPlan, "free">) => void;
  onCancelSubscribe: () => void;
  onSubscriptionStatusChange: (isActive: boolean) => void;
  isSubscriptionProcessing: boolean;
  subscriptionPrices: SubscriptionPrices;
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
  subscriptionPrices,
}: Props) {
  const { width: windowWidth } = useWindowDimensions();
  const state = useSubscriptionScreenState({
    isSubscribed,
    ocrUsage,
    onOcrUsageChange,
    onSubscriptionStatusChange,
  });
  const isCompact = windowWidth < 700;
  const planBorderColor =
    !state.resolvedSubscribed && state.limitReached
      ? subscriptionColors.red
      : subscriptionColors.blue;
  const progressColor = state.limitReached
    ? subscriptionColors.red
    : subscriptionColors.blue;
  const layout = useMemo(() => {
    const rowMaxWidth = figmaScale(1160);
    const rowGap = figmaScale(20);
    const contentWidth = Math.max(
      figmaScale(402),
      windowWidth - figmaScale(116),
    );
    const rowWidth = Math.min(contentWidth, rowMaxWidth);
    const cardWidth = isCompact ? rowWidth : (rowWidth - rowGap * 2) / 3;
    const freeCardHeight = isCompact
      ? Math.round(cardWidth * (480 / 448))
      : figmaScale(480);
    const premiumCardHeight = isCompact
      ? Math.round(cardWidth * (544 / 448))
      : figmaScale(544);
    return {
      rowWidth,
      rowGap,
      cardWidth,
      freeCardHeight,
      premiumCardHeight,
    };
  }, [isCompact, windowWidth]);

  return (
    <View style={styles.root}>
      <AppScreenHeader title="구독 관리" onBack={onBack} />
      <View style={styles.content}>
        <SubscriptionUsageCard
          pagesUsed={state.pagesUsed}
          pagesLimit={state.pagesLimit}
          limitReached={state.limitReached}
          progress={state.progress}
          progressColor={progressColor}
        />
        <SubscriptionPlanCards
          isCompact={isCompact}
          layout={layout}
          currentPlan={state.currentPlan}
          limitReached={state.limitReached}
          planBorderColor={planBorderColor}
          onFreePress={() => {
            if (state.resolvedSubscribed) state.setShowCancelModal(true);
          }}
          onSubscribe={onSubscribe}
          onManage={onCancelSubscribe}
          onCouponPress={() => state.setShowCouponModal(true)}
          isProcessing={isSubscriptionProcessing}
          prices={subscriptionPrices}
        />
      </View>

      <SubscriptionCancelModal
        visible={state.showCancelModal}
        onClose={() => state.setShowCancelModal(false)}
        onConfirmCancel={() => {
          state.setShowCancelModal(false);
          onCancelSubscribe();
        }}
      />
      <SubscriptionCouponModal
        visible={state.showCouponModal}
        onClose={() => state.setShowCouponModal(false)}
        onConfirm={state.handleConfirmCoupon}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: subscriptionColors.screenBg },
  content: {
    flex: 1,
    paddingHorizontal: figmaScale(58),
    paddingTop: figmaScale(31),
    paddingBottom: figmaScale(24),
    overflow: "hidden",
  },
});
