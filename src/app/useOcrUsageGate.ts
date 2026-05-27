import { useState } from 'react';

import { getOcrUsage, type OcrUsageResponse } from '../api/ocr';
import { getToken } from '../lib/storage';
import { getOcrUsageExhaustedMessage } from '../lib/ocrUsage';

export default function useOcrUsageGate() {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [ocrUsage, setOcrUsage] = useState<OcrUsageResponse | null>(null);
  const [showUsageExhaustedModal, setShowUsageExhaustedModal] = useState(false);

  const usageExhaustedMessage = getOcrUsageExhaustedMessage(ocrUsage);

  const isUsageLimitReached = (usage?: OcrUsageResponse | null) => {
    const target = usage ?? ocrUsage;
    if (!target) return false;

    // 백엔드에서 무제한(화이트리스트) 유저로 내려온 경우에는 항상 사용 가능 처리
    if (target.is_unlimited) return false;

    return target.status === 'limit_reached' || target.remaining <= 0;
  };

  const refreshOcrUsage = async () => {
    try {
      const token = await getToken();
      if (!token) {
        setOcrUsage(null);
        return null;
      }

      const usage = await getOcrUsage();
      setOcrUsage(usage);
      return usage;
    } catch (error) {
      console.error('OCR 사용량 조회 실패:', error);
      return null;
    }
  };

  const canUseOcrOrShowLimit = async () => {
    const usage = await refreshOcrUsage();
    if (!isSubscribed && isUsageLimitReached(usage)) {
      setShowUsageExhaustedModal(true);
      return false;
    }

    return true;
  };

  return {
    isSubscribed,
    setIsSubscribed,
    ocrUsage,
    setOcrUsage,
    showUsageExhaustedModal,
    setShowUsageExhaustedModal,
    usageExhaustedMessage,
    isUsageLimitReached,
    refreshOcrUsage,
    canUseOcrOrShowLimit,
  };
}
