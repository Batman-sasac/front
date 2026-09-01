import { useEffect, useState } from "react";

import { getOcrUsage, type OcrUsageResponse } from "../../../../api/ocr";
import { getErrorMessage } from "../../../../app/error/errors";

export function useSelectPictureOcrUsage(sourceCount: number) {
  const [ocrUsage, setOcrUsage] = useState<OcrUsageResponse | null>(null);
  const [ocrUsageError, setOcrUsageError] = useState<string | null>(null);
  const [showOcrLimitModal, setShowOcrLimitModal] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadUsage = async () => {
      try {
        const usage = await getOcrUsage();
        if (!cancelled) {
          setOcrUsage(usage);
          setOcrUsageError(null);
        }
      } catch (error) {
        if (!cancelled) {
          setOcrUsage(null);
          setOcrUsageError(
            getErrorMessage(error, "OCR 사용량을 불러오지 못했습니다."),
          );
        }
      }
    };

    loadUsage();
    return () => {
      cancelled = true;
    };
  }, []);

  const isUnlimitedUser = ocrUsage?.is_unlimited === true;
  const remainingOcr = ocrUsage?.remaining ?? 0;
  const limitReached =
    !isUnlimitedUser &&
    (ocrUsage?.status === "limit_reached" || remainingOcr <= 0);
  const exceedsRemainingOcr =
    !isUnlimitedUser && ocrUsage != null && sourceCount > remainingOcr;

  useEffect(() => {
    setShowOcrLimitModal(exceedsRemainingOcr);
  }, [exceedsRemainingOcr]);

  return {
    ocrUsage,
    ocrUsageError,
    isUnlimitedUser,
    remainingOcr,
    limitReached,
    exceedsRemainingOcr,
    showOcrLimitModal,
    setShowOcrLimitModal,
  };
}
