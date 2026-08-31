import { useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { Alert } from 'react-native';

import {
  gradeStudy,
  submitReviewStudy,
  type BlankItemSave,
  type OcrUsageResponse,
  type ScaffoldingPayload,
} from '../../api/ocr';
import type { RewardType } from '../../screens/reward/Reward';
import type { StudySource } from '../../screens/input_data/studySource';
import type { AppStep } from '../../navigation/routes';
import type { SourceCropMap } from './studyFlow';
import { getErrorMessage } from '../error/errors';
import {
  buildGradeStudyRequest,
  countCorrectAnswers,
  mergeReviewAnswers,
  prepareScaffoldingSaveData,
  type PendingGradePart,
  type PendingReviewPart,
} from './scaffoldingStudyData';

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
      setScaffoldingError(getErrorMessage(error, '다시 시도에 실패했습니다.'));
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

    const { keywords, blankItems, rawBlankItems } = prepareScaffoldingSaveData({
      payload: scaffoldingPayload,
      selectedBlankIds,
      selectedBlankItems,
    });
    if (keywords.length === 0 && !isReviewMode) {
      throw new Error('선택한 빈칸 정보가 없습니다.');
    }

    const reviewCorrectCount = countCorrectAnswers(userAnswers, keywords);

    if (isReviewMode) {
      const exactReviewAnswerWords = rawBlankItems.length > 0
        ? rawBlankItems.map((item) => item.word)
        : scaffoldingPayload.blanks.map((blank) => blank.word);
      const exactReviewCorrectCount = countCorrectAnswers(
        userAnswers,
        exactReviewAnswerWords,
      );
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
      const accumulatedReviewCorrectCount = Object.values(nextReviewParts).reduce(
        (count, part) => count + part.correctCount,
        0,
      );
      const accumulatedReviewEarnedXp = accumulatedReviewCorrectCount * 2;

      if (!isLastReviewPage) {
        return {
          earnedXp: exactReviewCorrectCount * 2,
          totalEarnedXp: accumulatedReviewEarnedXp,
          handledCompletion: false,
        };
      }

      const { userAnswers: mergedReviewUserAnswers } = mergeReviewAnswers(
        nextReviewParts,
        reviewPageCount,
      );

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

    const gradeRequest = buildGradeStudyRequest({
      parts: pendingGradePartsRef.current,
      sourceCount: capturedSources.length,
      subjectName,
      fallbackTitle: scaffoldingPayload.title,
    });
    const gradeResult = await gradeStudy(gradeRequest);

    resetPendingGradeParts();
    const nextPoints = Number(gradeResult?.new_points);
    const rewardGiven = Number(gradeResult?.reward_given);
    const totalEarned = Number.isFinite(rewardGiven)
      ? rewardGiven
      : (gradeRequest.grade_cnt ?? 0) * 2;
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
