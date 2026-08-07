import { useCallback, useEffect, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import Constants from 'expo-constants';
import { Alert, Platform } from 'react-native';
import type { Purchase } from 'react-native-iap';

import { verifySubscription } from '../../api/iap';
import type { SubscriptionPlan } from '../../api/iap';
import { getToken } from '../../lib/storage';
import type { AppStep } from '../../navigation/routes';

const IOS_BASIC_SUBSCRIPTION_PRODUCT_ID =
  process.env.EXPO_PUBLIC_IOS_BASIC_SUBSCRIPTION_PRODUCT_ID?.trim()
  || process.env.EXPO_PUBLIC_IOS_SUBSCRIPTION_PRODUCT_ID?.trim()
  || '';
const IOS_PRO_SUBSCRIPTION_PRODUCT_ID =
  process.env.EXPO_PUBLIC_IOS_PRO_SUBSCRIPTION_PRODUCT_ID?.trim() ?? '';

const PRODUCT_IDS_BY_PLAN: Record<Exclude<SubscriptionPlan, 'free'>, string> = {
  basic: IOS_BASIC_SUBSCRIPTION_PRODUCT_ID,
  pro: IOS_PRO_SUBSCRIPTION_PRODUCT_ID,
};
const IOS_SUBSCRIPTION_PRODUCT_IDS = new Set(
  Object.values(PRODUCT_IDS_BY_PLAN).filter(Boolean),
);

const canUseStoreKit = Platform.OS === 'ios' && Constants.appOwnership !== 'expo';

async function loadIapModule() {
  return import('react-native-iap');
}

type UseSubscriptionActionsParams = {
  setStep: (step: AppStep) => void;
  setIsSubscribed: Dispatch<SetStateAction<boolean>>;
  setShowUsageExhaustedModal: Dispatch<SetStateAction<boolean>>;
  refreshOcrUsage: () => Promise<unknown>;
};

export default function useSubscriptionActions({
  setStep,
  setIsSubscribed,
  setShowUsageExhaustedModal,
  refreshOcrUsage,
}: UseSubscriptionActionsParams) {
  const [isSubscriptionProcessing, setIsSubscriptionProcessing] = useState(false);
  const processingTransactionIds = useRef<Set<string>>(new Set());

  const handlePurchaseUpdated = useCallback(async (purchase: Purchase) => {
    if (!IOS_SUBSCRIPTION_PRODUCT_IDS.has(purchase.productId)) return;
    if (purchase.purchaseState !== 'purchased') return;

    const transactionId = purchase.transactionId;
    if (!transactionId || processingTransactionIds.current.has(transactionId)) return;

    processingTransactionIds.current.add(transactionId);
    setIsSubscriptionProcessing(true);

    try {
      const token = await getToken();
      if (!token) throw new Error('로그인이 필요합니다.');

      const status = await verifySubscription(token, {
        transaction_id: transactionId,
        product_id: purchase.productId,
      });

      if (!status.is_active) {
        throw new Error('결제는 완료됐지만 구독 상태가 활성화되지 않았습니다.');
      }

      const { finishTransaction } = await loadIapModule();
      await finishTransaction({ purchase, isConsumable: false });
      setIsSubscribed(true);
      await refreshOcrUsage();
      const planName = status.plan === 'pro' ? 'Pro' : 'Basic';
      Alert.alert('구독 완료', `${planName} 플랜이 적용되었습니다.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : '구독 검증에 실패했습니다.';
      Alert.alert('구독 검증 실패', message);
    } finally {
      processingTransactionIds.current.delete(transactionId);
      setIsSubscriptionProcessing(false);
    }
  }, [refreshOcrUsage, setIsSubscribed]);

  useEffect(() => {
    if (!canUseStoreKit) return undefined;

    let mounted = true;
    let cleanup: (() => void) | null = null;

    const registerListeners = async () => {
      const {
        endConnection,
        purchaseErrorListener,
        purchaseUpdatedListener,
        ErrorCode,
      } = await loadIapModule();

      if (!mounted) {
        void endConnection();
        return;
      }

      const purchaseSubscription = purchaseUpdatedListener((purchase) => {
        void handlePurchaseUpdated(purchase);
      });
      const errorSubscription = purchaseErrorListener((error) => {
        setIsSubscriptionProcessing(false);
        if (error.code === ErrorCode.UserCancelled) return;
        Alert.alert('결제 실패', error.message || '결제를 완료하지 못했습니다.');
      });

      cleanup = () => {
        purchaseSubscription.remove();
        errorSubscription.remove();
        void endConnection();
      };
    };

    void registerListeners();

    return () => {
      mounted = false;
      cleanup?.();
    };
  }, [handlePurchaseUpdated]);

  const handleSubscribe = async (plan: Exclude<SubscriptionPlan, 'free'>) => {
    if (!canUseStoreKit) {
      Alert.alert('안내', 'iOS dev client 또는 실제 앱 빌드에서만 App Store 구독 결제를 사용할 수 있습니다.');
      return;
    }
    const productId = PRODUCT_IDS_BY_PLAN[plan];
    if (!productId) {
      const envName = plan === 'basic'
        ? 'EXPO_PUBLIC_IOS_BASIC_SUBSCRIPTION_PRODUCT_ID'
        : 'EXPO_PUBLIC_IOS_PRO_SUBSCRIPTION_PRODUCT_ID';
      Alert.alert('설정 필요', `${envName}를 App Store Connect 구독 상품 ID로 설정해주세요.`);
      return;
    }

    try {
      setIsSubscriptionProcessing(true);
      const { fetchProducts, initConnection, requestPurchase } = await loadIapModule();
      await initConnection();
      const products = await fetchProducts({
        skus: [productId],
        type: 'subs',
      });

      if (!products || products.length === 0) {
        throw new Error('App Store Connect에서 구독 상품을 찾지 못했습니다.');
      }

      await requestPurchase({
        type: 'subs',
        request: {
          apple: {
            sku: productId,
            andDangerouslyFinishTransactionAutomatically: false,
          },
        },
      });
    } catch (error) {
      setIsSubscriptionProcessing(false);
      const message = error instanceof Error ? error.message : '결제를 시작하지 못했습니다.';
      Alert.alert('결제 시작 실패', message);
    }
  };

  const handleCancelSubscribe = async () => {
    if (!canUseStoreKit) {
      Alert.alert('안내', 'iOS 설정의 구독 관리에서 해지할 수 있습니다.');
      return;
    }

    try {
      const { initConnection, showManageSubscriptionsIOS } = await loadIapModule();
      await initConnection();
      await showManageSubscriptionsIOS();
      setStep('mypage');
    } catch (error) {
      const message = error instanceof Error ? error.message : '구독 관리 화면을 열지 못했습니다.';
      Alert.alert('구독 관리 실패', message);
    }
  };

  const handleSubscriptionStatusChange = useCallback((isActive: boolean) => {
    setIsSubscribed(isActive);
  }, [setIsSubscribed]);

  const handleUsageModalClose = () => {
    setShowUsageExhaustedModal(false);
  };

  const handleUsageModalSubscribe = () => {
    setShowUsageExhaustedModal(false);
    setStep('subscribe');
  };

  return {
    handleSubscribe,
    handleCancelSubscribe,
    handleSubscriptionStatusChange,
    handleUsageModalClose,
    handleUsageModalSubscribe,
    isSubscriptionProcessing,
  };
}
