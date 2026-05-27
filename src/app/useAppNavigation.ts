import type { AppStep } from '../navigation/routes';
import type { Screen as SidebarScreen } from '../components/Sidebar';

export type MainNavigationScreen = 'home' | 'league' | 'alarm' | 'mypage' | 'takePicture' | 'brushup';

type UseAppNavigationParams = {
  setStep: (step: AppStep) => void;
  canUseOcrOrShowLimit: () => Promise<boolean>;
};

export default function useAppNavigation({
  setStep,
  canUseOcrOrShowLimit,
}: UseAppNavigationParams) {
  const tryMoveToTakePicture = async () => {
    const canUseOcr = await canUseOcrOrShowLimit();
    if (!canUseOcr) return;

    setStep('takePicture');
  };

  const handleMainNavigate = (screen: MainNavigationScreen) => {
    if (screen === 'takePicture') {
      void tryMoveToTakePicture();
      return;
    }

    setStep(screen);
  };

  const handleSidebarNavigate = (screen: SidebarScreen) => {
    if (screen === 'takePicture') {
      void tryMoveToTakePicture();
      return;
    }

    setStep(screen);
  };

  const handlePlanManageOpen = async () => {
    const canUseOcr = await canUseOcrOrShowLimit();
    if (!canUseOcr) return;

    setStep('subscribe');
  };

  return {
    handleMainNavigate,
    handleSidebarNavigate,
    handlePlanManageOpen,
  };
}
