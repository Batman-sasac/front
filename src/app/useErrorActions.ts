import { Platform } from 'react-native';

import type { AppStep } from '../navigation/routes';

type UseErrorActionsParams = {
  setStep: (step: AppStep) => void;
};

export default function useErrorActions({ setStep }: UseErrorActionsParams) {
  const handleErrorRetry = () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.location.reload();
      return;
    }

    setStep('home');
  };

  const handleSubmitReport = (message: string) => {
    console.log('[오류 제보]', message);
  };

  return {
    handleErrorRetry,
    handleSubmitReport,
  };
}
