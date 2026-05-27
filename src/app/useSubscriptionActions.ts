import type { Dispatch, SetStateAction } from 'react';
import { Alert } from 'react-native';

import type { AppStep } from '../navigation/routes';

type UseSubscriptionActionsParams = {
  setStep: (step: AppStep) => void;
  setIsSubscribed: Dispatch<SetStateAction<boolean>>;
  setShowUsageExhaustedModal: Dispatch<SetStateAction<boolean>>;
};

export default function useSubscriptionActions({
  setStep,
  setIsSubscribed,
  setShowUsageExhaustedModal,
}: UseSubscriptionActionsParams) {
  const handleSubscribe = () => {
    setStep('mypage');
    setTimeout(() => {
      Alert.alert('안내', '추후 업데이트 후 제공됩니다');
    }, 0);
  };

  const handleCancelSubscribe = () => {
    setIsSubscribed(false);
    setStep('mypage');
  };

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
    handleUsageModalClose,
    handleUsageModalSubscribe,
  };
}
