import type { Dispatch, SetStateAction } from 'react';

import type { ScaffoldingPayload } from '../api/ocr';
import type { AppStep } from '../navigation/routes';
import type { Card as BrushUpCard } from '../screens/brushUP/BrushUPScreen';
import type { StudySource } from '../screens/input_data/studySource';
import type { SourceCropMap } from './studyFlow';

type UseStudyRouteActionsParams = {
  isReviewMode: boolean;
  setIsReviewMode: Dispatch<SetStateAction<boolean>>;
  setReviewQuizId: Dispatch<SetStateAction<number | null>>;
  capturedSources: StudySource[];
  prepareCapturedSources: (sources: StudySource[]) => void;
  clearCapturedSources: () => void;
  prepareLearningStart: (
    finalSources: StudySource[],
    subject?: string,
    cropMap?: SourceCropMap,
  ) => SourceCropMap;
  preloadScaffoldingPayloads: (sources: StudySource[], cropMap: SourceCropMap) => Promise<void>;
  setSelectedSourceIndex: Dispatch<SetStateAction<number>>;
  setScaffoldingPayload: Dispatch<SetStateAction<ScaffoldingPayload | null>>;
  setScaffoldingPayloads: Dispatch<SetStateAction<ScaffoldingPayload[]>>;
  setScaffoldingError: Dispatch<SetStateAction<string | null>>;
  resetBatchEarnedXp: () => void;
  resetPendingGradeParts: () => void;
  resetPendingReviewParts: () => void;
  setStep: (step: AppStep) => void;
};

const getSelectPictureKey = (sources: StudySource[]) => sources.map((source, index) => {
  return source?.uri ? `uri-${source.uri}-${index}` : `source-${index}`;
}).join('|');

export default function useStudyRouteActions({
  isReviewMode,
  setIsReviewMode,
  setReviewQuizId,
  capturedSources,
  prepareCapturedSources,
  clearCapturedSources,
  prepareLearningStart,
  preloadScaffoldingPayloads,
  setSelectedSourceIndex,
  setScaffoldingPayload,
  setScaffoldingPayloads,
  setScaffoldingError,
  resetBatchEarnedXp,
  resetPendingGradeParts,
  resetPendingReviewParts,
  setStep,
}: UseStudyRouteActionsParams) {
  const handleTakePictureDone = (sources: StudySource[]) => {
    prepareCapturedSources(sources);
    resetPendingGradeParts();
    setStep('selectPicture');
  };

  const handleSelectPictureBack = () => {
    clearCapturedSources();
    resetPendingGradeParts();
    setStep('takePicture');
  };

  const handleStartLearning = async (
    finalSources: StudySource[],
    isOcrNeeded?: boolean,
    subject?: string,
    cropMap?: SourceCropMap,
  ) => {
    void isOcrNeeded;
    const nextCropMap = prepareLearningStart(finalSources, subject, cropMap);
    resetBatchEarnedXp();
    resetPendingGradeParts();

    if (!finalSources.length) {
      setScaffoldingError('학습할 이미지가 없습니다.');
      setScaffoldingPayload(null);
      setStep('home');
      return;
    }

    setStep('ocrLoading');
    await preloadScaffoldingPayloads(finalSources, nextCropMap);
  };

  const handleScaffoldingBack = () => {
    // 복습 모드에서 복습 화면으로
    if (isReviewMode) {
      setIsReviewMode(false);
      setReviewQuizId(null);
      resetPendingReviewParts();
      setScaffoldingPayloads([]);
      setStep('brushup');
      return;
    }

    setStep('selectPicture');
  };

  const handleBrushUpCardPress = (card: BrushUpCard) => {
    setIsReviewMode(true);
    setReviewQuizId(card.quiz_id || null);
    setSelectedSourceIndex(0);
    setScaffoldingPayload(null);
    setScaffoldingPayloads([]);
    resetPendingReviewParts();
    setStep('scaffolding');
  };

  return {
    selectPictureKey: getSelectPictureKey(capturedSources),
    handleTakePictureDone,
    handleSelectPictureBack,
    handleStartLearning,
    handleScaffoldingBack,
    handleBrushUpCardPress,
  };
}
