import { useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { Alert } from 'react-native';

import {
  gradeStudy,
  submitReviewStudy,
  type BlankItemSave,
  type PageItem,
  type OcrUsageResponse,
  type ScaffoldingPayload,
} from '../api/ocr';
import type { RewardType } from '../screens/reward/Reward';
import { buildOrderedStudySaveData } from '../screens/study/scaffoldingLogic';
import type { StudySource } from '../screens/input_data/studySource';
import type { AppStep } from '../navigation/routes';
import type { SourceCropMap } from './studyFlow';
import { getErrorMessage } from './errors';

type PendingGradePart = {
  pages: PageItem[];
  blankItems: BlankItemSave[];
  keywords: string[];
  userAnswers: string[];
  correctCount: number;
};

type PendingReviewPart = {
  userAnswers: string[];
  correctCount: number;
};

type SavePayload = {
  answers: string[];
  selectedBlankIds: number[];
  selectedBlankItems?: BlankItemSave[];
};

type UseScaffoldingStudyActionsParams = {
  isReviewMode: boolean;
  setIsReviewMode: Dispatch<SetStateAction<boolean>>;
  reviewQuizId: number | null;
  setReviewQuizId: Dispatch<SetStateAction<number | null>>;
  selectedSourceIndex: number;
  setSelectedSourceIndex: Dispatch<SetStateAction<number>>;
  capturedSources: StudySource[];
  cropBySourceIndex: SourceCropMap;
  scaffoldingPayload: ScaffoldingPayload | null;
  setScaffoldingPayload: Dispatch<SetStateAction<ScaffoldingPayload | null>>;
  scaffoldingPayloads: ScaffoldingPayload[];
  setScaffoldingPayloads: Dispatch<SetStateAction<ScaffoldingPayload[]>>;
  setScaffoldingLoading: Dispatch<SetStateAction<boolean>>;
  setScaffoldingError: Dispatch<SetStateAction<string | null>>;
  runOcrForIndex: (
    sources: StudySource[],
    index: number,
    cropMap: SourceCropMap,
  ) => Promise<ScaffoldingPayload>;
  subjectName: string;
  setCropBySourceIndex: Dispatch<SetStateAction<SourceCropMap>>;
  setStep: (step: AppStep) => void;
  setExp: Dispatch<SetStateAction<number>>;
  refreshOcrUsage: () => Promise<OcrUsageResponse | null>;
  isSubscribed: boolean;
  isUsageLimitReached: (usage?: OcrUsageResponse | null) => boolean;
  setShowUsageExhaustedModal: Dispatch<SetStateAction<boolean>>;
  refreshMyRewardRank: () => Promise<unknown>;
  refreshLeagueLeaderboard: () => Promise<unknown>;
  showRewardScreen: (type: RewardType, xp: number, onClose?: () => void) => void;
};

export default function useScaffoldingStudyActions({
  isReviewMode,
  setIsReviewMode,
  reviewQuizId,
  setReviewQuizId,
  selectedSourceIndex,
  setSelectedSourceIndex,
  capturedSources,
  cropBySourceIndex,
  scaffoldingPayload,
  setScaffoldingPayload,
  scaffoldingPayloads,
  setScaffoldingPayloads,
  setScaffoldingLoading,
  setScaffoldingError,
  runOcrForIndex,
  subjectName,
  setCropBySourceIndex,
  setStep,
  setExp,
  refreshOcrUsage,
  isSubscribed,
  isUsageLimitReached,
  setShowUsageExhaustedModal,
  refreshMyRewardRank,
  refreshLeagueLeaderboard,
  showRewardScreen,
}: UseScaffoldingStudyActionsParams) {
  const [batchEarnedXp, setBatchEarnedXp] = useState(0);
  const batchEarnedXpRef = useRef(0);
  const pendingGradePartsRef = useRef<Record<number, PendingGradePart>>({});
  const pendingReviewPartsRef = useRef<Record<number, PendingReviewPart>>({});

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

  const resetPendingGradeParts = () => {
    pendingGradePartsRef.current = {};
  };

  const resetPendingReviewParts = () => {
    pendingReviewPartsRef.current = {};
  };

  const handleScaffoldingRetry = async () => {
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
    } catch (error: unknown) {
      setScaffoldingPayload(null);
      setScaffoldingError(getErrorMessage(error, '재시도에 실패했습니다.'));
    } finally {
      setScaffoldingLoading(false);
    }
  };

  const handleBackFromCompletion = async () => {
    if (isReviewMode && selectedSourceIndex < scaffoldingPayloads.length - 1) {
      const nextIndex = selectedSourceIndex + 1;
      const nextPayload = scaffoldingPayloads[nextIndex];
      if (nextPayload) {
        setSelectedSourceIndex(nextIndex);
        setScaffoldingPayload(nextPayload);
        setScaffoldingError(null);
        setStep('scaffolding');
        return;
      }
    }

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
      } catch (error: unknown) {
        const message = getErrorMessage(error, '텍스트 추출에 실패했습니다.');
        setScaffoldingPayload(null);
        setScaffoldingError(message);

        if (message.includes('무료 횟수')) {
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

    setIsReviewMode(false);
    setReviewQuizId(null);
    resetPendingReviewParts();
    resetBatchEarnedXp();
    setCropBySourceIndex({});
    setScaffoldingPayloads([]);
    setStep('home');
    const usage = await refreshOcrUsage();
    if (!isSubscribed && isUsageLimitReached(usage)) {
      setShowUsageExhaustedModal(true);
    }
  };

  const handleScaffoldingSave = async ({
    answers: userAnswers,
    selectedBlankIds,
    selectedBlankItems,
  }: SavePayload) => {
    if (!scaffoldingPayload) throw new Error('Payload가 없습니다.');

    const blanks = scaffoldingPayload.blanks ?? [];
    const rawBlankItems = scaffoldingPayload.blankItems && scaffoldingPayload.blankItems.length > 0
      ? scaffoldingPayload.blankItems
      : blanks.map((blank, index) => ({ blank_index: index, word: blank.word, page_index: 0 }));
    const selectedExactBlankItems = (selectedBlankItems ?? [])
      .map((item, index) => ({
        blank_index: index,
        word: item.word,
        page_index: item.page_index ?? 0,
        ...(item.candidate_id ? { candidate_id: item.candidate_id } : {}),
      }))
      .filter((item) => item.word.trim().length > 0);
    const orderedSaveData = selectedExactBlankItems.length > 0
      ? {
        keywords: selectedExactBlankItems.map((item) => item.word),
        blankItems: selectedExactBlankItems,
      }
      : buildOrderedStudySaveData({
        selectedBlankIds,
        blanks,
        rawBlankItems,
      });
    const { keywords, blankItems } = orderedSaveData;
    if (keywords.length === 0 && !isReviewMode) {
      throw new Error('선택된 빈칸 정보가 없습니다.');
    }

    const reviewCorrectCount = userAnswers.reduce((acc, ua, idx) => {
      const isCorrect = (ua ?? '').trim().toLowerCase() === (keywords[idx] ?? '').trim().toLowerCase();
      return acc + (isCorrect ? 1 : 0);
    }, 0);

    if (isReviewMode) {
      const exactReviewAnswerWords = rawBlankItems.length > 0
        ? rawBlankItems.map((item) => item.word)
        : blanks.map((blank) => blank.word);
      const exactReviewCorrectCount = userAnswers.reduce((acc, ua, idx) => {
        const isCorrect = (ua ?? '').trim().toLowerCase() === (exactReviewAnswerWords[idx] ?? '').trim().toLowerCase();
        return acc + (isCorrect ? 1 : 0);
      }, 0);
      const nextReviewParts = {
        ...pendingReviewPartsRef.current,
        [selectedSourceIndex]: {
          userAnswers,
          correctCount: exactReviewCorrectCount,
        },
      };
      pendingReviewPartsRef.current = nextReviewParts;

      const reviewPageCount = Math.max(scaffoldingPayloads.length, 1);
      const isLastReviewPage = selectedSourceIndex >= reviewPageCount - 1;
      const completedReviewParts = Object.values(nextReviewParts);
      const accumulatedReviewCorrectCount = completedReviewParts.reduce((acc, part) => acc + part.correctCount, 0);
      const accumulatedReviewEarnedXp = accumulatedReviewCorrectCount * 2;

      if (!isLastReviewPage) {
        return {
          earnedXp: exactReviewCorrectCount * 2,
          totalEarnedXp: accumulatedReviewEarnedXp,
          handledCompletion: false,
        };
      }

      const mergedReviewUserAnswers: string[] = [];
      for (let idx = 0; idx < reviewPageCount; idx += 1) {
        const part = nextReviewParts[idx];
        if (!part) throw new Error(`${idx + 1}번째 복습 답안이 없어 저장할 수 없습니다.`);
        mergedReviewUserAnswers.push(...part.userAnswers);
      }

      setExp((prev) => prev + accumulatedReviewEarnedXp);
      setIsReviewMode(false);
      setReviewQuizId(null);
      resetPendingReviewParts();
      setScaffoldingPayloads([]);
      showRewardScreen('reviewComplete', accumulatedReviewEarnedXp, () => setStep('home'));

      if (reviewQuizId != null) {
        void submitReviewStudy({
          quiz_id: reviewQuizId,
          user_answers: mergedReviewUserAnswers,
        })
          .then((reviewResult) => {
            const nextPoints = Number(reviewResult?.new_points);
            if (Number.isFinite(nextPoints)) {
              setExp(nextPoints);
            }
            return Promise.all([
              refreshMyRewardRank(),
              refreshLeagueLeaderboard(),
            ]);
          })
          .catch((error) => {
            console.error('복습 결과 저장 실패:', error);
          });
      }
      return {
        earnedXp: exactReviewCorrectCount * 2,
        totalEarnedXp: accumulatedReviewEarnedXp,
        handledCompletion: true,
      };
    }

    const pages = scaffoldingPayload.pages && scaffoldingPayload.pages.length > 0
      ? scaffoldingPayload.pages
      : [{ original_text: scaffoldingPayload.extractedText, keywords }];
    const isLastInBatch = selectedSourceIndex >= capturedSources.length - 1;
    const earnedXp = reviewCorrectCount * 2;

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

    if (!isLastInBatch) {
      const nextBatchTotal = earnedXp > 0
        ? addBatchEarnedXp(earnedXp)
        : batchEarnedXpRef.current;
      return {
        earnedXp,
        totalEarnedXp: nextBatchTotal,
      };
    }

    const mergedParts: Record<number, PendingGradePart> = {
      ...pendingGradePartsRef.current,
    };
    const mergedPages: PageItem[] = [];
    const mergedBlanks: BlankItemSave[] = [];
    const mergedKeywords: string[] = [];
    const mergedUserAnswers: string[] = [];
    let pageOffset = 0;
    let blankOffset = 0;
    let totalCorrect = 0;

    for (let idx = 0; idx < capturedSources.length; idx += 1) {
      const pendingPart = mergedParts[idx];
      if (!pendingPart) throw new Error(`${idx + 1}페이지 학습 결과가 없어 저장할 수 없습니다.`);
      totalCorrect += pendingPart.correctCount;

      for (const page of pendingPart.pages) mergedPages.push(page);

      for (let blankIdx = 0; blankIdx < pendingPart.blankItems.length; blankIdx += 1) {
        const blankItem = pendingPart.blankItems[blankIdx];
        mergedBlanks.push({
          blank_index: blankOffset + blankIdx,
          word: blankItem.word,
          page_index: pageOffset + (blankItem.page_index ?? 0),
          ...(blankItem.candidate_id ? { candidate_id: blankItem.candidate_id } : {}),
        });
      }

      mergedKeywords.push(...pendingPart.keywords);
      mergedUserAnswers.push(...pendingPart.userAnswers);

      pageOffset += pendingPart.pages.length;
      blankOffset += pendingPart.keywords.length;
    }

    const mergedRawText = mergedPages.map((page) => page.original_text ?? '').join('\n\n');
    const mergedOcrText = {
      pages: mergedPages,
      blanks: mergedBlanks,
      quiz: { raw: mergedRawText },
      layout_meta: {
        selected_blank_refs: mergedBlanks.map((blank) => ({
          blank_index: blank.blank_index,
          word: blank.word,
          page_index: blank.page_index,
          ...(blank.candidate_id ? { candidate_id: blank.candidate_id } : {}),
        })),
      },
    };

    const pageQuestionCounts = Array.from({ length: mergedPages.length }, () => 0);
    const pageCorrectCounts = Array.from({ length: mergedPages.length }, () => 0);
    for (let index = 0; index < mergedBlanks.length; index += 1) {
      const pageIndex = mergedBlanks[index]?.page_index ?? 0;
      if (pageIndex < 0 || pageIndex >= pageQuestionCounts.length) continue;
      pageQuestionCounts[pageIndex] += 1;
      const userAnswer = (mergedUserAnswers[index] ?? '').trim().toLowerCase();
      const correctAnswer = (mergedKeywords[index] ?? '').trim().toLowerCase();
      if (userAnswer && correctAnswer && userAnswer === correctAnswer) pageCorrectCounts[pageIndex] += 1;
    }

    const gradeResult = await gradeStudy({
      quiz_id: 0,
      correct_answers: mergedKeywords,
      answer: mergedKeywords,
      user_answer: mergedUserAnswers,
      quiz_html: mergedRawText,
      ocr_text: mergedOcrText,
      user_answers: mergedUserAnswers,
      subject_name: subjectName || scaffoldingPayload.title,
      study_name: subjectName || scaffoldingPayload.title,
      original_text: mergedPages.map((page) => page.original_text ?? ''),
      keywords: mergedKeywords,
      grade_cnt: totalCorrect,
      page_correct_counts: pageCorrectCounts,
      page_question_counts: pageQuestionCounts,
    });

    resetPendingGradeParts();
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
      void Promise.all([
        refreshMyRewardRank(),
        refreshLeagueLeaderboard(),
      ]);
      showRewardScreen('studyComplete', totalEarned, () => setStep('home'));
    }
    return {
      earnedXp,
      totalEarnedXp: totalEarned,
      handledCompletion: totalEarned > 0,
    };
  };

  return {
    batchEarnedXp,
    resetBatchEarnedXp,
    resetPendingGradeParts,
    resetPendingReviewParts,
    handleBackFromCompletion,
    handleScaffoldingRetry,
    handleScaffoldingSave,
  };
}
