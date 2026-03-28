import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Image, Animated, Easing } from 'react-native';
import { scale, fontScale } from '../../lib/layout';

type Props = {
  mode: 'loading' | 'intro';
  totalPages: number;
  currentPage: number;
  onStart?: () => void;
  progress?: number;
};

export default function StudyFlowScreen({
  mode,
  totalPages,
  currentPage,
  onStart,
  progress = 0,
}: Props) {
  const [displayProgress, setDisplayProgress] = useState(18);
  const [trackWidth, setTrackWidth] = useState(0);
  const animatedProgress = useRef(new Animated.Value(18)).current;
  const effectiveTrackWidth = trackWidth > 0 ? trackWidth : scale(320);

  useEffect(() => {
    if (mode !== 'loading') return;

    setDisplayProgress((prev) => {
      if (progress >= 100) return 100;
      if (progress <= 0) return Math.max(prev, 18);
      return Math.max(prev, Math.min(progress, 92));
    });
  }, [mode, progress]);

  useEffect(() => {
    if (mode !== 'loading') return;

    const timer = setInterval(() => {
      setDisplayProgress((prev) => {
        if (progress >= 100) return 100;
        const upperBound = progress > 0 ? Math.max(Math.min(progress, 92), prev) : 92;
        if (prev >= upperBound) return prev;
        const next = prev + Math.floor(Math.random() * 8) + 3;
        return Math.min(next, upperBound);
      });
    }, 180);

    return () => clearInterval(timer);
  }, [mode, progress]);

  useEffect(() => {
    Animated.timing(animatedProgress, {
      toValue: displayProgress,
      duration: 280,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [animatedProgress, displayProgress]);

  const animatedFillWidth = animatedProgress.interpolate({
    inputRange: [0, 100],
    outputRange: [0, effectiveTrackWidth],
    extrapolate: 'clamp',
  });

  const bubbleLines = mode === 'loading'
    ? ['문제가 만들어지는 중이에요.', '조금만 기다려주세요!']
    : currentPage === 1
      ? [`${totalPages}장의 페이지를 인식했어요!`, `${currentPage}번째 페이지의 학습을`, '진행할게요.']
      : [`${totalPages}장의 페이지 중에서`, `${currentPage}번째 페이지의 학습을`, '진행할게요.'];

  return (
    <View style={styles.root}>
      <View style={styles.center}>
        <View style={styles.bubbleWrap}>
          <View style={styles.bubble}>
            {bubbleLines.map((line) => (
              <Text key={line} style={styles.bubbleText}>{line}</Text>
            ))}
          </View>
          <View style={styles.bubbleTail} />
        </View>

        <Image
          source={require('../../../assets/character/bat-character.png')}
          style={styles.character}
          resizeMode="contain"
        />

        {mode === 'loading' ? (
          <View style={styles.progressCard}>
            <Text style={styles.progressText}>{displayProgress}%</Text>
            <View
              style={styles.progressTrack}
              onLayout={(event) => setTrackWidth(event.nativeEvent.layout.width)}
            >
              <Animated.View style={[styles.progressFill, { width: animatedFillWidth }]} />
            </View>
          </View>
        ) : (
          <>
            <Text style={styles.caption}>3라운드까지 학습을 완료한 후 다음 페이지의 학습이 진행돼요.</Text>
            <Pressable style={styles.primaryButton} onPress={onStart}>
              <Text style={styles.primaryButtonText}>{currentPage}페이지 학습 시작</Text>
            </Pressable>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F6F7FB',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: scale(20),
  },
  bubbleWrap: {
    alignItems: 'center',
    marginBottom: scale(20),
  },
  bubble: {
    minWidth: scale(360),
    maxWidth: scale(520),
    backgroundColor: '#FFFFFF',
    borderRadius: scale(18),
    paddingHorizontal: scale(24),
    paddingVertical: scale(22),
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#4B5563',
    shadowOpacity: 0.12,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },
  bubbleTail: {
    marginTop: scale(-1),
    width: 0,
    height: 0,
    borderLeftWidth: scale(14),
    borderRightWidth: scale(14),
    borderTopWidth: scale(22),
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#FFFFFF',
  },
  bubbleText: {
    fontSize: fontScale(24),
    lineHeight: fontScale(34),
    fontWeight: '900',
    color: '#111827',
    textAlign: 'center',
  },
  character: {
    width: scale(170),
    height: scale(170),
    marginBottom: scale(28),
  },
  caption: {
    fontSize: fontScale(13),
    lineHeight: fontScale(20),
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: scale(16),
  },
  primaryButton: {
    width: '100%',
    maxWidth: scale(360),
    height: scale(56),
    borderRadius: scale(16),
    backgroundColor: '#5E82FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    fontSize: fontScale(18),
    fontWeight: '900',
    color: '#FFFFFF',
  },
  progressCard: {
    width: '100%',
    maxWidth: scale(560),
    backgroundColor: '#FFFFFF',
    borderRadius: scale(18),
    paddingHorizontal: scale(18),
    paddingVertical: scale(14),
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(14),
    shadowColor: '#4B5563',
    shadowOpacity: 0.1,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },
  progressText: {
    minWidth: scale(62),
    fontSize: fontScale(22),
    fontWeight: '900',
    color: '#111827',
    textAlign: 'center',
  },
  progressTrack: {
    flex: 1,
    minWidth: scale(220),
    height: scale(18),
    borderRadius: scale(999),
    backgroundColor: '#D1D5DB',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: scale(999),
    backgroundColor: '#7C93FF',
  },
});
