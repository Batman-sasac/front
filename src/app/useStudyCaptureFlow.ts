import { useState } from 'react';
import { Alert } from 'react-native';
import { manipulateAsync, SaveFormat, type Action } from 'expo-image-manipulator';

import { runOcr, type OcrProgressMessage, type OcrUsageResponse, type ScaffoldingPayload } from '../api/ocr';
import type { AppStep } from '../navigation/routes';
import type { StudySource } from '../screens/input_data/studySource';
import { getErrorMessage } from './errors';
import {
  createOcrJobId,
  getSourceDisplayName,
  type OcrProgressState,
  type SourceCropMap,
} from './studyFlow';

type UseStudyCaptureFlowParams = {
  setStep: (step: AppStep) => void;
  refreshOcrUsage: () => Promise<OcrUsageResponse | null>;
  ocrUsage: OcrUsageResponse | null;
};

const initialOcrProgressState: OcrProgressState = {
  completedPages: 0,
  totalPages: 0,
  activeSourceIndex: 0,
  activeSourceName: '',
  activeSourceCompletedPages: 0,
  activeSourceTotalPages: 0,
};

export default function useStudyCaptureFlow({
  setStep,
  refreshOcrUsage,
  ocrUsage,
}: UseStudyCaptureFlowParams) {
  const [selectedSourceIndex, setSelectedSourceIndex] = useState(0);
  const [subjectName, setSubjectName] = useState('');
  const [cropBySourceIndex, setCropBySourceIndex] = useState<SourceCropMap>({});
  const [capturedSources, setCapturedSources] = useState<StudySource[]>([]);
  const [scaffoldingPayload, setScaffoldingPayload] = useState<ScaffoldingPayload | null>(null);
  const [scaffoldingPayloads, setScaffoldingPayloads] = useState<ScaffoldingPayload[]>([]);
  const [scaffoldingLoading, setScaffoldingLoading] = useState(false);
  const [scaffoldingError, setScaffoldingError] = useState<string | null>(null);
  const [ocrProgressState, setOcrProgressState] = useState<OcrProgressState>(initialOcrProgressState);

  const resetStudyInputState = () => {
    setCapturedSources([]);
    setSelectedSourceIndex(0);
    setSubjectName('');
    setCropBySourceIndex({});
    setScaffoldingPayloads([]);
    setScaffoldingPayload(null);
    setScaffoldingError(null);
  };

  const prepareCapturedSources = (sources: StudySource[]) => {
    setCapturedSources(sources);
    setSelectedSourceIndex(0);
    setCropBySourceIndex({});
    setScaffoldingPayloads([]);
    setScaffoldingPayload(null);
    setScaffoldingError(null);
  };

  const clearCapturedSources = () => {
    setCapturedSources([]);
    setSelectedSourceIndex(0);
    setCropBySourceIndex({});
    setScaffoldingPayloads([]);
    setScaffoldingPayload(null);
    setScaffoldingError(null);
  };

  const prepareLearningStart = (
    sources: StudySource[],
    subject: string | undefined,
    cropMap: SourceCropMap | undefined,
  ) => {
    setCapturedSources(sources);
    if (subject) setSubjectName(subject);
    const nextCropMap = cropMap ?? {};
    setCropBySourceIndex(nextCropMap);
    setOcrProgressState({
      completedPages: 0,
      totalPages: Math.max(sources.length, 1),
      activeSourceIndex: 0,
      activeSourceName: getSourceDisplayName(sources[0], 0),
      activeSourceCompletedPages: 0,
      activeSourceTotalPages: 1,
    });
    return nextCropMap;
  };

  const runOcrForIndex = async (
    sources: StudySource[],
    index: number,
    cropMap: SourceCropMap,
  ) => {
    const target = sources[index];
    const uri = target?.uri;

    if (!uri) {
      throw new Error(`${index + 1}번째 이미지 URI를 찾을 수 없습니다.`);
    }

    const mimeType = target?.mimeType ?? '';
    const isImage = typeof mimeType === 'string' ? mimeType.startsWith('image/') : false;
    const cropInfo = cropMap[index];

    let uploadUri = uri;
    let uploadMimeType = target?.mimeType ?? undefined;
    let uploadFileName = target?.name ?? undefined;
    let shouldSendCropInfo = true;

    if (isImage) {
      try {
        const actions: Action[] = [];

        if (cropInfo && cropInfo.pw > 0 && cropInfo.ph > 0) {
          actions.push({
            crop: {
              originX: Math.max(0, Math.round(cropInfo.px)),
              originY: Math.max(0, Math.round(cropInfo.py)),
              width: Math.max(1, Math.round(cropInfo.pw)),
              height: Math.max(1, Math.round(cropInfo.ph)),
            },
          });
        }

        actions.push({ resize: { width: 2000 } });

        const result = await manipulateAsync(uploadUri, actions, {
          compress: 0.82,
          format: SaveFormat.JPEG,
        });

        if (result?.uri) {
          uploadUri = result.uri;
          uploadMimeType = 'image/jpeg';
          uploadFileName = `ocr_${Date.now()}.jpg`;
          shouldSendCropInfo = false;
        }
      } catch (error) {
        console.warn('OCR 업로드 전 이미지 전처리 실패, 원본으로 진행:', error);
      }
    }

    const jobId = createOcrJobId();

    return runOcr(uploadUri, shouldSendCropInfo ? cropInfo : undefined, {
      fileName: uploadFileName,
      mimeType: uploadMimeType,
      jobId,
      onProgress: (message: OcrProgressMessage) => {
        if (message.status !== 'page_done') return;
        setOcrProgressState((prev) => {
          const completedBeforeActive = prev.activeSourceIndex === index
            ? Math.max(prev.completedPages - prev.activeSourceCompletedPages, 0)
            : Math.min(prev.completedPages, prev.totalPages);
          const nextActiveCompletedPages = Math.max(0, message.page ?? 0);
          const nextActiveTotalPages = Math.max(message.total_pages ?? 0, nextActiveCompletedPages, 1);
          const nextCompletedPages = completedBeforeActive + nextActiveCompletedPages;
          const nextTotalPages = completedBeforeActive + nextActiveTotalPages + Math.max(sources.length - index - 1, 0);

          return {
            completedPages: nextCompletedPages,
            totalPages: nextTotalPages,
            activeSourceIndex: index,
            activeSourceName: message.filename || getSourceDisplayName(target, index),
            activeSourceCompletedPages: nextActiveCompletedPages,
            activeSourceTotalPages: nextActiveTotalPages,
          };
        });
      },
    });
  };

  const preloadScaffoldingPayloads = async (
    sources: StudySource[],
    cropMap: SourceCropMap,
  ) => {
    setScaffoldingLoading(true);
    setScaffoldingError(null);
    setScaffoldingPayload(null);
    setScaffoldingPayloads([]);
    setSelectedSourceIndex(0);
    setOcrProgressState({
      completedPages: 0,
      totalPages: Math.max(sources.length, 1),
      activeSourceIndex: 0,
      activeSourceName: getSourceDisplayName(sources[0], 0),
      activeSourceCompletedPages: 0,
      activeSourceTotalPages: 1,
    });

    try {
      const nextPayloads: ScaffoldingPayload[] = [];
      for (let i = 0; i < sources.length; i += 1) {
        setOcrProgressState((prev) => ({
          ...prev,
          activeSourceIndex: i,
          activeSourceName: getSourceDisplayName(sources[i], i),
          activeSourceCompletedPages: 0,
          activeSourceTotalPages: prev.activeSourceIndex === i ? prev.activeSourceTotalPages : 1,
        }));
        const payload = await runOcrForIndex(sources, i, cropMap);
        nextPayloads.push(payload);
        const actualPages = Math.max(payload.pages?.length ?? 0, 1);
        const completedBeforeCurrent = nextPayloads
          .slice(0, -1)
          .reduce((sum, item) => sum + Math.max(item.pages?.length ?? 0, 1), 0);
        const remainingMinPages = Math.max(sources.length - i - 1, 0);

        setOcrProgressState({
          completedPages: completedBeforeCurrent + actualPages,
          totalPages: completedBeforeCurrent + actualPages + remainingMinPages,
          activeSourceIndex: i,
          activeSourceName: getSourceDisplayName(sources[i], i),
          activeSourceCompletedPages: actualPages,
          activeSourceTotalPages: actualPages,
        });
      }

      setScaffoldingPayloads(nextPayloads);
      setSelectedSourceIndex(0);
      setScaffoldingPayload(nextPayloads[0] ?? null);
      setOcrProgressState((prev) => ({
        ...prev,
        completedPages: Math.max(prev.totalPages, prev.completedPages, 1),
        totalPages: Math.max(prev.totalPages, prev.completedPages, 1),
      }));
      await new Promise((resolve) => setTimeout(resolve, 420));
      setStep('studyIntro');
    } catch (error: unknown) {
      const message = getErrorMessage(error, '텍스트 추출에 실패했습니다.');
      setScaffoldingPayload(null);
      setScaffoldingError(message);

      if (message.includes('무료 횟수')) {
        const latestUsage = (await refreshOcrUsage()) ?? ocrUsage;
        if (!latestUsage?.is_unlimited) {
          Alert.alert('텍스트 추출 사용 한도', message);
          setStep('home');
          return;
        }
      }

      Alert.alert('텍스트 추출 오류', message);
      setStep('home');
    } finally {
      setScaffoldingLoading(false);
    }
  };

  return {
    selectedSourceIndex,
    setSelectedSourceIndex,
    subjectName,
    setSubjectName,
    cropBySourceIndex,
    setCropBySourceIndex,
    capturedSources,
    setCapturedSources,
    scaffoldingPayload,
    setScaffoldingPayload,
    scaffoldingPayloads,
    setScaffoldingPayloads,
    scaffoldingLoading,
    setScaffoldingLoading,
    scaffoldingError,
    setScaffoldingError,
    ocrProgressState,
    setOcrProgressState,
    resetStudyInputState,
    prepareCapturedSources,
    clearCapturedSources,
    prepareLearningStart,
    runOcrForIndex,
    preloadScaffoldingPayloads,
  };
}
