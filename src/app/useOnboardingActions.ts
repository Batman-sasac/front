import type { Dispatch, SetStateAction } from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { setStudyGoal } from '../api/weekly';
import { ResultStats, typeProfiles } from '../data/learningTypeTest';
import type { AppStep } from '../navigation/routes';
import { TYPE_LABEL_KEY } from './progress';
import { getErrorMessage } from './errors';

type UseOnboardingActionsParams = {
  setStep: (step: AppStep) => void;
  setMonthlyGoal: Dispatch<SetStateAction<number | null>>;
  setTypeLabel: Dispatch<SetStateAction<string>>;
  setTypeResult: Dispatch<SetStateAction<ResultStats | null>>;
};

export default function useOnboardingActions({
  setStep,
  setMonthlyGoal,
  setTypeLabel,
  setTypeResult,
}: UseOnboardingActionsParams) {
  const saveGoalAndContinue = async (goal: number) => {
    try {
      await setStudyGoal(goal);
      setMonthlyGoal(goal);
      setStep('typeIntro');
    } catch (error: unknown) {
      Alert.alert('목표 설정 실패', getErrorMessage(error, '목표 설정에 실패했습니다.'));
    }
  };

  const saveMonthlyGoal = async (goal: number) => {
    try {
      await setStudyGoal(goal);
      setMonthlyGoal(goal);
    } catch (error: unknown) {
      Alert.alert('목표 설정 실패', getErrorMessage(error, '목표 설정에 실패했습니다.'));
    }
  };

  const finishTypeTest = async (result: ResultStats) => {
    setTypeResult(result);
    // typeKey로 프로필을 찾아 title 사용
    const profile = typeProfiles[result.typeKey];
    setTypeLabel(profile.title);
    await AsyncStorage.setItem(TYPE_LABEL_KEY, profile.title);
    setStep('result');
  };

  const clearTypeLabel = async () => {
    setTypeLabel('');
    await AsyncStorage.removeItem(TYPE_LABEL_KEY);
  };

  return {
    saveGoalAndContinue,
    saveMonthlyGoal,
    finishTypeTest,
    clearTypeLabel,
  };
}
