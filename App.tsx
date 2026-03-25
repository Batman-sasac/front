import React, { useState, useEffect, useRef } from 'react';
import { View, Alert, Platform, Modal, Pressable, Image, Text, StyleSheet } from 'react-native';
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
import { StudySource } from './src/screens/input_data/studySource';
import TalkingStudyScreen from './src/screens/study/TalkingStudyScreen';
import ScaffoldingScreen from './src/screens/study/ScaffoldingScreen';
import StudyFlowScreen from './src/screens/study/StudyFlowScreen';
import { buildOrderedStudySaveData } from './src/screens/study/scaffoldingLogic';
import BrushUPScreen from './src/screens/brushUP/BrushUPScreen';
import RewardScreen, { RewardType } from './src/screens/reward/Reward';
import ErrorScreen from './src/screens/error/error';
import SubscribeScreen from './src/screens/subscribe/subscribe';
import Sidebar, { type Screen as SidebarScreen } from './src/components/Sidebar';
import { runOcr, ScaffoldingPayload, gradeStudy, getQuizForReview, getWeeklyGrowth, getMonthlyStats, getOcrUsage, OcrUsageResponse, submitReviewStudy } from './src/api/ocr';
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
  | 'ocrLoading'
  | 'studyIntro'
  | 'talkingStudy'
  | 'scaffolding'
  | 'brushup'
  | 'reward'
  | 'subscribe'
  | 'error';
type BootStep = Exclude<Step, 'splash'>;

export default function App() {
  const [step, setStep] = useState<Step>('splash');
  const [bootTargetStep, setBootTargetStep] = useState<BootStep | null>(null);
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
  const batchEarnedXpRef = useRef(0);
  type PendingGradePart = {
    pages: { original_text: string; keywords: string[] }[];
    blankItems: { blank_index: number; word: string; page_index: number }[];
    keywords: string[];
    userAnswers: string[];
    correctCount: number;
  };
  // 멀티 이미지 학습 시: 페이지별 결과를 모았다가 마지막에 1번만 /study/grade 호출
  const [pendingGradeParts, setPendingGradeParts] = useState<Record<number, PendingGradePart>>({});
  const pendingGradePartsRef = useRef<Record<number, PendingGradePart>>({});
  const [rewardScreenState, setRewardScreenState] = useState<{ type: RewardType; xp: number } | null>(null);
  const rewardCloseActionRef = useRef<(() => void) | null>(null);
  const [pushTokenSynced, setPushTokenSynced] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [ocrUsage, setOcrUsage] = useState<OcrUsageResponse | null>(null);
  const [showUsageExhaustedModal, setShowUsageExhaustedModal] = useState(false);

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

  // 학습 통계 상태
  const [totalStudyCount, setTotalStudyCount] = useState(0);
  const [continuousDays, setContinuousDays] = useState(0);
  const [weekAttendance, setWeekAttendance] = useState<boolean[]>( // 이번 주 요일별 출석
    [false, false, false, false, false, false, false],
  );
  const [weekAttendanceWeekKey, setWeekAttendanceWeekKey] = useState('');

  const getWeekdayIndex = (date: Date) => {
    const jsDay = date.getDay(); // 0(일)~6(토)
    return (jsDay + 6) % 7;      // 월, 화, ... 일
  };
  const getWeekStartKey = (date: Date) => {
    const target = new Date(date);
    target.setHours(0, 0, 0, 0);
    target.setDate(target.getDate() - getWeekdayIndex(target));
    const year = target.getFullYear();
    const month = String(target.getMonth() + 1).padStart(2, '0');
    const day = String(target.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  const [progressLoaded, setProgressLoaded] = useState(false);

  const EXP_KEY = '@bat_exp';
  const LEVEL_KEY = '@bat_level';
  const LAST_ATTENDANCE_KEY = '@bat_last_attendance_date';
  const STREAK_KEY = '@bat_streak';
  const WEEK_ATTENDANCE_KEY = '@bat_week_attendance';
  const WEEK_ATTENDANCE_WEEK_KEY = '@bat_week_attendance_week';
  const MONTHLY_GOAL_KEY = '@bat_monthly_goal';
  const TYPE_LABEL_KEY = '@bat_type_label';
  const WEEKLY_GROWTH_CACHE_KEY = '@bat_weekly_growth_cache';

  // 포인트 기준 레벨 구간
  // 1레벨: 0 ~ 100
  // 2레벨: 101 ~ 500
  // 3레벨: 501 ~ 2000
  // 4레벨: 2001 ~ 5000
  // 5레벨: 5001 ~ 10000 (이후도 5레벨로 유지)
  const LEVEL_THRESHOLDS = [0, 100, 500, 2000, 5000, 10000];
  const getLevelForExp = (value: number) => {
    if (value <= LEVEL_THRESHOLDS[1]) return 1;
    if (value <= LEVEL_THRESHOLDS[2]) return 2;
    if (value <= LEVEL_THRESHOLDS[3]) return 3;
    if (value <= LEVEL_THRESHOLDS[4]) return 4;
    return 5;
  };

  const progressLoadedRef = useRef(false);

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

  const refreshLeagueLeaderboard = async () => {
    try {
      const response = await getRewardLeaderboard();
      if (response.status !== 'success' || !response.leaderboard) {
        return null;
      }

      const users: LeagueUser[] = response.leaderboard.map((item, idx) => ({
        id: `user_${idx}`,
        nickname: item.nickname,
        xp: item.total_reward,
      }));
      setLeagueUsers(users);
      return users;
    } catch (error) {
      console.error('리그 데이터 로드 실패:', error);
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

  const tryMoveToTakePicture = async () => {
    try {
      const usage = await refreshOcrUsage();
      if (!isSubscribed && usage && isUsageLimitReached(usage)) {
        setShowUsageExhaustedModal(true);
        return;
      }
    } catch (error) {
      console.error('자료입력 진입 전 OCR 사용량 확인 실패:', error);
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
        const [expRaw, levelRaw, lastAttendRaw, streakRaw, weekRaw, weekKeyRaw, monthlyGoalRaw, typeLabelRaw] = await AsyncStorage.multiGet([
          EXP_KEY,
          LEVEL_KEY,
          LAST_ATTENDANCE_KEY,
          STREAK_KEY,
          WEEK_ATTENDANCE_KEY,
          WEEK_ATTENDANCE_WEEK_KEY,
          MONTHLY_GOAL_KEY,
          TYPE_LABEL_KEY,
        ]);

        const expValue = expRaw[1] ? Number(expRaw[1]) : 0;
        const levelValue = levelRaw[1] ? Number(levelRaw[1]) : getLevelForExp(expValue);
        const streakValue = streakRaw[1] ? Number(streakRaw[1]) : 0;
        const storedWeekKey = weekKeyRaw[1] ?? '';
        const currentWeekKey = getWeekStartKey(new Date());
        const parsedWeekValue = weekRaw[1] ? (JSON.parse(weekRaw[1]) as boolean[]) : [false, false, false, false, false, false, false];
        const weekValue = storedWeekKey === currentWeekKey
          ? parsedWeekValue
          : [false, false, false, false, false, false, false];
        const monthlyGoalValue = monthlyGoalRaw[1] ? Number(monthlyGoalRaw[1]) : null;

        setExp(Number.isFinite(expValue) ? expValue : 0);
        setLevel(Number.isFinite(levelValue) ? levelValue : 1);
        setLastAttendanceDate(lastAttendRaw[1]);
        setStreak(Number.isFinite(streakValue) ? streakValue : 0);
        setWeekAttendance(Array.isArray(weekValue) ? weekValue : [false, false, false, false, false, false, false]);
        setWeekAttendanceWeekKey(currentWeekKey);
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
      [WEEK_ATTENDANCE_WEEK_KEY, weekAttendanceWeekKey],
      [MONTHLY_GOAL_KEY, monthlyGoal != null ? String(monthlyGoal) : ''],
      [TYPE_LABEL_KEY, typeLabel],
    ]).catch((error) => {
      console.error('출석/XP 저장 실패:', error);
    });
  }, [exp, level, lastAttendanceDate, streak, weekAttendance, weekAttendanceWeekKey, monthlyGoal, typeLabel]);

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
          const storedTypeLabel = (await AsyncStorage.getItem(TYPE_LABEL_KEY))?.trim() ?? '';
          if (storedTypeLabel) {
            setTypeLabel(storedTypeLabel);
          }
          // 초기 진입 화면은 로컬 정보만으로 먼저 결정하고,
          // 네트워크 상태 조회는 뒤에서 진행해 스플래시 고정을 막는다.
          setBootTargetStep(storedTypeLabel ? 'home' : 'typeIntro');
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
          try {
            await refreshOcrUsage();
          } catch (e) {
            console.error('초기 OCR 사용량 조회 실패:', e);
          }
          return;
        }
      }
      // 토큰이 없으면 로그인 화면으로
      setBootTargetStep('login');
    } catch (error) {
      console.error('자동 로그인 확인 오류:', error);
      setBootTargetStep('login');
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

      // 통계 데이터 로드 (당월 학습 횟수는 /auth/home/stats에서 study_logs 기준으로 가져옴)
      (async () => {
        const defaultWeeklyGrowth = {
          labels: ['4주 전', '3주 전', '2주 전', '지난 주', '이번 주'],
          data: [0, 0, 0, 0, 0],
        };
        const token = await getToken();
        const [weeklyResult, monthlyResult, homeStatsResult] = await Promise.allSettled([
          getWeeklyGrowth(),
          getMonthlyStats(),
          token ? getHomeStats(token) : Promise.resolve(null),
        ]);

        if (weeklyResult.status === 'fulfilled') {
          setWeeklyGrowth(weeklyResult.value);
          await AsyncStorage.setItem(WEEKLY_GROWTH_CACHE_KEY, JSON.stringify(weeklyResult.value));
        } else {
          console.error('주간 그래프 데이터 로드 실패:', weeklyResult.reason);
          try {
            const cachedWeeklyRaw = await AsyncStorage.getItem(WEEKLY_GROWTH_CACHE_KEY);
            const cachedWeekly = cachedWeeklyRaw ? JSON.parse(cachedWeeklyRaw) : null;
            if (Array.isArray(cachedWeekly?.labels) && Array.isArray(cachedWeekly?.data)) {
              setWeeklyGrowth({
                labels: cachedWeekly.labels,
                data: cachedWeekly.data,
              });
            } else {
              setWeeklyGrowth(defaultWeeklyGrowth);
            }
          } catch (cacheError) {
            console.error('주간 그래프 캐시 로드 실패:', cacheError);
            setWeeklyGrowth(defaultWeeklyGrowth);
          }
        }

        const monthlyCompare: {
          last_month_name?: string;
          last_month_count?: number;
          this_month_name?: string;
          this_month_count?: number;
          target_count?: number;
          diff?: number;
        } = monthlyResult.status === 'fulfilled'
            ? (monthlyResult.value.compare ?? {})
            : {};
        if (monthlyResult.status === 'rejected') {
          console.error('월간 통계 데이터 로드 실패:', monthlyResult.reason);
        }

        const homeStats = homeStatsResult.status === 'fulfilled' ? homeStatsResult.value : null;
        if (homeStatsResult.status === 'rejected') {
          console.error('홈 통계 데이터 로드 실패:', homeStatsResult.reason);
        }

        setMonthlyStats({
          ...monthlyCompare,
          this_month_count: homeStats?.data?.this_month_count ?? monthlyCompare.this_month_count ?? 0,
        });

        if (homeStats?.data?.monthly_goal != null && homeStats.data.monthly_goal > 0) {
          setMonthlyGoal(homeStats.data.monthly_goal);
        } else if ((monthlyCompare?.target_count ?? 0) > 0) {
          setMonthlyGoal(monthlyCompare.target_count ?? null);
        }
      })();
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
  const STREAK_REWARD_XP = 10;

  const hasCheckedInToday = lastAttendanceDate === getTodayKey();

  const handleDailyCheckIn = async () => {
    const today = new Date();
    const todayKey = today.toISOString().slice(0, 10);
    const currentWeekKey = getWeekStartKey(today);

    if (lastAttendanceDate === todayKey) return; // 이미 출석

    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    const yesterdayKey = yesterday.toISOString().slice(0, 10);
    const nextStreak = lastAttendanceDate === yesterdayKey ? streak + 1 : 1;

    let baseXP = 10;
    let streakXP = nextStreak >= 2 ? STREAK_REWARD_XP : 0;
    let bonusXP = 0;
    let shouldReward = true;
    let totalPoints: number | null = null;

    try {
      const result = await checkAttendanceReward();
      if (result?.status === 'success') {
        shouldReward = result.is_new_reward;
        baseXP = result.baseXP ?? 0;
        bonusXP = result.bonusXP ?? 0;
        totalPoints = Number.isFinite(Number(result.total_points)) ? Number(result.total_points) : null;
      }
    } catch (error) {
      console.error('출석 보상 API 실패, 로컬 처리로 대체', error);
      bonusXP = Math.random() < 0.5 ? 10 : 0;
    }

    // 연속 출석 계산
    setStreak(nextStreak);
    setLastAttendanceDate(todayKey);

    // 주간 출석 배열 업데이트
    const todayIdx = getWeekdayIndex(today);
    setWeekAttendanceWeekKey(currentWeekKey);
    setWeekAttendance((prev) => {
      const base = weekAttendanceWeekKey === currentWeekKey
        ? [...prev]
        : [false, false, false, false, false, false, false];
      const next = [...base];
      next[todayIdx] = true;
      return next;
    });

    if (shouldReward && (baseXP > 0 || bonusXP > 0)) {
      if (totalPoints != null) {
        setExp(totalPoints + streakXP);
      } else {
        setExp((prev) => prev + baseXP + streakXP + bonusXP);
      }
      void refreshLeagueLeaderboard();
      showRewardScreen('attendance', baseXP, () => {
        if (streakXP > 0) {
          showRewardScreen('streak', streakXP, () => {
            if (bonusXP > 0) {
              showRewardScreen('randomBonus', bonusXP, () => setStep('home'));
              return;
            }
            setStep('home');
          });
          return;
        }
        if (bonusXP > 0) {
          showRewardScreen('randomBonus', bonusXP, () => setStep('home'));
          return;
        }
        setStep('home');
      });
    }
  };

  const [currentLeagueTier] = useState<LeagueTier>('iron');  // 우선 아이언으로 시작
  const [leagueUsers, setLeagueUsers] = useState<LeagueUser[]>([]);
  const [leagueRemainingText] = useState<string>('');
  // 촬영 결과 임시 소스 목록
  const [capturedSources, setCapturedSources] = useState<StudySource[]>([]);

  const [scaffoldingPayload, setScaffoldingPayload] = useState<ScaffoldingPayload | null>(null);
  const [scaffoldingPayloads, setScaffoldingPayloads] = useState<ScaffoldingPayload[]>([]);
  const [scaffoldingLoading, setScaffoldingLoading] = useState(false);
  const [scaffoldingError, setScaffoldingError] = useState<string | null>(null);

  const runOcrForIndex = async (
    sources: StudySource[],
    index: number,
    cropMap: Record<number, { px: number; py: number; pw: number; ph: number }>,
  ) => {
    const target = sources[index];
    const uri = target?.uri;

    if (!uri) {
      throw new Error(`${index + 1}번째 이미지 URI를 찾을 수 없습니다.`);
    }

    return runOcr(uri, cropMap[index], {
      fileName: target?.name ?? undefined,
      mimeType: target?.mimeType ?? undefined,
    });
  };

  const preloadScaffoldingPayloads = async (
    sources: StudySource[],
    cropMap: Record<number, { px: number; py: number; pw: number; ph: number }>,
  ) => {
    setScaffoldingLoading(true);
    setScaffoldingError(null);
    setScaffoldingPayload(null);
    setScaffoldingPayloads([]);
    setSelectedSourceIndex(0);

    try {
      const nextPayloads: ScaffoldingPayload[] = [];
      for (let i = 0; i < sources.length; i += 1) {
        const payload = await runOcrForIndex(sources, i, cropMap);
        nextPayloads.push(payload);
      }

      setScaffoldingPayloads(nextPayloads);
      setSelectedSourceIndex(0);
      setScaffoldingPayload(nextPayloads[0] ?? null);
      setStep('studyIntro');
    } catch (e: any) {
      const message = e?.message ?? '텍스트 추출에 실패했습니다.';
      setScaffoldingPayload(null);
      setScaffoldingError(message);

      if (typeof message === 'string' && message.includes('무료 횟수')) {
        // 화이트리스트 유저는 사용량 소진 모달/알림을 띄우지 않음 (기록은 계속 유지)
        const latestUsage = (await refreshOcrUsage()) ?? ocrUsage;
        if (!latestUsage?.is_unlimited) {
          Alert.alert('텍스트 추출 사용 한도', message);
          setStep('home');
          return;
        }
      }

      Alert.alert('텍스트 추출 오류', message);
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
            <Splash
              duration={1500}
              ready={bootTargetStep !== null}
              onDone={() => {
                setStep(bootTargetStep ?? 'login');
              }}
            />
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
              weekAttendance={weekAttendance}
              weeklyGrowth={weeklyGrowth}
              monthlyStats={monthlyStats}
              monthlyGoal={monthlyGoal}
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
                setCapturedSources(sources);
                setSelectedSourceIndex(0);
                setCropBySourceIndex({});
                setScaffoldingPayloads([]);
                setScaffoldingPayload(null);
                setScaffoldingError(null);
                setPendingGradeParts({});
                pendingGradePartsRef.current = {};
                setStep('selectPicture');
              }}
            />
          )}


          {/* 자료 입력: 선택/미리보기 화면 */}
          {step === 'selectPicture' && (
            <SelectPicture
              key={capturedSources.map((source: any, index) => {
                if (typeof source === 'number') return `asset-${source}-${index}`;
                return source?.uri ? `uri-${source.uri}-${index}` : `source-${index}`;
              }).join('|')}
              sources={capturedSources}
              onBack={() => {
                setCapturedSources([]);
                setSelectedSourceIndex(0);
                setCropBySourceIndex({});
                setScaffoldingPayloads([]);
                setScaffoldingPayload(null);
                setScaffoldingError(null);
                setPendingGradeParts({});
                pendingGradePartsRef.current = {};
                setStep('takePicture');
              }}
              onStartLearning={async (finalSources, isOcrNeeded, subject, cropMap) => {
                void isOcrNeeded;
                setCapturedSources(finalSources);
                if (subject) setSubjectName(subject);
                const nextCropMap = cropMap ?? {};
                setCropBySourceIndex(nextCropMap);
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
                  } catch (e: any) {
                    const message = e?.message ?? '텍스트 추출에 실패했습니다.';
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
              totalStudyCount={capturedSources.length}
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
                } catch (e: any) {
                  setScaffoldingPayload(null);
                  setScaffoldingError(e?.message ?? '재시도에 실패했습니다.');
                } finally {
                  setScaffoldingLoading(false);
                }
              }}
              onSave={async ({ answers: userAnswers, selectedBlankIds }) => {
                if (!scaffoldingPayload) throw new Error('Payload가 없습니다.');

                const blanks = scaffoldingPayload.blanks ?? [];
                const rawBlankItems = scaffoldingPayload.blankItems && scaffoldingPayload.blankItems.length > 0
                  ? scaffoldingPayload.blankItems
                  : blanks.map((b, i) => ({ blank_index: i, word: b.word, page_index: 0 }));
                const { keywords, blankItems } = buildOrderedStudySaveData({
                  selectedBlankIds,
                  blanks,
                  rawBlankItems,
                });
                if (keywords.length === 0) {
                  throw new Error('선택된 빈칸 정보가 없습니다.');
                }

                const reviewCorrectCount = userAnswers.reduce((acc, ua, idx) => {
                  const isCorrect = (ua ?? '').trim().toLowerCase() === (keywords[idx] ?? '').trim().toLowerCase();
                  return acc + (isCorrect ? 1 : 0);
                }, 0);
                const reviewEarnedXp = reviewCorrectCount * 2;

                // 복습 모드에서는 저장하지 않음
                if (isReviewMode) {
                  setExp((prev) => prev + reviewEarnedXp);
                  setIsReviewMode(false);
                  setReviewQuizId(null);
                  showRewardScreen('reviewComplete', reviewEarnedXp, () => setStep('home'));

                  if (reviewQuizId != null) {
                    void submitReviewStudy({
                      quiz_id: reviewQuizId,
                      user_answers: userAnswers,
                    })
                      .then((reviewResult) => {
                        const nextPoints = Number(reviewResult?.new_points);
                        if (Number.isFinite(nextPoints)) {
                          setExp(nextPoints);
                        }
                        return refreshLeagueLeaderboard();
                      })
                      .catch((error) => {
                        console.error('복습 결과 저장 실패:', error);
                      });
                  }
                  return {
                    earnedXp: reviewEarnedXp,
                    totalEarnedXp: reviewEarnedXp,
                    handledCompletion: true,
                  };
                }
                const keywordSet = new Set(keywords);
                const pages = scaffoldingPayload.pages && scaffoldingPayload.pages.length > 0
                  ? scaffoldingPayload.pages
                      .map((page) => ({
                        ...page,
                        keywords: (page.keywords ?? []).filter((word) => keywordSet.has(word)),
                      }))
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
                const mergedPages: { original_text: string; keywords: string[] }[] = [];
                const mergedBlanks: { blank_index: number; word: string; page_index: number }[] = [];
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
                  void refreshLeagueLeaderboard();
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
                  <Image source={require('./assets/character/bat-character.png')} style={stylesSub.modalBat} resizeMode="contain" />
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
