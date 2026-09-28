import { useEffect, useMemo, useRef, useState } from "react";
import { Image, PanResponder, type PanResponderInstance } from "react-native";

import {
  isImageStudySource,
  type StudySource,
} from "../../studySource";
import { MIN_CROP_BOX_SIZE } from "../constants";
import {
  clamp,
  EMPTY_CROP,
  getCropOverlayLayout,
  getDisplayRect,
  getPixelCrop,
  type CropRect,
  type DisplayRect,
  type PixelCrop,
} from "../logic/cropGeometry";

export type SourceCropMap = Record<number, PixelCrop>;

type UseSelectPictureCropParams = {
  sources: StudySource[];
  sourcesSessionKey: string;
  selectedIndex: number;
  selectedSource: StudySource | null;
  selectedSourceKey: string;
  isSelectedImage: boolean;
};

export function useSelectPictureCrop({
  sources,
  sourcesSessionKey,
  selectedIndex,
  selectedSource,
  selectedSourceKey,
  isSelectedImage,
}: UseSelectPictureCropParams) {
  const [containerWidth, setContainerWidth] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);
  const [imageWidth, setImageWidth] = useState(0);
  const [imageHeight, setImageHeight] = useState(0);
  const [isCropReady, setIsCropReady] = useState(false);
  const [crop, setCrop] = useState<CropRect>(EMPTY_CROP);
  const [cropByIndex, setCropByIndex] = useState<SourceCropMap>({});

  const displayRect = useMemo(
    () =>
      getDisplayRect(
        containerWidth,
        containerHeight,
        imageWidth,
        imageHeight,
      ),
    [containerWidth, containerHeight, imageWidth, imageHeight],
  );

  const cropRef = useRef<CropRect>(crop);
  const displayRef = useRef<DisplayRect>(displayRect);
  const containerRef = useRef({ w: 0, h: 0 });
  const imageRef = useRef({ w: 0, h: 0 });

  useEffect(() => {
    cropRef.current = crop;
  }, [crop]);

  useEffect(() => {
    displayRef.current = displayRect;
  }, [displayRect]);

  useEffect(() => {
    containerRef.current = { w: containerWidth, h: containerHeight };
  }, [containerWidth, containerHeight]);

  useEffect(() => {
    imageRef.current = { w: imageWidth, h: imageHeight };
  }, [imageWidth, imageHeight]);

  useEffect(() => {
    setCropByIndex({});
    setCrop(EMPTY_CROP);
    cropRef.current = EMPTY_CROP;
    setImageWidth(0);
    setImageHeight(0);
    setIsCropReady(false);
  }, [sourcesSessionKey]);

  useEffect(() => {
    setIsCropReady(false);
    setCrop(EMPTY_CROP);
    cropRef.current = EMPTY_CROP;
    setImageWidth(0);
    setImageHeight(0);

    if (!selectedSource) return;

    let cancelled = false;
    const uri =
      typeof selectedSource.uri === "string" ? selectedSource.uri : null;

    if (uri && isSelectedImage) {
      Image.getSize(
        uri,
        (width, height) => {
          if (!cancelled) {
            setImageWidth(width);
            setImageHeight(height);
          }
        },
        () => {
          if (!cancelled) {
            setImageWidth(0);
            setImageHeight(0);
          }
        },
      );
    }

    return () => {
      cancelled = true;
    };
  }, [isSelectedImage, selectedSource, selectedSourceKey]);

  useEffect(() => {
    if (!isSelectedImage) {
      setIsCropReady(false);
      setCrop(EMPTY_CROP);
      cropRef.current = EMPTY_CROP;
      return;
    }
    if (
      displayRect.dw <= 0 ||
      displayRect.dh <= 0 ||
      imageWidth <= 0 ||
      imageHeight <= 0
    ) {
      return;
    }

    const saved = cropByIndex[selectedIndex];
    const nextCrop = saved
      ? {
          x: displayRect.dx + (saved.px / imageWidth) * displayRect.dw,
          y: displayRect.dy + (saved.py / imageHeight) * displayRect.dh,
          w: (saved.pw / imageWidth) * displayRect.dw,
          h: (saved.ph / imageHeight) * displayRect.dh,
        }
      : {
          x: displayRect.dx,
          y: displayRect.dy,
          w: displayRect.dw,
          h: displayRect.dh,
        };

    setCrop(nextCrop);
    cropRef.current = nextCrop;
    setIsCropReady(true);
    containerRef.current = { w: containerWidth, h: containerHeight };
  }, [
    cropByIndex,
    displayRect.dh,
    displayRect.dw,
    displayRect.dx,
    displayRect.dy,
    imageHeight,
    imageWidth,
    isSelectedImage,
    selectedIndex,
    selectedSourceKey,
    containerHeight,
    containerWidth,
  ]);

  const getCurrentPixelCrop = () =>
    getPixelCrop(
      displayRef.current,
      cropRef.current,
      imageRef.current.w,
      imageRef.current.h,
    );

  const persistCurrentCropForIndex = (index: number) => {
    if (!isCropReady || !isImageStudySource(sources[index])) return;
    const pixelCrop = getCurrentPixelCrop();
    if (!pixelCrop) return;
    setCropByIndex((current) => ({ ...current, [index]: pixelCrop }));
  };

  const getCropMapWithCurrentCrop = (): SourceCropMap | null => {
    if (!isSelectedImage) return { ...cropByIndex };
    const pixelCrop = getCurrentPixelCrop();
    if (!pixelCrop) return null;
    return { ...cropByIndex, [selectedIndex]: pixelCrop };
  };

  const createMoveResponder = (): PanResponderInstance => {
    let start: CropRect = EMPTY_CROP;

    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        start = { ...cropRef.current };
      },
      onPanResponderMove: (_, gesture) => {
        const display = displayRef.current;
        const x = clamp(
          start.x + gesture.dx,
          display.dx,
          display.dx + display.dw - start.w,
        );
        const y = clamp(
          start.y + gesture.dy,
          display.dy,
          display.dy + display.dh - start.h,
        );

        setCrop((current) => ({ ...current, x, y }));
      },
    });
  };

  const createResizeResponder = (
    corner: "tl" | "tr" | "bl" | "br",
  ): PanResponderInstance => {
    let start: CropRect = EMPTY_CROP;

    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        start = { ...cropRef.current };
      },
      onPanResponderMove: (_, gesture) => {
        const display = displayRef.current;

        if (corner === "br") {
          setCrop((current) => ({
            ...current,
            w: clamp(
              start.w + gesture.dx,
              MIN_CROP_BOX_SIZE,
              display.dx + display.dw - start.x,
            ),
            h: clamp(
              start.h + gesture.dy,
              MIN_CROP_BOX_SIZE,
              display.dy + display.dh - start.y,
            ),
          }));
          return;
        }

        if (corner === "tr") {
          const y = clamp(
            start.y + gesture.dy,
            display.dy,
            start.y + start.h - MIN_CROP_BOX_SIZE,
          );
          setCrop({
            x: start.x,
            y,
            w: clamp(
              start.w + gesture.dx,
              MIN_CROP_BOX_SIZE,
              display.dx + display.dw - start.x,
            ),
            h: clamp(
              start.h - gesture.dy,
              MIN_CROP_BOX_SIZE,
              start.y + start.h - display.dy,
            ),
          });
          return;
        }

        if (corner === "bl") {
          const x = clamp(
            start.x + gesture.dx,
            display.dx,
            start.x + start.w - MIN_CROP_BOX_SIZE,
          );
          setCrop({
            x,
            y: start.y,
            w: clamp(
              start.w - gesture.dx,
              MIN_CROP_BOX_SIZE,
              start.x + start.w - display.dx,
            ),
            h: clamp(
              start.h + gesture.dy,
              MIN_CROP_BOX_SIZE,
              display.dy + display.dh - start.y,
            ),
          });
          return;
        }

        const x = clamp(
          start.x + gesture.dx,
          display.dx,
          start.x + start.w - MIN_CROP_BOX_SIZE,
        );
        const y = clamp(
          start.y + gesture.dy,
          display.dy,
          start.y + start.h - MIN_CROP_BOX_SIZE,
        );
        setCrop({
          x,
          y,
          w: clamp(
            start.w - gesture.dx,
            MIN_CROP_BOX_SIZE,
            start.x + start.w - display.dx,
          ),
          h: clamp(
            start.h - gesture.dy,
            MIN_CROP_BOX_SIZE,
            start.y + start.h - display.dy,
          ),
        });
      },
    });
  };

  const moveResponder = useRef(createMoveResponder()).current;
  const topLeftResponder = useRef(createResizeResponder("tl")).current;
  const topRightResponder = useRef(createResizeResponder("tr")).current;
  const bottomLeftResponder = useRef(createResizeResponder("bl")).current;
  const bottomRightResponder = useRef(createResizeResponder("br")).current;

  const overlayStyles = useMemo(
    () => getCropOverlayLayout(crop, containerWidth, containerHeight),
    [containerHeight, containerWidth, crop],
  );

  const isCropUiReady =
    isCropReady &&
    imageWidth > 0 &&
    imageHeight > 0 &&
    displayRect.dw > 0 &&
    displayRect.dh > 0 &&
    crop.w > 0 &&
    crop.h > 0;

  return {
    cropByIndex,
    setCropByIndex,
    isCropUiReady,
    setContainerSize: (width: number, height: number) => {
      setContainerWidth(width);
      setContainerHeight(height);
    },
    persistCurrentCropForIndex,
    getCropMapWithCurrentCrop,
    overlayStyles,
    moveResponder,
    topLeftResponder,
    topRightResponder,
    bottomLeftResponder,
    bottomRightResponder,
  };
}
