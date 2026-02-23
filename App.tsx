import React, { useState, useEffect, useRef } from 'react';
import { View, ImageSourcePropType, Alert, Platform, Modal, Pressable, Image, Text, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Splash from './src/components/Splash';
import LoginScreen from './src/screens/auth/LoginScreen';
import NicknameScreen from './src/screens/auth/NicknameScreen';
import GoalSettingScreen from './src/screens/goal/GoalSettingScreen';
import TypeIntroScreen from './src/screens/diagnosis/TypeIntroScreen';
import TypeTestScreen from './src/screens/diagnosis/TypeTestScreen';
import TypeResultScreen from './src/screens/diagnosis/TypeResultScreen';
import HomeScreen from './src/screens/home/HomeScreen';
import { ResultStats, typeProfiles } from './src/data/learningTypeTest';
import LeagueScreen, { LeagueTier, LeagueUser, } from './src/screens/league/LeagueScreen';
import AlarmScreen from './src/screens/alarm/AlarmScreen';
import AlarmSettingScreen from './src/screens/alarm/AlarmSettingScreen';
import MyPageScreen from './src/screens/mypage/MyPageScreen';
import TakePicture from './src/screens/input_data/TakePicture';
import SelectPicture from './src/screens/input_data/SelectPicture';
import TalkingStudyScreen from './src/screens/study/TalkingStudyScreen';
import ScaffoldingScreen from './src/screens/study/ScaffoldingScreen';
import BrushUPScreen from './src/screens/brushUP/BrushUPScreen';
import ErrorScreen from './src/screens/error/error';
import SubscribeScreen from './src/screens/subscribe/subscribe';
import Sidebar, { type Screen as SidebarScreen } from './src/components/Sidebar';
import { runOcr, ScaffoldingPayload, gradeStudy, getQuizForReview, getWeeklyGrowth, getMonthlyStats, getOcrUsage, OcrUsageResponse } from './src/api/ocr';
import { registerAndSyncPushToken } from './src/api/notification';
import { checkAttendanceReward, getRewardLeaderboard } from './src/api/reward';
import { setStudyGoal } from './src/api/weekly';
import { getToken, getUserInfo, saveAuthData, clearAuthData } from './src/lib/storage';
import { getHomeStats, getUserStats } from './src/api/auth';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

type SocialProvider = 'kakao' | 'naver';
type Step =
  | 'splash'
  | 'login'
  | 'nickname'
  | 'goal'
  | 'typeIntro'
  | 'typeTest'
  | 'result'
  | 'home'
  | 'league'
  | 'alarm'
  | 'alarmSetting'
  | 'mypage'
  | 'takePicture'
  | 'selectPicture'
  | 'talkingStudy'
  | 'scaffolding'
  | 'brushup'
  | 'subscribe'
  | 'error';

export default function App() {
  const [step, setStep] = useState<Step>('splash');
  const [nickname, setNickname] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userSocialId, setUserSocialId] = useState('');
  const [typeResult, setTypeResult] = useState<ResultStats | null>(null);
  const [typeLabel, setTypeLabel] = useState(''); // 학습 유형 라벨
  const [level, setLevel] = useState(1);
  const [exp, setExp] = useState(0);
  const [monthlyGoal, setMonthlyGoal] = useState<number | null>(null);
  const [streak, setStreak] = useState(0);                 // 연속 학습 일수
  const [lastAttendanceDate, setLastAttendanceDate] = useState<string | null>(null);
  const [isReviewMode, setIsReviewMode] = useState(false); // 복습 모드 여부
  const [reviewQuizId, setReviewQuizId] = useState<number | null>(null); // 복습 퀴즈 ID
  const [selectedSourceIndex, setSelectedSourceIndex] = useState(0);
  const [subjectName, setSubjectName] = useState('');
  const [cropBySourceIndex, setCropBySourceIndex] = useState<Record<number, { px: number; py: number; pw: number; ph: number }>>({});
  const [batchEarnedXp, setBatchEarnedXp] = useState(0);
  const [rewardState, setRewardState] = useState({
    baseXP: 0,
    bonusXP: 0,
    showBase: false,
    showBonus: false,
  });
  const [pushTokenSynced, setPushTokenSynced] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [ocrUsage, setOcrUsage] = useState<OcrUsageResponse | null>(null);
  const [showUsageExhaustedModal, setShowUsageExhaustedModal] = useState(false);

  // 학습 통계 상태
  const [totalStudyCount, setTotalStudyCount] = useState(0);
  const [continuousDays, setContinuousDays] = useState(0);
  const [weekAttendance, setWeekAttendance] = useState<boolean[]>( // 이번 주 요일별 출석
    [false, false, false, false, false, false, false],
  );

  const getWeekdayIndex = (date: Date) => {
    const jsDay = date.getDay(); // 0(일)~6(토)
    return (jsDay + 6) % 7;      // 월, 화, ... 일
  };
  const [progressLoaded, setProgressLoaded] = useState(false);

  const EXP_KEY = '@bat_exp';
  const LEVEL_KEY = '@bat_level';
  const LAST_ATTENDANCE_KEY = '@bat_last_attendance_date';
  const STREAK_KEY = '@bat_streak';
  const WEEK_ATTENDANCE_KEY = '@bat_week_attendance';
  const MONTHLY_GOAL_KEY = '@bat_monthly_goal';
  const TYPE_LABEL_KEY = '@bat_type_label';

  const LEVEL_THRESHOLDS = [0, 100, 500, 2000, 5000, 10000];
  const getLevelForExp = (value: number) => {
    if (value >= LEVEL_THRESHOLDS[5]) return 5;
    if (value >= LEVEL_THRESHOLDS[4]) return 4;
    if (value >= LEVEL_THRESHOLDS[3]) return 3;
    if (value >= LEVEL_THRESHOLDS[2]) return 2;
    return 1;
  };

  const progressLoadedRef = useRef(false);

  const isUsageLimitReached = (usage?: OcrUsageResponse | null) => {
    const target = usage ?? ocrUsage;
    if (!target) return false;
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
    const loadProgress = async () => {
      try {
        const [expRaw, levelRaw, lastAttendRaw, streakRaw, weekRaw, monthlyGoalRaw, typeLabelRaw] = await AsyncStorage.multiGet([
          EXP_KEY,
          LEVEL_KEY,
          LAST_ATTENDANCE_KEY,
          STREAK_KEY,
          WEEK_ATTENDANCE_KEY,
          MONTHLY_GOAL_KEY,
          TYPE_LABEL_KEY,
        ]);

        const expValue = expRaw[1] ? Number(expRaw[1]) : 0;
        const levelValue = levelRaw[1] ? Number(levelRaw[1]) : getLevelForExp(expValue);
        const streakValue = streakRaw[1] ? Number(streakRaw[1]) : 0;
        const weekValue = weekRaw[1] ? (JSON.parse(weekRaw[1]) as boolean[]) : [false, false, false, false, false, false, false];
        const monthlyGoalValue = monthlyGoalRaw[1] ? Number(monthlyGoalRaw[1]) : null;

        setExp(Number.isFinite(expValue) ? expValue : 0);
        setLevel(Number.isFinite(levelValue) ? levelValue : 1);
        setLastAttendanceDate(lastAttendRaw[1]);
        setStreak(Number.isFinite(streakValue) ? streakValue : 0);
        setWeekAttendance(Array.isArray(weekValue) ? weekValue : [false, false, false, false, false, false, false]);
        setTypeLabel(typeLabelRaw[1] ?? '');
        if (monthlyGoalValue && Number.isFinite(monthlyGoalValue)) {
          setMonthlyGoal(monthlyGoalValue);
        }
      } catch (error) {
        console.error('출석/XP 로드 실패:', error);
      } finally {
        progressLoadedRef.current = true;
        setProgressLoaded(true);
      }
    };

    loadProgress();
  }, []);

  useEffect(() => {
    if (!progressLoadedRef.current) return;

    AsyncStorage.multiSet([
      [EXP_KEY, String(exp)],
      [LEVEL_KEY, String(level)],
      [LAST_ATTENDANCE_KEY, lastAttendanceDate ?? ''],
      [STREAK_KEY, String(streak)],
      [WEEK_ATTENDANCE_KEY, JSON.stringify(weekAttendance)],
      [MONTHLY_GOAL_KEY, monthlyGoal != null ? String(monthlyGoal) : ''],
      [TYPE_LABEL_KEY, typeLabel],
    ]).catch((error) => {
      console.error('출석/XP 저장 실패:', error);
    });
  }, [exp, level, lastAttendanceDate, streak, weekAttendance, monthlyGoal, typeLabel]);

  useEffect(() => {
    setLevel(getLevelForExp(exp));
  }, [exp]);

  // 학습 통계 불러오기
  useEffect(() => {
    const loadStats = async () => {
      try {
        const stats = await getMonthlyStats();
        setTotalStudyCount(stats.compare?.this_month_count || 0);
        setContinuousDays(stats.compare?.diff || 0);
      } catch (error) {
        console.error('학습 통계 불러오기 실패:', error);
      }
    };

    if (step === 'mypage') {
      loadStats();
    }
  }, [step]);

  useEffect(() => {
    // 앱 시작 시 자동 로그인 체크
    checkAutoLogin();
  }, []);

  // 로그인 후 홈에 들어오면: 푸시 토큰 생성(iOS=Expo/Android=FCM) → 백엔드에 전달
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

      // 통계 데이터 로드
      (async () => {
        try {
          const [weekly, monthly] = await Promise.all([
            getWeeklyGrowth(),
            getMonthlyStats(),
          ]);
          setWeeklyGrowth(weekly);
          setMonthlyStats(monthly.compare);
          if (monthly.compare?.target_count > 0) {
            setMonthlyGoal(monthly.compare.target_count);
          }
        } catch (e) {
          console.error('통계 데이터 로드 실패:', e);
        }
      })();
    }

    // 리그 화면 진입 시 상위 5명 리더보드 로드
    if (step === 'league') {
      (async () => {
        try {
          const response = await getRewardLeaderboard();
          if (response.status === 'success' && response.leaderboard) {
            // 백엔드에서 상위 5명만 반환
            const users: LeagueUser[] = response.leaderboard.map((item, idx) => ({
              id: `user_${idx}`,
              nickname: item.nickname,
              xp: item.total_reward,
              minutesAgo: 0, // 백엔드에서 미제공
            }));
            setLeagueUsers(users);
          }
        } catch (e) {
          console.error('리그 데이터 로드 실패:', e);
        }
      })();
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
        if (!cancelled) setScaffoldingPayload(payload);
      })
      .catch((e: any) => {
        if (!cancelled) {
          setScaffoldingPayload(null);
          setScaffoldingError(e?.message ?? '복습 퀴즈 데이터를 불러오지 못했습니다.');
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

  const getTodayKey = () => new Date().toISOString().slice(0, 10);

  const hasCheckedInToday = lastAttendanceDate === getTodayKey();

  const handleDailyCheckIn = async () => {
    const today = new Date();
    const todayKey = today.toISOString().slice(0, 10);

    if (lastAttendanceDate === todayKey) return; // 이미 출석

    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    const yesterdayKey = yesterday.toISOString().slice(0, 10);

    let baseXP = 10;
    let bonusXP = 0;
    let shouldReward = true;

    try {
      const result = await checkAttendanceReward();
      if (result?.status === 'success') {
        shouldReward = result.is_new_reward;
        baseXP = result.baseXP ?? 0;
        bonusXP = result.bonusXP ?? 0;
      }
    } catch (error) {
      console.error('출석 보상 API 실패, 로컬 처리로 대체', error);
      bonusXP = Math.random() < 0.5 ? 10 : 0;
    }

    // 연속 출석 계산
    setStreak((prev) => (lastAttendanceDate === yesterdayKey ? prev + 1 : 1));
    setLastAttendanceDate(todayKey);

    // 주간 출석 배열 업데이트
    const todayIdx = getWeekdayIndex(today);
    setWeekAttendance((prev) => {
      const next = [...prev];
      next[todayIdx] = true;
      return next;
    });

    if (shouldReward && (baseXP > 0 || bonusXP > 0)) {
      setExp((prev) => prev + baseXP + bonusXP);
      setRewardState({
        baseXP,
        bonusXP,
        showBase: true,
        showBonus: false,
      });
    }
  };
  const handleCloseBaseReward = () => {
    setRewardState((prev) => ({
      ...prev,
      showBase: false,
      showBonus: prev.bonusXP > 0, // 보너스가 있으면 다음 모달로
    }));
  };
  const handleCloseBonusReward = () => {
    setRewardState((prev) => ({
      ...prev,
      showBonus: false,
    }));
  };

  const [currentLeagueTier] = useState<LeagueTier>('iron');  // 우선 아이언으로 시작
  const [leagueUsers, setLeagueUsers] = useState<LeagueUser[]>([]);
  const [leagueRemainingText] = useState<string>('남은 시간: 3일 19시간 30분'); // 임시 텍스트
  // 촬영 결과 임시 소스 목록
  const [capturedSources, setCapturedSources] = useState<ImageSourcePropType[]>([]);

  const [scaffoldingPayload, setScaffoldingPayload] = useState<ScaffoldingPayload | null>(null);
  const [scaffoldingLoading, setScaffoldingLoading] = useState(false);
  const [scaffoldingError, setScaffoldingError] = useState<string | null>(null);

  const loadScaffoldingForIndex = async (
    sources: ImageSourcePropType[],
    index: number,
    cropMap: Record<number, { px: number; py: number; pw: number; ph: number }>,
  ) => {
    const target = sources[index] as any;
    const uri = target?.uri as string | undefined;

    if (!uri) {
      setScaffoldingError('이미지 URI를 찾을 수 없습니다.');
      setScaffoldingPayload(null);
      setStep('home');
      return;
    }

    setSelectedSourceIndex(index);
    setScaffoldingLoading(true);
    setScaffoldingError(null);

    try {
      const payload = await runOcr(uri, cropMap[index]);
      setScaffoldingPayload(payload);
      setStep('scaffolding');
    } catch (e: any) {
      const message = e?.message ?? 'OCR 추출에 실패했습니다.';
      setScaffoldingPayload(null);
      setScaffoldingError(message);

      if (typeof message === 'string' && message.includes('무료 횟수')) {
        Alert.alert('OCR 사용 한도', message);
        setStep('home');
        return;
      }

      Alert.alert('OCR 오류', message);
      setStep('home');
    } finally {
      setScaffoldingLoading(false);
    }
  };

  // 홈 화면 통계 데이터
  const [weeklyGrowth, setWeeklyGrowth] = useState<{ labels: string[]; data: number[] } | undefined>();
  const [monthlyStats, setMonthlyStats] = useState<any>(undefined);

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

  const safeAreaEdges = step === 'takePicture' || step === 'selectPicture' ? ([] as const) : (['top'] as const);

  return (
    <SafeAreaProvider>
      <SafeAreaView style={{ flex: 1 }} edges={safeAreaEdges}>
        <View style={{ flex: 1 }}>
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
            } catch (error: any) {
              Alert.alert('목표 설정 실패', error?.message ?? '목표 설정에 실패했습니다.');
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
          rewardState={rewardState}
          onCloseBaseReward={handleCloseBaseReward}
          onCloseBonusReward={handleCloseBonusReward}
          weekAttendance={weekAttendance}
          weeklyGrowth={weeklyGrowth}
          monthlyStats={monthlyStats}
          monthlyGoal={monthlyGoal}
          onNavigate={handleMainNavigate}
          onLogout={handleLogout}
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
            } catch (error: any) {
              Alert.alert('목표 설정 실패', error?.message ?? '목표 설정에 실패했습니다.');
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
            setCapturedSources([]);
            setSelectedSourceIndex(0);
            setSubjectName('');
            setCropBySourceIndex({});
            setBatchEarnedXp(0);
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
            setCapturedSources(sources);
            setStep('selectPicture');
          }}
        />
      )}


      {/* 자료 입력: 선택/미리보기 화면 */}
      {step === 'selectPicture' && (
        <SelectPicture
          sources={capturedSources}
          onBack={() => setStep('takePicture')}
          onStartLearning={async (finalSources, isOcrNeeded, subject, cropMap) => {
            void isOcrNeeded;
            setCapturedSources(finalSources);
            if (subject) setSubjectName(subject);
            const nextCropMap = cropMap ?? {};
            setCropBySourceIndex(nextCropMap);
            setBatchEarnedXp(0);

            if (!finalSources.length) {
              setScaffoldingError('학습할 이미지가 없습니다.');
              setScaffoldingPayload(null);
              setStep('home');
              return;
            }

            await loadScaffoldingForIndex(finalSources, 0, nextCropMap);
          }}
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
          key={`study-${isReviewMode ? `review-${reviewQuizId ?? 'none'}` : `new-${selectedSourceIndex}`}`}
          onBack={() => {
            // 복습 모드에서 복습 화면으로
            if (isReviewMode) {
              setIsReviewMode(false);
              setReviewQuizId(null);
              setStep('brushup');
            } else {
              setStep('selectPicture');
            }
          }}
          onBackFromCompletion={async () => {
            if (!isReviewMode && selectedSourceIndex < capturedSources.length - 1) {
              const nextIndex = selectedSourceIndex + 1;
              await loadScaffoldingForIndex(capturedSources, nextIndex, cropBySourceIndex);
              return;
            }

            // 전체 학습 완료 후 홈 이동
            setIsReviewMode(false);
            setReviewQuizId(null);
            setBatchEarnedXp(0);
            setCropBySourceIndex({});
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
          totalStudyCount={capturedSources.length}
          onRetry={async () => {
            const current = capturedSources[selectedSourceIndex] as any;
            const uri = current?.uri as string | undefined;
            if (!uri) return;

            setScaffoldingLoading(true);
            setScaffoldingError(null);
            try {
              const payload = await runOcr(uri, cropBySourceIndex[selectedSourceIndex]);
              setScaffoldingPayload(payload);
            } catch (e: any) {
              setScaffoldingPayload(null);
              setScaffoldingError(e?.message ?? '재시도에 실패했습니다.');
            } finally {
              setScaffoldingLoading(false);
            }
          }}
          onSave={async (userAnswers) => {
            // 복습 모드에서는 저장하지 않음
            if (isReviewMode) {
              setIsReviewMode(false);
              setReviewQuizId(null);
              setStep('home');
              return;
            }

            if (!scaffoldingPayload) throw new Error('Payload가 없습니다.');

            const blanks = scaffoldingPayload.blanks ?? [];
            const keywords = blanks.map((b) => b.word);

            const ocrText = {
              pages: [{ original_text: scaffoldingPayload.extractedText, keywords }],
              blanks: blanks.map((b, i) => ({ blank_index: i, word: b.word, page_index: 0 })),
              quiz: { raw: scaffoldingPayload.extractedText },
            };

            const gradeCount = userAnswers.reduce((acc, ua, idx) => {
              const isCorrect = (ua ?? '').trim().toLowerCase() === (keywords[idx] ?? '').trim().toLowerCase();
              return acc + (isCorrect ? 1 : 0);
            }, 0);

            const gradeResult = await gradeStudy({
              quiz_id: 0,
              correct_answers: keywords,
              answer: keywords,
              user_answer: userAnswers,
              quiz_html: scaffoldingPayload.extractedText,
              ocr_text: ocrText,
              // backend compatibility
              user_answers: userAnswers,
              subject_name: scaffoldingPayload.title,
              study_name: scaffoldingPayload.title,
              original_text: [scaffoldingPayload.extractedText],
              keywords,
              grade_cnt: gradeCount,
            });

            const isLastInBatch = selectedSourceIndex >= capturedSources.length - 1;
            const nextPoints = Number(gradeResult?.new_points);
            if (Number.isFinite(nextPoints)) {
              if (isLastInBatch) {
                setExp(nextPoints);
              }
            } else {
              const earnedXp = gradeCount * 2;
              if (isLastInBatch) {
                const totalEarned = batchEarnedXp + earnedXp;
                if (totalEarned > 0) {
                  setExp((prev) => prev + totalEarned);
                }
                setBatchEarnedXp(0);
              } else if (earnedXp > 0) {
                setBatchEarnedXp((prev) => prev + earnedXp);
              }
            }
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

      <Modal visible={showUsageExhaustedModal} transparent animationType="fade" onRequestClose={() => setShowUsageExhaustedModal(false)}>
        <View style={stylesSub.modalBackdrop}>
          <View style={stylesSub.modalCard}>
            <View style={stylesSub.modalHeader}>
              <Text style={stylesSub.modalTitle}>사용량 소진 안내</Text>
              <Pressable onPress={() => setShowUsageExhaustedModal(false)}>
                <Image source={require('./assets/subscribe/close.png')} style={stylesSub.closeIcon} resizeMode="contain" />
              </Pressable>
            </View>

            <View style={stylesSub.modalBody}>
              <Image source={require('./assets/bat-character.png')} style={stylesSub.modalBat} resizeMode="contain" />
              <Text style={stylesSub.modalDesc}>무료 AI 호출 사용량을 모두 사용했어요.</Text>
              <Text style={stylesSub.modalDesc}>계속 학습하고 싶으시다면</Text>
              <Text style={stylesSub.modalDesc}>프리미엄 요금제를 이용해 보세요.</Text>
            </View>

            <View style={stylesSub.modalButtons}>
              <Pressable style={stylesSub.modalBtn} onPress={() => setShowUsageExhaustedModal(false)}>
                <Image source={require('./assets/subscribe/popup-cancel.png')} style={stylesSub.modalBtnImg} resizeMode="stretch" />
              </Pressable>
              <Pressable
                style={stylesSub.modalBtn}
                onPress={() => {
                  setShowUsageExhaustedModal(false);
                  setStep('subscribe');
                }}
              >
                <Image source={require('./assets/subscribe/popup-subscribe.png')} style={stylesSub.modalBtnImg} resizeMode="stretch" />
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>




        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const stylesSub = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  modalCard: {
    width: '100%',
    maxWidth: 540,
    backgroundColor: '#F8F8FA',
    borderRadius: 20,
    overflow: 'hidden',
  },
  modalHeader: {
    height: 72,
    borderBottomWidth: 1,
    borderBottomColor: '#D7DAE3',
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'space-between',
    flexDirection: 'row',
  },
  modalTitle: {
    fontSize: 34,
    fontWeight: '800',
    color: '#111218',
    marginLeft: 6,
  },
  closeIcon: {
    width: 36,
    height: 36,
  },
  modalBody: {
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingTop: 22,
    paddingBottom: 10,
  },
  modalBat: {
    width: 220,
    height: 180,
    marginBottom: 10,
  },
  modalDesc: {
    fontSize: 16,
    lineHeight: 26,
    fontWeight: '700',
    color: '#111218',
    textAlign: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 18,
    paddingBottom: 18,
  },
  modalBtn: {
    flex: 1,
  },
  modalBtnImg: {
    width: '100%',
    height: 58,
  },
});
