import { useEffect } from 'react';

import { getQuizForReview, type ScaffoldingPayload } from '../api/ocr';
import type { AppStep } from '../navigation/routes';
import { getErrorMessage } from './errors';
import { buildReviewPayloadsByPage } from './studyFlow';

type UseReviewQuizLoaderParams = {
  step: AppStep;
  reviewQuizId: number | null;
  resetReviewParts: () => void;
  setSelectedSourceIndex: (index: number) => void;
  setScaffoldingPayload: (payload: ScaffoldingPayload | null) => void;
  setScaffoldingPayloads: (payloads: ScaffoldingPayload[]) => void;
  setScaffoldingLoading: (loading: boolean) => void;
  setScaffoldingError: (message: string | null) => void;
};

export default function useReviewQuizLoader({
  step,
  reviewQuizId,
  resetReviewParts,
  setSelectedSourceIndex,
  setScaffoldingPayload,
  setScaffoldingPayloads,
  setScaffoldingLoading,
  setScaffoldingError,
}: UseReviewQuizLoaderParams) {
  useEffect(() => {
    if (step !== 'scaffolding' || reviewQuizId == null) return;
    let cancelled = false;

    setScaffoldingLoading(true);
    setScaffoldingError(null);
    getQuizForReview(reviewQuizId)
      .then((payload) => {
        if (!cancelled) {
          const reviewPayloads = buildReviewPayloadsByPage(payload);
          resetReviewParts();
          setScaffoldingPayloads(reviewPayloads);
          setSelectedSourceIndex(0);
          setScaffoldingPayload(reviewPayloads[0] ?? payload);
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setScaffoldingPayload(null);
          setScaffoldingError(getErrorMessage(error, '복습 퀴즈 데이터를 불러오지 못했습니다.'));
        }
      })
      .finally(() => {
        if (!cancelled) setScaffoldingLoading(false);
      });

    return () => { cancelled = true; };
  }, [step, reviewQuizId]);
}
