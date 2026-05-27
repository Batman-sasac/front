import React, { useState, useEffect, useRef } from 'react';
import { Alert, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AppProviders from './src/app/AppProviders';
import { getErrorMessage } from './src/app/errors';
import { TYPE_LABEL_KEY } from './src/app/progress';
import {
  buildReviewPayloadsByPage,
} from './src/app/studyFlow';
import useHomeDashboardData from './src/app/useHomeDashboardData';
import useLearningProgress from './src/app/useLearningProgress';
import useStudyCaptureFlow from './src/app/useStudyCaptureFlow';
import Splash from './src/components/Splash';
import UsageExhaustedModal from './src/components/subscription/UsageExhaustedModal';
import LoginScreen from './src/screens/auth/LoginScreen';
import NicknameScreen from './src/screens/auth/NicknameScreen';
import GoalSettingScreen from './src/screens/goal/GoalSettingScreen';
import TypeIntroScreen from './src/screens/diagnosis/TypeIntroScreen';
import TypeTestScreen from './src/screens/diagnosis/TypeTestScreen';
import TypeResultScreen from './src/screens/diagnosis/TypeResultScreen';
import HomeScreen from './src/screens/home/HomeScreen';
import { ResultStats, typeProfiles } from './src/data/learningTypeTest';
import LeagueScreen from './src/screens/league/LeagueScreen';
import AlarmScreen from './src/screens/alarm/AlarmScreen';
import AlarmSettingScreen from './src/screens/alarm/AlarmSettingScreen';
import MyPageScreen from './src/screens/mypage/MyPageScreen';
import TakePicture from './src/screens/input_data/TakePicture';
import SelectPicture from './src/screens/input_data/SelectPicture';
import TalkingStudyScreen from './src/screens/study/TalkingStudyScreen';
import ScaffoldingScreen from './src/screens/study/ScaffoldingScreen';
import StudyFlowScreen from './src/screens/study/StudyFlowScreen';
import { buildOrderedStudySaveData } from './src/screens/study/scaffoldingLogic';
import BrushUPScreen from './src/screens/brushUP/BrushUPScreen';
import RewardScreen, { RewardType } from './src/screens/reward/Reward';
import ErrorScreen from './src/screens/error/error';
import SubscribeScreen from './src/screens/subscribe/subscribe';
import Sidebar, { type Screen as SidebarScreen } from './src/components/Sidebar';
import { PageItem, BlankItemSave, gradeStudy, getQuizForReview, getOcrUsage, OcrUsageResponse, submitReviewStudy } from './src/api/ocr';
import { registerAndSyncPushToken } from './src/api/notification';
import { setStudyGoal } from './src/api/weekly';
import { getToken, getUserInfo, saveAuthData, clearAuthData } from './src/lib/storage';
import { getHomeStats, getUserStats } from './src/api/auth';
import { getOcrUsageExhaustedMessage } from './src/lib/ocrUsage';
import type { AppStep as Step } from './src/navigation/routes';

type SocialProvider = 'kakao' | 'naver';

export default function App() {
  const [step, setStep] = useState<Step>('splash');
  const [nickname, setNickname] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userSocialId, setUserSocialId] = useState('');
  const [typeResult, setTypeResult] = useState<ResultStats | null>(null);
  const [isReviewMode, setIsReviewMode] = useState(false); // 복습 모드 여부
  const [reviewQuizId, setReviewQuizId] = useState<number | null>(null); // 복습 퀴즈 ID
  const [batchEarnedXp, setBatchEarnedXp] = useState(0);
  const batchEarnedXpRef = useRef(0);
  type PendingGradePart = {
    pages: PageItem[];
    blankItems: BlankItemSave[];
    keywords: string[];
    userAnswers: string[];
    correctCount: number;
  };
  type PendingReviewPart = {
    userAnswers: string[];
    correctCount: number;
  };
  // 멀티 이미지 학습 시: 페이지별 결과를 모았다가 마지막에 1번만 /study/grade 호출
  const [pendingGradeParts, setPendingGradeParts] = useState<Record<number, PendingGradePart>>({});
  const pendingGradePartsRef = useRef<Record<number, PendingGradePart>>({});
  const pendingReviewPartsRef = useRef<Record<number, PendingReviewPart>>({});
  const [rewardScreenState, setRewardScreenState] = useState<{ type: RewardType; xp: number } | null>(null);
  const rewardCloseActionRef = useRef<(() => void) | null>(null);
  const [pushTokenSynced, setPushTokenSynced] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [ocrUsage, setOcrUsage] = useState<OcrUsageResponse | null>(null);
  const [showUsageExhaustedModal, setShowUsageExhaustedModal] = useState(false);

  const usageExhaustedMessage = getOcrUsageExhaustedMessage(ocrUsage);

  const resetBatchEarnedXp = () => {
    batchEarnedXpRef.current = 0;
    setBatchEarnedXp(0);
  };

  const addBatchEarnedXp = (delta: number) => {
    const safeDelta = Number.isFinite(delta) ? delta : 0;
    batchEarnedXpRef.current += safeDelta;
    setBatchEarnedXp(batchEarnedXpRef.current);
    return batchEarnedXpRef.current;
  };

  const isUsageLimitReached = (usage?: OcrUsageResponse | null) => {
    const target = usage ?? ocrUsage;
    if (!target) return false;

    // 백엔드에서 무제한(화이트리스트) 유저로 내려온 경우에는 항상 사용 가능 처리
    if (target.is_unlimited) return false;

    return target.status === 'limit_reached' || target.remaining <= 0;
  };

  const refreshOcrUsage = async () => {
    try {
      const token = await getToken();
      if (!token) {
        setOcrUsage(null);
        return null;
      }
      const usage = await getOcrUsage();
      setOcrUsage(usage);
      return usage;
    } catch (error) {
      console.error('OCR 사용량 조회 실패:', error);
      return null;
    }
  };

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

  const tryMoveToTakePicture = async () => {
    const usage = await refreshOcrUsage();
    if (!isSubscribed && isUsageLimitReached(usage)) {
      setShowUsageExhaustedModal(true);
      return;
    }
    setStep('takePicture');
  };

  const handleMainNavigate = (screen: 'home' | 'league' | 'alarm' | 'mypage' | 'takePicture' | 'brushup') => {
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
    const usage = await refreshOcrUsage();
    if (!isSubscribed && isUsageLimitReached(usage)) {
      setShowUsageExhaustedModal(true);
      return;
    }
    setStep('subscribe');
  };

  useEffect(() => {
    if (step === 'mypage') {
      void loadMyPageStats();
    }
  }, [step]);

  useEffect(() => {
    // 앱 시작 시 자동 로그인 체크
    checkAutoLogin();
  }, []);

  // 로그인 후 홈에 들어오면: iOS만 Expo 푸시 토큰 생성 후 백엔드에 전달
  useEffect(() => {
    if (step !== 'home' || pushTokenSynced) return;

    const authToken = getToken();
    authToken.then((token) => {
      if (!token) return;
      return registerAndSyncPushToken(token);
    }).then((ok) => {
      if (ok) setPushTokenSynced(true);
    }).catch((error) => {
      console.error('푸시 토큰 등록 실패:', error);
    });
  }, [step, pushTokenSynced]);

  const checkAutoLogin = async () => {
    try {
      const token = await getToken();
      if (token) {
        const userInfo = await getUserInfo();
        if (userInfo.email && userInfo.nickname) {
          setUserEmail(userInfo.email);
          setNickname(userInfo.nickname);
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
          } catch (e) {
            console.error('유저 상태 조회 실패:', e);
          }
          await refreshOcrUsage();
          const storedTypeLabel = (await AsyncStorage.getItem(TYPE_LABEL_KEY))?.trim() ?? '';
          if (storedTypeLabel) {
            setTypeLabel(storedTypeLabel);
          }
          setTimeout(() => setStep(storedTypeLabel ? 'home' : 'typeIntro'), 2000);
          return;
        }
      }
      // 토큰이 없으면 로그인 화면으로
      setTimeout(() => setStep('login'), 2000);
    } catch (error) {
      console.error('자동 로그인 확인 오류:', error);
      setTimeout(() => setStep('login'), 2000);
    }
  };

  const handleLogout = async () => {
    try {
      console.log('로그아웃 시작...');
      await clearAuthData();
      console.log('로그아웃 완료');
      // 상태 초기화
      setUserEmail('');
      setNickname('');
      setUserSocialId('');
      setTypeResult(null);
      setIsSubscribed(false);
      setOcrUsage(null);
      setShowUsageExhaustedModal(false);
      // 로그인 화면으로 이동
      setStep('login');
    } catch (error) {
      console.error('로그아웃 오류:', error);
    }
  };

  useEffect(() => {
    if (step === 'home' && progressLoaded) {
      handleDailyCheckIn();   // 홈 진입 시 자동 출석

      void loadHomeDashboard(setMonthlyGoal);
    }

    // 리그 화면 진입 시 상위 5명 리더보드 로드
    if (step === 'league') {
      void refreshLeagueLeaderboard();
    }
  }, [step, progressLoaded]);

  useEffect(() => {
    if (step !== 'home') return;
    void refreshOcrUsage();
  }, [step, isSubscribed]);

  // 복습 진입 시 DB에서 퀴즈 데이터 조회
  useEffect(() => {
    if (step !== 'scaffolding' || reviewQuizId == null) return;
    let cancelled = false;
    setScaffoldingLoading(true);
    setScaffoldingError(null);
    getQuizForReview(reviewQuizId)
      .then((payload) => {
        if (!cancelled) {
          const reviewPayloads = buildReviewPayloadsByPage(payload);
          pendingReviewPartsRef.current = {};
          setScaffoldingPayloads(reviewPayloads);
          setSelectedSourceIndex(0);
          setScaffoldingPayload(reviewPayloads[0] ?? payload);
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setScaffoldingPayload(null);
          setScaffoldingError(getErrorMessage(error, '복습 퀴즈 데이터를 불러오지 못했습니다.'));
        }
      })
      .finally(() => {
        if (!cancelled) setScaffoldingLoading(false);
      });
    return () => { cancelled = true; };
  }, [step, reviewQuizId]);

  // 로그인 성공 핸들러
  const handleLoginSuccess = async (email: string, userNickname: string) => {
    setUserEmail(email);
    setNickname(userNickname);
    try {
      const token = await getToken();
      if (token) {
        const homeStats = await getHomeStats(token);
        if (typeof homeStats.data.points === 'number' && Number.isFinite(homeStats.data.points)) {
          setExp(homeStats.data.points);
        }
        if (typeof homeStats.data.monthly_goal === 'number' && homeStats.data.monthly_goal > 0) {
          setMonthlyGoal(homeStats.data.monthly_goal);
        }
        const userState = await getUserStats(token);
        setIsSubscribed(!!userState.data.is_subscribed);
      }
    } catch (e) {
      console.error('유저 상태 조회 실패:', e);
    }
    await refreshOcrUsage();
    const storedTypeLabel = (await AsyncStorage.getItem(TYPE_LABEL_KEY))?.trim() ?? '';
    if (storedTypeLabel) {
      setTypeLabel(storedTypeLabel);
    }
    setStep(storedTypeLabel ? 'home' : 'typeIntro');
  };

  // 닉네임 설정 필요 핸들러
  const handleNicknameRequired = (email: string, socialId: string) => {
    setUserEmail(email);
    setUserSocialId(socialId);
    setStep('nickname');
  };

  // 닉네임 설정 완료 핸들러
  const handleNicknameSet = (email: string, userNickname: string) => {
    setUserEmail(email);
    setNickname(userNickname);
    setStep('typeIntro');
  };

  function buildBlankWordsFromText(text: string, limit = 8) {
    // 1) 공백/문장부호 기준으로 분리
    const raw = text
      .replace(/[0-9]/g, ' ')
      .replace(/[.,!?()\[\]{}"'`~]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .split(' ');

    // 2) 너무 짧은 토큰 제거 + 중복 제거
    const uniq: string[] = [];
    for (const w of raw) {
      const clean = w.trim();
      if (clean.length < 2) continue;
      if (!uniq.includes(clean)) uniq.push(clean);
      if (uniq.length >= limit) break;
    }
    return uniq;
  }

  return (
    <AppProviders step={step}>
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
              onSubmit={async (goal) => {
                try {
                  await setStudyGoal(goal);
                  setMonthlyGoal(goal);
                  setStep('typeIntro');
                } catch (error: unknown) {
                  Alert.alert('목표 설정 실패', getErrorMessage(error, '목표 설정에 실패했습니다.'));
                }
              }}
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
              onFinish={async (result) => {
                setTypeResult(result);
                // typeKey로 프로필을 찾아 title 사용
                const profile = typeProfiles[result.typeKey];
                setTypeLabel(profile.title);
                await AsyncStorage.setItem(TYPE_LABEL_KEY, profile.title);
                setStep('result');
              }}
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
              onMonthlyGoalChange={async (goal) => {
                try {
                  await setStudyGoal(goal);
                  setMonthlyGoal(goal);
                } catch (error: unknown) {
                  Alert.alert('목표 설정 실패', getErrorMessage(error, '목표 설정에 실패했습니다.'));
                }
              }}
              onNicknameChange={(newNickname) => setNickname(newNickname)}
              onLogout={handleLogout}
              isSubscribed={isSubscribed}
              onPlanManage={handlePlanManageOpen}
              onWithdraw={() => {
                // 모든 상태 초기화
                setNickname('');
                setUserEmail('');
                setUserSocialId('');
                setTypeResult(null);
                setTypeLabel('');
                setLevel(1);
                setExp(0);
                setMonthlyGoal(null);
                setStreak(0);
                setLastAttendanceDate(null);
                resetStudyInputState();
                resetBatchEarnedXp();
                setIsReviewMode(false);
                setReviewQuizId(null);
                void AsyncStorage.removeItem(TYPE_LABEL_KEY);

                // 로그인 화면으로 이동
                setStep('login');
              }}
            />
          )}

          {/* 자료 입력: 촬영 화면 */}
          {step === 'takePicture' && (
            <TakePicture
              onBack={() => setStep('home')}
              onDone={(sources) => {
                prepareCapturedSources(sources);
                setPendingGradeParts({});
                pendingGradePartsRef.current = {};
                setStep('selectPicture');
              }}
            />
          )}


          {/* 자료 입력: 선택/미리보기 화면 */}
          {step === 'selectPicture' && (
            <SelectPicture
              key={capturedSources.map((source, index) => {
                return source?.uri ? `uri-${source.uri}-${index}` : `source-${index}`;
              }).join('|')}
              sources={capturedSources}
              onBack={() => {
                clearCapturedSources();
                setPendingGradeParts({});
                pendingGradePartsRef.current = {};
                setStep('takePicture');
              }}
              onStartLearning={async (finalSources, isOcrNeeded, subject, cropMap) => {
                void isOcrNeeded;
                const nextCropMap = prepareLearningStart(finalSources, subject, cropMap);
                resetBatchEarnedXp();
                setPendingGradeParts({});
                pendingGradePartsRef.current = {};

                if (!finalSources.length) {
                  setScaffoldingError('학습할 이미지가 없습니다.');
                  setScaffoldingPayload(null);
                  setStep('home');
                  return;
                }

                setStep('ocrLoading');
                await preloadScaffoldingPayloads(finalSources, nextCropMap);
              }}
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
              onBack={() => {
                // 복습 모드에서 복습 화면으로
                if (isReviewMode) {
                  setIsReviewMode(false);
                  setReviewQuizId(null);
                  pendingReviewPartsRef.current = {};
                  setScaffoldingPayloads([]);
                  setStep('brushup');
                } else {
                  setStep('selectPicture');
                }
              }}
              onBackFromCompletion={async () => {
                if (isReviewMode && selectedSourceIndex < scaffoldingPayloads.length - 1) {
                  const nextIndex = selectedSourceIndex + 1;
                  const nextPayload = scaffoldingPayloads[nextIndex];
                  if (nextPayload) {
                    setSelectedSourceIndex(nextIndex);
                    setScaffoldingPayload(nextPayload);
                    setScaffoldingError(null);
                    setStep('scaffolding');
                    return;
                  }
                }

                if (!isReviewMode && selectedSourceIndex < capturedSources.length - 1) {
                  const nextIndex = selectedSourceIndex + 1;
                  const nextPayload = scaffoldingPayloads[nextIndex];
                  if (nextPayload) {
                    setSelectedSourceIndex(nextIndex);
                    setScaffoldingPayload(nextPayload);
                    setScaffoldingError(null);
                    setStep('studyIntro');
                    return;
                  }

                  setScaffoldingLoading(true);
                  setScaffoldingError(null);
                  try {
                    const payload = await runOcrForIndex(capturedSources, nextIndex, cropBySourceIndex);
                    setSelectedSourceIndex(nextIndex);
                    setScaffoldingPayload(payload);
                    setScaffoldingPayloads((prev) => {
                      const next = [...prev];
                      next[nextIndex] = payload;
                      return next;
                    });
                    setStep('studyIntro');
                  } catch (error: unknown) {
                    const message = getErrorMessage(error, '텍스트 추출에 실패했습니다.');
                    setScaffoldingPayload(null);
                    setScaffoldingError(message);

                    if (typeof message === 'string' && message.includes('무료 횟수')) {
                      Alert.alert('텍스트 추출 사용 한도', message);
                      setStep('home');
                      return;
                    }

                    Alert.alert('텍스트 추출 오류', message);
                  } finally {
                    setScaffoldingLoading(false);
                  }
                  return;
                }

                // 전체 학습 완료 후 홈 이동
                setIsReviewMode(false);
                setReviewQuizId(null);
                pendingReviewPartsRef.current = {};
                resetBatchEarnedXp();
                setCropBySourceIndex({});
                setScaffoldingPayloads([]);
                setStep('home');
                const usage = await refreshOcrUsage();
                if (!isSubscribed && isUsageLimitReached(usage)) {
                  setShowUsageExhaustedModal(true);
                }
              }}
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
              onRetry={async () => {
                setScaffoldingLoading(true);
                setScaffoldingError(null);
                try {
                  const payload = await runOcrForIndex(capturedSources, selectedSourceIndex, cropBySourceIndex);
                  setScaffoldingPayload(payload);
                  setScaffoldingPayloads((prev) => {
                    const next = [...prev];
                    next[selectedSourceIndex] = payload;
                    return next;
                  });
                } catch (error: unknown) {
                  setScaffoldingPayload(null);
                  setScaffoldingError(getErrorMessage(error, '재시도에 실패했습니다.'));
                } finally {
                  setScaffoldingLoading(false);
                }
              }}
              onSave={async ({ answers: userAnswers, selectedBlankIds, selectedBlankItems }) => {
                if (!scaffoldingPayload) throw new Error('Payload가 없습니다.');

                const blanks = scaffoldingPayload.blanks ?? [];
                const rawBlankItems = scaffoldingPayload.blankItems && scaffoldingPayload.blankItems.length > 0
                  ? scaffoldingPayload.blankItems
                  : blanks.map((b, i) => ({ blank_index: i, word: b.word, page_index: 0 }));
                const selectedExactBlankItems = (selectedBlankItems ?? [])
                  .map((item, index) => ({
                    blank_index: index,
                    word: item.word,
                    page_index: item.page_index ?? 0,
                    ...(item.candidate_id ? { candidate_id: item.candidate_id } : {}),
                  }))
                  .filter((item) => item.word.trim().length > 0);
                const orderedSaveData = selectedExactBlankItems.length > 0
                  ? {
                    keywords: selectedExactBlankItems.map((item) => item.word),
                    blankItems: selectedExactBlankItems,
                  }
                  : buildOrderedStudySaveData({
                    selectedBlankIds,
                    blanks,
                    rawBlankItems,
                  });
                const { keywords, blankItems } = orderedSaveData;
                if (keywords.length === 0 && !isReviewMode) {
                  throw new Error('선택된 빈칸 정보가 없습니다.');
                }

                const reviewCorrectCount = userAnswers.reduce((acc, ua, idx) => {
                  const isCorrect = (ua ?? '').trim().toLowerCase() === (keywords[idx] ?? '').trim().toLowerCase();
                  return acc + (isCorrect ? 1 : 0);
                }, 0);
                const reviewEarnedXp = reviewCorrectCount * 2;

                // 복습 모드에서는 저장하지 않음
                if (isReviewMode) {
                  const exactReviewAnswerWords = rawBlankItems.length > 0
                    ? rawBlankItems.map((item) => item.word)
                    : blanks.map((blank) => blank.word);
                  const exactReviewCorrectCount = userAnswers.reduce((acc, ua, idx) => {
                    const isCorrect = (ua ?? '').trim().toLowerCase() === (exactReviewAnswerWords[idx] ?? '').trim().toLowerCase();
                    return acc + (isCorrect ? 1 : 0);
                  }, 0);
                  const nextReviewParts = {
                    ...pendingReviewPartsRef.current,
                    [selectedSourceIndex]: {
                      userAnswers,
                      correctCount: exactReviewCorrectCount,
                    },
                  };
                  pendingReviewPartsRef.current = nextReviewParts;

                  const reviewPageCount = Math.max(scaffoldingPayloads.length, 1);
                  const isLastReviewPage = selectedSourceIndex >= reviewPageCount - 1;
                  const completedReviewParts = Object.values(nextReviewParts);
                  const accumulatedReviewCorrectCount = completedReviewParts.reduce((acc, part) => acc + part.correctCount, 0);
                  const accumulatedReviewEarnedXp = accumulatedReviewCorrectCount * 2;

                  if (!isLastReviewPage) {
                    return {
                      earnedXp: exactReviewCorrectCount * 2,
                      totalEarnedXp: accumulatedReviewEarnedXp,
                      handledCompletion: false,
                    };
                  }

                  const mergedReviewUserAnswers: string[] = [];
                  for (let idx = 0; idx < reviewPageCount; idx += 1) {
                    const part = nextReviewParts[idx];
                    if (!part) throw new Error(`${idx + 1}번째 복습 답안이 없어 저장할 수 없습니다.`);
                    mergedReviewUserAnswers.push(...part.userAnswers);
                  }

                  setExp((prev) => prev + accumulatedReviewEarnedXp);
                  setIsReviewMode(false);
                  setReviewQuizId(null);
                  pendingReviewPartsRef.current = {};
                  setScaffoldingPayloads([]);
                  showRewardScreen('reviewComplete', accumulatedReviewEarnedXp, () => setStep('home'));

                  if (reviewQuizId != null) {
                    void submitReviewStudy({
                      quiz_id: reviewQuizId,
                      user_answers: mergedReviewUserAnswers,
                    })
                      .then((reviewResult) => {
                        const nextPoints = Number(reviewResult?.new_points);
                        if (Number.isFinite(nextPoints)) {
                          setExp(nextPoints);
                        }
                        return Promise.all([
                          refreshMyRewardRank(),
                          refreshLeagueLeaderboard(),
                        ]);
                      })
                      .catch((error) => {
                        console.error('복습 결과 저장 실패:', error);
                      });
                  }
                  return {
                    earnedXp: exactReviewCorrectCount * 2,
                    totalEarnedXp: accumulatedReviewEarnedXp,
                    handledCompletion: true,
                  };
                }
                const pages = scaffoldingPayload.pages && scaffoldingPayload.pages.length > 0
                  ? scaffoldingPayload.pages
                  : [{ original_text: scaffoldingPayload.extractedText, keywords }];
                const rawText = pages.map((p) => p.original_text ?? '').join('\n\n');

                const isLastInBatch = selectedSourceIndex >= capturedSources.length - 1;
                const earnedXp = reviewCorrectCount * 2;

                // 페이지별 결과를 모아둠 (마지막 페이지에서만 merge 후 DB 저장)
                const part: PendingGradePart = {
                  pages,
                  blankItems,
                  keywords,
                  userAnswers,
                  correctCount: reviewCorrectCount,
                };
                const nextParts = {
                  ...pendingGradePartsRef.current,
                  [selectedSourceIndex]: part,
                };
                pendingGradePartsRef.current = nextParts;
                setPendingGradeParts(nextParts);

                if (!isLastInBatch) {
                  const nextBatchTotal = earnedXp > 0
                    ? addBatchEarnedXp(earnedXp)
                    : batchEarnedXpRef.current;
                  return {
                    earnedXp,
                    totalEarnedXp: nextBatchTotal,
                  };
                }

                // 마지막 페이지: 지금까지 모아둔 결과 + 현재 페이지 결과를 merge해서 1회 저장
                const mergedParts: Record<number, PendingGradePart> = {
                  ...pendingGradePartsRef.current,
                };
                const mergedPages: PageItem[] = [];
                const mergedBlanks: BlankItemSave[] = [];
                const mergedKeywords: string[] = [];
                const mergedUserAnswers: string[] = [];
                let pageOffset = 0;
                let blankOffset = 0;
                let totalCorrect = 0;

                for (let idx = 0; idx < capturedSources.length; idx += 1) {
                  const p = mergedParts[idx];
                  if (!p) throw new Error(`${idx + 1}페이지 학습 결과가 없어 저장할 수 없습니다.`);
                  totalCorrect += p.correctCount;

                  // pages merge (global page index)
                  for (const pg of p.pages) mergedPages.push(pg);

                  // blanks merge (reindex blank_index + page_index)
                  for (let b = 0; b < p.blankItems.length; b += 1) {
                    const bi = p.blankItems[b];
                    mergedBlanks.push({
                      blank_index: blankOffset + b,
                      word: bi.word,
                      page_index: pageOffset + (bi.page_index ?? 0),
                      ...(bi.candidate_id ? { candidate_id: bi.candidate_id } : {}),
                    });
                  }

                  // answers merge (blank order)
                  mergedKeywords.push(...p.keywords);
                  mergedUserAnswers.push(...p.userAnswers);

                  pageOffset += p.pages.length;
                  blankOffset += p.keywords.length;
                }

                const mergedRawText = mergedPages.map((p) => p.original_text ?? '').join('\n\n');
                const mergedOcrText = {
                  pages: mergedPages,
                  blanks: mergedBlanks,
                  quiz: { raw: mergedRawText },
                  layout_meta: {
                    selected_blank_refs: mergedBlanks.map((blank) => ({
                      blank_index: blank.blank_index,
                      word: blank.word,
                      page_index: blank.page_index,
                      ...(blank.candidate_id ? { candidate_id: blank.candidate_id } : {}),
                    })),
                  },
                };

                // 페이지별 문항/정답 집계 (mergedBlanks.page_index 기준)
                const pageQuestionCounts = Array.from({ length: mergedPages.length }, () => 0);
                const pageCorrectCounts = Array.from({ length: mergedPages.length }, () => 0);
                for (let i = 0; i < mergedBlanks.length; i += 1) {
                  const pageIndex = mergedBlanks[i]?.page_index ?? 0;
                  if (pageIndex < 0 || pageIndex >= pageQuestionCounts.length) continue;
                  pageQuestionCounts[pageIndex] += 1;
                  const ua = (mergedUserAnswers[i] ?? '').trim().toLowerCase();
                  const ca = (mergedKeywords[i] ?? '').trim().toLowerCase();
                  if (ua && ca && ua === ca) pageCorrectCounts[pageIndex] += 1;
                }

                const gradeResult = await gradeStudy({
                  quiz_id: 0,
                  correct_answers: mergedKeywords,
                  answer: mergedKeywords,
                  user_answer: mergedUserAnswers,
                  quiz_html: mergedRawText,
                  ocr_text: mergedOcrText,
                  // backend compatibility
                  user_answers: mergedUserAnswers,
                  subject_name: subjectName || scaffoldingPayload.title,
                  study_name: subjectName || scaffoldingPayload.title,
                  original_text: mergedPages.map((p) => p.original_text ?? ''),
                  keywords: mergedKeywords,
                  grade_cnt: totalCorrect,
                  page_correct_counts: pageCorrectCounts,
                  page_question_counts: pageQuestionCounts,
                });

                setPendingGradeParts({});
                pendingGradePartsRef.current = {};
                const nextPoints = Number(gradeResult?.new_points);
                const rewardGiven = Number(gradeResult?.reward_given);
                const totalEarned = Number.isFinite(rewardGiven) ? rewardGiven : totalCorrect * 2;
                batchEarnedXpRef.current = totalEarned;
                setBatchEarnedXp(totalEarned);

                if (Number.isFinite(nextPoints)) {
                  setExp(nextPoints);
                } else if (totalEarned > 0) {
                  setExp((prev) => prev + totalEarned);
                }
                if (totalEarned > 0) {
                  void Promise.all([
                    refreshMyRewardRank(),
                    refreshLeagueLeaderboard(),
                  ]);
                  showRewardScreen('studyComplete', totalEarned, () => setStep('home'));
                }
                return {
                  earnedXp,
                  totalEarnedXp: totalEarned,
                  handledCompletion: totalEarned > 0,
                };
              }}
            />

          )}

          {step === 'brushup' && (
            <BrushUPScreen
              onBack={() => setStep('home')}
              // 복습 보정
              onNavigate={handleSidebarNavigate}
              onLogout={handleLogout}
              onCardPress={(card) => {
                setIsReviewMode(true);
                setReviewQuizId(card.quiz_id || null);
                setSelectedSourceIndex(0);
                setScaffoldingPayload(null);
                setScaffoldingPayloads([]);
                pendingReviewPartsRef.current = {};
                setStep('scaffolding');
              }}
            />
          )}

          {step === 'subscribe' && (
            <SubscribeScreen
              isSubscribed={isSubscribed}
              ocrUsage={ocrUsage}
              onBack={() => setStep('mypage')}
              onSubscribe={() => {
                setStep('mypage');
                setTimeout(() => {
                  Alert.alert('안내', '추후 업데이트 후 제공됩니다');
                }, 0);
              }}
              onCancelSubscribe={() => {
                setIsSubscribed(false);
                setStep('mypage');
              }}
            />
          )}

          {step === 'error' && (
            <ErrorScreen
              onGoHome={() => setStep('home')}
              onRetry={() => {
                if (Platform.OS === 'web' && typeof window !== 'undefined') {
                  window.location.reload();
                  return;
                }
                setStep('home');
              }}
              onSubmitReport={(message) => {
                console.log('[오류 제보]', message);
              }}
            />
          )}

          <UsageExhaustedModal
            visible={showUsageExhaustedModal}
            message={usageExhaustedMessage}
            onClose={() => setShowUsageExhaustedModal(false)}
            onSubscribe={() => {
              setShowUsageExhaustedModal(false);
              setStep('subscribe');
            }}
          />
    </AppProviders>
  );
}
