import { useState } from 'react';

import type { ResultStats } from '../../data/learningTypeTest';
import type { AppStep as Step } from '../../navigation/routes';
import useAccountActions from '../auth/useAccountActions';
import useAuthFlow from '../auth/useAuthFlow';
import useHomeDashboardData from '../dashboard/useHomeDashboardData';
import useLearningProgress from '../dashboard/useLearningProgress';
import useRewardOverlay from '../dashboard/useRewardOverlay';
import useErrorActions from '../error/useErrorActions';
import useAppNavigation from '../navigation/useAppNavigation';
import useAppRouteEffects from '../navigation/useAppRouteEffects';
import useOnboardingActions from '../onboarding/useOnboardingActions';
import useOcrUsageGate from '../subscription/useOcrUsageGate';
import useSubscriptionActions from '../subscription/useSubscriptionActions';
import useReviewQuizLoader from '../study/useReviewQuizLoader';
import useScaffoldingStudyActions from '../study/useScaffoldingStudyActions';
import useStudyCaptureFlow from '../study/useStudyCaptureFlow';
import useStudyRouteActions from '../study/useStudyRouteActions';
import type { AppRoutesProps } from './AppRoutes';

export default function useAppController() {
  const [step, setStep] = useState<Step>('splash');
  const [typeResult, setTypeResult] = useState<ResultStats | null>(null);
  const [isReviewMode, setIsReviewMode] = useState(false);
  const [reviewQuizId, setReviewQuizId] = useState<number | null>(null);

  const {
    isSubscribed,
    setIsSubscribed,
    ocrUsage,
    setOcrUsage,
    showUsageExhaustedModal,
    setShowUsageExhaustedModal,
    usageExhaustedMessage,
    isUsageLimitReached,
    refreshOcrUsage,
    canUseOcrOrShowLimit,
  } = useOcrUsageGate();

  const {
    rewardScreenState,
    showRewardScreen,
    handleRewardScreenClose,
  } = useRewardOverlay({ setStep });

  const dashboard = useHomeDashboardData();

  const {
    typeLabel,
    setTypeLabel,
    level,
    setLevel,
    exp,
    setExp,
    monthlyGoal,
    setMonthlyGoal,
    streak,
    setStreak,
    setLastAttendanceDate,
    weekAttendance,
    progressLoaded,
    hasCheckedInToday,
    handleDailyCheckIn,
  } = useLearningProgress({
    onReward: showRewardScreen,
    onGoHome: () => setStep('home'),
    onRefreshRewardData: () => {
      void dashboard.refreshMyRewardRank();
      void dashboard.refreshLeagueLeaderboard();
    },
  });

  const {
    saveGoalAndContinue,
    saveMonthlyGoal,
    finishTypeTest,
    clearTypeLabel,
  } = useOnboardingActions({
    setStep,
    setMonthlyGoal,
    setTypeLabel,
    setTypeResult,
  });

  const studyCapture = useStudyCaptureFlow({
    setStep,
    refreshOcrUsage,
    ocrUsage,
  });

  const {
    nickname,
    setNickname,
    userEmail,
    userSocialId,
    resetAuthIdentity,
    handleLoginSuccess,
    handleNicknameRequired,
    handleNicknameSet,
    handleLogout,
  } = useAuthFlow({
    step,
    setStep,
    setExp,
    setMonthlyGoal,
    setTypeLabel,
    setIsSubscribed,
    setOcrUsage,
    setShowUsageExhaustedModal,
    refreshOcrUsage,
    onLogoutReset: () => {
      setTypeResult(null);
    },
  });

  const studyActions = useScaffoldingStudyActions({
    isReviewMode,
    setIsReviewMode,
    reviewQuizId,
    setReviewQuizId,
    selectedSourceIndex: studyCapture.selectedSourceIndex,
    setSelectedSourceIndex: studyCapture.setSelectedSourceIndex,
    capturedSources: studyCapture.capturedSources,
    cropBySourceIndex: studyCapture.cropBySourceIndex,
    scaffoldingPayload: studyCapture.scaffoldingPayload,
    setScaffoldingPayload: studyCapture.setScaffoldingPayload,
    scaffoldingPayloads: studyCapture.scaffoldingPayloads,
    setScaffoldingPayloads: studyCapture.setScaffoldingPayloads,
    setScaffoldingLoading: studyCapture.setScaffoldingLoading,
    setScaffoldingError: studyCapture.setScaffoldingError,
    runOcrForIndex: studyCapture.runOcrForIndex,
    subjectName: studyCapture.subjectName,
    setCropBySourceIndex: studyCapture.setCropBySourceIndex,
    setStep,
    setExp,
    refreshOcrUsage,
    isSubscribed,
    isUsageLimitReached,
    setShowUsageExhaustedModal,
    refreshMyRewardRank: dashboard.refreshMyRewardRank,
    refreshLeagueLeaderboard: dashboard.refreshLeagueLeaderboard,
    showRewardScreen,
  });

  useReviewQuizLoader({
    step,
    reviewQuizId,
    resetReviewParts: studyActions.resetPendingReviewParts,
    setSelectedSourceIndex: studyCapture.setSelectedSourceIndex,
    setScaffoldingPayload: studyCapture.setScaffoldingPayload,
    setScaffoldingPayloads: studyCapture.setScaffoldingPayloads,
    setScaffoldingLoading: studyCapture.setScaffoldingLoading,
    setScaffoldingError: studyCapture.setScaffoldingError,
  });

  const studyRoutes = useStudyRouteActions({
    isReviewMode,
    setIsReviewMode,
    setReviewQuizId,
    capturedSources: studyCapture.capturedSources,
    prepareCapturedSources: studyCapture.prepareCapturedSources,
    clearCapturedSources: studyCapture.clearCapturedSources,
    prepareLearningStart: studyCapture.prepareLearningStart,
    preloadScaffoldingPayloads: studyCapture.preloadScaffoldingPayloads,
    setSelectedSourceIndex: studyCapture.setSelectedSourceIndex,
    setScaffoldingPayload: studyCapture.setScaffoldingPayload,
    setScaffoldingPayloads: studyCapture.setScaffoldingPayloads,
    setScaffoldingError: studyCapture.setScaffoldingError,
    resetBatchEarnedXp: studyActions.resetBatchEarnedXp,
    resetPendingGradeParts: studyActions.resetPendingGradeParts,
    resetPendingReviewParts: studyActions.resetPendingReviewParts,
    setStep,
  });

  const { handleWithdraw } = useAccountActions({
    resetAuthIdentity,
    setTypeResult,
    setLevel,
    setExp,
    setMonthlyGoal,
    setStreak,
    setLastAttendanceDate,
    resetStudyInputState: studyCapture.resetStudyInputState,
    resetBatchEarnedXp: studyActions.resetBatchEarnedXp,
    setIsReviewMode,
    setReviewQuizId,
    clearTypeLabel,
    setStep,
  });

  const {
    handleSubscribe,
    handleCancelSubscribe,
    handleSubscriptionStatusChange,
    handleUsageModalClose,
    handleUsageModalSubscribe,
    isSubscriptionProcessing,
  } = useSubscriptionActions({
    setStep,
    setIsSubscribed,
    setShowUsageExhaustedModal,
    refreshOcrUsage,
  });

  const {
    handleErrorRetry,
    handleSubmitReport,
  } = useErrorActions({ setStep });

  const {
    handleMainNavigate,
    handleSidebarNavigate,
    handlePlanManageOpen,
  } = useAppNavigation({
    setStep,
    canUseOcrOrShowLimit,
  });

  useAppRouteEffects({
    step,
    isSubscribed,
    progressLoaded,
    setMonthlyGoal,
    handleDailyCheckIn,
    loadMyPageStats: dashboard.loadMyPageStats,
    loadHomeDashboard: dashboard.loadHomeDashboard,
    refreshLeagueLeaderboard: dashboard.refreshLeagueLeaderboard,
    refreshOcrUsage,
  });

  const routeProps: AppRoutesProps = {
    step,
    setStep,
    nickname,
    setNickname,
    userEmail,
    userSocialId,
    handleLoginSuccess,
    handleNicknameRequired,
    handleNicknameSet,
    saveGoalAndContinue,
    finishTypeTest,
    typeResult,
    typeLabel,
    level,
    exp,
    streak,
    hasCheckedInToday,
    handleDailyCheckIn,
    weekAttendance,
    weeklyGrowth: dashboard.weeklyGrowth,
    monthlyStats: dashboard.monthlyStats,
    monthlyGoal,
    myRewardRank: dashboard.myRewardRank,
    myRewardTotal: dashboard.myRewardTotal,
    leagueUsers: dashboard.leagueUsers,
    handleMainNavigate,
    handleLogout,
    rewardScreenState,
    handleRewardScreenClose,
    currentLeagueTier: dashboard.currentLeagueTier,
    leagueRemainingText: dashboard.leagueRemainingText,
    handleSidebarNavigate,
    totalStudyCount: dashboard.totalStudyCount,
    continuousDays: dashboard.continuousDays,
    saveMonthlyGoal,
    isSubscribed,
    handlePlanManageOpen,
    handleWithdraw,
    selectPictureKey: studyRoutes.selectPictureKey,
    capturedSources: studyCapture.capturedSources,
    handleTakePictureDone: studyRoutes.handleTakePictureDone,
    handleSelectPictureBack: studyRoutes.handleSelectPictureBack,
    handleStartLearning: studyRoutes.handleStartLearning,
    selectedSourceIndex: studyCapture.selectedSourceIndex,
    ocrProgressState: studyCapture.ocrProgressState,
    isReviewMode,
    reviewQuizId,
    scaffoldingPayloads: studyCapture.scaffoldingPayloads,
    scaffoldingPayload: studyCapture.scaffoldingPayload,
    scaffoldingLoading: studyCapture.scaffoldingLoading,
    scaffoldingError: studyCapture.scaffoldingError,
    subjectName: studyCapture.subjectName,
    batchEarnedXp: studyActions.batchEarnedXp,
    handleScaffoldingBack: studyRoutes.handleScaffoldingBack,
    handleBackFromCompletion: studyActions.handleBackFromCompletion,
    handleScaffoldingRetry: studyActions.handleScaffoldingRetry,
    handleScaffoldingSave: studyActions.handleScaffoldingSave,
    handleBrushUpCardPress: studyRoutes.handleBrushUpCardPress,
    ocrUsage,
    setOcrUsage,
    handleSubscribe,
    handleCancelSubscribe,
    handleSubscriptionStatusChange,
    isSubscriptionProcessing,
    handleErrorRetry,
    handleSubmitReport,
    showUsageExhaustedModal,
    usageExhaustedMessage,
    handleUsageModalClose,
    handleUsageModalSubscribe,
  };

  return {
    step,
    routeProps,
  };
}
