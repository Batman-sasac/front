import React, { useState } from 'react';
import AppProviders from './src/app/AppProviders';
import AppRoutes from './src/app/AppRoutes';
import useAccountActions from './src/app/useAccountActions';
import useAppNavigation from './src/app/useAppNavigation';
import useAppRouteEffects from './src/app/useAppRouteEffects';
import useAuthFlow from './src/app/useAuthFlow';
import useErrorActions from './src/app/useErrorActions';
import useHomeDashboardData from './src/app/useHomeDashboardData';
import useLearningProgress from './src/app/useLearningProgress';
import useOcrUsageGate from './src/app/useOcrUsageGate';
import useOnboardingActions from './src/app/useOnboardingActions';
import useRewardOverlay from './src/app/useRewardOverlay';
import useReviewQuizLoader from './src/app/useReviewQuizLoader';
import useScaffoldingStudyActions from './src/app/useScaffoldingStudyActions';
import useStudyRouteActions from './src/app/useStudyRouteActions';
import useStudyCaptureFlow from './src/app/useStudyCaptureFlow';
import useSubscriptionActions from './src/app/useSubscriptionActions';
import { ResultStats } from './src/data/learningTypeTest';
import type { AppStep as Step } from './src/navigation/routes';

export default function App() {
  const [step, setStep] = useState<Step>('splash');
  const [typeResult, setTypeResult] = useState<ResultStats | null>(null);
  const [isReviewMode, setIsReviewMode] = useState(false); // 복습 모드 여부
  const [reviewQuizId, setReviewQuizId] = useState<number | null>(null); // 복습 퀴즈 ID

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

  const {
    myRewardRank,
    myRewardTotal,
    totalStudyCount,
    continuousDays,
    leagueUsers,
    weeklyGrowth,
    monthlyStats,
    currentLeagueTier,
    leagueRemainingText,
    refreshLeagueLeaderboard,
    refreshMyRewardRank,
    loadMyPageStats,
    loadHomeDashboard,
  } = useHomeDashboardData();

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
      void refreshMyRewardRank();
      void refreshLeagueLeaderboard();
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

  const {
    selectedSourceIndex,
    setSelectedSourceIndex,
    subjectName,
    cropBySourceIndex,
    setCropBySourceIndex,
    capturedSources,
    scaffoldingPayload,
    setScaffoldingPayload,
    scaffoldingPayloads,
    setScaffoldingPayloads,
    scaffoldingLoading,
    setScaffoldingLoading,
    scaffoldingError,
    setScaffoldingError,
    ocrProgressState,
    resetStudyInputState,
    prepareCapturedSources,
    clearCapturedSources,
    prepareLearningStart,
    runOcrForIndex,
    preloadScaffoldingPayloads,
  } = useStudyCaptureFlow({
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

  const {
    batchEarnedXp,
    resetBatchEarnedXp,
    resetPendingGradeParts,
    resetPendingReviewParts,
    handleBackFromCompletion,
    handleScaffoldingRetry,
    handleScaffoldingSave,
  } = useScaffoldingStudyActions({
    isReviewMode,
    setIsReviewMode,
    reviewQuizId,
    setReviewQuizId,
    selectedSourceIndex,
    setSelectedSourceIndex,
    capturedSources,
    cropBySourceIndex,
    scaffoldingPayload,
    setScaffoldingPayload,
    scaffoldingPayloads,
    setScaffoldingPayloads,
    setScaffoldingLoading,
    setScaffoldingError,
    runOcrForIndex,
    subjectName,
    setCropBySourceIndex,
    setStep,
    setExp,
    refreshOcrUsage,
    isSubscribed,
    isUsageLimitReached,
    setShowUsageExhaustedModal,
    refreshMyRewardRank,
    refreshLeagueLeaderboard,
    showRewardScreen,
  });

  useReviewQuizLoader({
    step,
    reviewQuizId,
    resetReviewParts: resetPendingReviewParts,
    setSelectedSourceIndex,
    setScaffoldingPayload,
    setScaffoldingPayloads,
    setScaffoldingLoading,
    setScaffoldingError,
  });

  const {
    selectPictureKey,
    handleTakePictureDone,
    handleSelectPictureBack,
    handleStartLearning,
    handleScaffoldingBack,
    handleBrushUpCardPress,
  } = useStudyRouteActions({
    isReviewMode,
    setIsReviewMode,
    setReviewQuizId,
    capturedSources,
    prepareCapturedSources,
    clearCapturedSources,
    prepareLearningStart,
    preloadScaffoldingPayloads,
    setSelectedSourceIndex,
    setScaffoldingPayload,
    setScaffoldingPayloads,
    setScaffoldingError,
    resetBatchEarnedXp,
    resetPendingGradeParts,
    resetPendingReviewParts,
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
    resetStudyInputState,
    resetBatchEarnedXp,
    setIsReviewMode,
    setReviewQuizId,
    clearTypeLabel,
    setStep,
  });

  const {
    handleSubscribe,
    handleCancelSubscribe,
    handleUsageModalClose,
    handleUsageModalSubscribe,
  } = useSubscriptionActions({
    setStep,
    setIsSubscribed,
    setShowUsageExhaustedModal,
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
    loadMyPageStats,
    loadHomeDashboard,
    refreshLeagueLeaderboard,
    refreshOcrUsage,
  });

  return (
    <AppProviders step={step}>
      <AppRoutes
        step={step}
        setStep={setStep}
        nickname={nickname}
        setNickname={setNickname}
        userEmail={userEmail}
        userSocialId={userSocialId}
        handleLoginSuccess={handleLoginSuccess}
        handleNicknameRequired={handleNicknameRequired}
        handleNicknameSet={handleNicknameSet}
        saveGoalAndContinue={saveGoalAndContinue}
        finishTypeTest={finishTypeTest}
        typeResult={typeResult}
        typeLabel={typeLabel}
        level={level}
        exp={exp}
        streak={streak}
        hasCheckedInToday={hasCheckedInToday}
        handleDailyCheckIn={handleDailyCheckIn}
        weekAttendance={weekAttendance}
        weeklyGrowth={weeklyGrowth}
        monthlyStats={monthlyStats}
        monthlyGoal={monthlyGoal}
        myRewardRank={myRewardRank}
        myRewardTotal={myRewardTotal}
        leagueUsers={leagueUsers}
        handleMainNavigate={handleMainNavigate}
        handleLogout={handleLogout}
        rewardScreenState={rewardScreenState}
        handleRewardScreenClose={handleRewardScreenClose}
        currentLeagueTier={currentLeagueTier}
        leagueRemainingText={leagueRemainingText}
        handleSidebarNavigate={handleSidebarNavigate}
        totalStudyCount={totalStudyCount}
        continuousDays={continuousDays}
        saveMonthlyGoal={saveMonthlyGoal}
        isSubscribed={isSubscribed}
        handlePlanManageOpen={handlePlanManageOpen}
        handleWithdraw={handleWithdraw}
        selectPictureKey={selectPictureKey}
        capturedSources={capturedSources}
        handleTakePictureDone={handleTakePictureDone}
        handleSelectPictureBack={handleSelectPictureBack}
        handleStartLearning={handleStartLearning}
        selectedSourceIndex={selectedSourceIndex}
        ocrProgressState={ocrProgressState}
        isReviewMode={isReviewMode}
        reviewQuizId={reviewQuizId}
        scaffoldingPayloads={scaffoldingPayloads}
        scaffoldingPayload={scaffoldingPayload}
        scaffoldingLoading={scaffoldingLoading}
        scaffoldingError={scaffoldingError}
        subjectName={subjectName}
        batchEarnedXp={batchEarnedXp}
        handleScaffoldingBack={handleScaffoldingBack}
        handleBackFromCompletion={handleBackFromCompletion}
        handleScaffoldingRetry={handleScaffoldingRetry}
        handleScaffoldingSave={handleScaffoldingSave}
        handleBrushUpCardPress={handleBrushUpCardPress}
        ocrUsage={ocrUsage}
        handleSubscribe={handleSubscribe}
        handleCancelSubscribe={handleCancelSubscribe}
        handleErrorRetry={handleErrorRetry}
        handleSubmitReport={handleSubmitReport}
        showUsageExhaustedModal={showUsageExhaustedModal}
        usageExhaustedMessage={usageExhaustedMessage}
        handleUsageModalClose={handleUsageModalClose}
        handleUsageModalSubscribe={handleUsageModalSubscribe}
      />
    </AppProviders>
  );
}
