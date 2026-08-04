import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';

import { getHomeStats, getUserStats } from '../../api/auth';
import { registerAndSyncPushToken } from '../../api/notification';
import type { OcrUsageResponse } from '../../api/ocr';
import { clearAuthData, getToken, getUserInfo } from '../../lib/storage';
import type { AppStep } from '../../navigation/routes';
import { TYPE_LABEL_KEY } from '../dashboard/progress';

function isUnauthorizedError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return error.message.includes('401') || error.message.includes('토큰이 만료');
}

type UseAuthFlowParams = {
  step: AppStep;
  setStep: (step: AppStep) => void;
  setExp: Dispatch<SetStateAction<number>>;
  setMonthlyGoal: Dispatch<SetStateAction<number | null>>;
  setTypeLabel: Dispatch<SetStateAction<string>>;
  setIsSubscribed: Dispatch<SetStateAction<boolean>>;
  setOcrUsage: Dispatch<SetStateAction<OcrUsageResponse | null>>;
  setShowUsageExhaustedModal: Dispatch<SetStateAction<boolean>>;
  refreshOcrUsage: () => Promise<OcrUsageResponse | null>;
  onLogoutReset: () => void;
};

export default function useAuthFlow({
  step,
  setStep,
  setExp,
  setMonthlyGoal,
  setTypeLabel,
  setIsSubscribed,
  setOcrUsage,
  setShowUsageExhaustedModal,
  refreshOcrUsage,
  onLogoutReset,
}: UseAuthFlowParams) {
  const [nickname, setNickname] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userSocialId, setUserSocialId] = useState('');
  const [pushTokenSynced, setPushTokenSynced] = useState(false);

  const applyUserState = async (token: string) => {
    const [homeResult, userResult] = await Promise.allSettled([
      getHomeStats(token),
      getUserStats(token),
    ]);

    if (homeResult.status === 'fulfilled') {
      const homeStats = homeResult.value;
      if (typeof homeStats.data.points === 'number' && Number.isFinite(homeStats.data.points)) {
        setExp(homeStats.data.points);
      }
      if (typeof homeStats.data.monthly_goal === 'number' && homeStats.data.monthly_goal > 0) {
        setMonthlyGoal(homeStats.data.monthly_goal);
      }
    } else {
      console.error('홈 상태 조회 실패:', homeResult.reason);
    }

    if (userResult.status === 'fulfilled') {
      const userState = userResult.value;
      setIsSubscribed(!!userState.data.is_subscribed);
    } else {
      console.error('사용자 통계 조회 실패:', userResult.reason);
    }

    const errors = [homeResult, userResult]
      .filter((result): result is PromiseRejectedResult => result.status === 'rejected')
      .map((result) => result.reason);
    return !errors.some(isUnauthorizedError);
  };

  const clearSessionAndGoLogin = async () => {
    await clearAuthData();
    setUserEmail('');
    setNickname('');
    setUserSocialId('');
    setIsSubscribed(false);
    setOcrUsage(null);
    setShowUsageExhaustedModal(false);
    setPushTokenSynced(false);
    onLogoutReset();
    setStep('login');
  };

  const loadStoredTypeLabel = async () => {
    const storedTypeLabel = (await AsyncStorage.getItem(TYPE_LABEL_KEY))?.trim() ?? '';
    if (storedTypeLabel) {
      setTypeLabel(storedTypeLabel);
    }
    return storedTypeLabel;
  };

  const checkAutoLogin = async () => {
    try {
      const token = await getToken();
      if (token) {
        const userInfo = await getUserInfo();
        if (userInfo.email && userInfo.nickname) {
          setUserEmail(userInfo.email);
          setNickname(userInfo.nickname);
          const storedTypeLabel = await loadStoredTypeLabel();
          setStep(storedTypeLabel ? 'home' : 'typeIntro');
          void (async () => {
            const isUsableToken = await applyUserState(token);
            if (!isUsableToken) {
              await clearSessionAndGoLogin();
              return;
            }
            await refreshOcrUsage();
          })();
          return;
        }
      }
      setStep('login');
    } catch (error) {
      console.error('자동 로그인 확인 오류:', error);
      setStep('login');
    }
  };

  useEffect(() => {
    void checkAutoLogin();
  }, []);

  useEffect(() => {
    if (step !== 'home' || pushTokenSynced) return;

    getToken()
      .then((token) => {
        if (!token) return undefined;
        return registerAndSyncPushToken(token);
      })
      .then((ok) => {
        if (ok) setPushTokenSynced(true);
      })
      .catch((error) => {
        console.error('푸시 토큰 등록 실패:', error);
      });
  }, [step, pushTokenSynced]);

  const handleLoginSuccess = async (email: string, userNickname: string) => {
    setUserEmail(email);
    setNickname(userNickname);
    const storedTypeLabel = await loadStoredTypeLabel();
    setStep(storedTypeLabel ? 'home' : 'typeIntro');

    const token = await getToken();
    if (token) {
      const isUsableToken = await applyUserState(token);
      if (!isUsableToken) {
        await clearSessionAndGoLogin();
        return;
      }
    }
    await refreshOcrUsage();
  };

  const handleNicknameRequired = (email: string, socialId: string) => {
    setUserEmail(email);
    setUserSocialId(socialId);
    setStep('nickname');
  };

  const handleNicknameSet = (email: string, userNickname: string) => {
    setUserEmail(email);
    setNickname(userNickname);
    setStep('typeIntro');
  };

  const handleLogout = async () => {
    try {
      console.log('로그아웃 시작...');
      await clearSessionAndGoLogin();
      console.log('로그아웃 완료');
    } catch (error) {
      console.error('로그아웃 오류:', error);
    }
  };

  const resetAuthIdentity = () => {
    setUserEmail('');
    setNickname('');
    setUserSocialId('');
  };

  return {
    nickname,
    setNickname,
    userEmail,
    userSocialId,
    resetAuthIdentity,
    handleLoginSuccess,
    handleNicknameRequired,
    handleNicknameSet,
    handleLogout,
  };
}
