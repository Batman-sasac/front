export type CropRect = { x: number; y: number; w: number; h: number };

export type DisplayRect = { dx: number; dy: number; dw: number; dh: number };

export type PixelCrop = {
  px: number;
  py: number;
  pw: number;
  ph: number;
};

export type CropOverlayLayout = {
  top: { height: number };
  bottom: { top: number; height: number };
  left: { top: number; height: number; width: number };
  right: { left: number; top: number; height: number; width: number };
  frame: { left: number; top: number; width: number; height: number };
};

export const EMPTY_CROP: CropRect = { x: 0, y: 0, w: 0, h: 0 };

export function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export function getDisplayRect(
  containerWidth: number,
  containerHeight: number,
  imageWidth: number,
  imageHeight: number,
): DisplayRect {
  if (containerWidth <= 0 || containerHeight <= 0) {
    return { dx: 0, dy: 0, dw: 0, dh: 0 };
  }
  if (imageWidth <= 0 || imageHeight <= 0) {
    return { dx: 0, dy: 0, dw: containerWidth, dh: containerHeight };
  }

  const scale = Math.min(
    containerWidth / imageWidth,
    containerHeight / imageHeight,
  );
  const displayWidth = imageWidth * scale;
  const displayHeight = imageHeight * scale;

  return {
    dx: (containerWidth - displayWidth) / 2,
    dy: (containerHeight - displayHeight) / 2,
    dw: displayWidth,
    dh: displayHeight,
  };
}
export function getPixelCrop(
  display: DisplayRect,
  crop: CropRect,
  imageWidth: number,
  imageHeight: number,
): PixelCrop | null {
  if (
    display.dw <= 0 ||
    display.dh <= 0 ||
    imageWidth <= 0 ||
    imageHeight <= 0
  ) {
    return null;
  }

  return {
    px: Math.round(((crop.x - display.dx) / display.dw) * imageWidth),
    py: Math.round(((crop.y - display.dy) / display.dh) * imageHeight),
    pw: Math.round((crop.w / display.dw) * imageWidth),
    ph: Math.round((crop.h / display.dh) * imageHeight),
  };
}

export function getCropOverlayLayout(
  crop: CropRect,
  containerWidth: number,
  containerHeight: number,
): CropOverlayLayout {
  const frameLeft = clamp(Math.round(crop.x), 0, containerWidth);
  const frameTop = clamp(Math.round(crop.y), 0, containerHeight);
  const frameWidth = clamp(
    Math.round(crop.w),
    0,
    Math.max(containerWidth - frameLeft, 0),
  );
  const frameHeight = clamp(
    Math.round(crop.h),
    0,
    Math.max(containerHeight - frameTop, 0),
  );
  const bottomTop = clamp(frameTop + frameHeight, 0, containerHeight);
  const rightLeft = clamp(frameLeft + frameWidth, 0, containerWidth);

  return {
    top: { height: frameTop },
    bottom: {
      top: bottomTop,
      height: clamp(containerHeight - bottomTop, 0, containerHeight),
    },
    left: { top: frameTop, height: frameHeight, width: frameLeft },
    right: {
      left: rightLeft,
      top: frameTop,
      height: frameHeight,
      width: clamp(containerWidth - rightLeft, 0, containerWidth),
    },
    frame: {
      left: frameLeft,
      top: frameTop,
      width: frameWidth,
      height: frameHeight,
    },
  };
}
