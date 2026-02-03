import React, { useMemo, useRef, useState, useEffect } from 'react';
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
    ActivityIndicator,
} from 'react-native';
import { scale, fontScale } from '../../lib/layout';
import { saveTest } from '../../api/ocr';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = Constants.expoConfig?.extra?.apiBaseUrl || 'http://localhost:8000';

type Step = '1-1' | '1-2' | '1-3' | '2-1' | '2-2' | '2-3' | '3-1' | '3-2' | '3-3';
type GradeState = 'idle' | 'correct' | 'wrong';

export type BlankItem = {
    id: number;
    word: string;
    meaningLong?: string;
};

export type ScaffoldingPayload = {
    title: string;
    extractedText: string;
    blanks: BlankItem[];
};

type Props = {
    onBack: () => void;
    sources: ImageSourcePropType[];
    selectedIndex: number;

    payload: ScaffoldingPayload | null;
    loading: boolean;
    error: string | null;
    onRetry: () => void;
    onSave?: (answers: string[]) => Promise<void>;
    initialRound?: Step; // 초기 라운드 설정 (복습용)
    reviewQuizId?: number | null; // 복습할 quiz ID
};

const BG = '#F6F7FB';
const CARD = '#FFFFFF';
const BORDER = '#E5E7EB';
const MUTED = '#6B7280';

const HIGHLIGHT_BG = '#C7CFFF';
const CORRECT_BG = '#C5FFBA';
const WRONG_BG = '#FF9CAD';

export default function ScaffoldingScreen({
    onBack,
    sources,
    selectedIndex,
    payload,
    loading,
    error,
    onRetry,
    onSave,
    initialRound = '1-1', // 기본값은 1라운드
    reviewQuizId = null, // 복습 quiz ID
}: Props) {
    const [step, setStep] = useState<Step>(initialRound);

    // 복습 모드는 별도 로드 없이 initialRound만 사용
    // (실제 데이터는 이미 학습 완료된 상태이므로 payload 재사용)

    /** 로딩/에러 */
    if (loading) {
        return (
            <View style={[styles.root, styles.center]}>
                <ActivityIndicator size="large" color="#5E82FF" />
                <Text style={styles.loadingText}>OCR 결과를 불러오는 중입니다…</Text>
            </View>
        );
    }
    if (error || !payload) {
        return (
            <View style={[styles.root, styles.center, { paddingHorizontal: scale(18) }]}>
                <Text style={styles.errorTitle}>데이터를 불러오지 못했습니다.</Text>
                {!!error && <Text style={styles.errorDesc}>{error}</Text>}

                {!reviewQuizId && (
                    <Pressable style={styles.retryBtn} onPress={onRetry}>
                        <Text style={styles.retryBtnText}>다시 시도</Text>
                    </Pressable>
                )}

                <Pressable style={styles.backOnlyBtn} onPress={onBack}>
                    <Text style={styles.backOnlyBtnText}>뒤로가기</Text>
                </Pressable>
            </View>
        );
    }

    const title = payload.title ?? '';
    const extractedText = payload.extractedText ?? '';
    const blankDefs = payload.blanks ?? [];

    /** 뜻(지금은 meaningLong만) 모달 */
    const [selectedWord, setSelectedWord] = useState<BlankItem | null>(null);

    /** 키워드 목록 */
    const keywordList = useMemo(() => blankDefs.map((b) => b.word), [blankDefs]);
    const baseInfoByWord = useMemo(() => {
        const m = new Map<string, BlankItem>();
        blankDefs.forEach((b) => {
            if (!m.has(b.word)) m.set(b.word, b);
        });
        return m;
    }, [blankDefs]);

    /** ✅ 핵심: 중복 단어도 등장마다 instanceId를 부여해서 “각 칸이 독립 입력” 되게 함 */
    const tokens = useMemo(() => {
        const raw = tokenizeWithKeywords(extractedText, keywordList);
        let seq = 1;
        return raw.map((t) => (t.type === 'keyword' ? { ...t, instanceId: seq++ } : t));
    }, [extractedText, keywordList]);

    const keywordInstances = useMemo(() => {
        return tokens
            .filter((t): t is KeywordTokenWithId => t.type === 'keyword')
            .map((t) => ({
                instanceId: t.instanceId,
                word: t.value,
                base: baseInfoByWord.get(t.baseWord) ?? null,
            }));
    }, [tokens, baseInfoByWord]);

    /** 입력/채점 상태: instanceId 기준 */
    const inputRefs = useRef<Record<number, TextInput | null>>({});
    const [activeBlankId, setActiveBlankId] = useState<number | null>(null);
    const [answers, setAnswers] = useState<Record<number, string>>({});
    const [graded, setGraded] = useState<Record<number, GradeState>>({});
    /** 라운드별로 틀린 문제 추적 (누적) */
    const [wrongInstances, setWrongInstances] = useState<Set<number>>(new Set());

    const totalKeywordCount = keywordInstances.length;
    const totalBars = Math.max(20, totalKeywordCount);
    const round1Count = Math.min(5, totalKeywordCount);
    const round2Count = Math.min(12, totalKeywordCount);
    const round3Count = totalKeywordCount;

    const currentRound = useMemo(() => {
        if (step.startsWith('1-')) return 1;
        if (step.startsWith('2-')) return 2;
        if (step.startsWith('3-')) return 3;
        return 1;
    }, [step]);

    const activeWordCount = useMemo(() => {
        if (currentRound === 1) return round1Count;
        if (currentRound === 2) return round2Count;
        return round3Count;
    }, [currentRound]);

    const correctCount = useMemo(
        () => Object.values(graded).filter((g) => g === 'correct').length,
        [graded]
    );

    const barStates: GradeState[] = useMemo(() => {
        const arr: GradeState[] = Array.from({ length: totalBars }, () => 'idle');
        const isFinalStep = step.endsWith('-3');
        if (!isFinalStep) return arr;

        keywordInstances.slice(0, totalBars).forEach((ins, idx) => {
            arr[idx] = graded[ins.instanceId] ?? 'idle';
        });
        return arr;
    }, [keywordInstances, graded, step]);

    const roundLabel = useMemo(() => {
        const [round, substep] = step.split('-');
        const roundNum = round;
        const label = substep === '1' ? '단어 확인' : substep === '2' ? '빈칸 학습' : '학습 채점';
        return `Round ${roundNum} - ${label}`;
    }, [step]);

    const onReselectWords = () => {
        Alert.alert('단어 재선정', '추후 백엔드/AI 단어 재선정 API로 교체할 예정입니다.');
    };
    const onStartLearning = () => {
        setSelectedWord(null);
        if (step === '1-1') setStep('1-2');
        else if (step === '2-1') setStep('2-2');
        else if (step === '3-1') setStep('3-2');
    };
    const onLongPressBlank = () => {
        Alert.alert('힌트', '추후 기능입니다. (롱프레스 로직만 구현됨)');
    };
    const onPressBlank = (instanceId: number) => {
        setActiveBlankId(instanceId);
        requestAnimationFrame(() => inputRefs.current[instanceId]?.focus());
    };
    const onGrade = () => {
        const next: Record<number, GradeState> = { ...graded };
        const newWrong = new Set(wrongInstances);

        keywordInstances.slice(0, activeWordCount).forEach((ins) => {
            // 이미 이전 라운드에서 맞췄으면 그대로 유지
            if (next[ins.instanceId] === 'correct') return;

            const user = (answers[ins.instanceId] ?? '').trim();
            const isCorrect = normalize(user) === normalize(ins.word);

            if (isCorrect) {
                next[ins.instanceId] = 'correct';
                newWrong.delete(ins.instanceId);
            } else {
                next[ins.instanceId] = 'wrong';
                newWrong.add(ins.instanceId);
            }
        });

        setGraded(next);
        setWrongInstances(newWrong);

        if (step === '1-2') setStep('1-3');
        else if (step === '2-2') setStep('2-3');
        else if (step === '3-2') setStep('3-3');
    };

    /** 왼쪽 설명 카드(상/하 색 분리) */
    const HelpChip = () => {
        const substep = step.split('-')[1];

        if (substep === '2') {
            return (
                <>
                    <View style={styles.helpBox}>
                        <View style={[styles.helpHeader, { backgroundColor: HIGHLIGHT_BG }]}>
                            <Text style={styles.helpTitle}>빈칸 터치하기</Text>
                        </View>
                        <View style={styles.helpBody}>
                            <Text style={styles.helpDesc}>빈칸의 정답을</Text>
                            <Text style={[styles.helpDesc, styles.helpDescBottom]}>입력할 수 있어요!</Text>
                        </View>
                    </View>
                    <View style={styles.helpBox}>
                        <View style={[styles.helpHeader, { backgroundColor: HIGHLIGHT_BG }]}>
                            <Text style={styles.helpTitle}>빈칸 꾹 누르기</Text>
                        </View>
                        <View style={styles.helpBody}>
                            <Text style={styles.helpDesc}>H1을 누르면 첫글자,</Text>
                            <Text style={[styles.helpDesc, styles.helpDescBottom]}>H2를 누르면 마지막글자,</Text>
                            <Text style={[styles.helpDesc, styles.helpDescBottom]}>H3을 누르면 전체 단어의</Text>
                            <Text style={[styles.helpDesc, styles.helpDescBottom]}>초성이 제공돼요!</Text>
                        </View>
                    </View>
                </>
            );
        }

        const titleText = substep === '1' ? '단어 터치하기' : '결과 확인';
        const descTop = '단어를 터치하면';
        const descBottom = substep === '1' ? '의미를 확인할 수 있어요!' : '의미를 다시 확인할 수 있어요.';

        return (
            <View style={styles.helpBox}>
                <View style={styles.helpHeader}>
                    <Text style={styles.helpTitle}>{titleText}</Text>
                </View>
                <View style={styles.helpBody}>
                    <Text style={styles.helpDesc}>{descTop}</Text>
                    <Text style={[styles.helpDesc, styles.helpDescBottom]}>{descBottom}</Text>
                </View>
            </View>
        );
    };

    return (
        <KeyboardAvoidingView
            style={styles.root}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
        >
            {/* 상단(카드 아님) */}
            <View style={styles.header}>
                <Pressable style={styles.backBtn} onPress={onBack} hitSlop={10}>
                    <Image source={require('../../../assets/shift.png')} style={styles.backIcon} resizeMode="contain" />
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
                        const bg = s === 'correct' ? CORRECT_BG : s === 'wrong' ? WRONG_BG : '#E5E7EB';
                        return <View key={i} style={[styles.bar, { backgroundColor: bg }]} />;
                    })}
                </View>
            </View>

            <View style={styles.content}>
                {/* 왼쪽 카드 */}
                <View style={styles.leftCard}>
                    <HelpChip />

                    {(step === '1-1' || step === '2-1' || step === '3-1') && (
                        <View style={styles.buttonGroup}>
                            {step === '1-1' && (
                                <Pressable style={styles.imgBtnWrap} onPress={onReselectWords}>
                                    <Image
                                        source={require('../../../assets/study/re-selection-button.png')}
                                        style={styles.reselectImg}
                                        resizeMode="contain"
                                    />
                                </Pressable>
                            )}
                            <Pressable style={styles.imgBtnWrap} onPress={onStartLearning}>
                                <Image
                                    source={require('../../../assets/study/start-study-button.png')}
                                    style={styles.startImg}
                                    resizeMode="contain"
                                />
                            </Pressable>
                        </View>
                    )}

                    {(step === '1-2' || step === '2-2' || step === '3-2') && (
                        <View style={styles.buttonGroup}>
                            <Pressable style={styles.imgBtnWrap} onPress={onGrade}>
                                <Image
                                    source={require('../../../assets/study/grade-button.png')}
                                    style={styles.startImg}
                                    resizeMode="contain"
                                />
                            </Pressable>
                        </View>
                    )}

                    {step === '1-3' && (
                        <Pressable
                            style={styles.imgBtnWrap}
                            onPress={() => {
                                setAnswers({});
                                setStep('2-1');
                            }}
                        >
                            <Image
                                source={require('../../../assets/study/Round2.png')}
                                style={styles.startImg}
                                resizeMode="contain"
                            />
                        </Pressable>
                    )}

                    {step === '2-3' && (
                        <Pressable
                            style={styles.imgBtnWrap}
                            onPress={() => {
                                setAnswers({});
                                setStep('3-1');
                            }}
                        >
                            <Image
                                source={require('../../../assets/study/Round3.png')}
                                style={styles.startImg}
                                resizeMode="contain"
                            />
                        </Pressable>
                    )}

                    {step === '3-3' && (
                        <Pressable
                            style={styles.imgBtnWrap}
                            onPress={async () => {
                                if (onSave) {
                                    try {
                                        const answerList = keywordInstances.map((ins) =>
                                            answers[ins.instanceId] ?? ''
                                        );
                                        await onSave(answerList);
                                    } catch (e: any) {
                                        Alert.alert('저장 실패', e?.message ?? '알 수 없는 오류가 발생했습니다.');
                                    }
                                }
                                onBack();
                            }}
                        >
                            <Image
                                source={require('../../../assets/study/finish_study.png')}
                                style={styles.startImg}
                                resizeMode="contain"
                            />
                        </Pressable>
                    )}
                </View>

                {/* 오른쪽 카드(글만) */}
                <View style={styles.rightCard}>
                    <ScrollView contentContainerStyle={styles.textContainer}>
                        <View style={styles.flow}>
                            {tokens.map((t, idx) => {
                                if (t.type === 'newline') return <View key={idx} style={styles.newline} />;
                                if (t.type === 'space') return <Text key={idx}>{t.value}</Text>;
                                if (t.type === 'text') return <Text key={idx} style={styles.bodyText}>{t.value}</Text>;

                                const base = baseInfoByWord.get(t.baseWord) ?? null;
                                const instanceId = t.instanceId;
                                const grade = graded[instanceId] ?? 'idle';
                                const userValue = answers[instanceId] ?? '';
                                const substep = step.split('-')[1];
                                const instanceIdx = keywordInstances.findIndex(ki => ki.instanceId === instanceId);
                                const isInActiveRange = instanceIdx < activeWordCount;

                                if (substep === '1') {
                                    return (
                                        <Pressable
                                            key={idx}
                                            onPress={() => base && setSelectedWord(base)}
                                            style={[styles.wordPill, { backgroundColor: HIGHLIGHT_BG }]}
                                        >
                                            <Text style={styles.wordText}>{t.value}</Text>
                                        </Pressable>
                                    );
                                }

                                if (substep === '2') {
                                    if (!isInActiveRange) {
                                        return (
                                            <Pressable key={idx} style={[styles.wordPill, { backgroundColor: HIGHLIGHT_BG }]}>
                                                <Text style={styles.wordText}>{t.value}</Text>
                                            </Pressable>
                                        );
                                    }
                                    const isActive = activeBlankId === instanceId;
                                    return (
                                        <Pressable
                                            key={idx}
                                            onPress={() => onPressBlank(instanceId)}
                                            onLongPress={onLongPressBlank}
                                            delayLongPress={450}
                                            style={[styles.wordPill, { backgroundColor: HIGHLIGHT_BG }, isActive && styles.blankBoxActive]}
                                        >
                                            <View style={{ position: 'relative' }}>
                                                <Text style={[styles.wordText, { opacity: 0 }]}>{t.value}</Text>
                                                <TextInput
                                                    ref={(r) => { if (r) inputRefs.current[instanceId] = r; }}
                                                    value={userValue}
                                                    onChangeText={(v) => setAnswers((prev) => ({ ...prev, [instanceId]: v }))}
                                                    style={[styles.blankInput, { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }]}
                                                    blurOnSubmit
                                                    onBlur={() => setActiveBlankId((prev) => (prev === instanceId ? null : prev))}
                                                />
                                            </View>
                                        </Pressable>
                                    );
                                }

                                if (!isInActiveRange) {
                                    return (
                                        <Pressable key={idx} style={[styles.wordPill, { backgroundColor: HIGHLIGHT_BG }]}>
                                            <Text style={styles.wordText}>{t.value}</Text>
                                        </Pressable>
                                    );
                                }
                                const bg =
                                    grade === 'correct' ? CORRECT_BG : grade === 'wrong' ? WRONG_BG : HIGHLIGHT_BG;

                                return (
                                    <Pressable
                                        key={idx}
                                        onPress={() => base && setSelectedWord(base)}
                                        style={[styles.wordPill, { backgroundColor: bg }]}
                                    >
                                        <Text style={styles.wordText}>{t.value}</Text>
                                    </Pressable>
                                );
                            })}
                        </View>
                    </ScrollView>
                </View>
            </View>

            {/* 뜻 모달 */}
            <Modal visible={!!selectedWord} transparent animationType="fade" onRequestClose={() => setSelectedWord(null)}>
                <Pressable style={styles.modalOverlay} onPress={() => setSelectedWord(null)}>
                    <Pressable style={styles.modalCard} onPress={() => { }}>
                        <Pressable style={styles.modalClose} onPress={() => setSelectedWord(null)} hitSlop={10}>
                            <Text style={styles.modalCloseText}>×</Text>
                        </Pressable>

                        <Text style={styles.modalWord}>{selectedWord?.word ?? ''}</Text>
                        <Text style={styles.modalLong}>{selectedWord?.meaningLong ?? '추후 AI 의미 API로 교체 예정입니다.'}</Text>
                    </Pressable>
                </Pressable>
            </Modal>
        </KeyboardAvoidingView>
    );
}

/** Tokenize */
type Token =
    | { type: 'text'; value: string }
    | { type: 'space'; value: string }
    | { type: 'newline'; value: '\n' }
    | { type: 'keyword'; value: string; occ: number; baseWord: string };

type KeywordTokenWithId = { type: 'keyword'; value: string; occ: number; instanceId: number; baseWord: string };

/**
 * 키워드가 text의 pos 위치에서 시작하는지 확인.
 * OCR이 단어 안에 공백을 넣은 경우("단 어")도 매칭되도록, 텍스트 쪽 공백은 건너뛰고 비교.
 * 반환: 매칭되면 원문 기준 길이(공백 포함), 아니면 0.
 */
function matchKeywordAllowingSpaces(
    text: string,
    textLower: string,
    pos: number,
    keyword: string
): number {
    const kwLower = keyword.toLowerCase();
    let ti = pos;
    let ki = 0;
    while (ki < kwLower.length && ti < text.length) {
        if (text[ti] === ' ' || text[ti] === '\t') {
            ti++;
            continue;
        }
        if (textLower[ti] !== kwLower[ki]) return 0;
        ti++;
        ki++;
    }
    return ki === kwLower.length ? ti - pos : 0;
}

function tokenizeWithKeywords(text: string, keywords: string[]): Token[] {
    const normalized = [...keywords]
        .map((k) => (k && typeof k === 'string' ? k.trim() : ''))
        .filter(Boolean);
    const sorted = [...normalized].sort((a, b) => b.length - a.length);
    const textLower = text.toLowerCase();
    const out: Token[] = [];
    const occMap = new Map<string, number>();
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
        let matchedLen = 0;
        for (const kw of sorted) {
            if (!kw) continue;
            const len = matchKeywordAllowingSpaces(text, textLower, i, kw);
            if (len > 0) {
                matched = kw;
                matchedLen = len;
                break;
            }
        }

        if (matched !== null && matchedLen > 0) {
            const sliceFromText = text.slice(i, i + matchedLen);
            const prev = occMap.get(matched) ?? 0;
            const nextOcc = prev + 1;
            occMap.set(matched, nextOcc);
            out.push({ type: 'keyword', value: sliceFromText, occ: nextOcc, baseWord: matched });
            i += matchedLen;
            continue;
        }

        let j = i + 1;
        while (j < text.length) {
            if (text[j] === '\n' || text[j] === ' ' || text[j] === '\t') break;

            let willBreak = false;
            for (const kw of sorted) {
                if (kw && matchKeywordAllowingSpaces(text, textLower, j, kw) > 0) {
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

function normalize(s: string) {
    return s.replace(/\s+/g, ' ').trim().toLowerCase();
}

/** Styles */
const styles = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: BG,
        paddingHorizontal: scale(18),
        paddingTop: scale(16),
        paddingBottom: scale(16),
        gap: scale(12),
    },
    center: { justifyContent: 'center', alignItems: 'center' },

    loadingText: { color: MUTED, fontSize: fontScale(12), fontWeight: '700' },

    errorTitle: { color: '#111827', fontSize: fontScale(16), fontWeight: '900', marginBottom: scale(8) },
    errorDesc: { color: MUTED, fontSize: fontScale(12), fontWeight: '700', textAlign: 'center', marginBottom: scale(16) },
    retryBtn: {
        width: '100%',
        maxWidth: scale(320),
        height: scale(48),
        borderRadius: scale(14),
        backgroundColor: '#5E82FF',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: scale(10),
    },
    retryBtnText: { color: '#FFFFFF', fontSize: fontScale(12), fontWeight: '900' },
    backOnlyBtn: {
        width: '100%',
        maxWidth: scale(320),
        height: scale(48),
        borderRadius: scale(14),
        backgroundColor: '#E5E7EB',
        alignItems: 'center',
        justifyContent: 'center',
    },
    backOnlyBtnText: { color: '#111827', fontSize: fontScale(12), fontWeight: '900' },

    header: { backgroundColor: 'transparent' },
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
    backIcon: { width: scale(16), height: scale(16), transform: [{ rotate: '180deg' }] },

    headerTopRow: { flexDirection: 'row', alignItems: 'flex-start', gap: scale(10), paddingLeft: scale(44) },
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: scale(8), flex: 1 },
    headerTitle: { fontSize: fontScale(16), fontWeight: '900', color: '#111827' },
    headerSubtitle: { fontSize: fontScale(12), fontWeight: '800', color: '#111827', opacity: 0.75 },
    scoreText: { fontSize: fontScale(16), fontWeight: '900', color: '#9CA3AF', paddingTop: scale(2) },

    barsRow: { marginTop: scale(8), flexDirection: 'row', gap: scale(4) },
    bar: { flex: 1, height: scale(10), borderRadius: scale(3) },

    content: { flex: 1, flexDirection: 'row', gap: scale(12) },

    leftCard: {
        width: scale(170),
        backgroundColor: CARD,
        borderWidth: 1,
        borderColor: BORDER,
        borderRadius: scale(16),
        paddingHorizontal: scale(12),
        paddingVertical: scale(12),
        gap: scale(12),
        justifyContent: 'flex-start',
    },

    buttonGroup: {
        marginTop: 'auto',
        gap: scale(12),
    },

    helpBox: {
        borderRadius: scale(14),
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#D6DBFF',
        overflow: 'hidden',
    },
    helpHeader: {
        backgroundColor: '#EEF1FF',
        paddingHorizontal: scale(12),
        paddingVertical: scale(12),
        alignItems: 'center',
        justifyContent: 'center',
    },
    helpBody: {
        backgroundColor: '#FFFFFF',
        paddingHorizontal: scale(12),
        paddingVertical: scale(12),
        alignItems: 'center',
        justifyContent: 'center',
        borderTopWidth: 1,
        borderTopColor: '#D6DBFF',
    },
    helpTitle: { fontSize: fontScale(13), fontWeight: '900', color: '#111827', textAlign: 'center' },
    helpDesc: { fontSize: fontScale(11), fontWeight: '700', color: MUTED, lineHeight: fontScale(16), textAlign: 'center' },
    helpDescBottom: { marginTop: scale(2) },

    imgBtnWrap: { width: '100%', alignItems: 'center' },
    reselectImg: { width: '100%', height: scale(70) },
    startImg: { width: '100%', height: scale(110) },

    primaryRectBtn: {
        width: '100%',
        height: scale(52),
        borderRadius: scale(14),
        backgroundColor: '#5E82FF',
        alignItems: 'center',
        justifyContent: 'center',
    },
    primaryRectBtnText: { color: '#FFFFFF', fontSize: fontScale(12), fontWeight: '900' },

    rightCard: { flex: 1, backgroundColor: CARD, borderWidth: 1, borderColor: BORDER, borderRadius: scale(16), overflow: 'hidden' },
    textContainer: { paddingHorizontal: scale(14), paddingVertical: scale(14) },
    flow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start' },
    newline: { width: '100%', height: fontScale(14) },
    bodyText: { fontSize: fontScale(14), lineHeight: fontScale(22), fontWeight: '600', color: '#111827' },

    wordPill: { paddingHorizontal: 0, paddingVertical: 0, borderRadius: scale(4), marginVertical: 0 },
    wordText: { fontSize: fontScale(13), lineHeight: fontScale(20), fontWeight: '600', color: '#111827' },

    blankBox: { paddingHorizontal: 0, paddingVertical: 0, borderRadius: scale(4), marginVertical: 0, justifyContent: 'center' },
    blankBoxActive: { borderWidth: 2, borderColor: '#5E82FF' },
    blankInput: { padding: 0, margin: 0, fontSize: fontScale(13), fontWeight: '600', color: '#111827', lineHeight: fontScale(20) },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: scale(18) },
    modalCard: { width: '100%', maxWidth: scale(430), backgroundColor: '#FFFFFF', borderRadius: scale(16), paddingHorizontal: scale(18), paddingTop: scale(18), paddingBottom: scale(16) },
    modalClose: { position: 'absolute', right: scale(12), top: scale(10), width: scale(32), height: scale(32), borderRadius: scale(16), alignItems: 'center', justifyContent: 'center' },
    modalCloseText: { fontSize: fontScale(22), fontWeight: '900', color: '#9CA3AF' },
    modalWord: { fontSize: fontScale(20), fontWeight: '900', color: '#111827', marginBottom: scale(8) },
    modalLong: { fontSize: fontScale(12), fontWeight: '700', color: '#111827', lineHeight: fontScale(18) },
});
