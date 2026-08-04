import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';

import { getHomeStats, getUserStats } from '../../api/auth';
import { registerAndSyncPushToken } from '../../api/notification';
import type { OcrUsageResponse } from '../../api/ocr';
import { clearAuthData, getToken, getUserInfo } from '../../lib/storage';
import type { AppStep } from '../../navigation/routes';
import { TYPE_LABEL_KEY } from '../dashboard/progress';

const AUTO_LOGIN_TIMEOUT_MS = 8000;

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error('자동 로그인 요청 시간이 초과되었습니다.')), timeoutMs);
  });

  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

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
    try {
      const homeStats = await getHomeStats(token);
      if (typeof homeStats.data.points === 'number' && Number.isFinite(homeStats.data.points)) {
        setExp(homeStats.data.points);
      }
      if (typeof homeStats.data.monthly_goal === 'number' && homeStats.data.monthly_goal > 0) {
        setMonthlyGoal(homeStats.data.monthly_goal);
      }
      const userState = await getUserStats(token);
      setIsSubscribed(!!userState.data.is_subscribed);
      return true;
    } catch (error) {
      console.error('유저 상태 조회 실패:', error);
      return !isUnauthorizedError(error);
    }
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
          const isUsableToken = await withTimeout(
            (async () => {
              const usable = await applyUserState(token);
              if (usable) await refreshOcrUsage();
              return usable;
            })(),
            AUTO_LOGIN_TIMEOUT_MS,
          );
          if (!isUsableToken) {
            await clearSessionAndGoLogin();
            return;
          }
          const storedTypeLabel = await loadStoredTypeLabel();
          setTimeout(() => setStep(storedTypeLabel ? 'home' : 'typeIntro'), 2000);
          return;
        }
      }
      setTimeout(() => setStep('login'), 2000);
    } catch (error) {
      console.error('자동 로그인 확인 오류:', error);
      setTimeout(() => setStep('login'), 2000);
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
    const token = await getToken();
    if (token) {
      const isUsableToken = await applyUserState(token);
      if (!isUsableToken) {
        await clearSessionAndGoLogin();
        return;
      }
    }
    await refreshOcrUsage();
    const storedTypeLabel = await loadStoredTypeLabel();
    setStep(storedTypeLabel ? 'home' : 'typeIntro');
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
