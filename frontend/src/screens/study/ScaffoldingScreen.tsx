import React, { useMemo, useRef, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Pressable,
    Image,
    ImageSourcePropType,
    ScrollView,
    TextInput,
    KeyboardAvoidingView,
    Platform,
    Alert,
    Modal,
} from 'react-native';
import { scale, fontScale } from '../../lib/layout';

type Props = {
    onBack: () => void;
    sources: ImageSourcePropType[];
    selectedIndex: number;
};

type Step = '1-1' | '1-2' | '1-3';

type BlankItem = {
    id: number;
    word: string;
    // ✅ 단어 뜻 모달에 들어갈 데이터(지금은 더미, 나중에 AI로 교체)
    hanja?: string;          // 예: 小選擧區制
    tags?: string[];         // 예: ['정치', '선거', '제도']
    meaningShort?: string;   // 한 줄 요약
    meaningLong?: string;    // 자세한 설명
};

type GradeState = 'idle' | 'correct' | 'wrong';

const BG = '#F6F7FB';
const CARD = '#FFFFFF';
const BORDER = '#E5E7EB';
const MUTED = '#6B7280';

const HIGHLIGHT_BG = '#C7CFFF';
const CORRECT_BG = '#C5FFBA';
const WRONG_BG = '#FF9CAD';

const PRIMARY = '#5E82FF';
const PRIMARY_DARK = '#3B5BFF';

export default function ScaffoldingScreen({ onBack }: Props) {
    /** ---------------------------
     * 더미 데이터 (나중에 OCR/AI로 교체)
     * --------------------------- */
    const title = '대표 결정 방식';

    const extractedText = useMemo(() => {
        return (
            '대표를 결정하는 방식은 크게 다수 대표제와 비례 대표제로 구분된다.\n\n' +
            '다수 대표제는 단순 다수 대표제와 절대다수 대표제로 나뉜다. 단순 다수 대표제는 여러 후보 중에서 다수 득표자를 당선자로 결정하는 방식으로, 주로 소선거구제와 결합한다. 대표 결정 방식의 대표성과 효율성 사이의 관계를 살펴보면 대표성은 비례 대표제에서 유리하고 효율성은 다수 대표제에서 유리한 측면이 있다.\n\n' +
            '비례 대표제는 정당 득표에 따른 의석 배분으로 대표성이 높지만, 정당 체계가 분열될 경우 정부의 안정성이 낮아질 수 있다.'
        );
    }, []);

    const blanks: BlankItem[] = useMemo(
        () => [
            {
                id: 1,
                word: '다수 대표제',
                hanja: '多數代表制',
                tags: ['정치', '선거', '제도'],
                meaningShort: '득표수가 가장 많은 후보를 당선자로 결정하는 방식',
                meaningLong:
                    '여러 후보 중 최다 득표자를 당선자로 결정하는 방식이다. 대표성과 효율성의 균형에서 효율성 측면이 상대적으로 강점이 될 수 있다.',
            },
            {
                id: 2,
                word: '비례 대표제',
                hanja: '比例代表制',
                tags: ['정치', '정당', '제도'],
                meaningShort: '정당 득표율에 비례해 의석을 배분하는 방식',
                meaningLong:
                    '정당 득표에 따라 의석을 배분하여 대표성이 높은 편이다. 다만 정당 체계가 분열될 경우 정부 안정성이 낮아질 수 있다.',
            },
            {
                id: 3,
                word: '단순 다수 대표제',
                hanja: '單純多數代表制',
                tags: ['선거', '제도'],
                meaningShort: '가장 많은 표를 얻은 후보가 당선',
                meaningLong:
                    '최다 득표자가 당선되는 방식으로, 소선거구제와 결합되는 경우가 많다.',
            },
            {
                id: 4,
                word: '소선거구제',
                hanja: '小選擧區制',
                tags: ['선거', '구역', '제도'],
                meaningShort: '한 선거구에서 1인을 선출하는 제도',
                meaningLong:
                    '한 선거구에서 한 명의 대표를 선출하는 방식이다. 지역 대표성과 선거의 단순성이 장점이 될 수 있다.',
            },
            {
                id: 5,
                word: '대표성',
                hanja: '代表性',
                tags: ['정치', '개념'],
                meaningShort: '유권자 의사가 결과에 반영되는 정도',
                meaningLong:
                    '표의 분포가 의석이나 대표 구성에 얼마나 반영되는지를 의미한다.',
            },
            {
                id: 6,
                word: '효율성',
                hanja: '效率性',
                tags: ['정치', '개념'],
                meaningShort: '정부 구성/운영의 안정성과 신속성',
                meaningLong:
                    '정부가 안정적으로 구성되고 의사결정이 신속하게 이뤄지는 성질을 의미한다.',
            },
        ],
        [],
    );

    /** ---------------------------
     * 상태: 1-1 / 1-2 / 1-3
     * --------------------------- */
    const [step, setStep] = useState<Step>('1-1');

    /** 단어 뜻 모달 */
    const [selectedWord, setSelectedWord] = useState<BlankItem | null>(null);
    const closeMeaning = () => setSelectedWord(null);

    /** 1-2 입력용 */
    const inputRefs = useRef<Record<number, TextInput | null>>({});
    const [activeBlankId, setActiveBlankId] = useState<number | null>(null);
    const [answers, setAnswers] = useState<Record<number, string>>({});

    /** 1-3 채점 결과 */
    const [graded, setGraded] = useState<Record<number, GradeState>>({});

    /** 상단 진행/점수 (20바 고정) */
    const totalBars = 20;

    const correctCount = useMemo(() => {
        return Object.values(graded).filter((g) => g === 'correct').length;
    }, [graded]);

    const barStates: GradeState[] = useMemo(() => {
        const arr: GradeState[] = Array.from({ length: totalBars }, () => 'idle');
        if (step !== '1-3') return arr;

        blanks.forEach((b, idx) => {
            if (idx >= totalBars) return;
            arr[idx] = graded[b.id] ?? 'idle';
        });
        return arr;
    }, [blanks, graded, step]);

    /** 토큰화(단어/공백/줄바꿈) */
    const tokens = useMemo(
        () => tokenizeWithKeywords(extractedText, blanks.map((b) => b.word)),
        [extractedText, blanks],
    );

    /** ---------------------------
     * 액션
     * --------------------------- */
    const onReselectWords = () => {
        Alert.alert('단어 재선정', '나중에 AI 재선정 API를 연결할 예정입니다.');
    };

    const onStartLearning = () => {
        setSelectedWord(null);
        setStep('1-2');
    };

    const onLongPressBlank = () => {
        Alert.alert('힌트', '추후 힌트 기능을 연결할 예정입니다.');
    };

    const onPressBlank = (blankId: number) => {
        setActiveBlankId(blankId);
        requestAnimationFrame(() => inputRefs.current[blankId]?.focus());
    };

    const onGrade = () => {
        const next: Record<number, GradeState> = {};
        blanks.forEach((b) => {
            const user = (answers[b.id] ?? '').trim();
            const isCorrect = normalize(user) === normalize(b.word);
            next[b.id] = isCorrect ? 'correct' : 'wrong';
        });
        setGraded(next);
        setStep('1-3');
    };

    /** ---------------------------
     * 상단 헤더: 한 줄에 제목 + Round 라벨 (이전 요구사항 유지)
     * --------------------------- */
    const roundLabel =
        step === '1-1'
            ? 'Round 1 - 단어 확인'
            : step === '1-2'
                ? 'Round 1 - 빈칸 학습'
                : 'Round 1 - 학습 채점';

    /** ---------------------------
     * 왼쪽 카드 UI (캡처 느낌: 조작설명 작은 박스 + 아이콘 버튼 + 큰 버튼)
     * --------------------------- */
    const HelpChip = () => {
        const descTop =
            step === '1-1'
                ? '단어를 터치하면'
                : step === '1-2'
                    ? '빈칸을 터치해'
                    : '단어를 터치하면';

        const descBottom =
            step === '1-1'
                ? '의미를 확인할 수 있어요!'
                : step === '1-2'
                    ? '답을 입력할 수 있어요!'
                    : '의미를 다시 확인할 수 있어요.';


        return (
            <View style={styles.helpBox}>
                {/* ➕ 추가: 상단(제목) 영역 */}
                <View style={styles.helpHeader}>
                    <Text style={styles.helpTitle}>{title}</Text>
                </View>

                {/* ➕ 추가: 하단(설명) 영역 */}
                <View style={styles.helpBody}>
                    <Text style={styles.helpDesc}>{descTop}</Text>
                    <Text style={[styles.helpDesc, styles.helpDescBottom]}>{descBottom}</Text>
                </View>
            </View>
        );

    };

    const leftCard = (
        <View style={styles.leftCard}>
            <HelpChip />

            {step === '1-1' && (
                <>
                    {/* 단어 재선정 버튼 (이미지) */}
                    <Pressable style={styles.imgBtnWrap} onPress={onReselectWords}>
                        <Image
                            source={require('../../../assets/study/re-selection-button.png')}
                            style={styles.imgBtn}
                            resizeMode="contain"
                        />
                    </Pressable>

                    {/* 학습 시작 버튼 (이미지) */}
                    <Pressable style={styles.imgBtnWrap} onPress={onStartLearning}>
                        <Image
                            source={require('../../../assets/study/start-study-button.png')}
                            style={styles.imgBtn}
                            resizeMode="contain"
                        />
                    </Pressable>
                </>
            )}


            {step === '1-2' && (
                <Pressable style={styles.bigPrimaryBtn} onPress={onGrade}>
                    <Text style={styles.bigPlay}>✓</Text>
                    <Text style={styles.bigPrimaryText}>채점하기</Text>
                </Pressable>
            )}

            {step === '1-3' && (
                <Pressable
                    style={styles.bigPrimaryBtn}
                    onPress={() => Alert.alert('Round 2', '2단계는 다음 작업에서 연결하겠습니다.')}
                >
                    <Text style={styles.bigPlay}>▶</Text>
                    <Text style={styles.bigPrimaryText}>Round 2</Text>
                </Pressable>
            )}
        </View>
    );

    /** ---------------------------
     * 오른쪽 카드(글만)
     * --------------------------- */
    const rightCard = (
        <View style={styles.rightCard}>
            <ScrollView contentContainerStyle={styles.textContainer}>
                <View style={styles.flow}>
                    {tokens.map((t, idx) => {
                        if (t.type === 'newline') return <View key={idx} style={styles.newline} />;
                        if (t.type === 'space') return <Text key={idx}>{t.value}</Text>;

                        if (t.type === 'text') {
                            return (
                                <Text key={idx} style={styles.bodyText}>
                                    {t.value}
                                </Text>
                            );
                        }

                        // keyword
                        const item = blanks.find((b) => b.word === t.value);
                        if (!item) {
                            return (
                                <Text key={idx} style={styles.bodyText}>
                                    {t.value}
                                </Text>
                            );
                        }

                        const grade = graded[item.id] ?? 'idle';
                        const userValue = answers[item.id] ?? '';

                        // 1-1: 단어 그대로 + 배경만
                        if (step === '1-1') {
                            return (
                                <Pressable
                                    key={idx}
                                    onPress={() => setSelectedWord(item)}
                                    style={[styles.wordPill, { backgroundColor: HIGHLIGHT_BG }]}
                                >
                                    <Text style={styles.wordText}>{item.word}</Text>
                                </Pressable>
                            );
                        }

                        // 1-2: 빈칸(직사각형) + 터치 입력 + 꾹누름 힌트
                        if (step === '1-2') {
                            const isActive = activeBlankId === item.id;
                            return (
                                <Pressable
                                    key={idx}
                                    onPress={() => onPressBlank(item.id)}
                                    onLongPress={onLongPressBlank}
                                    delayLongPress={450}
                                    style={[
                                        styles.blankBox,
                                        { backgroundColor: HIGHLIGHT_BG },
                                        isActive && styles.blankBoxActive,
                                    ]}
                                >
                                    <TextInput
                                        ref={(r) => {
                                            inputRefs.current[item.id] = r;
                                        }}
                                        value={userValue}
                                        onChangeText={(v) => setAnswers((prev) => ({ ...prev, [item.id]: v }))}
                                        placeholder=""
                                        style={styles.blankInput}
                                        blurOnSubmit
                                        onBlur={() => setActiveBlankId((prev) => (prev === item.id ? null : prev))}
                                    />
                                </Pressable>
                            );
                        }

                        // 1-3: 정답/오답 색 + 단어 뜻 확인 가능
                        const bg =
                            grade === 'correct' ? CORRECT_BG : grade === 'wrong' ? WRONG_BG : HIGHLIGHT_BG;

                        return (
                            <Pressable
                                key={idx}
                                onPress={() => setSelectedWord(item)}
                                style={[styles.wordPill, { backgroundColor: bg }]}
                            >
                                <Text style={styles.wordText}>{item.word}</Text>
                            </Pressable>
                        );
                    })}
                </View>
            </ScrollView>
        </View>
    );

    /** ---------------------------
     * 단어 뜻 모달(캡처처럼 중앙 팝업)
     * --------------------------- */
    const meaningModal = (
        <Modal visible={!!selectedWord} transparent animationType="fade" onRequestClose={closeMeaning}>
            <Pressable style={styles.modalOverlay} onPress={closeMeaning}>
                <Pressable style={styles.modalCard} onPress={() => { }}>
                    <Pressable style={styles.modalClose} onPress={closeMeaning} hitSlop={10}>
                        <Text style={styles.modalCloseText}>×</Text>
                    </Pressable>

                    <Text style={styles.modalWord}>{selectedWord?.word ?? ''}</Text>

                    {!!selectedWord?.hanja && (
                        <Text style={styles.modalHanja}>{selectedWord.hanja}</Text>
                    )}

                    {!!selectedWord?.tags?.length && (
                        <View style={styles.tagRow}>
                            {selectedWord.tags.map((tag) => (
                                <View key={tag} style={styles.tagChip}>
                                    <Text style={styles.tagText}>{tag}</Text>
                                </View>
                            ))}
                        </View>
                    )}

                    {!!selectedWord?.meaningShort && (
                        <Text style={styles.modalShort}>{selectedWord.meaningShort}</Text>
                    )}

                    <Text style={styles.modalLong}>
                        {selectedWord?.meaningLong ?? '의미 데이터를 불러오는 중입니다.'}
                    </Text>
                </Pressable>
            </Pressable>
        </Modal>
    );

    /** ---------------------------
     * 렌더
     * --------------------------- */
    return (
        <KeyboardAvoidingView
            style={styles.root}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
        >
            {/* 상단: 카드 아님(배경 위에 그냥) */}
            <View style={styles.header}>
                <Pressable style={styles.backBtn} onPress={onBack} hitSlop={10}>
                    <Image
                        source={require('../../../assets/shift.png')}
                        style={styles.backIcon}
                        resizeMode="contain"
                    />
                </Pressable>

                <View style={styles.headerTopRow}>
                    <View style={styles.titleRow}>
                        <Text style={styles.headerTitle}>{title}</Text>
                        <Text style={styles.headerSubtitle}>{roundLabel}</Text>
                    </View>

                    <Text style={styles.scoreText}>
                        {correctCount}/{totalBars}
                    </Text>
                </View>

                <View style={styles.barsRow}>
                    {Array.from({ length: totalBars }).map((_, i) => {
                        const s = barStates[i] ?? 'idle';
                        const bg =
                            s === 'correct' ? CORRECT_BG : s === 'wrong' ? WRONG_BG : '#E5E7EB';
                        return <View key={i} style={[styles.bar, { backgroundColor: bg }]} />;
                    })}
                </View>
            </View>

            {/* 본문: 왼쪽(설명/버튼) + 오른쪽(글) */}
            <View style={styles.content}>
                {leftCard}
                {rightCard}
            </View>

            {meaningModal}
        </KeyboardAvoidingView>
    );
}

/** ---------------------------
 * Helpers
 * --------------------------- */

function normalize(s: string) {
    return s.replace(/\s+/g, ' ').trim().toLowerCase();
}

type Token =
    | { type: 'text'; value: string }
    | { type: 'space'; value: string }
    | { type: 'newline'; value: '\n' }
    | { type: 'keyword'; value: string };

function tokenizeWithKeywords(text: string, keywords: string[]): Token[] {
    const sorted = [...keywords].sort((a, b) => b.length - a.length);
    const out: Token[] = [];
    let i = 0;

    while (i < text.length) {
        const ch = text[i];

        if (ch === '\n') {
            out.push({ type: 'newline', value: '\n' });
            i += 1;
            continue;
        }

        if (ch === ' ' || ch === '\t') {
            let j = i;
            while (j < text.length && (text[j] === ' ' || text[j] === '\t')) j++;
            out.push({ type: 'space', value: text.slice(i, j) });
            i = j;
            continue;
        }

        let matched: string | null = null;
        for (const kw of sorted) {
            if (text.startsWith(kw, i)) {
                matched = kw;
                break;
            }
        }
        if (matched) {
            out.push({ type: 'keyword', value: matched });
            i += matched.length;
            continue;
        }

        let j = i + 1;
        while (j < text.length) {
            if (text[j] === '\n' || text[j] === ' ' || text[j] === '\t') break;

            let willBreak = false;
            for (const kw of sorted) {
                if (text.startsWith(kw, j)) {
                    willBreak = true;
                    break;
                }
            }
            if (willBreak) break;

            j++;
        }
        out.push({ type: 'text', value: text.slice(i, j) });
        i = j;
    }

    return out;
}

/** ---------------------------
 * Styles
 * --------------------------- */
const styles = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: BG,
        paddingHorizontal: scale(18),
        paddingTop: scale(16),
        paddingBottom: scale(16),
        gap: scale(12),
    },

    /** Header (카드 아님) */
    header: {
        backgroundColor: 'transparent',
        paddingHorizontal: 0,
        paddingVertical: 0,
    },
    backBtn: {
        position: 'absolute',
        left: scale(0),
        top: scale(0),
        width: scale(36),
        height: scale(36),
        borderRadius: scale(18),
        backgroundColor: '#F3F4F6',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10,
    },
    backIcon: {
        width: scale(16),
        height: scale(16),
        transform: [{ rotate: '180deg' }],
    },

    headerTopRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: scale(10),
        paddingLeft: scale(44),
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(8),
        flex: 1,
    },
    headerTitle: {
        fontSize: fontScale(16),
        fontWeight: '900',
        color: '#111827',
    },
    headerSubtitle: {
        fontSize: fontScale(12),
        fontWeight: '800',
        color: '#111827',
        opacity: 0.75,
    },
    scoreText: {
        fontSize: fontScale(12),
        fontWeight: '900',
        color: '#111827',
        paddingTop: scale(2),
    },
    barsRow: {
        marginTop: scale(8),
        flexDirection: 'row',
        gap: scale(4),
    },
    bar: {
        flex: 1,
        height: scale(10),
        borderRadius: scale(3),
    },
    imgBtnWrap: {
        width: '100%',
        alignItems: 'center',
    },

    imgBtn: {
        width: '100%',
        height: scale(110), // 학습 시작 버튼 높이 느낌
    },

    /** Content */
    content: {
        flex: 1,
        flexDirection: 'row',
        gap: scale(12),
    },

    /** Left card */
    leftCard: {
        width: scale(170),
        backgroundColor: CARD,
        borderWidth: 1,
        borderColor: BORDER,
        borderRadius: scale(16),
        paddingHorizontal: scale(12),
        paddingVertical: scale(12),
        gap: scale(12),
    },
    /** Help box */
    // 🔧 수정
    helpBox: {
        borderRadius: scale(14),
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#D6DBFF',
        overflow: 'hidden',
    },

    // ➕ 추가: 상단(제목) 배경 영역
    helpHeader: {
        backgroundColor: '#C7CFFF',
        paddingHorizontal: scale(12),
        paddingVertical: scale(12),
        alignItems: 'center',
        justifyContent: 'center',
    },

    // ➕ 추가: 하단(설명) 배경 영역
    helpBody: {
        backgroundColor: '#FFFFFF',
        paddingHorizontal: scale(12),
        paddingVertical: scale(12),
        alignItems: 'center',
        justifyContent: 'center',
    },

    helpDescBottom: {
        marginTop: scale(2),
    },


    helpTitle: {
        fontSize: fontScale(12),
        fontWeight: '900',
        color: '#111827',
        marginBottom: scale(6),

        textAlign: 'center',
    },

    helpDesc: {
        fontSize: fontScale(10),
        fontWeight: '700',
        color: '#6B7280',
        lineHeight: fontScale(14),

        textAlign: 'center',
    },


    iconBtn: {
        alignItems: 'center',
        gap: scale(8),
        paddingVertical: scale(12),
    },
    iconCircle: {
        width: scale(56),
        height: scale(56),
        borderRadius: scale(28),
        backgroundColor: '#EEF2FF',
        borderWidth: 1,
        borderColor: '#C7D2FE',
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconGlyph: {
        fontSize: fontScale(26),
        fontWeight: '900',
        color: PRIMARY_DARK,
    },
    iconLabel: {
        fontSize: fontScale(12),
        fontWeight: '900',
        color: PRIMARY_DARK,
    },

    bigPrimaryBtn: {
        marginTop: scale(4),
        height: scale(110),
        borderRadius: scale(16),
        backgroundColor: PRIMARY,
        alignItems: 'center',
        justifyContent: 'center',
        gap: scale(10),
    },
    bigPlay: {
        fontSize: fontScale(32),
        fontWeight: '900',
        color: '#FFFFFF',
    },
    bigPrimaryText: {
        fontSize: fontScale(12),
        fontWeight: '900',
        color: '#FFFFFF',
    },

    /** Right card (글만) */
    rightCard: {
        flex: 1,
        backgroundColor: CARD,
        borderWidth: 1,
        borderColor: BORDER,
        borderRadius: scale(16),
        overflow: 'hidden',
    },
    textContainer: {
        paddingHorizontal: scale(14),
        paddingVertical: scale(14),
    },
    flow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'flex-start',
    },
    newline: {
        width: '100%',
        height: fontScale(14),
    },
    bodyText: {
        fontSize: fontScale(13),
        lineHeight: fontScale(20),
        fontWeight: '600',
        color: '#111827',
    },

    wordPill: {
        paddingHorizontal: scale(6),
        paddingVertical: scale(2),
        borderRadius: scale(6),
        marginVertical: scale(1),
    },
    wordText: {
        fontSize: fontScale(13),
        lineHeight: fontScale(20),
        fontWeight: '900',
        color: '#111827',
    },

    blankBox: {
        minWidth: scale(72),
        height: scale(24),
        borderRadius: scale(6),
        marginVertical: scale(2),
        justifyContent: 'center',
        paddingHorizontal: scale(6),
    },
    blankBoxActive: {
        borderWidth: 2,
        borderColor: PRIMARY,
    },
    blankInput: {
        padding: 0,
        margin: 0,
        fontSize: fontScale(13),
        fontWeight: '800',
        color: '#111827',
    },

    /** Meaning modal */
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.35)',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: scale(18),
    },
    modalCard: {
        width: '100%',
        maxWidth: scale(430),
        backgroundColor: '#FFFFFF',
        borderRadius: scale(16),
        paddingHorizontal: scale(18),
        paddingTop: scale(18),
        paddingBottom: scale(16),
    },
    modalClose: {
        position: 'absolute',
        right: scale(12),
        top: scale(10),
        width: scale(32),
        height: scale(32),
        borderRadius: scale(16),
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalCloseText: {
        fontSize: fontScale(22),
        fontWeight: '900',
        color: '#9CA3AF',
    },
    modalWord: {
        fontSize: fontScale(20),
        fontWeight: '900',
        color: '#111827',
        marginBottom: scale(8),
    },
    modalHanja: {
        fontSize: fontScale(12),
        fontWeight: '800',
        color: MUTED,
        marginBottom: scale(10),
    },
    tagRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: scale(8),
        marginBottom: scale(12),
    },
    tagChip: {
        paddingHorizontal: scale(10),
        paddingVertical: scale(6),
        borderRadius: scale(999),
        backgroundColor: '#F3F4F6',
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    tagText: {
        fontSize: fontScale(10),
        fontWeight: '800',
        color: '#111827',
    },
    modalShort: {
        fontSize: fontScale(12),
        fontWeight: '900',
        color: '#111827',
        marginBottom: scale(10),
    },
    modalLong: {
        fontSize: fontScale(12),
        fontWeight: '700',
        color: '#111827',
        lineHeight: fontScale(18),
    },
});
