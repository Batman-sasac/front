import { Alert } from "react-native";
import type { BlankItemSave } from "../../../../api/ocr";
import { getErrorMessage } from "../../../../app/error/errors";
import type { KeywordInstance, KeywordOccurrence } from "../logic/scaffoldingLogic";
import type { SavePayload, SaveResult } from "../logic/scaffoldingTypes";

export function useScaffoldingCompletionSave({
  isReviewMode,
  orderedSelectedBlanks,
  answers,
  blankIdByInstance,
  keywordOccurrenceOrder,
  keywordInstanceById,
  onSave,
  correctCount,
  accumulatedEarnedXp,
  currentStudyIndex,
  totalStudyCount,
  onBack,
  onBackFromCompletion,
  showPopup,
}: {
  isReviewMode: boolean;
  orderedSelectedBlanks: number[];
  answers: Record<number, string>;
  blankIdByInstance: Map<number, number>;
  keywordOccurrenceOrder: KeywordOccurrence[];
  keywordInstanceById: Map<number, KeywordInstance>;
  onSave?: (payload: SavePayload) => Promise<SaveResult | void>;
  correctCount: number;
  accumulatedEarnedXp: number;
  currentStudyIndex: number;
  totalStudyCount: number;
  onBack: () => void;
  onBackFromCompletion?: () => void;
  showPopup: (title: string, message: string, onConfirm?: () => void) => void;
}) {
  const showCompletionPopup = (totalEarnedXp: number) => {
    const isLastStudy = currentStudyIndex >= totalStudyCount - 1;
    showPopup(
      isLastStudy ? "축하합니다" : "다음 학습으로 이동",
      isLastStudy
        ? `학습을 완료해서 총 ${totalEarnedXp}xp를 획득했어요`
        : `${currentStudyIndex + 1}번 학습을 완료했습니다. ${currentStudyIndex + 2}번 학습을 시작합니다.`,
      () => {
        if (onBackFromCompletion) {
          onBackFromCompletion();
        } else {
          onBack();
        }
      },
    );
  };

  const onFinishStudy = async () => {
    if (onSave) {
      try {
        const answerPairs = orderedSelectedBlanks
          .map((instanceId, index) => {
            const blankId = blankIdByInstance.get(instanceId);
            const occurrence = keywordOccurrenceOrder.find(
              (item) => item.instanceId === instanceId,
            );
            const instance = keywordInstanceById.get(instanceId);
            if (typeof blankId !== "number") return null;
            return {
              blankId,
              answer: answers[instanceId] ?? "",
              blankItem: {
                blank_index: index,
                word: instance?.word ?? occurrence?.normalizedWord ?? "",
                page_index: occurrence?.pageIndex ?? 0,
                ...(occurrence?.candidateId
                  ? { candidate_id: occurrence.candidateId }
                  : {}),
              },
            };
          })
          .filter(
            (
              pair,
            ): pair is {
              blankId: number;
              answer: string;
              blankItem: BlankItemSave;
            } => pair != null,
          );
        const saveResult = await onSave({
          answers: answerPairs.map((pair) => pair.answer),
          selectedBlankIds: answerPairs.map((pair) => pair.blankId),
          selectedBlankItems: answerPairs.map((pair) => pair.blankItem),
        });
        if (isReviewMode && saveResult?.handledCompletion) return;
        if (saveResult?.handledCompletion) return;

        const earnedXp = saveResult?.earnedXp ?? correctCount * 2;
        const totalEarnedXp =
          saveResult?.totalEarnedXp ?? accumulatedEarnedXp + earnedXp;
        showCompletionPopup(totalEarnedXp);
        return;
      } catch (error) {
        Alert.alert(
          "저장 실패",
          getErrorMessage(error, "알 수 없는 오류가 발생했습니다."),
        );
        return;
      }
    }

    const earnedXp = correctCount * 2;
    showCompletionPopup(accumulatedEarnedXp + earnedXp);
  };

  return { onFinishStudy };
}
