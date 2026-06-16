import { useEffect, useMemo, useState } from "react";
import { Image } from "react-native";
import type { BlankItemSave, PageItem, ScaffoldingPayload } from "../../api/ocr";
import type { StudySource } from "../input_data/studySource";
import {
  buildKeywordInstances,
  normalizeBlankWord,
  type KeywordOccurrence,
} from "./scaffoldingLogic";
import {
  buildPageRenderData,
  getPageRenderTokenEntries,
  type KeywordTokenWithId,
  type RenderTokenEntry,
} from "./scaffoldingRenderData";
import type { BlankItem } from "./scaffoldingTypes";
import { DEFAULT_PAGE_CANVAS_ASPECT_RATIO } from "./scaffoldingConstants";

export function useScaffoldingRenderModel({
  payload,
  sources,
  selectedIndex,
  isReviewMode,
}: {
  payload: ScaffoldingPayload | null;
  sources: StudySource[];
  selectedIndex: number;
  isReviewMode: boolean;
}) {
  const [blankDefs, setBlankDefs] = useState<BlankItem[]>([]);
  const [pageCanvasWidth, setPageCanvasWidth] = useState(0);
  const [pageCanvasAspectRatio, setPageCanvasAspectRatio] = useState(
    DEFAULT_PAGE_CANVAS_ASPECT_RATIO,
  );

  const title = payload?.title ?? "";
  const extractedText = payload?.extractedText ?? "";

  useEffect(() => {
    setBlankDefs(payload?.blanks ?? []);
  }, [payload?.blanks, payload?.extractedText]);

  useEffect(() => {
    const fallback = () =>
      setPageCanvasAspectRatio(DEFAULT_PAGE_CANVAS_ASPECT_RATIO);

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

  const keywordList = useMemo(() => blankDefs.map((blank) => blank.word), [blankDefs]);

  const baseInfoByWord = useMemo(() => {
    const map = new Map<string, BlankItem>();
    blankDefs.forEach((blank) => {
      if (!map.has(blank.word)) map.set(blank.word, blank);
    });
    return map;
  }, [blankDefs]);

  const sourcePages = useMemo<PageItem[]>(() => {
    if (payload?.pages && payload.pages.length > 0) {
      return payload.pages;
    }

    return [
      {
        original_text: extractedText,
        keywords: keywordList,
      },
    ];
  }, [payload?.pages, extractedText, keywordList]);

  const reviewBlankItems = useMemo<BlankItemSave[]>(
    () => (isReviewMode ? (payload?.blankItems ?? []) : []),
    [isReviewMode, payload?.blankItems],
  );

  const hasStructuredPages = useMemo(
    () =>
      sourcePages.some(
        (page) =>
          (page.layout_blocks?.length ?? 0) > 0 ||
          (page.tables?.length ?? 0) > 0,
      ),
    [sourcePages],
  );

  const pageRenderData = useMemo(
    () => buildPageRenderData({ sourcePages, keywordList, isReviewMode }),
    [sourcePages, keywordList, isReviewMode],
  );

  const tokens = useMemo(
    () =>
      pageRenderData.flatMap((page) =>
        getPageRenderTokenEntries(page).map((entry) => entry.token),
      ),
    [pageRenderData],
  );

  const keywordInstances = useMemo(() => {
    const keywordTokens = tokens.filter(
      (token): token is KeywordTokenWithId => token.type === "keyword",
    );
    return buildKeywordInstances(keywordTokens, blankDefs).map((instance) => ({
      ...instance,
      base: instance.base ?? baseInfoByWord.get(instance.word) ?? null,
    }));
  }, [tokens, blankDefs, baseInfoByWord]);

  const keywordOccurrenceOrder = useMemo<KeywordOccurrence[]>(
    () =>
      pageRenderData.flatMap((page) =>
        getPageRenderTokenEntries(page)
          .filter(
            (
              entry,
            ): entry is RenderTokenEntry & { token: KeywordTokenWithId } =>
              entry.token.type === "keyword",
          )
          .map((entry) => ({
            instanceId: entry.token.instanceId,
            pageIndex: entry.pageIndex,
            candidateId: entry.candidateId,
            normalizedWord: normalizeBlankWord(entry.token.baseWord),
          })),
      ),
    [pageRenderData],
  );

  const pageCanvasHeight =
    pageCanvasWidth > 0 ? pageCanvasWidth / pageCanvasAspectRatio : 0;

  return {
    title,
    extractedText,
    blankDefs,
    setBlankDefs,
    sourcePages,
    reviewBlankItems,
    hasStructuredPages,
    pageRenderData,
    tokens,
    keywordInstances,
    keywordOccurrenceOrder,
    pageCanvasWidth,
    setPageCanvasWidth,
    pageCanvasHeight,
  };
}
