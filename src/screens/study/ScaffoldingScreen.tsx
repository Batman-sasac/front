import React, { useMemo, useRef, useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Pressable,
    Image,
    ScrollView,
    TextInput,
    Platform,
    Alert,
    Modal,
    ActivityIndicator,
    PanResponder,
    Keyboard,
} from 'react-native';
import { scale, fontScale } from '../../lib/layout';
import type {
    LayoutBlock,
    OcrTableBlock,
    PageItem,
    ScaffoldingPayload,
} from '../../api/ocr';
import { StudySource } from '../input_data/studySource';
import {
    buildKeywordInstances,
    normalizeBlankWord,
} from './scaffoldingLogic';
import SpeechBubbleShell from '../../components/SpeechBubbleShell';

const HINT_BUBBLE_WIDTH = scale(168);
const DEFAULT_PAGE_CANVAS_ASPECT_RATIO = 0.72;

type Step = '1-1' | '1-2' | '1-3' | '2-1' | '2-2' | '2-3' | '3-1' | '3-2' | '3-3';
type GradeState = 'idle' | 'correct' | 'wrong';

export type BlankItem = {
    id: number;
    word: string;
    meaningLong?: string;
};

type SavePayload = {
    answers: string[];
    selectedBlankIds: number[];
};

type SaveResult = {
    earnedXp: number;
    totalEarnedXp?: number;
    handledCompletion?: boolean;
};

type Props = {
    onBack: () => void;
    onBackFromCompletion?: () => void; // 학습 완료 후 뒤로가기
    sources: StudySource[];
    selectedIndex: number;

    payload: ScaffoldingPayload | null;
    loading: boolean;
    error: string | null;
    onRetry: () => void;
    onSave?: (payload: SavePayload) => Promise<SaveResult | void>;
    initialRound?: Step; // 초기 라운드 설정 (복습용)
    reviewQuizId?: number | null; // 복습용 quiz ID
    subjectName?: string; // 과목명
    currentStudyIndex?: number;
    totalStudyCount?: number;
    accumulatedEarnedXp?: number;
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
    currentStudyIndex = 0,
    totalStudyCount = 1,
    accumulatedEarnedXp = 0,
}: Props) {
    const [step, setStep] = useState<Step>(initialRound);
    const isReviewMode = reviewQuizId != null;

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
    const [pageCanvasWidth, setPageCanvasWidth] = useState(0);
    const [pageCanvasAspectRatio, setPageCanvasAspectRatio] = useState(DEFAULT_PAGE_CANVAS_ASPECT_RATIO);
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
    const suppressPressAfterLongPressRef = useRef(false);

    // 설명
    const title = payload?.title ?? '';
    const extractedText = payload?.extractedText ?? '';

    useEffect(() => {
        setBlankDefsState(payload?.blanks ?? []);
    }, [payload?.blanks, payload?.extractedText]);

    useEffect(() => {
        const fallback = () => setPageCanvasAspectRatio(DEFAULT_PAGE_CANVAS_ASPECT_RATIO);

        const imageUri = payload?.imageUrl ?? sources[selectedIndex]?.uri;
        if (!imageUri) {
            fallback();
            return;
        }

        Image.getSize(
            imageUri,
            (width, height) => {
                if (width > 0 && height > 0) {
                    setPageCanvasAspectRatio(width / height);
                    return;
                }
                fallback();
            },
            () => fallback(),
        );
    }, [payload?.imageUrl, selectedIndex, sources]);

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

    const sourcePages = useMemo<PageItem[]>(() => {
        if (payload?.pages && payload.pages.length > 0) {
            return payload.pages;
        }

        return [{
            original_text: extractedText,
            keywords: keywordList,
        }];
    }, [payload?.pages, extractedText, keywordList]);

    const hasStructuredPages = useMemo(
        () => sourcePages.some(
            (page) => (page.layout_blocks?.length ?? 0) > 0 || (page.tables?.length ?? 0) > 0,
        ),
        [sourcePages],
    );

    /** 중요: 중복 단어마다 instanceId를 부여해서 입력/채점을 분리 */
    const pageRenderData = useMemo<PageRenderPage[]>(() => {
        let nextInstanceId = 1;
        let nextTokenIndex = 0;

        return sourcePages.map((page, pageIndex) => {
            const pageKeywords = page.keywords?.length ? page.keywords : keywordList;
            const sectionsSource = page.layout_blocks && page.layout_blocks.length > 0
                ? page.layout_blocks.map((block, blockIndex) => ({
                    key: `page-${pageIndex}-block-${blockIndex}`,
                    block,
                    text: block.text ?? '',
                }))
                : [{
                    key: `page-${pageIndex}-flow`,
                    block: undefined,
                    text: page.original_text ?? '',
                }];

            const sections = sectionsSource.map((section) => {
                const rawTokens = tokenizeWithKeywords(section.text, pageKeywords);
                const tokenEntries = rawTokens.map((token) => {
                    const renderToken: RenderToken = token.type === 'keyword'
                        ? { ...token, instanceId: nextInstanceId++ }
                        : token;

                    return {
                        key: `${section.key}-token-${nextTokenIndex}`,
                        globalIndex: nextTokenIndex++,
                        token: renderToken,
                    };
                });

                return {
                    key: section.key,
                    block: section.block,
                    tokenEntries,
                };
            });

            return {
                pageIndex,
                page,
                sections,
                hasLayoutBlocks: (page.layout_blocks?.length ?? 0) > 0,
            };
        });
    }, [sourcePages, keywordList]);

    const tokens = useMemo(
        () => pageRenderData.flatMap((page) => page.sections.flatMap((section) => section.tokenEntries.map((entry) => entry.token))),
        [pageRenderData],
    );

    const keywordInstances = useMemo(() => {
        const keywordTokens = tokens.filter((t): t is KeywordTokenWithId => t.type === 'keyword');
        return buildKeywordInstances(keywordTokens, blankDefs).map((instance) => ({
            ...instance,
            base: instance.base ?? baseInfoByWord.get(instance.word) ?? null,
        }));
    }, [tokens, blankDefs, baseInfoByWord]);

    useEffect(() => {
        if (!isReviewMode || reviewInitRef.current) return;
        if (keywordInstances.length === 0) return;

        const userAnswers = payload?.user_answers || [];
        let selected: number[] = [];

        // 1) 저장된 빈칸 정의를 최우선으로 사용
        const savedBlankIdSet = new Set(
            (payload?.blanks ?? []).map((b, idx) => (typeof b.id === 'number' ? b.id : idx))
        );
        if (savedBlankIdSet.size > 0) {
            selected = keywordInstances
                .filter((ki) => savedBlankIdSet.has(ki.blankId))
                .map((ki) => ki.instanceId);
        }

        // 2) 레거시 데이터: user_answers 기준 보정
        if (selected.length === 0 && userAnswers.length > 0) {
            const answeredBlankIds = new Set(
                userAnswers.map((ans, idx) => (ans && ans.trim() !== '' ? idx : -1)).filter((id) => id >= 0)
            );
            selected = keywordInstances.filter((ki) => answeredBlankIds.has(ki.blankId)).map((ki) => ki.instanceId);
        }

        // 3) 최종 안전장치: 복습은 항상 최대 20개 빈칸 표시
        const targetCount = Math.min(20, keywordInstances.length);
        if (selected.length === 0) {
            selected = keywordInstances.slice(0, targetCount).map((ki) => ki.instanceId);
        } else if (selected.length < targetCount) {
            const selectedSet = new Set(selected);
            const remain = keywordInstances
                .map((ki) => ki.instanceId)
                .filter((id) => !selectedSet.has(id));
            selected = [...selected, ...remain.slice(0, targetCount - selected.length)];
        } else if (selected.length > targetCount) {
            selected = selected.slice(0, targetCount);
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
    }, [isReviewMode, keywordInstances, payload?.blanks, payload?.user_answers]);

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
    const keywordInstanceById = useMemo(() => {
        const map = new Map<number, (typeof keywordInstances)[number]>();
        keywordInstances.forEach((instance) => {
            map.set(instance.instanceId, instance);
        });
        return map;
    }, [keywordInstances]);
    const pageCanvasHeight = pageCanvasWidth > 0 ? pageCanvasWidth / pageCanvasAspectRatio : 0;

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
    const safeTotalStudyCount = Math.max(totalStudyCount, 1);
    const safeCurrentStudyIndex = Math.min(Math.max(currentStudyIndex, 0), safeTotalStudyCount - 1);
    const pageIndicatorLabel = `${safeCurrentStudyIndex + 1}/${safeTotalStudyCount}`;

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
        if (isReviewMode) return;
        // 설명
        if (step === '1-2') setStep('1-1');
        else if (step === '2-2') setStep('2-1');
        else if (step === '3-2') setStep('3-1');
    };

    // 설명
    const onToggleBlankSelection = (instanceId: number) => {
        if (isReviewMode) return;
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
                <Text style={styles.loadingText}>학습화면 불러오는 중입니다...</Text>
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
        suppressPressAfterLongPressRef.current = true;
        Keyboard.dismiss();
        inputRefs.current[instanceId]?.blur();
        setActiveBlankId(null);
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
        if (suppressPressAfterLongPressRef.current) {
            suppressPressAfterLongPressRef.current = false;
            return;
        }
        setActiveBlankId(instanceId);
        setHintWord(null);
        setHintType(null);
        setHintPosition(null);
        requestAnimationFrame(() => inputRefs.current[instanceId]?.focus());
    };

    const focusAdjacentBlank = (instanceId: number, direction: 1 | -1 = 1) => {
        const currentIndex = orderedSelectedBlanks.indexOf(instanceId);
        if (currentIndex < 0) return;

        const nextInstanceId = orderedSelectedBlanks[currentIndex + direction];
        if (typeof nextInstanceId !== 'number') {
            setActiveBlankId(null);
            inputRefs.current[instanceId]?.blur();
            return;
        }

        setActiveBlankId(nextInstanceId);
        setHintWord(null);
        setHintType(null);
        setHintPosition(null);
        requestAnimationFrame(() => inputRefs.current[nextInstanceId]?.focus());
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

        if (isReviewMode) {
            return null;
        }

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

    const getStructuredTextMetrics = (block?: LayoutBlock) => {
        if (!block || pageCanvasHeight <= 0) {
            return {
                bodyFontSize: fontScale(11),
                bodyLineHeight: fontScale(14),
                keywordFontSize: fontScale(10),
                keywordLineHeight: fontScale(13),
                horizontalPadding: scale(1),
                marginHorizontal: scale(1),
                borderRadius: scale(2),
            };
        }

        const blockHeightPx = pageCanvasHeight * Math.max(block.height, 0.018);
        const blockWidthPx = pageCanvasWidth * Math.max(block.width, 0.04);
        const bodyFontSize = Math.max(15, Math.min(15, blockHeightPx * 0.58));
        const bodyLineHeight = Math.max(bodyFontSize + 2, Math.min(18, blockHeightPx * 0.82));
        const keywordFontSize = Math.max(9, Math.min(bodyFontSize, blockHeightPx * 0.54));
        const keywordLineHeight = Math.max(keywordFontSize + 1, Math.min(bodyLineHeight, blockHeightPx * 0.76));
        const horizontalPadding = Math.max(0, Math.min(scale(3), blockWidthPx * 0.012));
        const marginHorizontal = Math.max(0, Math.min(scale(1), blockWidthPx * 0.004));

        return {
            bodyFontSize,
            bodyLineHeight,
            keywordFontSize,
            keywordLineHeight,
            horizontalPadding,
            marginHorizontal,
            borderRadius: scale(2),
        };
    };

    const renderTokenEntry = (entry: RenderTokenEntry, options?: { block?: LayoutBlock; compact?: boolean }) => {
        const { token: t, globalIndex, key } = entry;
        const compact = options?.compact === true;
        const metrics = getStructuredTextMetrics(options?.block);
        const bodyTextStyle = compact
            ? [styles.bodyText, styles.compactBodyText, {
                fontSize: metrics.bodyFontSize,
                lineHeight: metrics.bodyLineHeight,
            }]
            : styles.bodyText;
        const wordTextStyle = compact
            ? [styles.wordText, styles.compactWordText, {
                fontSize: metrics.keywordFontSize,
                lineHeight: metrics.keywordLineHeight,
            }]
            : styles.wordText;
        const wordPillStyle = compact
            ? [
                styles.wordPill,
                styles.compactWordPill,
                {
                    paddingHorizontal: metrics.horizontalPadding,
                    marginHorizontal: metrics.marginHorizontal,
                    borderRadius: metrics.borderRadius,
                },
            ]
            : styles.wordPill;
        const blankSpacingStyle = compact
            ? {
                marginHorizontal: metrics.marginHorizontal,
                paddingHorizontal: metrics.horizontalPadding,
            }
            : styles.blankTokenSpacing;

        if (t.type === 'newline') {
            return <View key={key} style={styles.newline} />;
        }

        if (t.type === 'space') {
            return <Text key={key} onLayout={recordTokenLayout(globalIndex)}>{t.value}</Text>;
        }

        if (t.type === 'text') {
            return (
                <Text
                    key={key}
                    style={bodyTextStyle}
                    onLayout={recordTokenLayout(globalIndex)}
                >
                    {t.value}
                </Text>
            );
        }

        const instanceId = t.instanceId;
        const instanceInfo = keywordInstanceById.get(instanceId);
        const grade = instanceInfo ? (graded[instanceInfo.blankId] ?? 'idle') : 'idle';
        const userValue = answers[instanceId] ?? '';
        const substep = step.split('-')[1];
        const isSelected = selectedBlankSet.has(instanceId);
        const shouldRenderPlainKeyword = isReviewMode && !isSelected;

        if (substep === '1') {
            if (shouldRenderPlainKeyword) {
                return (
                    <Text
                        key={key}
                        style={bodyTextStyle}
                        onLayout={recordTokenLayout(globalIndex)}
                    >
                        {t.value}
                    </Text>
                );
            }

            if (isSelected) {
                return (
                    <Pressable
                        key={key}
                        onPress={() => onToggleBlankSelection(instanceId)}
                        style={[
                            wordPillStyle,
                            blankSpacingStyle,
                            styles.blankBoxBase,
                            { backgroundColor: HIGHLIGHT_BG },
                        ]}
                        onLayout={recordTokenLayout(globalIndex)}
                    >
                        <View style={{ position: 'relative' }}>
                            <Text style={[wordTextStyle, { opacity: 0 }]}>{t.value}</Text>
                        </View>
                    </Pressable>
                );
            }

            return (
                <Pressable
                    key={key}
                    onPress={() => onToggleBlankSelection(instanceId)}
                    style={[
                        wordPillStyle,
                        blankSpacingStyle,
                        styles.blankBoxBase,
                        { backgroundColor: HIGHLIGHT_BG },
                    ]}
                    onLayout={recordTokenLayout(globalIndex)}
                >
                    <Text style={wordTextStyle}>{t.value}</Text>
                </Pressable>
            );
        }

        if (substep === '2') {
            if (!isSelected) {
                if (shouldRenderPlainKeyword) {
                    return (
                        <Text
                            key={key}
                            style={bodyTextStyle}
                            onLayout={recordTokenLayout(globalIndex)}
                        >
                            {t.value}
                        </Text>
                    );
                }

                return (
                    <Pressable
                        key={key}
                        style={[wordPillStyle, { backgroundColor: HIGHLIGHT_BG }]}
                        onLayout={recordTokenLayout(globalIndex)}
                    >
                        <Text style={wordTextStyle}>{t.value}</Text>
                    </Pressable>
                );
            }

            const isActive = activeBlankId === instanceId;
            const currentHintType = hintWord === instanceId ? hintType : null;
            const textAlign = currentHintType === 'last' ? 'right' : 'left';

            return (
                <View
                    key={key}
                    ref={(ref) => {
                        if (ref) blankRefs.current[instanceId] = ref;
                    }}
                >
                    <Pressable
                        onPress={() => onPressBlank(instanceId)}
                        onLongPress={() => onLongPressBlank(instanceId)}
                        delayLongPress={450}
                        style={[
                            wordPillStyle,
                            blankSpacingStyle,
                            styles.blankBoxBase,
                            { backgroundColor: HIGHLIGHT_BG },
                            isActive && styles.blankBoxActive,
                        ]}
                        onLayout={recordTokenLayout(globalIndex)}
                    >
                        <View style={{ position: 'relative' }}>
                            <Text style={[wordTextStyle, { opacity: 0 }]}>{t.value}</Text>
                            <View pointerEvents="none" style={styles.blankInputOverlay}>
                                <TextInput
                                    ref={(ref) => {
                                        if (ref) inputRefs.current[instanceId] = ref;
                                    }}
                                    value={userValue}
                                    onChangeText={(value) => setAnswers((prev) => ({ ...prev, [instanceId]: value }))}
                                    onFocus={() => setActiveBlankId(instanceId)}
                                    onKeyPress={(event) => {
                                        if (event.nativeEvent.key === 'Tab') {
                                            focusAdjacentBlank(instanceId, 1);
                                        }
                                    }}
                                    onSubmitEditing={() => focusAdjacentBlank(instanceId, 1)}
                                    style={[
                                        styles.blankInput,
                                        compact && {
                                            fontSize: metrics.keywordFontSize,
                                            lineHeight: metrics.keywordLineHeight,
                                        },
                                        { textAlign },
                                    ]}
                                    selectTextOnFocus={isActive}
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                    spellCheck={false}
                                    blurOnSubmit={false}
                                    onBlur={() => {
                                        requestAnimationFrame(() => {
                                            const hasFocusedInput = orderedSelectedBlanks.some(
                                                (id) => inputRefs.current[id]?.isFocused?.(),
                                            );
                                            if (!hasFocusedInput) {
                                                setActiveBlankId((prev) => (prev === instanceId ? null : prev));
                                            }
                                        });
                                    }}
                                    maxFontSizeMultiplier={1.0}
                                />
                            </View>
                        </View>
                    </Pressable>
                </View>
            );
        }

        if (!isSelected) {
            if (shouldRenderPlainKeyword) {
                return (
                    <Text
                        key={key}
                        style={bodyTextStyle}
                        onLayout={recordTokenLayout(globalIndex)}
                    >
                        {t.value}
                    </Text>
                );
            }

            return (
                <Pressable
                    key={key}
                    style={[wordPillStyle, { backgroundColor: HIGHLIGHT_BG }]}
                    onLayout={recordTokenLayout(globalIndex)}
                >
                    <Text style={wordTextStyle}>{t.value}</Text>
                </Pressable>
            );
        }

        const backgroundColor =
            grade === 'correct' ? CORRECT_BG : grade === 'wrong' ? WRONG_BG : HIGHLIGHT_BG;

        return (
            <View
                key={key}
                style={[wordPillStyle, blankSpacingStyle, { backgroundColor }]}
                onLayout={recordTokenLayout(globalIndex)}
            >
                <Text style={wordTextStyle}>{t.value}</Text>
            </View>
        );
    };

    const renderTable = (table: OcrTableBlock, tableIndex: number) => {
        const columnCount = Math.max(...table.rows.map((row) => row.length), 0);
        if (columnCount === 0) return null;

        return (
            <View key={`table-${tableIndex}`} style={styles.pageTableWrap}>
                <Text style={styles.pageTableTitle}>표 {tableIndex + 1}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={styles.pageTable}>
                        {table.rows.map((row, rowIndex) => {
                            const normalizedRow = Array.from({ length: columnCount }, (_, colIndex) => row[colIndex] ?? '');
                            return (
                                <View key={`row-${rowIndex}`} style={styles.pageTableRow}>
                                    {normalizedRow.map((cell, colIndex) => (
                                        <View
                                            key={`cell-${rowIndex}-${colIndex}`}
                                            style={[
                                                styles.pageTableCell,
                                                rowIndex === 0 && styles.pageTableHeaderCell,
                                            ]}
                                        >
                                            <Text
                                                style={[
                                                    styles.pageTableCellText,
                                                    rowIndex === 0 && styles.pageTableHeaderText,
                                                ]}
                                            >
                                                {cell}
                                            </Text>
                                        </View>
                                    ))}
                                </View>
                            );
                        })}
                    </View>
                </ScrollView>
            </View>
        );
    };

    const renderStructuredKeywordBlock = (
        entry: RenderTokenEntry,
        block: LayoutBlock,
    ) => {
        const token = entry.token;
        if (token.type !== 'keyword') return null;

        const instanceId = token.instanceId;
        const instanceInfo = keywordInstanceById.get(instanceId);
        const grade = instanceInfo ? (graded[instanceInfo.blankId] ?? 'idle') : 'idle';
        const userValue = answers[instanceId] ?? '';
        const substep = step.split('-')[1];
        const isSelected = selectedBlankSet.has(instanceId);
        const shouldRenderPlainKeyword = isReviewMode && !isSelected;
        const metrics = getStructuredTextMetrics(block);
        const keywordTextStyle = [
            styles.wordText,
            styles.compactWordText,
            {
                fontSize: metrics.keywordFontSize,
                lineHeight: metrics.keywordLineHeight,
            },
        ];
        const keywordBoxStyle = [
            styles.structuredKeywordInlineBox,
            styles.blankBoxBase,
            {
                backgroundColor: HIGHLIGHT_BG,
                paddingHorizontal: metrics.horizontalPadding,
                borderRadius: metrics.borderRadius,
            },
        ];
        const textStyle = [
            styles.structuredBlockText,
            {
                fontSize: metrics.bodyFontSize,
                lineHeight: metrics.bodyLineHeight,
            },
        ];

        if (substep === '1') {
            return (
                <Pressable
                    key={entry.key}
                    onPress={() => onToggleBlankSelection(instanceId)}
                    style={keywordBoxStyle}
                    onLayout={recordTokenLayout(entry.globalIndex)}
                >
                    <Text style={[keywordTextStyle, isSelected && { opacity: 0 }]}>{token.value}</Text>
                </Pressable>
            );
        }

        if (substep === '2') {
            if (!isSelected || shouldRenderPlainKeyword) {
                return (
                    <View
                        key={entry.key}
                        style={!shouldRenderPlainKeyword ? keywordBoxStyle : undefined}
                        onLayout={recordTokenLayout(entry.globalIndex)}
                    >
                        <Text style={shouldRenderPlainKeyword ? textStyle : keywordTextStyle}>{token.value}</Text>
                    </View>
                );
            }

            const isActive = activeBlankId === instanceId;
            const currentHintType = hintWord === instanceId ? hintType : null;
            const textAlign = currentHintType === 'last' ? 'right' : 'left';

            return (
                <View
                    key={entry.key}
                    ref={(ref) => {
                        if (ref) blankRefs.current[instanceId] = ref;
                    }}
                >
                    <Pressable
                        onPress={() => onPressBlank(instanceId)}
                        onLongPress={() => onLongPressBlank(instanceId)}
                        delayLongPress={450}
                        style={[
                            ...keywordBoxStyle,
                            styles.structuredKeywordInputBox,
                            isActive && styles.structuredKeywordInputBoxActive,
                        ]}
                        onLayout={recordTokenLayout(entry.globalIndex)}
                    >
                        <Text style={[keywordTextStyle, { opacity: 0 }]}>{token.value}</Text>
                        <View pointerEvents="none" style={styles.blankInputOverlay}>
                            <TextInput
                                ref={(ref) => {
                                    if (ref) inputRefs.current[instanceId] = ref;
                                }}
                                value={userValue}
                                onChangeText={(value) => setAnswers((prev) => ({ ...prev, [instanceId]: value }))}
                                onFocus={() => setActiveBlankId(instanceId)}
                                onKeyPress={(event) => {
                                    if (event.nativeEvent.key === 'Tab') {
                                        focusAdjacentBlank(instanceId, 1);
                                    }
                                }}
                                onSubmitEditing={() => focusAdjacentBlank(instanceId, 1)}
                                style={[
                                    styles.blankInput,
                                    {
                                        textAlign,
                                        fontSize: metrics.keywordFontSize,
                                        lineHeight: metrics.keywordLineHeight,
                                    },
                                ]}
                                selectTextOnFocus={isActive}
                                autoCapitalize="none"
                                autoCorrect={false}
                                spellCheck={false}
                                blurOnSubmit={false}
                                onBlur={() => {
                                    requestAnimationFrame(() => {
                                        const hasFocusedInput = orderedSelectedBlanks.some(
                                            (id) => inputRefs.current[id]?.isFocused?.(),
                                        );
                                        if (!hasFocusedInput) {
                                            setActiveBlankId((prev) => (prev === instanceId ? null : prev));
                                        }
                                    });
                                }}
                                maxFontSizeMultiplier={1.0}
                            />
                        </View>
                    </Pressable>
                </View>
            );
        }

        const backgroundColor = !isSelected
            ? 'transparent'
            : grade === 'correct'
                ? 'rgba(197, 255, 186, 0.45)'
                : grade === 'wrong'
                    ? 'rgba(255, 156, 173, 0.5)'
                    : 'rgba(199, 207, 255, 0.35)';

        return (
            <View
                key={entry.key}
                style={[
                    keywordBoxStyle,
                    backgroundColor !== 'transparent' && { backgroundColor },
                ]}
                onLayout={recordTokenLayout(entry.globalIndex)}
            >
                <Text style={keywordTextStyle}>{token.value}</Text>
            </View>
        );
    };

    const renderStructuredBlock = (section: PageRenderSection) => {
        const block = section.block;
        if (!block) return null;

        const metrics = getStructuredTextMetrics(block);
        const hasKeywordEntries = section.tokenEntries.some((entry) => entry.token.type === 'keyword');
        const keywordEntries = section.tokenEntries.filter(
            (entry): entry is RenderTokenEntry & { token: KeywordTokenWithId } => entry.token.type === 'keyword',
        );
        const singleKeywordEntry = keywordEntries.length === 1
            && normalizeBlankWord(block.text) === normalizeBlankWord(keywordEntries[0].token.value)
            ? keywordEntries[0]
            : null;

        return (
            <View
                key={section.key}
                style={[
                    styles.layoutBlock,
                    {
                        left: `${Math.max(block.x, 0) * 100}%`,
                        top: `${Math.max(block.y, 0) * 100}%`,
                        width: `${Math.max(block.width, 0.04) * 100}%`,
                        height: `${Math.max(block.height, 0.028) * 100}%`,
                    },
                ]}
            >
                {singleKeywordEntry ? (
                    renderStructuredKeywordBlock(singleKeywordEntry, block)
                ) : hasKeywordEntries ? (
                    <View style={styles.layoutBlockFlow}>
                        {section.tokenEntries.map((entry) => renderTokenEntry(entry, { block, compact: true }))}
                    </View>
                ) : (
                    <Text
                        style={[
                            styles.structuredBlockText,
                            {
                                fontSize: metrics.bodyFontSize,
                                lineHeight: metrics.bodyLineHeight,
                            },
                        ]}
                    >
                        {block.text}
                    </Text>
                )}
            </View>
        );
    };

    const renderStructuredPage = (pageRender: PageRenderPage) => {
        const { page, sections, pageIndex, hasLayoutBlocks } = pageRender;

        return (
            <View key={`page-${pageIndex}`} style={styles.pageCard}>
                {sourcePages.length > 1 && (
                    <Text style={styles.pageCardTitle}>페이지 {pageIndex + 1}</Text>
                )}

                <View style={styles.pageSheet}>
                    {hasLayoutBlocks ? (
                        <View
                            style={[
                                styles.pageCanvas,
                                { aspectRatio: pageCanvasAspectRatio },
                            ]}
                            onLayout={(event) => {
                                const nextWidth = event.nativeEvent.layout.width;
                                if (nextWidth > 0 && nextWidth !== pageCanvasWidth) {
                                    setPageCanvasWidth(nextWidth);
                                }
                            }}
                        >
                            {sections.map(renderStructuredBlock)}
                        </View>
                    ) : (
                        <View style={styles.flow}>
                            {sections
                                .flatMap((section) => section.tokenEntries)
                                .map((entry) => renderTokenEntry(entry))}
                        </View>
                    )}

                    {!hasLayoutBlocks && (page.tables ?? []).map(renderTable)}
                </View>
            </View>
        );
    };

    const legacyTokenEntries = pageRenderData[0]?.sections[0]?.tokenEntries ?? [];

    return (
        <View
            style={styles.root}
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
                                            // 페이지/등장 순서 기반으로 instance를 그대로 저장한다.
                                            // 같은 단어(같은 blankId)가 여러 번 나오더라도 dedupe 하지 않아야
                                            // 페이지별 문항 수/정답 수가 정확히 집계된다.
                                            const answerPairs = orderedSelectedBlanks
                                                .map((instanceId) => {
                                                    const blankId = blankIdByInstance.get(instanceId);
                                                    if (typeof blankId !== 'number') return null;
                                                    return {
                                                        blankId,
                                                        answer: answers[instanceId] ?? '',
                                                    };
                                                })
                                                .filter((pair): pair is { blankId: number; answer: string } => pair != null);
                                            const orderedBlankIds = answerPairs.map((pair) => pair.blankId);
                                            const answerList = answerPairs.map((pair) => pair.answer);
                                            const saveResult = await onSave({
                                                answers: answerList,
                                                selectedBlankIds: orderedBlankIds,
                                            });
                                            if (isReviewMode) {
                                                return;
                                            }
                                            if (saveResult?.handledCompletion) {
                                                return;
                                            }
                                            const earnedXp = saveResult?.earnedXp ?? correctCount * 2;
                                            const totalEarnedXp = saveResult?.totalEarnedXp ?? accumulatedEarnedXp + earnedXp;
                                            const isLastStudy = currentStudyIndex >= totalStudyCount - 1;
                                            if (isLastStudy) {
                                                setPopupTitle('축하합니다');
                                                setPopupMessage(`학습을 완료해서 총 ${totalEarnedXp}xp를 획득했어요`);
                                            } else {
                                                setPopupTitle('다음 학습으로 이동');
                                                setPopupMessage(
                                                    `${currentStudyIndex + 1}번 학습을 완료했습니다. ${currentStudyIndex + 2}번 학습을 시작합니다.`
                                                );
                                            }
                                            setPopupOnConfirm(() => () => {
                                                if (onBackFromCompletion) {
                                                    onBackFromCompletion();
                                                } else {
                                                    onBack();
                                                }
                                            });
                                            setPopupVisible(true);
                                            return;
                                        } catch (e: any) {
                                            Alert.alert('저장 실패', e?.message ?? '알 수 없는 오류가 발생했습니다.');
                                            return;
                                        }
                                    }

                                    const earnedXp = correctCount * 2;
                                    const isLastStudy = currentStudyIndex >= totalStudyCount - 1;
                                    if (isLastStudy) {
                                        const totalEarnedXp = accumulatedEarnedXp + earnedXp;
                                        setPopupTitle('축하합니다');
                                        setPopupMessage(`학습을 완료해서 총 ${totalEarnedXp}xp를 획득했어요`);
                                    } else {
                                        setPopupTitle('다음 학습으로 이동');
                                        setPopupMessage(
                                            `${currentStudyIndex + 1}번 학습을 완료했습니다. ${currentStudyIndex + 2}번 학습을 시작합니다.`
                                        );
                                    }
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
                    <ScrollView
                        contentContainerStyle={styles.textContainer}
                        keyboardShouldPersistTaps="handled"
                        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
                    >
                        {hasStructuredPages ? (
                            <View style={styles.pageList}>
                                {pageRenderData.map(renderStructuredPage)}
                            </View>
                        ) : (
                            <View
                                style={styles.flow}
                                onLayout={(e) => {
                                    flowLayoutRef.current = e.nativeEvent.layout;
                                }}
                                {...(dragResponder ? dragResponder.panHandlers : {})}
                            >
                                {legacyTokenEntries.map((entry) => renderTokenEntry(entry))}
                            </View>
                        )}
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
            {!isReviewMode && (
                <View pointerEvents="none" style={styles.pageIndicatorWrap}>
                    <Text style={styles.pageIndicatorText}>{pageIndicatorLabel}</Text>
                </View>
            )}

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
                                            transform: [{ translateX: -(HINT_BUBBLE_WIDTH / 2) }],
                                        },
                                    ]}
                                >
                                    <SpeechBubbleShell
                                        width={HINT_BUBBLE_WIDTH}
                                        minHeightRatio={86 / 505}
                                        tailRatio={34 / 505}
                                        bubbleStyle={styles.hintBalloonBubble}
                                    >
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
                                    </SpeechBubbleShell>
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
        </View>
    );
}

/** Tokenize */
type TextToken = { type: 'text'; value: string };
type SpaceToken = { type: 'space'; value: string };
type NewlineToken = { type: 'newline'; value: '\n' };
type KeywordToken = { type: 'keyword'; value: string; occ: number; baseWord: string };

type Token = TextToken | SpaceToken | NewlineToken | KeywordToken;
type KeywordTokenWithId = KeywordToken & { instanceId: number };
type RenderToken = TextToken | SpaceToken | NewlineToken | KeywordTokenWithId;
type RenderTokenEntry = {
    key: string;
    globalIndex: number;
    token: RenderToken;
};
type PageRenderSection = {
    key: string;
    block?: LayoutBlock;
    tokenEntries: RenderTokenEntry[];
};
type PageRenderPage = {
    pageIndex: number;
    page: PageItem;
    sections: PageRenderSection[];
    hasLayoutBlocks: boolean;
};

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
    return normalizeBlankWord(s);
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
        top: scale(-13),
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
    pageIndicatorWrap: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: scale(8),
        alignItems: 'center',
        justifyContent: 'center',
    },
    pageIndicatorText: {
        color: '#6B7280',
        fontSize: fontScale(14),
        fontWeight: '900',
    },

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
    pageList: { gap: scale(14) },
    pageCard: {
        gap: scale(8),
    },
    pageCardTitle: {
        fontSize: fontScale(12),
        lineHeight: fontScale(18),
        fontWeight: '700',
        color: '#6B7280',
    },
    pageSheet: {
        padding: scale(14),
        borderRadius: scale(14),
        backgroundColor: '#F8FAFF',
        borderWidth: 1,
        borderColor: '#E3E8F8',
        gap: scale(12),
    },
    pageCanvas: {
        position: 'relative',
        width: '100%',
        borderRadius: scale(12),
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E8ECF8',
        overflow: 'hidden',
    },
    layoutBlock: {
        position: 'absolute',
        paddingHorizontal: scale(3),
        paddingVertical: scale(2),
        overflow: 'visible',
    },
    structuredBlockText: {
        color: '#111827',
        fontWeight: '500',
        padding: 0,
        margin: 0,
    },
    structuredKeywordBox: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
    },
    structuredKeywordInlineBox: {
        alignSelf: 'flex-start',
        justifyContent: 'center',
    },
    structuredKeywordBoxDefault: {
        backgroundColor: HIGHLIGHT_BG,
        borderRadius: scale(2),
    },
    structuredKeywordBoxSelected: {
        backgroundColor: 'rgba(199, 207, 255, 0.55)',
    },
    structuredKeywordInputBox: {
        backgroundColor: 'rgba(199, 207, 255, 0.28)',
        borderRadius: scale(2),
    },
    structuredKeywordInputBoxActive: {
        borderWidth: 1,
        borderColor: '#5E82FF',
    },
    layoutBlockFlow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'flex-start',
    },
    pageTableWrap: {
        gap: scale(6),
    },
    pageTableTitle: {
        fontSize: fontScale(12),
        lineHeight: fontScale(18),
        fontWeight: '700',
        color: '#6B7280',
    },
    pageTable: {
        borderWidth: 1,
        borderColor: '#D8DEEF',
        borderRadius: scale(10),
        overflow: 'hidden',
    },
    pageTableRow: {
        flexDirection: 'row',
    },
    pageTableCell: {
        minWidth: scale(88),
        paddingHorizontal: scale(10),
        paddingVertical: scale(8),
        borderRightWidth: 1,
        borderBottomWidth: 1,
        borderColor: '#D8DEEF',
        backgroundColor: '#FFFFFF',
    },
    pageTableHeaderCell: {
        backgroundColor: '#EEF2FF',
    },
    pageTableCellText: {
        fontSize: fontScale(11),
        lineHeight: fontScale(16),
        fontWeight: '500',
        color: '#1F2937',
    },
    pageTableHeaderText: {
        fontWeight: '700',
    },
    flow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start' },
    newline: { width: '100%', height: fontScale(14) },
    bodyText: { fontSize: fontScale(14), lineHeight: fontScale(22), fontWeight: '600', color: '#111827' },
    compactBodyText: { fontWeight: '500', color: '#1F2937' },

    wordPill: { paddingHorizontal: 0, paddingVertical: 0, borderRadius: scale(4), marginVertical: 0 },
    compactWordPill: { marginVertical: 0, minHeight: 0 },
    blankTokenSpacing: { marginHorizontal: scale(3), paddingHorizontal: scale(4) },
    wordText: { fontSize: fontScale(13), lineHeight: fontScale(20), fontWeight: '600', color: '#111827' },
    compactWordText: { fontWeight: '500' },

    blankBox: { paddingHorizontal: 0, paddingVertical: 0, borderRadius: scale(4), marginVertical: 0, justifyContent: 'center' },
    blankBoxBase: { borderWidth: 2, borderColor: 'transparent' },
    blankBoxActive: { borderColor: '#5E82FF' },
    blankInputOverlay: {
        ...StyleSheet.absoluteFillObject,
    },
    blankInput: {
        ...StyleSheet.absoluteFillObject,
        padding: 0,
        paddingVertical: 0,
        margin: 0,
        fontSize: fontScale(13),
        fontWeight: '600',
        color: '#111827',
        lineHeight: fontScale(16),
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
    hintBalloonBubble: {
        paddingHorizontal: scale(14),
        paddingVertical: scale(8),
        shadowOpacity: 0.15,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
        elevation: 4,
    },
    hintContent: { flexDirection: 'row', gap: scale(8), justifyContent: 'center' },
    hintButton: { paddingHorizontal: scale(10), paddingVertical: scale(6), borderRadius: scale(6), minWidth: scale(42), alignItems: 'center', justifyContent: 'center' },
    hintButtonActive: { backgroundColor: '#5E82FF' },
    hintButtonInactive: { backgroundColor: '#E5E7EB' },
    hintButtonText: { fontSize: fontScale(13), fontWeight: '700' },
    hintButtonTextActive: { color: '#FFFFFF' },
    hintButtonTextInactive: { color: '#9CA3AF' },
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
