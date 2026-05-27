import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';

import { getHomeStats, getUserStats } from '../api/auth';
import { registerAndSyncPushToken } from '../api/notification';
import type { OcrUsageResponse } from '../api/ocr';
import { clearAuthData, getToken, getUserInfo } from '../lib/storage';
import type { AppStep } from '../navigation/routes';
import { TYPE_LABEL_KEY } from './progress';

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
    } catch (error) {
      console.error('유저 상태 조회 실패:', error);
    }
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
          await applyUserState(token);
          await refreshOcrUsage();
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
      await applyUserState(token);
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
      await clearAuthData();
      console.log('로그아웃 완료');
      setUserEmail('');
      setNickname('');
      setUserSocialId('');
      setIsSubscribed(false);
      setOcrUsage(null);
      setShowUsageExhaustedModal(false);
      setPushTokenSynced(false);
      onLogoutReset();
      setStep('login');
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
