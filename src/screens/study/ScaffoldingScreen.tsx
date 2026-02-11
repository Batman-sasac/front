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
    PanResponder,
} from 'react-native';
import { scale, fontScale } from '../../lib/layout';
import { saveTest } from '../../api/ocr';
import config from '../../lib/config';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = config.apiBaseUrl;

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
    user_answers?: string[]; // 이전 학습에서 작성한 답변 (복습용)
};

type Props = {
    onBack: () => void;
    onBackFromCompletion?: () => void; // 학습 완료 후 뒤로가기
    sources: ImageSourcePropType[];
    selectedIndex: number;

    payload: ScaffoldingPayload | null;
    loading: boolean;
    error: string | null;
    onRetry: () => void;
    onSave?: (answers: string[]) => Promise<void>;
    initialRound?: Step; // 초기 라운드 설정 (복습용)
    reviewQuizId?: number | null; // 복습용 quiz ID
    subjectName?: string; // 과목명
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
    onBackFromCompletion,
    sources,
    selectedIndex,
    payload,
    loading,
    error,
    onRetry,
    onSave,
    initialRound = '1-1', // 기본값 1라운드
    reviewQuizId = null, // 복습 quiz ID
}: Props) {
    const [step, setStep] = useState<Step>(initialRound);

    // 설명
    // 설명

    // 설명
    // 설명
    const [activeBlankId, setActiveBlankId] = useState<number | null>(null);
    const [answers, setAnswers] = useState<Record<number, string>>({}); // instanceId 기반
    const [graded, setGraded] = useState<Record<number, GradeState>>({}); // blankId 기반
    const [wrongInstances, setWrongInstances] = useState<Set<number>>(new Set());
    const [selectedBlanks, setSelectedBlanks] = useState<number[]>([]); // 사용자가 선택한 빈칸 instanceId
    const [selectionOrder, setSelectionOrder] = useState<Record<number, number>>({});
    const [popupVisible, setPopupVisible] = useState(false);
    const [popupTitle, setPopupTitle] = useState('');
    const [popupMessage, setPopupMessage] = useState('');
    const [popupOnConfirm, setPopupOnConfirm] = useState<(() => void) | null>(null);
    const [hintWord, setHintWord] = useState<number | null>(null);
    const [hintType, setHintType] = useState<'first' | 'last' | 'chosung' | null>(null); // 선택한 힌트 타입
    const [hintPosition, setHintPosition] = useState<{ x: number; y: number } | null>(null); // 힌트 모달 위치

    const [blankDefsState, setBlankDefsState] = useState<BlankItem[]>([]);
    const [pendingSelection, setPendingSelection] = useState<{ includeWord: string; excludeWords: string[] } | null>(null);
    const [dragConfirm, setDragConfirm] = useState<{ text: string; box: { x: number; y: number; w: number; h: number } } | null>(null);
    const [dragSelection, setDragSelection] = useState<{ text: string; box: { x: number; y: number; w: number; h: number } } | null>(null);

    const inputRefs = useRef<Record<number, TextInput | null>>({});
    const blankRefs = useRef<Record<number, View | null>>({}); // blankBox 위치 추적
    const selectionSeqRef = useRef(0);
    const reviewInitRef = useRef(false);
    const flowLayoutRef = useRef<{ x: number; y: number; width: number; height: number } | null>(null);
    const tokenLayoutsRef = useRef<Record<number, { x: number; y: number; width: number; height: number }>>({});
    const dragStartRef = useRef<{ x: number; y: number } | null>(null);
    const dragSelectionRef = useRef<{ text: string; box: { x: number; y: number; w: number; h: number } } | null>(null);

    // 설명
    const title = payload?.title ?? '';
    const extractedText = payload?.extractedText ?? '';

    useEffect(() => {
        setBlankDefsState(payload?.blanks ?? []);
    }, [payload?.blanks, payload?.extractedText]);

    const blankDefs = blankDefsState;

    /** 키워드 목록 */
    const keywordList = useMemo(() => blankDefs.map((b) => b.word), [blankDefs]);
    const baseInfoByWord = useMemo(() => {
        const m = new Map<string, BlankItem>();
        blankDefs.forEach((b) => {
            if (!m.has(b.word)) m.set(b.word, b);
        });
        return m;
    }, [blankDefs]);

    /** 중요: 중복 단어마다 instanceId를 부여해서 입력/채점을 분리 */
    const tokens = useMemo(() => {
        const raw = tokenizeWithKeywords(extractedText, keywordList);
        let seq = 1;
        return raw.map((t) => (t.type === 'keyword' ? { ...t, instanceId: seq++ } : t));
    }, [extractedText, keywordList]);

    const keywordInstances = useMemo(() => {
        const instances = tokens
            .filter((t): t is KeywordTokenWithId => t.type === 'keyword')
            .map((t, idx) => {
                // 설명
                const blankItem = blankDefs[idx] ?? null;
                return {
                    instanceId: t.instanceId,  // UI 렌더링용 식별자
                    blankId: blankItem?.id ?? idx,  // 서버 전송용(blank_index)
                    word: t.value,
                    base: baseInfoByWord.get(t.baseWord) ?? null,
                };
            });
        return instances;
    }, [tokens, baseInfoByWord, blankDefs]);

    useEffect(() => {
        if (!reviewQuizId || reviewInitRef.current) return;
        if (keywordInstances.length === 0) return;

        // 설명
        const userAnswers = payload?.user_answers || [];
        let selected: number[] = [];

        if (userAnswers.length > 0) {
            // 설명
            const answeredBlankIds = new Set(
                userAnswers.map((ans, idx) => (ans && ans.trim() !== '' ? idx : -1)).filter((id) => id >= 0)
            );
            selected = keywordInstances.filter((ki) => answeredBlankIds.has(ki.blankId)).map((ki) => ki.instanceId);
        } else {
            // 설명
            const limit = Math.min(20, keywordInstances.length);
            selected = keywordInstances.slice(0, limit).map((ki) => ki.instanceId);
        }

        setSelectedBlanks(selected);
        setSelectionOrder(() => {
            const next: Record<number, number> = {};
            selected.forEach((id, idx) => {
                next[id] = idx;
            });
            return next;
        });
        selectionSeqRef.current = selected.length;
        reviewInitRef.current = true;
    }, [reviewQuizId, keywordInstances, payload?.user_answers]);

    useEffect(() => {
        if (!pendingSelection) return;
        const includeNorm = normalize(pendingSelection.includeWord);
        const excludeNorms = pendingSelection.excludeWords.map((w) => normalize(w));
        const includeIds = keywordInstances
            .filter((ki) => normalize(ki.base?.word ?? ki.word) === includeNorm)
            .map((ki) => ki.instanceId);

        const filtered = selectedBlanks.filter((id) => {
            const inst = keywordInstances.find((ki) => ki.instanceId === id);
            if (!inst) return false;
            return !excludeNorms.includes(normalize(inst.base?.word ?? inst.word));
        });

        const merged = [...filtered];
        includeIds.forEach((id) => {
            if (!merged.includes(id)) merged.push(id);
        });

        setSelectedBlanks(merged);
        setSelectionOrder(() => {
            const next: Record<number, number> = {};
            merged.forEach((id, idx) => {
                next[id] = idx;
            });
            return next;
        });
        selectionSeqRef.current = merged.length;

        setAnswers((prev) => {
            const next: Record<number, string> = {};
            merged.forEach((id) => {
                if (prev[id] != null) next[id] = prev[id];
            });
            return next;
        });

        setPendingSelection(null);
    }, [pendingSelection, keywordInstances, selectedBlanks]);

    const orderedSelectedBlanks = useMemo(() => {
        return [...selectedBlanks].sort((a, b) => {
            const ao = selectionOrder[a] ?? 0;
            const bo = selectionOrder[b] ?? 0;
            return ao - bo;
        });
    }, [selectedBlanks, selectionOrder]);
    const selectedBlankSet = useMemo(() => new Set(orderedSelectedBlanks), [orderedSelectedBlanks]);
    const blankIdByInstance = useMemo(() => {
        const m = new Map<number, number>();
        keywordInstances.forEach((ki) => m.set(ki.instanceId, ki.blankId));
        return m;
    }, [keywordInstances]);

    // 설명
    const totalKeywordCount = Math.min(20, keywordInstances.length);
    const totalBars = 20;
    const round1Count = Math.min(5, totalKeywordCount);
    const round2Count = Math.min(12, totalKeywordCount);
    const round3Count = Math.min(20, totalKeywordCount);

    const currentRound = useMemo(() => {
        if (step.startsWith('1-')) return 1;
        if (step.startsWith('2-')) return 2;
        if (step.startsWith('3-')) return 3;
        return 1;
    }, [step]);

    // 설명
    const requiredSelectCount = useMemo(() => {
        if (currentRound === 1) return round1Count; // 1라운드 5개
        if (currentRound === 2) return 7; // 2라운드 7개 추가
        return 8; // 3라운드 8개 추가
    }, [currentRound, round1Count]);

    const correctCount = useMemo(() => {
        return orderedSelectedBlanks.reduce((acc, instanceId) => {
            const blankId = blankIdByInstance.get(instanceId);
            if (blankId == null) return acc;
            return graded[blankId] === 'correct' ? acc + 1 : acc;
        }, 0);
    }, [orderedSelectedBlanks, blankIdByInstance, graded]);

    const barStates: GradeState[] = useMemo(() => {
        const arr: GradeState[] = Array.from({ length: totalBars }, () => 'idle');
        const isFinalStep = step.endsWith('-3');
        if (!isFinalStep) return arr;

        orderedSelectedBlanks.slice(0, totalBars).forEach((instanceId, idx) => {
            const blankId = blankIdByInstance.get(instanceId);
            if (blankId == null) return;
            arr[idx] = graded[blankId] ?? 'idle';
        });
        return arr;
    }, [orderedSelectedBlanks, blankIdByInstance, graded, step]);

    const roundLabel = useMemo(() => {
        const [round, substep] = step.split('-');
        const roundNum = round;
        const label = substep === '1' ? '단어 확인' : substep === '2' ? '빈칸 학습' : '학습 채점';
        return `Round ${roundNum} - ${label}`;
    }, [step]);

    useEffect(() => {
        setDragConfirm(null);
    }, [step]);

    // 설명
    useEffect(() => {
        if (hintWord === null && hintType !== null) {
            // 설명
            setAnswers((prev) => {
                const newAnswers = { ...prev };
                Object.keys(newAnswers).forEach((keyStr) => {
                    const key = parseInt(keyStr, 10);
                    const val = newAnswers[key];
                    // 설명
                    if (val && (val.length === 1 || /^[ㄱ-ㅎ]+$/.test(val))) {
                        delete newAnswers[key];
                    }
                });
                return newAnswers;
            });
        }
    }, [hintWord]);


    const onReselectWords = () => {
        // 설명
        if (step === '1-2') setStep('1-1');
        else if (step === '2-2') setStep('2-1');
        else if (step === '3-2') setStep('3-1');
    };

    // 설명
    const onToggleBlankSelection = (instanceId: number) => {
        setSelectedBlanks((prev) => {
            const lockedCount = currentRound === 1 ? 0 : currentRound === 2 ? round1Count : round2Count;
            const requiredTotal = currentRound === 1 ? round1Count : currentRound === 2 ? round2Count : round3Count;
            const existsIndex = prev.indexOf(instanceId);

            if (existsIndex >= 0) {
                // 설명
                if (existsIndex < lockedCount) return prev;
                setSelectionOrder((orderPrev) => {
                    const nextOrder = { ...orderPrev };
                    delete nextOrder[instanceId];
                    return nextOrder;
                });
                return prev.filter((id) => id !== instanceId);
            }

            // 설명
            if (prev.length >= requiredTotal) return prev;

            setSelectionOrder((orderPrev) => {
                if (orderPrev[instanceId] != null) return orderPrev;
                return { ...orderPrev, [instanceId]: selectionSeqRef.current++ };
            });

            return [...prev, instanceId];
        });
    };

    const onStartLearning = () => {
        const requiredTotal = currentRound === 1 ? round1Count : currentRound === 2 ? round2Count : round3Count;
        if (orderedSelectedBlanks.length < requiredTotal) {
            setPopupTitle('알림');
            setPopupMessage(`${requiredTotal}개가 아직 설정되지 않았어요!`);
            setPopupOnConfirm(null);
            setPopupVisible(true);
            return;
        }

        if (step === '1-1') setStep('1-2');
        else if (step === '2-1') setStep('2-2');
        else if (step === '3-1') setStep('3-2');
    };

    const recordTokenLayout = (idx: number) => (event: any) => {
        const { x, y, width, height } = event.nativeEvent.layout;
        tokenLayoutsRef.current[idx] = { x, y, width, height };
    };

    const buildSelectedText = (indices: number[]) => {
        if (indices.length === 0) return '';
        const sorted = [...indices].sort((a, b) => a - b);
        const start = sorted[0];
        const end = sorted[sorted.length - 1];
        let text = '';
        for (let i = start; i <= end; i++) {
            const t = tokens[i];
            if (!t) continue;
            if (t.type === 'newline') {
                text += ' ';
                continue;
            }
            text += t.value;
        }
        return text.replace(/\s+/g, ' ').trim();
    };

    const getSelectionBox = (indices: number[]) => {
        if (indices.length === 0) return null;
        let minX = Number.POSITIVE_INFINITY;
        let minY = Number.POSITIVE_INFINITY;
        let maxX = Number.NEGATIVE_INFINITY;
        let maxY = Number.NEGATIVE_INFINITY;
        indices.forEach((idx) => {
            const box = tokenLayoutsRef.current[idx];
            if (!box) return;
            minX = Math.min(minX, box.x);
            minY = Math.min(minY, box.y);
            maxX = Math.max(maxX, box.x + box.width);
            maxY = Math.max(maxY, box.y + box.height);
        });
        if (!Number.isFinite(minX)) return null;
        return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
    };

    const applyCustomBlank = (rawText: string) => {
        const trimmed = rawText.replace(/\s+/g, ' ').trim();
        if (!trimmed) return;

        const norm = normalize(trimmed);
        const overlapWords = blankDefs
            .filter((b) => {
                const bn = normalize(b.word);
                return norm.includes(bn) || bn.includes(norm);
            })
            .map((b) => b.word);

        const excludeWords = overlapWords.filter((w) => normalize(w) !== norm);
        const filtered = blankDefs.filter((b) => !excludeWords.some((w) => normalize(w) === normalize(b.word)));

        const existing = filtered.find((b) => normalize(b.word) === norm);
        if (existing) {
            setBlankDefsState(filtered);
            setPendingSelection({ includeWord: existing.word, excludeWords });
            return;
        }

        const nextId = filtered.reduce((max, b) => Math.max(max, b.id), -1) + 1;
        const nextBlank: BlankItem = { id: nextId, word: trimmed, meaningLong: '' };
        setBlankDefsState([...filtered, nextBlank]);
        setPendingSelection({ includeWord: trimmed, excludeWords });
    };

    // TODO: 드래그로 빈칸 생성 기능은 임시 비활성화
    // const dragEnabled = step.endsWith('-1') && !reviewQuizId;
    const dragEnabled = false;
    const dragResponder = useMemo(() => {
        if (!dragEnabled) return null;
        return PanResponder.create({
            onStartShouldSetPanResponder: () => dragEnabled,
            onMoveShouldSetPanResponder: (_, g) => dragEnabled && (Math.abs(g.dx) + Math.abs(g.dy) > 4),
            onPanResponderGrant: (evt) => {
                const { locationX, locationY } = evt.nativeEvent;
                setDragConfirm(null);
                setDragSelection(null);
                dragSelectionRef.current = null;
                dragStartRef.current = { x: locationX, y: locationY };
            },
            onPanResponderMove: (evt) => {
                const start = dragStartRef.current;
                if (!start) return;
                const { locationX, locationY } = evt.nativeEvent;
                const left = Math.min(start.x, locationX);
                const right = Math.max(start.x, locationX);
                const top = Math.min(start.y, locationY);
                const bottom = Math.max(start.y, locationY);

                const indices = Object.keys(tokenLayoutsRef.current)
                    .map((k) => Number(k))
                    .filter((idx) => {
                        const box = tokenLayoutsRef.current[idx];
                        if (!box) return false;
                        const bLeft = box.x;
                        const bRight = box.x + box.width;
                        const bTop = box.y;
                        const bBottom = box.y + box.height;
                        return bLeft <= right && bRight >= left && bTop <= bottom && bBottom >= top;
                    });

                const text = buildSelectedText(indices);
                const box = getSelectionBox(indices);
                if (box && text) {
                    const selection = { text, box };
                    setDragSelection(selection);
                    dragSelectionRef.current = selection;
                } else {
                    setDragSelection(null);
                    dragSelectionRef.current = null;
                }
            },
            onPanResponderRelease: () => {
                const selection = dragSelectionRef.current;
                if (!selection || !selection.text || !selection.box) {
                    setDragSelection(null);
                    return;
                }
                setDragConfirm({ text: selection.text, box: selection.box });
                setDragSelection(null);
            },
            onPanResponderTerminate: () => {
                setDragSelection(null);
            },
        });
    }, [dragEnabled, tokens]);

    /** 로딩/에러 UI (모든 Hook 선언 이후) */
    if (loading) {
        return (
            <View style={[styles.root, styles.center]}>
                <ActivityIndicator size="large" color="#5E82FF" />
                <Text style={styles.loadingText}>OCR 결과를 불러오는 중입니다.</Text>
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


    const onLongPressBlank = (instanceId: number) => {
        setHintWord(instanceId);
        setHintType(null);

        // 설명
        const blankRef = blankRefs.current[instanceId];
        if (blankRef) {
            blankRef.measure((fx, fy, width, height, px, py) => {
                setHintPosition({
                    x: px + width / 2,
                    y: py - 80, // 빈칸 상단에 힌트 모달 표시
                });
            });
        }
    };
    const onPressBlank = (instanceId: number) => {
        setActiveBlankId(instanceId);
        setHintWord(null);
        setHintType(null);
        setHintPosition(null);
        requestAnimationFrame(() => inputRefs.current[instanceId]?.focus());
    };

    const handlePopupConfirm = () => {
        setPopupVisible(false);
        const cb = popupOnConfirm;
        setPopupOnConfirm(null);
        if (cb) cb();
    };

    // 한글 초성 추출 함수 (유니코드 계산)
    const getChosung = (char: string): string => {
        const code = char.charCodeAt(0);

        // 한글 범위: AC00(가) ~ D7A3(힣)
        if (code < 0xac00 || code > 0xd7a3) {
            return ''; // 한글이 아니면 빈 문자열 반환
        }

        // 초성 목록 (19개)
        const chosungList = ['ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];

        // 한글 오프셋 = 초성 * 588 + 중성 * 28 + 종성
        const temp = code - 0xac00;
        const chosungIndex = Math.floor(temp / 588);

        return chosungList[chosungIndex] || '';
    };

    // 설명
    const getFirstLetter = (word: string): string => word[0] || '';
    const getLastLetter = (word: string): string => word[word.length - 1] || '';
    const getChosungText = (word: string): string => {
        let result = '';
        for (const char of word) {
            const chosung = getChosung(char);
            if (chosung) result += chosung;
        }
        return result;
    };

    const applyHint = (type: 'first' | 'last' | 'chosung', word: string, instanceId: number) => {
        let hint = '';
        if (type === 'first') {
            hint = getFirstLetter(word); // 첫 글자
        } else if (type === 'last') {
            hint = getLastLetter(word); // 마지막 글자
        } else {
            hint = getChosungText(word); // 초성
        }

        setAnswers(prev => ({ ...prev, [instanceId]: hint }));
        setHintType(type); // 선택한 타입만 표시
    };

    const onGrade = () => {
        const next: Record<number, GradeState> = { ...graded };
        const newWrong = new Set(wrongInstances);

        // 설명
        orderedSelectedBlanks.forEach((instanceId) => {
            const ins = keywordInstances.find(ki => ki.instanceId === instanceId);
            if (!ins) return;

            const user = (answers[ins.instanceId] ?? '').trim();
            const isCorrect = normalize(user) === normalize(ins.word);

            if (isCorrect) {
                next[ins.blankId] = 'correct';
                newWrong.delete(ins.blankId);
            } else {
                next[ins.blankId] = 'wrong';
                newWrong.add(ins.blankId);
            }
        });

        setGraded(next);
        setWrongInstances(newWrong);

        if (step === '1-2') setStep('1-3');
        else if (step === '2-2') setStep('2-3');
        else if (step === '3-2') setStep('3-3');
    };

    /** 왼쪽 설명 카드 */
    const HelpChip = () => {
        const substep = step.split('-')[1];

        if (substep === '2') {
            return (
                <>
                    <View style={styles.helpBox}>
                        <View style={[styles.helpHeader, { backgroundColor: HIGHLIGHT_BG }]}>
                            <Text style={styles.helpTitle}>빈칸 채우기</Text>
                        </View>
                        <View style={styles.helpBody}>
                            <Text style={styles.helpDesc}>빈칸에 정답을</Text>
                            <Text style={[styles.helpDesc, styles.helpDescBottom]}>입력해 보세요</Text>
                        </View>
                    </View>
                    <View style={styles.helpBox}>
                        <View style={[styles.helpHeader, { backgroundColor: HIGHLIGHT_BG }]}>
                            <Text style={styles.helpTitle}>힌트 버튼 누르기</Text>
                        </View>
                        <View style={styles.helpBody}>
                            <Text style={styles.helpDesc}>H1을 누르면 첫 글자</Text>
                            <Text style={[styles.helpDesc, styles.helpDescBottom]}>H2를 누르면 마지막 글자</Text>
                            <Text style={[styles.helpDesc, styles.helpDescBottom]}>H3을 누르면 전체 단어 초성</Text>
                            <Text style={[styles.helpDesc, styles.helpDescBottom]}>힌트가 제공됩니다!</Text>
                        </View>
                    </View>
                </>
            );
        }

        // 설명
        if (substep === '1') {
            let titleText = '';
            let descText = '';

            if (currentRound === 1) {
                titleText = '단어 고르기';
                descText = `${requiredSelectCount}개의 단어를 골라서\n학습할 빈칸을 만들어 보세요`;
            } else if (currentRound === 2) {
                titleText = '단어 고르기';
                descText = `${requiredSelectCount}개의 단어를\n추가로 선택해 주세요`;
            } else {
                titleText = '단어 고르기';
                descText = `${requiredSelectCount}개의 단어를\n추가로 선택해 주세요`;
            }

            return (
                <View style={styles.helpBox}>
                    <View style={styles.helpHeader}>
                        <Text style={styles.helpTitle}>{titleText}</Text>
                    </View>
                    <View style={styles.helpBody}>
                        <Text style={[styles.helpDesc, { textAlign: 'center' }]}>{descText}</Text>
                    </View>
                </View>
            );
        }

        // substep === '3' (결과 확인)
        const titleText = '결과 확인';
        const descTop = '단어를 다시 보고';
        const descBottom = '의미를 확인해 보세요';

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
            {/* 설명 */}
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
                {/* 설명 */}
                <View style={styles.leftCard}>
                    <HelpChip />

                    {(step === '1-1' || step === '2-1' || step === '3-1') && (
                        <View style={styles.buttonGroup}>
                            {/* 설명 */}
                            {!reviewQuizId && (step === '1-1' || step === '2-1' || step === '3-1') && (
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
                        <View style={styles.buttonGroup}>
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
                        </View>
                    )}

                    {step === '2-3' && (
                        <View style={styles.buttonGroup}>
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
                        </View>
                    )}

                    {step === '3-3' && (
                        <View style={styles.buttonGroup}>
                            <Pressable
                                style={styles.imgBtnWrap}
                                onPress={async () => {
                                    if (onSave) {
                                        try {
                                            // blankDefs(blank_index) 순서대로 답변 정렬
                                            const answerList = blankDefs.map((blank) => {
                                                const instance = keywordInstances.find((ki) => ki.blankId === blank.id);
                                                return instance ? (answers[instance.instanceId] ?? '') : '';
                                            });
                                            await onSave(answerList);
                                        } catch (e: any) {
                                            Alert.alert('저장 실패', e?.message ?? '알 수 없는 오류가 발생했습니다.');
                                            return;
                                        }
                                    }
                                    const earnedXp = correctCount * 2;
                                    setPopupTitle('축하합니다');
                                    setPopupMessage(`학습을 완료해서 ${earnedXp}xp를 획득했어요`);
                                    setPopupOnConfirm(() => () => {
                                        if (onBackFromCompletion) {
                                            onBackFromCompletion();
                                        } else {
                                            onBack();
                                        }
                                    });
                                    setPopupVisible(true);
                                }}
                            >
                                <Image
                                    source={require('../../../assets/study/finish_study.png')}
                                    style={styles.startImg}
                                    resizeMode="contain"
                                />
                            </Pressable>
                        </View>
                    )}
                </View>

                {/* 설명 */}
                <View style={styles.rightCard}>
                    <ScrollView contentContainerStyle={styles.textContainer}>
                        <View
                            style={styles.flow}
                            onLayout={(e) => {
                                flowLayoutRef.current = e.nativeEvent.layout;
                            }}
                            {...(dragResponder ? dragResponder.panHandlers : {})}
                        >
                            {tokens.map((t, idx) => {
                                if (t.type === 'newline') return <View key={idx} style={styles.newline} />;
                                if (t.type === 'space') return <Text key={idx} onLayout={recordTokenLayout(idx)}>{t.value}</Text>;
                                if (t.type === 'text') return <Text key={idx} style={styles.bodyText} onLayout={recordTokenLayout(idx)}>{t.value}</Text>;

                                const instanceId = t.instanceId;
                                const instanceInfo = keywordInstances.find(ki => ki.instanceId === instanceId);
                                const grade = instanceInfo ? (graded[instanceInfo.blankId] ?? 'idle') : 'idle';
                                const userValue = answers[instanceId] ?? '';
                                const substep = step.split('-')[1];
                                const isSelected = selectedBlankSet.has(instanceId); // 사용자가 선택한 빈칸인지

                                if (substep === '1') {
                                    // 설명
                                    if (isSelected) {
                                        // 설명
                                        return (
                                            <Pressable
                                                key={idx}
                                                onPress={() => onToggleBlankSelection(instanceId)}
                                                style={[styles.wordPill, { backgroundColor: HIGHLIGHT_BG }]}
                                                onLayout={recordTokenLayout(idx)}
                                            >
                                                <View style={{ position: 'relative' }}>
                                                    <Text style={[styles.wordText, { opacity: 0 }]}>{t.value}</Text>
                                                </View>
                                            </Pressable>
                                        );
                                    } else {
                                        // 설명
                                        return (
                                            <Pressable
                                                key={idx}
                                                onPress={() => onToggleBlankSelection(instanceId)}
                                                style={[styles.wordPill, { backgroundColor: HIGHLIGHT_BG }]}
                                                onLayout={recordTokenLayout(idx)}
                                            >
                                                <Text style={styles.wordText}>{t.value}</Text>
                                            </Pressable>
                                        );
                                    }
                                }

                                if (substep === '2') {
                                    // 설명
                                    if (!isSelected) {
                                        return (
                                            <Pressable key={idx} style={[styles.wordPill, { backgroundColor: HIGHLIGHT_BG }]} onLayout={recordTokenLayout(idx)}>
                                                <Text style={styles.wordText}>{t.value}</Text>
                                            </Pressable>
                                        );
                                    }
                                    const isActive = activeBlankId === instanceId;
                                    const currentHintType = hintWord === instanceId ? hintType : null;
                                    const textAlign = currentHintType === 'last' ? 'right' : 'left';
                                    return (
                                        <View
                                            key={idx}
                                            ref={(r) => { if (r) blankRefs.current[instanceId] = r; }}
                                        >
                                            <Pressable
                                                onPress={() => onPressBlank(instanceId)}
                                                onLongPress={() => onLongPressBlank(instanceId)}
                                                delayLongPress={450}
                                                style={[styles.wordPill, styles.blankBoxBase, { backgroundColor: HIGHLIGHT_BG }, isActive && styles.blankBoxActive]}
                                                onLayout={recordTokenLayout(idx)}
                                            >
                                                <View style={{ position: 'relative' }}>
                                                    <Text style={[styles.wordText, { opacity: 0 }]}>{t.value}</Text>
                                                    <TextInput
                                                        ref={(r) => { if (r) inputRefs.current[instanceId] = r; }}
                                                        value={userValue}
                                                        onChangeText={(v) => setAnswers((prev) => ({ ...prev, [instanceId]: v }))}
                                                        style={[styles.blankInput, { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, textAlign }]}
                                                        blurOnSubmit
                                                        onBlur={() => setActiveBlankId((prev) => (prev === instanceId ? null : prev))}
                                                        maxFontSizeMultiplier={1.0}
                                                    />
                                                </View>
                                            </Pressable>
                                        </View>
                                    );
                                }

                                // 설명
                                // 설명
                                if (!isSelected) {
                                    return (
                                        <Pressable key={idx} style={[styles.wordPill, { backgroundColor: HIGHLIGHT_BG }]} onLayout={recordTokenLayout(idx)}>
                                            <Text style={styles.wordText}>{t.value}</Text>
                                        </Pressable>
                                    );
                                }
                                const bg =
                                    grade === 'correct' ? CORRECT_BG : grade === 'wrong' ? WRONG_BG : HIGHLIGHT_BG;

                                return (
                                    <View
                                        key={idx}
                                        style={[styles.wordPill, { backgroundColor: bg }]}
                                        onLayout={recordTokenLayout(idx)}
                                    >
                                        <Text style={styles.wordText}>{t.value}</Text>
                                    </View>
                                );
                            })}
                        </View>
                    </ScrollView>
                    {dragSelection?.box && flowLayoutRef.current && dragEnabled && (
                        <View
                            style={[
                                styles.dragSelectionBox,
                                {
                                    left: flowLayoutRef.current.x + dragSelection.box.x,
                                    top: flowLayoutRef.current.y + dragSelection.box.y,
                                    width: dragSelection.box.w,
                                    height: dragSelection.box.h,
                                },
                            ]}
                            pointerEvents="none"
                        />
                    )}
                    {dragConfirm?.box && flowLayoutRef.current && dragEnabled && (
                        <Pressable
                            style={[
                                styles.dragConfirmBtn,
                                {
                                    left: flowLayoutRef.current.x + dragConfirm.box.x + dragConfirm.box.w / 2 - scale(52),
                                    top: Math.max(0, flowLayoutRef.current.y + dragConfirm.box.y - scale(34)),
                                },
                            ]}
                            onPress={() => {
                                applyCustomBlank(dragConfirm.text);
                                setDragConfirm(null);
                            }}
                        >
                            <Text style={styles.dragConfirmText}>빈칸 만들기</Text>
                        </Pressable>
                    )}
                </View>
            </View>

            {/* 설명 */}
            {hintWord !== null && (
                (() => {
                    const hintInstance = keywordInstances.find(ki => ki.instanceId === hintWord);  // instanceId濡?李얠쓬
                    return (
                        <Modal visible={true} transparent onRequestClose={() => {
                            setHintWord(null);
                            setHintType(null);
                            setHintPosition(null);
                        }}>
                            <Pressable
                                style={styles.hintModalOverlay}
                                onPress={() => {
                                    setHintWord(null);
                                    setHintType(null);
                                    setHintPosition(null);
                                }}
                            >
                                {/* 설명 */}
                                <View
                                    style={[
                                        styles.hintBalloonContainer,
                                        hintPosition && {
                                            position: 'absolute' as const,
                                            top: hintPosition.y,
                                            left: hintPosition.x,
                                            transform: [{ translateX: -60 }],
                                        },
                                    ]}
                                >
                                    <View style={styles.hintBalloon}>
                                        <View style={styles.hintContent}>
                                            <Pressable
                                                style={[styles.hintButton, hintType === 'first' && styles.hintButtonActive, hintType !== 'first' && styles.hintButtonInactive]}
                                                onPress={() => hintInstance && applyHint('first', hintInstance.word, hintWord)}
                                            >
                                                <Text style={[styles.hintButtonText, hintType === 'first' && styles.hintButtonTextActive, hintType !== 'first' && styles.hintButtonTextInactive]}>H1</Text>
                                            </Pressable>
                                            <Pressable
                                                style={[styles.hintButton, hintType === 'last' && styles.hintButtonActive, hintType !== 'last' && styles.hintButtonInactive]}
                                                onPress={() => hintInstance && applyHint('last', hintInstance.word, hintWord)}
                                            >
                                                <Text style={[styles.hintButtonText, hintType === 'last' && styles.hintButtonTextActive, hintType !== 'last' && styles.hintButtonTextInactive]}>H2</Text>
                                            </Pressable>
                                            <Pressable
                                                style={[styles.hintButton, hintType === 'chosung' && styles.hintButtonActive, hintType !== 'chosung' && styles.hintButtonInactive]}
                                                onPress={() => hintInstance && applyHint('chosung', hintInstance.word, hintWord)}
                                            >
                                                <Text style={[styles.hintButtonText, hintType === 'chosung' && styles.hintButtonTextActive, hintType !== 'chosung' && styles.hintButtonTextInactive]}>H3</Text>
                                            </Pressable>
                                        </View>
                                        {/* 설명 */}
                                        <View style={styles.hintArrow} />
                                    </View>
                                </View>
                            </Pressable>
                        </Modal>
                    );
                })()
            )}
            {/* 설명 */}
            {popupVisible && (
                <View style={styles.popupOverlay}>
                    <Pressable style={styles.popupBackdrop} onPress={handlePopupConfirm}>
                        <View style={styles.popupCard}>
                            <Text style={styles.popupTitle}>{popupTitle}</Text>
                            <Text style={styles.popupMessage}>{popupMessage}</Text>
                            <Pressable style={styles.popupConfirmBtn} onPress={handlePopupConfirm}>
                                <Text style={styles.popupConfirmText}>확인</Text>
                            </Pressable>
                        </View>
                    </Pressable>
                </View>
            )}
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
 * keyword가 text의 pos 위치에서 시작하는지 확인.
 * OCR 단어 중간에 공백이 끼는 경우("연 구")를 매칭하기 위해 텍스트의 공백을 건너뛰며 비교.
 * 반환: 매칭 시 원문 기준 길이(공백 포함), 아니면 0.
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
        if (kwLower[ki] === ' ' || kwLower[ki] === '\t') {
            ki++;
            continue;
        }
        if (text[ti] === ' ' || text[ti] === '\t') {
            ti++;
            continue;
        }
        if (textLower[ti] !== kwLower[ki]) return 0;
        ti++;
        ki++;
    }
    while (ki < kwLower.length && (kwLower[ki] === ' ' || kwLower[ki] === '\t')) {
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

    rightCard: { flex: 1, backgroundColor: CARD, borderWidth: 1, borderColor: BORDER, borderRadius: scale(16), overflow: 'hidden', position: 'relative' },
    textContainer: { paddingHorizontal: scale(14), paddingVertical: scale(14) },
    flow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start' },
    newline: { width: '100%', height: fontScale(14) },
    bodyText: { fontSize: fontScale(14), lineHeight: fontScale(22), fontWeight: '600', color: '#111827' },

    wordPill: { paddingHorizontal: 0, paddingVertical: 0, borderRadius: scale(4), marginVertical: 0 },
    wordText: { fontSize: fontScale(13), lineHeight: fontScale(20), fontWeight: '600', color: '#111827' },

    blankBox: { paddingHorizontal: 0, paddingVertical: 0, borderRadius: scale(4), marginVertical: 0, justifyContent: 'center' },
    blankBoxBase: { borderWidth: 2, borderColor: 'transparent' },
    blankBoxActive: { borderColor: '#5E82FF' },
    blankInput: {
        padding: 0,
        margin: 0,
        fontSize: fontScale(13),
        fontWeight: '600',
        color: '#111827',
        lineHeight: fontScale(20),
        borderWidth: 0,
        ...(Platform.OS === 'web' ? ({ outlineStyle: 'none', outlineWidth: 0 } as any) : {}),
    },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: scale(18) },
    modalCard: { width: '100%', maxWidth: scale(430), backgroundColor: '#FFFFFF', borderRadius: scale(16), paddingHorizontal: scale(18), paddingTop: scale(18), paddingBottom: scale(16) },
    modalClose: { position: 'absolute', right: scale(12), top: scale(10), width: scale(32), height: scale(32), borderRadius: scale(16), alignItems: 'center', justifyContent: 'center' },
    modalCloseText: { fontSize: fontScale(22), fontWeight: '900', color: '#9CA3AF' },
    modalWord: { fontSize: fontScale(20), fontWeight: '900', color: '#111827', marginBottom: scale(8) },
    modalLong: { fontSize: fontScale(12), fontWeight: '700', color: '#111827', lineHeight: fontScale(18) },

    hintModalOverlay: { flex: 1, backgroundColor: 'transparent', paddingHorizontal: scale(18) },

    // 설명
    popupOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
    },
    popupBackdrop: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(15, 23, 42, 0.25)',
        paddingHorizontal: scale(18),
    },
    popupCard: {
        width: scale(300),
        borderRadius: scale(20),
        backgroundColor: '#FFFFFF',
        paddingVertical: scale(22),
        paddingHorizontal: scale(18),
        alignItems: 'center',
        elevation: 6,
    },
    popupTitle: {
        fontSize: fontScale(18),
        fontWeight: '800',
        color: '#111827',
        marginBottom: scale(10),
        textAlign: 'center',
    },
    popupMessage: {
        fontSize: fontScale(14),
        color: '#111827',
        marginBottom: scale(16),
        textAlign: 'center',
        lineHeight: fontScale(20),
    },
    popupConfirmBtn: {
        width: '100%',
        height: scale(44),
        borderRadius: scale(12),
        backgroundColor: '#5E82FF',
        alignItems: 'center',
        justifyContent: 'center',
    },
    popupConfirmText: {
        color: '#FFFFFF',
        fontSize: fontScale(14),
        fontWeight: '800',
    },
    hintBalloonContainer: { alignItems: 'center', justifyContent: 'center' },
    hintBalloon: { backgroundColor: '#FFFFFF', borderRadius: scale(12), paddingHorizontal: scale(12), paddingVertical: scale(8), shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
    hintContent: { flexDirection: 'row', gap: scale(8), justifyContent: 'center' },
    hintButton: { paddingHorizontal: scale(12), paddingVertical: scale(6), borderRadius: scale(6), minWidth: scale(48), alignItems: 'center', justifyContent: 'center' },
    hintButtonActive: { backgroundColor: '#5E82FF' },
    hintButtonInactive: { backgroundColor: '#E5E7EB' },
    hintButtonText: { fontSize: fontScale(13), fontWeight: '700' },
    hintButtonTextActive: { color: '#FFFFFF' },
    hintButtonTextInactive: { color: '#9CA3AF' },
    hintArrow: { width: 0, height: 0, borderLeftWidth: scale(8), borderRightWidth: scale(8), borderBottomWidth: scale(8), borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: '#FFFFFF', alignSelf: 'center', marginTop: scale(0) } as any,
    dragSelectionBox: {
        position: 'absolute',
        borderWidth: 1,
        borderColor: '#5E82FF',
        backgroundColor: 'rgba(94,130,255,0.15)',
        borderRadius: scale(4),
    },
    dragConfirmBtn: {
        position: 'absolute',
        paddingHorizontal: scale(10),
        paddingVertical: scale(6),
        backgroundColor: '#111827',
        borderRadius: scale(10),
        zIndex: 5,
    },
    dragConfirmText: {
        color: '#FFFFFF',
        fontSize: fontScale(11),
        fontWeight: '800',
    },
});
