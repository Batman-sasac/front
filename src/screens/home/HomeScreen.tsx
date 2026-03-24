import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  Pressable,
} from 'react-native';
import { scale, fontScale } from '../../lib/layout';
import Sidebar from '../../components/Sidebar';
import { confirmLogout } from '../../lib/auth';
import Svg, { Polyline, Circle, Defs, LinearGradient, Stop, G, Text as SvgText } from 'react-native-svg';

// 학습자 유형별 색상 → 레벨업 캐릭터 이미지 (레벨 1~5)
const LEVEL_UP_IMAGES: Record<string, Record<number, ReturnType<typeof require>>> = {
  green: {
    1: require('../../../assets/character/level-up/green/green-1.png'),
    2: require('../../../assets/character/level-up/green/green-2.png'),
    3: require('../../../assets/character/level-up/green/green-3.png'),
    4: require('../../../assets/character/level-up/green/green-4.png'),
    5: require('../../../assets/character/level-up/green/green-5.png'),
  },
  red: {
    1: require('../../../assets/character/level-up/red/red-1.png'),
    2: require('../../../assets/character/level-up/red/red-2.png'),
    3: require('../../../assets/character/level-up/red/red-3.png'),
    4: require('../../../assets/character/level-up/red/red-4.png'),
    5: require('../../../assets/character/level-up/red/red-5.png'),
  },
  yellow: {
    1: require('../../../assets/character/level-up/yellow/yellow-1.png'),
    2: require('../../../assets/character/level-up/yellow/yellow-2.png'),
    3: require('../../../assets/character/level-up/yellow/yellow-3.png'),
    4: require('../../../assets/character/level-up/yellow/yellow-4.png'),
    5: require('../../../assets/character/level-up/yellow/yellow-5.png'),
  },
  purple: {
    1: require('../../../assets/character/level-up/purple/purple-1.png'),
    2: require('../../../assets/character/level-up/purple/purple-2.png'),
    3: require('../../../assets/character/level-up/purple/purple-3.png'),
    4: require('../../../assets/character/level-up/purple/purple-4.png'),
    5: require('../../../assets/character/level-up/purple/purple-5.png'),
  },
};

/** 학습자 유형 + 레벨에 따라 레벨업 캐릭터 이미지 반환 (유형별 색상 적용) */
const getLevelUpCharacterSource = (typeLabel: string, level: number): ReturnType<typeof require> => {
  const clampedLevel = Math.min(5, Math.max(1, level));
  // 유형 없으면 기본 파란 BAT
  if (!typeLabel) {
    return require('../../../assets/character/bat-character.png');
  }
  if (typeLabel.includes('분석형')) return LEVEL_UP_IMAGES.green[clampedLevel];
  if (typeLabel.includes('협력형')) return LEVEL_UP_IMAGES.red[clampedLevel];
  if (typeLabel.includes('창의형')) return LEVEL_UP_IMAGES.yellow[clampedLevel];
  if (typeLabel.includes('사회형')) return LEVEL_UP_IMAGES.purple[clampedLevel];
  return require('../../../assets/character/bat-character.png');
};

type Props = {
  nickname: string;
  typeLabel: string;
  level: number;
  exp: number;
  // 출석 관련
  streak: number;
  hasCheckedInToday: boolean;
  onCheckIn: () => void;
  weekAttendance: boolean[]; // 월~일, true이면 출석
  // 홈 화면 통계
  weeklyGrowth?: { labels: string[]; data: number[] };
  monthlyStats?: { last_month_name: string; last_month_count: number; this_month_name: string; this_month_count: number; target_count: number; diff: number };
  monthlyGoal?: number | null;
  //
  onNavigate: (screen: 'home' | 'league' | 'alarm' | 'mypage' | 'takePicture' | 'brushup') => void;
  onLogout?: () => void;
};

export default function HomeScreen({
  nickname,
  typeLabel,
  level,
  exp,
  streak,
  hasCheckedInToday,
  onCheckIn,
  weekAttendance,
  weeklyGrowth,
  monthlyStats,
  monthlyGoal,
  onNavigate,
  onLogout,
}: Props) {
  const [graphWidth, setGraphWidth] = useState(0);
  const graphSvgHeight = scale(132);
  const LEVEL_THRESHOLDS = [0, 100, 500, 2000, 5000, 10000];
  const getLevelBounds = (currentLevel: number) => {
    const idx = Math.min(Math.max(currentLevel, 1), 5) - 1;
    const min = LEVEL_THRESHOLDS[idx];
    const max = LEVEL_THRESHOLDS[Math.min(idx + 1, LEVEL_THRESHOLDS.length - 1)];
    return { min, max };
  };

  const effectiveLevel = level;
  const characterSource = getLevelUpCharacterSource(typeLabel, effectiveLevel);

  const { min: levelMin, max: levelMax } = getLevelBounds(effectiveLevel);
  const expClamped = Math.max(levelMin, Math.min(exp, levelMax));
  const expInLevel = expClamped - levelMin;
  const expNeeded = Math.max(levelMax - levelMin, 1);
  const expProgress = levelMax === levelMin ? 1 : Math.min(expInLevel / expNeeded, 1);

  // 레벨업 이미지를 레벨별로 따로 쓰므로 스케일은 항상 1로 고정
  const characterScale = 1;
  const weekdays = ['월', '화', '수', '목', '금', '토', '일'];
  const todayIndex = (() => {
    const jsDay = new Date().getDay();
    return (jsDay + 6) % 7; // 월0~일6
  })();
  const hasStreak = streak >= 2; // 2일 이상 연속 출석이면 불 아이콘 색상

  const handleLogoutPress = () => {
    confirmLogout(() => {
      if (onLogout) onLogout();
      else onNavigate('home');
    });
  };

  return (
    <View style={styles.root}>
      <Sidebar
        activeScreen="home"
        onNavigate={onNavigate}
        onLogout={handleLogoutPress}
      />

      {/* 우측 메인 영역 */}
      <ScrollView style={styles.main} contentContainerStyle={styles.mainContent}>
        <View style={styles.headerRow}>
          <Text style={styles.welcome}>{nickname}님 환영해요!</Text>

          <Pressable
            style={styles.alarmButton}
            onPress={() => onNavigate('alarm')}
          >
            <Image
              source={require('../../../assets/homebutton/alarm.png')}
              style={styles.alarmIcon}
              resizeMode="contain"
            />
          </Pressable>
        </View>
        <View style={styles.contentRow}>
          {/* 왼쪽 컬럼: bigCard + 성장 카드 */}
          <View style={styles.leftColumn}>
            {/* 상단 큰 카드 */}
            <View style={styles.bigCard}>
              {/* Level + 유형 */}
              <Text style={styles.levelText}>
                <Text style={styles.levelLabel}>Level </Text>
                <Text style={styles.levelValue}>{effectiveLevel} </Text>
                {typeLabel || '학습 유형 미지정'}
              </Text>

              {/* 레벨 바 + 경험치(바 오른쪽 위) */}
              <View style={styles.progressWrapper}>
                <View style={styles.progressBarBackground}>
                  <View
                    style={[
                      styles.progressBarFill,
                      { width: `${Math.round(expProgress * 100)}%` },
                    ]}
                  />
                </View>
                <Text style={styles.expText}>{expClamped}/{levelMax}</Text>
              </View>

              {/* 캐릭터 */}
              <View style={styles.characterWrapper}>
                <Image
                  source={characterSource}
                  style={[styles.characterImage, { transform: [{ scale: characterScale }] }]}
                />
              </View>

              {/* 오늘의 복습 버튼 */}
              <Pressable
                style={styles.todayButton}
                onPress={() => {
                  if (!hasCheckedInToday) {
                    onCheckIn();
                  }
                  onNavigate('brushup');
                }}
              >
                <View style={styles.todayButtonInner}>
                  <Image
                    source={require('../../../assets/homebutton/reft-shift.png')}
                    style={styles.todayButtonIcon}
                    resizeMode="contain"
                  />
                  <Text style={styles.todayButtonText}>오늘의 복습</Text>
                </View>
              </Pressable>

            </View>

            {/* 아래 성장 카드 */}
            <View style={styles.bottomCard}>
              {/* 요약 메시지 */}
              {weeklyGrowth && weeklyGrowth.data && weeklyGrowth.data.length >= 2 && (
                <Text style={styles.smallTitle}>
                  {(() => {
                    const thisWeek = weeklyGrowth.data[weeklyGrowth.data.length - 1] || 0;
                    const lastWeek = weeklyGrowth.data[weeklyGrowth.data.length - 2] || 0;
                    const growthPercent = lastWeek > 0 ? Math.round(((thisWeek - lastWeek) / lastWeek) * 100) : 0;
                    return growthPercent >= 0
                      ? ` 이번주, 지난주보다 ${growthPercent}% 성장했어요!`
                      : ` 이번주 지난주보다 ${Math.abs(growthPercent)}% 감소했어요. 조금만 더 힘내요! ✊`;
                  })()}
                </Text>
              )}

              {/* 선 그래프 */}
              <View style={styles.lineGraphContainer}>
                {weeklyGrowth && weeklyGrowth.labels && weeklyGrowth.data ? (
                  <View style={styles.lineChartWrapper}>
                    <View
                      style={styles.lineChartContainer}
                      onLayout={(e) => setGraphWidth(e.nativeEvent.layout.width)}
                    >
                      {/* 그라데이션 배경 영역 */}
                      <View style={styles.graphBackground} />
                      {/* 선과 점 */}
                      <Svg
                        width={graphWidth > 0 ? graphWidth : '100%'}
                        height={graphSvgHeight}
                        style={styles.svgOverlay}
                      >
                        {weeklyGrowth?.data && weeklyGrowth.data.length > 0 && (() => {
                          const data = weeklyGrowth.data;
                          const maxValue = Math.max(...data, 1);
                          const svgWidth = Math.max(graphWidth, 320);
                          const paddingLeft = 20;
                          const paddingRight = 20;
                          const pointRadius = 4;
                          const labelOffset = 12;
                          const labelTopPadding = 18;
                          const paddingTop = labelTopPadding + labelOffset + pointRadius + 4;
                          const paddingBottom = 20;
                          const svgHeight = graphSvgHeight;
                          const chartWidth = Math.max(svgWidth - (paddingLeft + paddingRight), 1);
                          const chartHeight = Math.max(svgHeight - (paddingTop + paddingBottom), 1);
                          const pointSpacing = chartWidth / Math.max(data.length - 1, 1);
                          const minPointY = paddingTop;

                          const points = data.map((val: number, idx: number) => ({
                            x: paddingLeft + idx * pointSpacing,
                            y: Math.max(minPointY, svgHeight - paddingBottom - (val / maxValue) * chartHeight),
                            val,
                          }));

                          const pointsStr = points.map(p => `${p.x},${p.y}`).join(' ');

                          return [
                            <Polyline key="line" points={pointsStr} fill="none" stroke="#5E82FF" strokeWidth={2} />,
                            ...points.map((p, idx) => (
                              <G key={`point-${idx}`}>
                                <Circle cx={p.x} cy={p.y} r={pointRadius} fill="#5E82FF" />
                                <SvgText
                                  x={p.x}
                                  y={p.y - 12}
                                  fontSize="14"
                                  fontWeight="700"
                                  fill="#5E82FF"
                                  textAnchor="middle"
                                >
                                  {p.val}
                                </SvgText>
                              </G>
                            )),
                          ];
                        })()}
                      </Svg>
                    </View>

                    {/* 통계 정보: 좌측 하단 텍스트만 */}
                    {monthlyStats && weeklyGrowth?.data && (
                      <View style={styles.graphStatsTextContainer}>
                        <Text style={styles.graphStatsLabel}>
                          정답률*출석률: {Math.round(
                            ((monthlyStats.this_month_count || 0) *
                              (weeklyGrowth.data[weeklyGrowth.data.length - 1] || 0) *
                              0.01) * 100
                          ) / 100}%
                        </Text>
                      </View>
                    )}
                  </View>
                ) : (
                  <Text style={styles.graphPlaceholder}>
                    학습 기록이 없습니다{'\n'}학습을 시작해보세요!
                  </Text>
                )}
              </View>
            </View>
          </View>

          {/* 오른쪽 컬럼: 연속 학습 / 리그 / 목표 카드 */}
          <View style={styles.rightColumn}>
            {/* 연속 학습 카드 */}
            <View style={styles.smallCard}>
              <View style={styles.streakRow}>
                {/* 왼쪽 큰 불 아이콘 */}
                <Image
                  source={require('../../../assets/fire.png')}
                  style={[
                    styles.fireImage,
                    hasStreak && styles.fireImageActive,
                  ]}
                  resizeMode="contain"
                />

                {/* 오른쪽 텍스트 + 요일 */}
                <View style={styles.streakContent}>
                  <Text style={styles.streakTitle}>
                    연속 학습 <Text style={styles.streakStrong}>{streak}</Text>일
                  </Text>

                  <View style={styles.weekRow}>
                    {weekdays.map((label, idx) => {
                      const checked = weekAttendance[idx];
                      const isToday = idx === todayIndex;
                      return (
                        <View key={label} style={styles.weekItem}>
                          <View
                            style={[
                              styles.weekCircle,
                              checked && styles.weekCircleChecked,
                            ]}
                          >
                            <Text
                              style={[
                                styles.weekLabel,
                                checked && styles.weekLabelChecked,
                              ]}
                            >
                              {label}
                            </Text>
                          </View>
                          {isToday && <View style={styles.todayTriangle} />}
                        </View>
                      );
                    })}
                  </View>
                </View>
              </View>
            </View>

            {/* 이하 리그 카드 / 목표 카드 그대로 */}
            {/* 리그 카드 (디자인 개선 버전) */}
            <Pressable
              style={styles.leagueCard}
              onPress={() => onNavigate('league')}
            >

              {/* 제목 */}
              <Text style={styles.leagueTitle}>현재 리그 순위</Text>

              <View style={styles.leagueRow}>
                {/* 트로피 이미지 */}
                <Image
                  source={require('../../../assets/league-trophy/iron.png')}
                  style={styles.leagueTrophy}
                  resizeMode="contain"
                />

                {/* 리그명 + 순위 */}
                <View style={{ flex: 1 }}>
                  <Text style={styles.leagueMainText}>아이언 리그 <Text style={styles.leagueRank}>5</Text> 위</Text>

                  {/* XP 부족분 계산 */}
                  <Text style={styles.leagueSubText}>
                    10XP만 획득하면 순위 UP!
                  </Text>
                  {/* 1등일 때는 ↓ */}
                  {/* <Text style={styles.leagueSubText}>와 리그 1등이에요!</Text> */}
                </View>

                {/* 오른쪽 > 아이콘 */}
                <Image
                  source={require('../../../assets/shift.png')}
                  style={styles.leagueArrowImage}
                  resizeMode="contain"
                />
              </View>
            </Pressable>


            <View style={[styles.bottomCard, styles.rightBottomCard, styles.goalCard]}>
              <Text style={styles.goalCardTitle}>이번 달 목표까지 얼마 안 남았어요!</Text>

              {/* 이번 달 목표 */}
              <View style={styles.goalInlineRow}>
                <Text style={styles.goalItemLabel}>이번 달 목표</Text>
                <View style={styles.goalProgressBarContainer}>
                  <View style={[styles.goalProgressBar, { width: '100%', backgroundColor: '#5E82FF' }]} />
                  <Text style={styles.goalValueOverlay}>{monthlyGoal ?? 20}회</Text>
                </View>
              </View>

              {/* 현재 달 학습 */}
              <View style={styles.goalInlineRow}>
                <Text style={styles.goalItemLabel}>{monthlyStats?.this_month_name || new Date().getMonth() + 1}월 총 학습</Text>
                {(monthlyStats?.this_month_count ?? 0) === 0 ? (
                  <View style={[styles.goalProgressBarContainer, { backgroundColor: 'transparent' }]}>
                    <Text style={[styles.goalValueOverlay, { position: 'static', color: '#92A6FF' }]}>0회</Text>
                  </View>
                ) : (
                  <View style={styles.goalProgressBarContainer}>
                    <View
                      style={[
                        styles.goalProgressBar,
                        {
                          width: `${Math.min(
                            ((monthlyStats?.this_month_count ?? 0) / (monthlyGoal ?? 20)) * 100,
                            100
                          )}%`,
                          backgroundColor: '#92a6ff',
                        },
                      ]}
                    />
                    <Text style={styles.goalValueOverlay}>{monthlyStats?.this_month_count ?? 0}회</Text>
                  </View>
                )}
              </View>

              <Text style={styles.goalHighlight}>
                {Math.max((monthlyGoal ?? 20) - (monthlyStats?.this_month_count ?? 0), 0)}회만 더 하면 목표달성!
              </Text>
            </View>
          </View>

        </View>
      </ScrollView>

    </View>
  );
}

const BG = '#F3F4F6';
const CARD_SHADOW = {
  shadowColor: '#0F172A',
  shadowOpacity: 0.1,
  shadowRadius: 18,
  shadowOffset: { width: 0, height: 8 },
  elevation: 5,
};

const styles = StyleSheet.create({
  root: { flex: 1, flexDirection: 'row', backgroundColor: BG },

  /* 메인 영역 */
  main: { flex: 1 },
  mainContent: {
    paddingHorizontal: 18,
    paddingVertical: 16
  },
  welcome: {
    fontSize: fontScale(30),
    fontWeight: '800',
    marginTop: scale(10),
    marginBottom: scale(8),
    marginHorizontal: scale(8),
  },

  /* 좌/우 컬럼 레이아웃 */
  contentRow: {
    flexDirection: 'row',
    gap: 14,
    alignItems: 'flex-start',
  },
  leftColumn: {
    flex: 0.97,
  },
  rightColumn: {
    flex: 1.03,
    gap: 8,
  },
  /* 카드들 */
  bigCard: {
    backgroundColor: '#ffffff',
    borderRadius: scale(24),
    padding: scale(18),
    ...CARD_SHADOW,
    marginBottom: scale(14),
  },
  smallCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    paddingVertical: 20,
    paddingHorizontal: 14,
    ...CARD_SHADOW,
    marginBottom: scale(12),
  },
  bottomCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    paddingTop: scale(20),
    paddingBottom: scale(6),
    paddingHorizontal: 14,
    ...CARD_SHADOW,
  },

  rightBottomCard: {
    marginTop: 4,
  },

  smallTitle: { fontSize: fontScale(25), fontWeight: '500', marginBottom: -4 },
  smallBody: { fontSize: fontScale(12), color: '#4B5563' },

  /* 레벨/경험치 */
  levelText: {
    fontSize: fontScale(16),
    fontWeight: '600',
    marginBottom: scale(8),
  },
  levelLabel: { color: '#000000' },
  levelValue: { fontSize: fontScale(20), color: '#000000', fontWeight: '800' },

  progressWrapper: {
    marginBottom: scale(16),
    position: 'relative',
  },
  progressBarBackground: {
    width: '100%',
    height: scale(6),
    borderRadius: 999,
    backgroundColor: '#E5E7EB',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#5E82FF',
  },
  expText: {
    position: 'absolute',
    right: 0,
    top: -18,
    fontSize: fontScale(12),
    fontWeight: '600',
    color: '#6B7280',
  },

  /* 캐릭터 + 버튼 */
  characterWrapper: {
    alignItems: 'center',
    marginBottom: scale(16),
  },
  characterImage: {
    width: scale(190),
    height: scale(190),
    marginBottom: scale(20),
    marginTop: scale(20),
  },
  todayButton: {
    borderRadius: scale(16),
    paddingVertical: scale(12),
    backgroundColor: '#5E82FF',
    alignItems: 'center',
  },
  todayButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  todayButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: fontScale(24),
  },

  /* 링크 텍스트 */
  linkText: {
    marginTop: 8,
    fontSize: 12,
    color: '#2563EB',
    fontWeight: '700',
  },

  streakRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fireImage: {
    width: scale(80),
    height: scale(80),
    tintColor: '#E5E7EB',
    marginRight: scale(14),
    marginBottom: scale(4),
    marginTop: scale(4),
  },
  fireImageActive: {
    tintColor: '#F973A6', // 활성 핑크 (원하는 색으로 조정 가능)
  },
  streakContent: {
    flex: 1,
  },
  streakTitle: {
    fontSize: fontScale(23),
    fontWeight: '700',
    marginBottom: scale(25),
  },
  streakStrong: {
    fontWeight: '800',
    fontSize: fontScale(18),
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  weekItem: {
    alignItems: 'center',
  },
  weekCircle: {
    width: scale(28),
    height: scale(28),
    borderRadius: scale(14),
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekCircleChecked: {
    backgroundColor: '#FED7E2', // 연한 핑크 배경
  },
  weekLabel: {
    fontSize: fontScale(16),
    color: '#4B5563',
  },
  weekLabelChecked: {
    color: '#EC4899',
    fontWeight: '700',
  },
  todayTriangle: {
    marginTop: 4,
    width: 0,
    height: 0,
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderBottomWidth: 7,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#3B82F6',
  },
  /* 리그 카드 */
  leagueCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 16,
    ...CARD_SHADOW,
    marginBottom: scale(12),
  },

  leagueTitle: {
    fontSize: fontScale(20),
    fontWeight: '400',
    marginBottom: fontScale(25),
    marginHorizontal: scale(4),
    marginTop: scale(8),
  },

  leagueRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  leagueTrophy: {
    width: scale(100),
    height: scale(100),
    marginRight: scale(14),
    marginBottom: scale(8),
  },

  leagueMainText: {
    fontSize: fontScale(25),
    fontWeight: '500',
    marginBottom: 6,
  },

  leagueRank: {
    fontSize: fontScale(30),
    fontWeight: '700',
  },

  leagueSubText: {
    fontSize: fontScale(15),
    fontWeight: '600',
    color: '#84858C',
    marginTop: scale(7),
  },

  leagueArrowImage: {
    width: scale(30),
    height: scale(30),
    tintColor: '#9CA3AF',
    marginLeft: 8,
  },
  todayButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: scale(6),
  },
  todayButtonIcon: {
    width: scale(24),
    height: scale(24),
    tintColor: '#FFFFFF',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: scale(16),
  },
  alarmButton: {
    padding: scale(4),
  },
  alarmIcon: {
    width: scale(24),
    height: scale(24),
    tintColor: '#9CA3AF',
  },

  /* 목표 카드 관련 */
  goalCard: {
    gap: 12,
  },
  lineGraphContainer: {
    minHeight: scale(138),
    marginTop: scale(0),
    marginBottom: scale(0),
    justifyContent: 'flex-start',
    alignItems: 'stretch',
  },
  lineChartWrapper: {
    width: '100%',
    alignItems: 'stretch',
  },
  lineChartContainer: {
    width: '100%',
    height: scale(135),
    position: 'relative',
    marginBottom: scale(2),
  },
  graphBackground: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    backgroundColor: 'transparent',
  } as any,
  svgOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
  } as any,
  xAxisLabels: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    paddingHorizontal: scale(20),
    marginTop: scale(8),
  },
  xAxisLabel: {
    fontSize: fontScale(11),
    color: '#6B7280',
  },
  graphStatsBox: {
    alignItems: 'center',
    marginTop: scale(16),
    paddingVertical: scale(12),
    paddingHorizontal: scale(16),
    backgroundColor: '#F0F4FF',
    borderRadius: scale(8),
  },
  graphStatsTextContainer: {
    alignItems: 'flex-start',
    marginTop: scale(-2),
    paddingLeft: scale(8),
    paddingBottom: scale(4),
    width: '100%',
    includeFontPadding: false
  },
  graphStatsLabel: {
    fontSize: fontScale(15),
    color: '#4B5563',
    fontWeight: '800',
    marginBottom: scale(4),
  },
  graphStatsText: {
    fontSize: fontScale(12),
    color: '#6B7280',
    marginBottom: scale(4),
  },
  graphStatsValue: {
    fontSize: fontScale(20),
    fontWeight: '800',
    color: '#5E82FF',
  },
  barChartContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    width: '100%',
    height: scale(100),
    paddingHorizontal: scale(8),
  },
  barItem: {
    alignItems: 'center',
    flex: 1,
    gap: scale(4),
  },
  barWrapper: {
    width: '80%',
    height: scale(80),
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  bar: {
    width: '100%',
    backgroundColor: '#5E82FF',
    borderRadius: scale(4),
    minHeight: 2,
  },
  barLabel: {
    fontSize: fontScale(10),
    color: '#6B7280',
    marginTop: scale(2),
  },
  barValue: {
    fontSize: fontScale(11),
    fontWeight: '700',
    color: '#111827',
  },
  graphPlaceholder: {
    fontSize: fontScale(11),
    color: '#9CA3AF',
    textAlign: 'center',
    paddingVertical: scale(20),
  },
  comparisonBox: {
    marginTop: scale(16),
    paddingTop: scale(16),
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statLabel: {
    fontSize: fontScale(11),
    color: '#9CA3AF',
    marginBottom: scale(4),
    textTransform: 'uppercase',
  },
  statValue: {
    fontSize: fontScale(16),
    fontWeight: '800',
    color: '#5E82FF',
  },
  divider: {
    width: 1,
    height: scale(40),
    backgroundColor: '#E5E7EB',
  },
  graphLegend: {
    gap: scale(4),
  },
  graphLegendText: {
    fontSize: fontScale(11),
    fontWeight: '600',
    color: '#4B5563',
  },
  goalCardTitle: {
    fontSize: fontScale(25),
    fontWeight: '500',
    color: '#1F2937',
    marginTop: scale(8),
    marginBottom: scale(20),
    marginHorizontal: scale(8),
  },
  goalInlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
    marginBottom: scale(18),
  },
  goalItemLabel: {
    fontSize: fontScale(18),
    fontWeight: '600',
    color: '#4B5563',
    minWidth: scale(75),
    marginHorizontal: scale(8),
    marginBottom: scale(4),
  },
  goalProgressBarContainer: {
    flex: 1,
    height: scale(37),
    backgroundColor: '#E5E7EB',
    borderRadius: scale(8),
    overflow: 'visible',
    position: 'relative',
    justifyContent: 'center',
  },
  goalProgressBar: {
    height: '100%',
    borderRadius: scale(10),
  },
  goalValueOverlay: {
    position: 'absolute',
    right: scale(10),
    fontSize: fontScale(20),
    fontWeight: '800',
    color: '#FFFFFF',
  },
  goalItemValue: {
    fontSize: fontScale(14),
    fontWeight: '800',
    color: '#5E82FF',
    minWidth: scale(45),
    textAlign: 'right',
  },
  goalHighlight: {
    fontSize: fontScale(24),
    fontWeight: '700',
    color: '#5E82FF',
    marginBottom: scale(24),
    marginHorizontal: scale(8),
    textAlign: 'left',
  },
});
