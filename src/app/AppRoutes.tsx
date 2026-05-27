import React from 'react';

import type { ResultStats } from '../data/learningTypeTest';
import type { OcrProgressState } from './studyFlow';
import type { AppStep as Step } from '../navigation/routes';
import Splash from '../components/Splash';
import UsageExhaustedModal from '../components/subscription/UsageExhaustedModal';
import LoginScreen from '../screens/auth/LoginScreen';
import NicknameScreen from '../screens/auth/NicknameScreen';
import GoalSettingScreen from '../screens/goal/GoalSettingScreen';
import TypeIntroScreen from '../screens/diagnosis/TypeIntroScreen';
import TypeTestScreen from '../screens/diagnosis/TypeTestScreen';
import TypeResultScreen from '../screens/diagnosis/TypeResultScreen';
import HomeScreen from '../screens/home/HomeScreen';
import LeagueScreen from '../screens/league/LeagueScreen';
import AlarmScreen from '../screens/alarm/AlarmScreen';
import AlarmSettingScreen from '../screens/alarm/AlarmSettingScreen';
import MyPageScreen from '../screens/mypage/MyPageScreen';
import TakePicture from '../screens/input_data/TakePicture';
import SelectPicture from '../screens/input_data/SelectPicture';
import TalkingStudyScreen from '../screens/study/TalkingStudyScreen';
import ScaffoldingScreen from '../screens/study/ScaffoldingScreen';
import StudyFlowScreen from '../screens/study/StudyFlowScreen';
import BrushUPScreen from '../screens/brushUP/BrushUPScreen';
import RewardScreen from '../screens/reward/Reward';
import ErrorScreen from '../screens/error/error';
import SubscribeScreen from '../screens/subscribe/subscribe';

type RewardScreenState = {
  type: React.ComponentProps<typeof RewardScreen>['type'];
  xp: number;
};

type AppRoutesProps = {
  step: Step;
  setStep: (step: Step) => void;
  nickname: string;
  setNickname: (nickname: string) => void;
  userEmail: string;
  userSocialId: string;
  handleLoginSuccess: React.ComponentProps<typeof LoginScreen>['onLoginSuccess'];
  handleNicknameRequired: React.ComponentProps<typeof LoginScreen>['onNicknameRequired'];
  handleNicknameSet: React.ComponentProps<typeof NicknameScreen>['onNicknameSet'];
  saveGoalAndContinue: React.ComponentProps<typeof GoalSettingScreen>['onSubmit'];
  finishTypeTest: React.ComponentProps<typeof TypeTestScreen>['onFinish'];
  typeResult: ResultStats | null;
  typeLabel: string;
  level: number;
  exp: number;
  streak: number;
  hasCheckedInToday: boolean;
  handleDailyCheckIn: React.ComponentProps<typeof HomeScreen>['onCheckIn'];
  weekAttendance: React.ComponentProps<typeof HomeScreen>['weekAttendance'];
  weeklyGrowth: React.ComponentProps<typeof HomeScreen>['weeklyGrowth'];
  monthlyStats: React.ComponentProps<typeof HomeScreen>['monthlyStats'];
  monthlyGoal: number | null;
  myRewardRank: React.ComponentProps<typeof HomeScreen>['myRewardRank'];
  myRewardTotal: React.ComponentProps<typeof HomeScreen>['myRewardTotal'];
  leagueUsers: React.ComponentProps<typeof LeagueScreen>['users'];
  handleMainNavigate: React.ComponentProps<typeof HomeScreen>['onNavigate'];
  handleLogout: () => void;
  rewardScreenState: RewardScreenState | null;
  handleRewardScreenClose: React.ComponentProps<typeof RewardScreen>['onPressAnywhere'];
  currentLeagueTier: React.ComponentProps<typeof LeagueScreen>['currentTier'];
  leagueRemainingText: React.ComponentProps<typeof LeagueScreen>['remainingText'];
  handleSidebarNavigate: React.ComponentProps<typeof LeagueScreen>['onNavigate'];
  totalStudyCount: number;
  continuousDays: number;
  saveMonthlyGoal: React.ComponentProps<typeof MyPageScreen>['onMonthlyGoalChange'];
  isSubscribed: boolean;
  handlePlanManageOpen: React.ComponentProps<typeof MyPageScreen>['onPlanManage'];
  handleWithdraw: React.ComponentProps<typeof MyPageScreen>['onWithdraw'];
  selectPictureKey: string;
  capturedSources: React.ComponentProps<typeof SelectPicture>['sources'];
  handleTakePictureDone: React.ComponentProps<typeof TakePicture>['onDone'];
  handleSelectPictureBack: React.ComponentProps<typeof SelectPicture>['onBack'];
  handleStartLearning: React.ComponentProps<typeof SelectPicture>['onStartLearning'];
  selectedSourceIndex: number;
  ocrProgressState: OcrProgressState;
  isReviewMode: boolean;
  reviewQuizId: number | null;
  scaffoldingPayloads: React.ComponentProps<typeof ScaffoldingScreen>['payload'][];
  scaffoldingPayload: React.ComponentProps<typeof ScaffoldingScreen>['payload'];
  scaffoldingLoading: React.ComponentProps<typeof ScaffoldingScreen>['loading'];
  scaffoldingError: React.ComponentProps<typeof ScaffoldingScreen>['error'];
  subjectName: React.ComponentProps<typeof ScaffoldingScreen>['subjectName'];
  batchEarnedXp: React.ComponentProps<typeof ScaffoldingScreen>['accumulatedEarnedXp'];
  handleScaffoldingBack: React.ComponentProps<typeof ScaffoldingScreen>['onBack'];
  handleBackFromCompletion: React.ComponentProps<typeof ScaffoldingScreen>['onBackFromCompletion'];
  handleScaffoldingRetry: React.ComponentProps<typeof ScaffoldingScreen>['onRetry'];
  handleScaffoldingSave: React.ComponentProps<typeof ScaffoldingScreen>['onSave'];
  handleBrushUpCardPress: React.ComponentProps<typeof BrushUPScreen>['onCardPress'];
  ocrUsage: React.ComponentProps<typeof SubscribeScreen>['ocrUsage'];
  handleSubscribe: React.ComponentProps<typeof SubscribeScreen>['onSubscribe'];
  handleCancelSubscribe: React.ComponentProps<typeof SubscribeScreen>['onCancelSubscribe'];
  handleErrorRetry: React.ComponentProps<typeof ErrorScreen>['onRetry'];
  handleSubmitReport: React.ComponentProps<typeof ErrorScreen>['onSubmitReport'];
  showUsageExhaustedModal: boolean;
  usageExhaustedMessage: string;
  handleUsageModalClose: React.ComponentProps<typeof UsageExhaustedModal>['onClose'];
  handleUsageModalSubscribe: React.ComponentProps<typeof UsageExhaustedModal>['onSubscribe'];
};

export default function AppRoutes({
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
  weeklyGrowth,
  monthlyStats,
  monthlyGoal,
  myRewardRank,
  myRewardTotal,
  leagueUsers,
  handleMainNavigate,
  handleLogout,
  rewardScreenState,
  handleRewardScreenClose,
  currentLeagueTier,
  leagueRemainingText,
  handleSidebarNavigate,
  totalStudyCount,
  continuousDays,
  saveMonthlyGoal,
  isSubscribed,
  handlePlanManageOpen,
  handleWithdraw,
  selectPictureKey,
  capturedSources,
  handleTakePictureDone,
  handleSelectPictureBack,
  handleStartLearning,
  selectedSourceIndex,
  ocrProgressState,
  isReviewMode,
  reviewQuizId,
  scaffoldingPayloads,
  scaffoldingPayload,
  scaffoldingLoading,
  scaffoldingError,
  subjectName,
  batchEarnedXp,
  handleScaffoldingBack,
  handleBackFromCompletion,
  handleScaffoldingRetry,
  handleScaffoldingSave,
  handleBrushUpCardPress,
  ocrUsage,
  handleSubscribe,
  handleCancelSubscribe,
  handleErrorRetry,
  handleSubmitReport,
  showUsageExhaustedModal,
  usageExhaustedMessage,
  handleUsageModalClose,
  handleUsageModalSubscribe,
}: AppRoutesProps) {
  return (
    <>
      {step === 'splash' && (
        <Splash duration={1500} onDone={() => { }} />
      )}

      {step === 'login' && (
        <LoginScreen
          onLoginSuccess={handleLoginSuccess}
          onNicknameRequired={handleNicknameRequired}
        />
      )}

      {step === 'nickname' && (
        <NicknameScreen
          email={userEmail}
          socialId={userSocialId}
          onNicknameSet={handleNicknameSet}
        />
      )}

      {step === 'goal' && (
        <GoalSettingScreen
          onSubmit={saveGoalAndContinue}
        />
      )}

      {step === 'typeIntro' && (
        <TypeIntroScreen
          nickname={nickname}
          onStartTest={() => setStep('typeTest')}
        />
      )}

      {step === 'typeTest' && (
        <TypeTestScreen
          onFinish={finishTypeTest}
        />
      )}

      {step === 'result' && typeResult && (
        <TypeResultScreen
          nickname={nickname}
          result={typeResult}
          onGoHome={() => setStep('home')}
        />
      )}

      {step === 'home' && (
        <HomeScreen
          nickname={nickname}
          typeLabel={typeLabel}
          level={level}
          exp={exp}
          streak={streak}
          hasCheckedInToday={hasCheckedInToday}
          onCheckIn={handleDailyCheckIn}
          weekAttendance={weekAttendance}
          weeklyGrowth={weeklyGrowth}
          monthlyStats={monthlyStats}
          monthlyGoal={monthlyGoal}
          myRewardRank={myRewardRank}
          myRewardTotal={myRewardTotal}
          leagueUsers={leagueUsers}
          onNavigate={handleMainNavigate}
          onLogout={handleLogout}
        />
      )}

      {step === 'reward' && rewardScreenState && (
        <RewardScreen
          type={rewardScreenState.type}
          xp={rewardScreenState.xp}
          onPressAnywhere={handleRewardScreenClose}
        />
      )}

      {step === 'league' && (
        <LeagueScreen
          onNavigate={handleSidebarNavigate}
          onLogout={handleLogout}
          currentTier={currentLeagueTier}
          users={leagueUsers}
          remainingText={leagueRemainingText}
        />
      )}

      {step === 'alarm' && (
        <AlarmScreen
          onNavigate={(screen) => setStep(screen)}
        />
      )}

      {step === 'alarmSetting' && (
        <AlarmSettingScreen
          onNavigate={(screen) => setStep(screen as Step)}
        />
      )}

      {step === 'mypage' && (
        <MyPageScreen
          nickname={nickname}
          typeLabel={typeLabel}
          level={level}
          totalStudyCount={totalStudyCount}
          continuousDays={continuousDays}
          monthlyGoal={monthlyGoal}
          onNavigate={handleMainNavigate}
          onMonthlyGoalChange={saveMonthlyGoal}
          onNicknameChange={(newNickname) => setNickname(newNickname)}
          onLogout={handleLogout}
          isSubscribed={isSubscribed}
          onPlanManage={handlePlanManageOpen}
          onWithdraw={handleWithdraw}
        />
      )}

      {step === 'takePicture' && (
        <TakePicture
          onBack={() => setStep('home')}
          onDone={handleTakePictureDone}
        />
      )}

      {step === 'selectPicture' && (
        <SelectPicture
          key={selectPictureKey}
          sources={capturedSources}
          onBack={handleSelectPictureBack}
          onStartLearning={handleStartLearning}
        />
      )}

      {step === 'ocrLoading' && (
        <StudyFlowScreen
          mode="loading"
          totalPages={capturedSources.length}
          currentPage={Math.min(selectedSourceIndex + 1, Math.max(capturedSources.length, 1))}
          progress={ocrProgressState.totalPages > 0
            ? Math.round((Math.min(ocrProgressState.completedPages, ocrProgressState.totalPages) / ocrProgressState.totalPages) * 100)
            : 0}
        />
      )}

      {step === 'studyIntro' && (
        <StudyFlowScreen
          mode="intro"
          totalPages={capturedSources.length}
          currentPage={selectedSourceIndex + 1}
          onStart={() => setStep('scaffolding')}
        />
      )}

      {step === 'talkingStudy' && (
        <TalkingStudyScreen
          onBack={() => setStep('selectPicture')}
          onSkip={() => setStep('scaffolding')}
          onDone={() => setStep('scaffolding')}
        />
      )}

      {step === 'scaffolding' && (
        <ScaffoldingScreen
          key={`study-${isReviewMode ? `review-${reviewQuizId ?? 'none'}-${selectedSourceIndex}` : `new-${selectedSourceIndex}`}`}
          onBack={handleScaffoldingBack}
          onBackFromCompletion={handleBackFromCompletion}
          sources={capturedSources}
          selectedIndex={selectedSourceIndex}
          payload={scaffoldingPayload}
          loading={scaffoldingLoading}
          error={scaffoldingError}
          initialRound={isReviewMode ? '3-1' : '1-1'} // 복습 모드면 3라운드로 시작
          reviewQuizId={reviewQuizId} // 복습 퀴즈 ID 전달
          subjectName={subjectName} // 과목명 전달
          currentStudyIndex={selectedSourceIndex}
          totalStudyCount={isReviewMode ? Math.max(scaffoldingPayloads.length, 1) : capturedSources.length}
          accumulatedEarnedXp={batchEarnedXp}
          onRetry={handleScaffoldingRetry}
          onSave={handleScaffoldingSave}
        />
      )}

      {step === 'brushup' && (
        <BrushUPScreen
          onBack={() => setStep('home')}
          // 복습 보정
          onNavigate={handleSidebarNavigate}
          onLogout={handleLogout}
          onCardPress={handleBrushUpCardPress}
        />
      )}

      {step === 'subscribe' && (
        <SubscribeScreen
          isSubscribed={isSubscribed}
          ocrUsage={ocrUsage}
          onBack={() => setStep('mypage')}
          onSubscribe={handleSubscribe}
          onCancelSubscribe={handleCancelSubscribe}
        />
      )}

      {step === 'error' && (
        <ErrorScreen
          onGoHome={() => setStep('home')}
          onRetry={handleErrorRetry}
          onSubmitReport={handleSubmitReport}
        />
      )}

      <UsageExhaustedModal
        visible={showUsageExhaustedModal}
        message={usageExhaustedMessage}
        onClose={handleUsageModalClose}
        onSubscribe={handleUsageModalSubscribe}
      />
    </>
  );
}
