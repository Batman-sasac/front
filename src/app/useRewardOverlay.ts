import { useRef, useState } from 'react';

import type { AppStep } from '../navigation/routes';
import type { RewardType } from '../screens/reward/Reward';

type RewardScreenState = {
  type: RewardType;
  xp: number;
};

type UseRewardOverlayParams = {
  setStep: (step: AppStep) => void;
};

export default function useRewardOverlay({ setStep }: UseRewardOverlayParams) {
  const [rewardScreenState, setRewardScreenState] = useState<RewardScreenState | null>(null);
  const rewardCloseActionRef = useRef<(() => void) | null>(null);

  const showRewardScreen = (type: RewardType, xp: number, onClose?: () => void) => {
    setRewardScreenState({ type, xp });
    rewardCloseActionRef.current = onClose ?? null;
    setStep('reward');
  };

  const handleRewardScreenClose = () => {
    const nextAction = rewardCloseActionRef.current;
    rewardCloseActionRef.current = null;
    setRewardScreenState(null);

    if (nextAction) {
      nextAction();
      return;
    }

    setStep('home');
  };

  return {
    rewardScreenState,
    showRewardScreen,
    handleRewardScreenClose,
  };
}
