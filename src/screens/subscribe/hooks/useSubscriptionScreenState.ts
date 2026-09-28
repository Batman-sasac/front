import { useEffect, useMemo, useState } from "react";
import { Alert } from "react-native";

import { redeemCoupon } from "../../../api/coupon";
import {
  getSubscriptionStatus,
  type SubscriptionPlan,
} from "../../../api/iap";
import { getOcrUsage, type OcrUsageResponse } from "../../../api/ocr";
import { getToken } from "../../../lib/storage";

type UseSubscriptionScreenStateParams = {
  isSubscribed: boolean;
  ocrUsage: OcrUsageResponse | null;
  onOcrUsageChange: (usage: OcrUsageResponse) => void;
  onSubscriptionStatusChange: (isActive: boolean) => void;
};

export function useSubscriptionScreenState({
  isSubscribed,
  ocrUsage,
  onOcrUsageChange,
  onSubscriptionStatusChange,
}: UseSubscriptionScreenStateParams) {
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
        const nextUsage = await getOcrUsage();
        if (!cancelled) setUsage(nextUsage);
      } catch {
        // 구독 상태의 기본 한도 표시를 유지한다.
      }
    };
    void loadUsage();
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
        setServerPlan(status.is_active ? status.plan : "free");
        onSubscriptionStatusChange(status.is_active);
      } catch {
        // OCR 사용량 API의 pages_limit 기반 표시로 fallback한다.
      }
    };
    void loadSubscriptionStatus();
    return () => {
      cancelled = true;
    };
  }, [isSubscribed, onSubscriptionStatusChange]);

  const currentPlan =
    serverPlan ?? usage?.plan ?? (isSubscribed ? "basic" : "free");
  const resolvedSubscribed = currentPlan !== "free";
  const fallbackLimit =
    currentPlan === "pro" ? 250 : currentPlan === "basic" ? 100 : 20;
  const pagesLimit = Math.max(usage?.pages_limit ?? fallbackLimit, 1);
  const pagesUsed = Math.max(usage?.pages_used ?? 0, 0);
  const remaining = usage?.remaining ?? Math.max(0, pagesLimit - pagesUsed);
  const isUnlimitedUser = usage?.is_unlimited === true;
  const limitReached =
    !isUnlimitedUser &&
    (remaining <= 0 || usage?.status === "limit_reached");
  const progress = useMemo(() => {
    if (limitReached) return 1;
    return Math.max(0, Math.min(1, pagesUsed / pagesLimit));
  }, [limitReached, pagesLimit, pagesUsed]);

  const handleConfirmCoupon = async (couponCode: string) => {
    const result = await redeemCoupon(couponCode);
    const nextUsage: OcrUsageResponse = {
      status: result.data.pages_remaining > 0 ? "ok" : "limit_reached",
      pages_used: result.data.pages_used,
      pages_limit: result.data.ocr_page_limit,
      remaining: result.data.pages_remaining,
    };
    setUsage(nextUsage);
    onOcrUsageChange(nextUsage);
    setShowCouponModal(false);
    Alert.alert("쿠폰 적용 완료", result.message);
  };

  return {
    currentPlan,
    resolvedSubscribed,
    pagesLimit,
    pagesUsed,
    limitReached,
    progress,
    showCancelModal,
    setShowCancelModal,
    showCouponModal,
    setShowCouponModal,
    handleConfirmCoupon,
  };
}
