import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Pressable,
    Image,
} from 'react-native';
import {
    questions,
    applyAnswer,
    RawScore,
    toResult,
    ResultStats,
} from '../../data/learningTypeTest';
import { scale, fontScale } from '../../lib/layout';
import SegmentedProgressBar from '../../components/common/SegmentedProgressBar';
import { appColors, appFontWeight } from '../../styles/theme';

type Props = {
    onFinish: (result: ResultStats) => void;
};

export default function TypeTestScreen({ onFinish }: Props) {
    const total = questions.length;
    const [index, setIndex] = useState(0);
    const [score, setScore] = useState<RawScore>({ field: 0, tempo: 0 });

    const current = questions[index];

    const handleAnswer = (answer: 'a' | 'b') => {
        const nextScore = applyAnswer(score, index, answer);

        const isLast = index === total - 1;
        if (isLast) {
            const result = toResult(nextScore);
            onFinish(result);
            return;
        }

        setScore(nextScore);
        setIndex(prev => prev + 1);
    };

    // 이미 답한 개수 (진행바 채우기용)
    const answeredCount = index;

    return (
        <View style={styles.container}>
            {/* 상단 타이틀 + 진행도 */}
            <View style={styles.top}>
                <Text style={styles.title}>학습 유형 검사</Text>

                {/* 20칸 세그먼트 진행 바 */}
                <SegmentedProgressBar total={total} activeCount={answeredCount} />

                <Text style={styles.counter}>
                    {answeredCount}/{total}
                </Text>
            </View>

            {/* 가운데 캐릭터 + 질문 카드 */}
            <View style={styles.center}>
                <Image
                    source={require('../../../assets/character/bat-character.png')}
                    style={styles.character}
                    resizeMode="contain"
                />

                <View style={styles.card}>
                    <Text style={styles.questionIndex}>Q{index + 1}.</Text>
                    <Text style={styles.questionText}>{current.text}</Text>

                    <View style={styles.buttonRow}>
                        <View style={styles.choiceCol}>
                            <Pressable
                                style={[styles.choiceButton, styles.yesButton]}
                                onPress={() => handleAnswer('a')}
                            >
                                <Text style={[styles.choiceLabel, styles.choiceLabelYes]}>A</Text>
                            </Pressable>
                            <Text style={styles.choiceText}>{current.aText}</Text>
                        </View>

                        <View style={styles.choiceCol}>
                            <Pressable
                                style={[styles.choiceButton, styles.noButton]}
                                onPress={() => handleAnswer('b')}
                            >
                                <Text style={[styles.choiceLabel, styles.choiceLabelNo]}>B</Text>
                            </Pressable>
                            <Text style={styles.choiceText}>{current.bText}</Text>
                        </View>
                    </View>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    // 전체 화면 배경 + 상단 여백
    container: {
        flex: 1,
        backgroundColor: appColors.screenBgMuted,
        paddingHorizontal: scale(40),
        paddingTop: scale(40),
    },

    // 상단 영역 (제목 + 진행바 + 카운터)
    top: {
        marginBottom: scale(24),
    },
    title: {
        fontSize: fontScale(22),
        fontWeight: appFontWeight.extraBold,
        marginBottom: scale(12),
    },

    // 20칸 세그먼트 진행 바 행
    // 0/20 카운터
    counter: {
        marginTop: scale(4),
        fontSize: fontScale(12),
        color: appColors.textSecondary,
        textAlign: 'right',
    },

    // 가운데 캐릭터 + 카드 정렬
    center: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },

    // 👇 캐릭터 아래가 카드에 살짝 파묻히도록 음수 마진
    character: {
        width: scale(140),
        height: scale(140),
        marginBottom: -scale(40),
    },

    // 질문 카드
    card: {
        width: scale(320),
        backgroundColor: appColors.surface,
        borderRadius: scale(24),
        paddingVertical: scale(24),
        paddingHorizontal: scale(20),
        alignItems: 'center',
        elevation: 4,
    },

    questionIndex: {
        fontSize: fontScale(14),
        fontWeight: appFontWeight.bold,
        color: '#2563EB',
        marginBottom: scale(8),
    },
    questionText: {
        fontSize: fontScale(16),
        textAlign: 'center',
        color: appColors.text,
        lineHeight: fontScale(22),
        marginBottom: scale(24),
    },

    buttonRow: {
        flexDirection: 'row',
        gap: scale(16),
    },
    choiceCol: {
        alignItems: 'center',
        width: scale(130),
    },

    choiceButton: {
        width: scale(96),
        height: scale(96),
        borderRadius: scale(24),
        alignItems: 'center',
        justifyContent: 'center',
    },
    yesButton: {
        backgroundColor: appColors.successSoft,
    },
    noButton: {
        backgroundColor: appColors.dangerSoft,
    },

    choiceLabel: {
        fontSize: fontScale(40),
        fontWeight: appFontWeight.extraBold,
    },
    choiceLabelYes: {
        color: appColors.success,
    },
    choiceLabelNo: {
        color: appColors.dangerText,
    },
    choiceText: {
        marginTop: scale(8),
        fontSize: fontScale(12),
        color: appColors.textSubtle,
        textAlign: 'center',
        lineHeight: fontScale(16),
    },
});
