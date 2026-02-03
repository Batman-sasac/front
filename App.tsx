import React, { useState, useEffect } from 'react';
import { View, ImageSourcePropType } from 'react-native';
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
import Sidebar, { type Screen as SidebarScreen } from './src/components/Sidebar';
import { runOcr, ScaffoldingPayload, saveTest, getQuizForReview, getWeeklyGrowth, getMonthlyStats } from './src/api/ocr';
import { getToken, getUserInfo, saveAuthData, clearAuthData } from './src/lib/storage';

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
  | 'brushup';

export default function App() {
  const [step, setStep] = useState<Step>('splash');
  const [nickname, setNickname] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userSocialId, setUserSocialId] = useState('');
  const [typeResult, setTypeResult] = useState<ResultStats | null>(null);
  const [typeLabel, setTypeLabel] = useState(''); // 홈 화면용
  const [level, setLevel] = useState(1);
  const [exp, setExp] = useState(0);
  const [monthlyGoal, setMonthlyGoal] = useState<number | null>(null);
  const [streak, setStreak] = useState(0);                 // 연속 학습 일수
  const [lastAttendanceDate, setLastAttendanceDate] = useState<string | null>(null);
  const [isReviewMode, setIsReviewMode] = useState(false); // 복습 모드 여부
  const [reviewQuizId, setReviewQuizId] = useState<number | null>(null); // 복습할 quiz ID
  const [selectedSourceIndex, setSelectedSourceIndex] = useState(0);
  const [rewardState, setRewardState] = useState({
    baseXP: 0,
    bonusXP: 0,
    showBase: false,
    showBonus: false,
  });
  
  // 학습 통계 상태
  const [totalStudyCount, setTotalStudyCount] = useState(0);
  const [continuousDays, setContinuousDays] = useState(0);

  // 학습 통계 불러오기
  useEffect(() => {
    const loadStats = async () => {
      try {
        const stats = await getMonthlyStats();
        setTotalStudyCount(stats.total_study_count || 0);
        setContinuousDays(stats.continuous_days || 0);
      } catch (error) {
        console.error('학습 통계 불러오기 실패:', error);
      }
    };

    if (step === 'mypage') {
      loadStats();
    }
  }, [step]);

  useEffect(() => {
    // 앱 시작시 자동 로그인 체크
    checkAutoLogin();
  }, []);

  const checkAutoLogin = async () => {
    try {
      const token = await getToken();
      if (token) {
        const userInfo = await getUserInfo();
        if (userInfo.email && userInfo.nickname) {
          setUserEmail(userInfo.email);
          setNickname(userInfo.nickname);
          // splash 끝나면 바로 홈으로
          setTimeout(() => setStep('home'), 2000);
          return;
        }
      }
      // 토큰 없으면 로그인 화면으로
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
      console.log('✅ 로그아웃 완료');
      // 상태 초기화
      setUserEmail('');
      setNickname('');
      setUserSocialId('');
      setTypeResult(null);
      // 로그인 화면으로 이동
      setStep('login');
    } catch (error) {
      console.error('❌ 로그아웃 오류:', error);
    }
  };

  useEffect(() => {
    if (step === 'home') {
      handleDailyCheckIn();   // 홈 들어오자마자 자동 출석

      // 통계 데이터 로드
      (async () => {
        try {
          const [weekly, monthly] = await Promise.all([
            getWeeklyGrowth(),
            getMonthlyStats(),
          ]);
          setWeeklyGrowth(weekly);
          setMonthlyStats(monthly.compare);
        } catch (e) {
          console.error('통계 데이터 로드 실패:', e);
        }
      })();
    }
  }, [step]);

  // 복습 진입 시 DB에서 퀴즈 데이터 가져오기 (저장된 pages/quiz 형태 그대로 사용)
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
          setScaffoldingError(e?.message ?? '복습 데이터를 불러오지 못했습니다.');
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

    // 바로 홈 화면으로 이동
    setStep('home');
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
    setStep('goal');  // 신규 유저는 목표 설정으로
  };

  const getTodayKey = () => new Date().toISOString().slice(0, 10);

  const hasCheckedInToday = lastAttendanceDate === getTodayKey();

  const handleDailyCheckIn = () => {
    const today = new Date();
    const todayKey = today.toISOString().slice(0, 10);

    if (lastAttendanceDate === todayKey) return; // 이미 출석

    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    const yesterdayKey = yesterday.toISOString().slice(0, 10);

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

    // XP 보상 로직은 그대로
    const baseXP = 10;
    const bonusXP = Math.random() < 0.5 ? 10 : 0;
    setExp((prev) => prev + baseXP + bonusXP);

    setRewardState({
      baseXP,
      bonusXP,
      showBase: true,
      showBonus: false,
    });
  };
  const handleCloseBaseReward = () => {
    setRewardState((prev) => ({
      ...prev,
      showBase: false,
      showBonus: prev.bonusXP > 0, // 보너스 있으면 다음 모달로
    }));
  };
  const handleCloseBonusReward = () => {
    setRewardState((prev) => ({
      ...prev,
      showBonus: false,
    }));
  };
  const [weekAttendance, setWeekAttendance] = useState<boolean[]>( //이번 주 요일 별 출석
    [false, false, false, false, false, false, false],
  );
  const [currentLeagueTier] = useState<LeagueTier>('iron');  // 우선 아이언으로 시작
  /* 백엔드 연결
  const [leagueUsers] = useState<LeagueUser[]>([]);
  const [leagueRemainingText] = useState<string>('');
  */
  const [leagueUsers] = useState<LeagueUser[]>([
    {
      id: 'u1',
      nickname: '데일리기록러',
      xp: 1200,
      minutesAgo: 51,
    },
    {
      id: 'u2',
      nickname: '공부하는곰돌이',
      xp: 900,
      minutesAgo: 51,
    },
  ]);

  const [leagueRemainingText] = useState<string>(
    '남은 시간: 3일 19시간 30분',
  );        // 예: "남은 시간: 3일 19시간 30분"
  const getWeekdayIndex = (date: Date) => {
    const jsDay = date.getDay(); // 0(일)~6(토)
    return (jsDay + 6) % 7;      // 월0, 화1, ... 일6
  };
  //촬영 결과 임시로 App으로 이동
  const [capturedSources, setCapturedSources] = useState<ImageSourcePropType[]>([]);

  const [scaffoldingPayload, setScaffoldingPayload] = useState<ScaffoldingPayload | null>(null);
  const [scaffoldingLoading, setScaffoldingLoading] = useState(false);
  const [scaffoldingError, setScaffoldingError] = useState<string | null>(null);

  // 홈 화면 통계 데이터
  const [weeklyGrowth, setWeeklyGrowth] = useState<{ labels: string[]; data: number[] } | undefined>();
  const [monthlyStats, setMonthlyStats] = useState<any>(undefined);

  function buildBlankWordsFromText(text: string, limit = 8) {
    // 1) 공백/문장부호 기준 분리
    const raw = text
      .replace(/[0-9]/g, ' ')
      .replace(/[.,!?()\[\]{}"“”‘’]/g, ' ')
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
          onSubmit={(goal) => {
            setMonthlyGoal(goal);
            setStep('typeIntro');
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
          onFinish={(result) => {
            setTypeResult(result);
            // typeKey 로 프로필 찾아서 title 사용
            const profile = typeProfiles[result.typeKey];
            setTypeLabel(profile.title);
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
          onNavigate={(screen) => setStep(screen)}
          onLogout={handleLogout}
        />
      )}

      {step === 'league' && (
        <LeagueScreen
          onNavigate={(screen) => setStep(screen)}
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
          onNavigate={(screen) => setStep(screen)}
          onMonthlyGoalChange={(goal) => setMonthlyGoal(goal)}
          onNicknameChange={(newNickname) => setNickname(newNickname)}
        />
      )}

      {/* 자료입력: 촬영 화면 */}
      {step === 'takePicture' && (
        <TakePicture
          onBack={() => setStep('home')}
          onDone={(sources) => {
            setCapturedSources(sources);
            setStep('selectPicture');
          }}
        />
      )}


      {/* 자료입력: 선택/미리보기(크롭 UI) 화면 */}
      {step === 'selectPicture' && (
        <SelectPicture
          sources={capturedSources}
          onBack={() => setStep('takePicture')}
          onStartLearning={async (finalSources, isOcrNeeded) => {
            setCapturedSources(finalSources);

            // 1) OCR 요청 (필요할 때만)
            const first = finalSources[0] as any;
            const uri = first?.uri as string | undefined;

            if (!uri) {
              setScaffoldingError('이미지 URI를 찾을 수 없습니다.');
              setScaffoldingPayload(null);
              setStep('talkingStudy');
              return;
            }

            setScaffoldingLoading(true);
            setScaffoldingError(null);

            try {
              const payload = await runOcr(uri);
              console.log('✅ OCR 성공, payload:', payload);
              setScaffoldingPayload(payload);
              setStep('scaffolding'); // OCR 성공 시 scaffolding으로 이동
            } catch (e: any) {
              console.error('❌ OCR 실패:', e);
              setScaffoldingPayload(null);
              setScaffoldingError(e?.message ?? 'OCR 호출에 실패했습니다.');
              setStep('talkingStudy'); // OCR 실패 시에만 talkingStudy로
            } finally {
              setScaffoldingLoading(false);
            }
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
          onBack={() => {
            setIsReviewMode(false);
            setReviewQuizId(null);
            setStep('talkingStudy');
          }}
          sources={capturedSources}
          selectedIndex={selectedSourceIndex}
          payload={scaffoldingPayload}
          loading={scaffoldingLoading}
          error={scaffoldingError}
          initialRound={isReviewMode ? '3-1' : '1-1'} // 복습 모드면 3라운드로 시작
          reviewQuizId={reviewQuizId} // 복습할 quiz ID 전달
          onRetry={async () => {
            const first = capturedSources[0] as any;
            const uri = first?.uri as string | undefined;
            if (!uri) return;

            setScaffoldingLoading(true);
            setScaffoldingError(null);
            try {
              const payload = await runOcr(uri);
              setScaffoldingPayload(payload);
            } catch (e: any) {
              setScaffoldingPayload(null);
              setScaffoldingError(e?.message ?? '재시도에 실패했습니다.');
            } finally {
              setScaffoldingLoading(false);
            }
          }}
          onSave={async (userAnswers) => {
            if (!scaffoldingPayload) throw new Error('Payload가 없습니다.');

            const blanks = scaffoldingPayload.blanks ?? [];
            const keywords = blanks.map((b) => b.word);

            await saveTest({
              subject_name: scaffoldingPayload.title,
              study_name: scaffoldingPayload.title,
              original: scaffoldingPayload.extractedText,
              answers: keywords,
              pages: [{ original_text: scaffoldingPayload.extractedText, keywords }],
              blanks: blanks.map((b, i) => ({ blank_index: i, word: b.word, page_index: 0 })),
              user_answers: userAnswers,
              quiz: scaffoldingPayload.extractedText,
            });
          }}
        />

      )}

      {step === 'brushup' && (
        <BrushUPScreen
          onBack={() => setStep('home')}
          // 🔧 수정
          onNavigate={(screen: SidebarScreen) => setStep(screen)}
          onCardPress={(card) => {
            setIsReviewMode(true);
            setReviewQuizId(card.quiz_id || null);
            setStep('scaffolding');
          }}
        />
      )}




    </View>
  );
}
