import React from "react";
import { View, type PanResponderInstance } from "react-native";

import type { CropOverlayLayout } from "../logic/cropGeometry";
import { styles } from "../styles/SelectPicture.styles";

type SelectPictureCropOverlayProps = {
  overlayStyles: CropOverlayLayout;
  moveResponder: PanResponderInstance;
  topLeftResponder: PanResponderInstance;
  topRightResponder: PanResponderInstance;
  bottomLeftResponder: PanResponderInstance;
  bottomRightResponder: PanResponderInstance;
};

export default function SelectPictureCropOverlay({
  overlayStyles,
  moveResponder,
  topLeftResponder,
  topRightResponder,
  bottomLeftResponder,
  bottomRightResponder,
}: SelectPictureCropOverlayProps) {
  const frame = overlayStyles.frame;

  return (
    <View style={styles.cropArea}>
      <View
        style={[styles.maskTop, overlayStyles.top, { pointerEvents: "none" }]}
      />
      <View
        style={[
          styles.maskBottom,
          overlayStyles.bottom,
          { pointerEvents: "none" },
        ]}
      />
      <View
        style={[
          styles.maskLeft,
          overlayStyles.left,
          { pointerEvents: "none" },
        ]}
      />
      <View
        style={[
          styles.maskRight,
          overlayStyles.right,
          { pointerEvents: "none" },
        ]}
      />

      <View
        style={[styles.cropFrame, frame, { pointerEvents: "none" }]}
      >
        <View style={[styles.cropCornerTL, { pointerEvents: "none" }]} />
        <View style={[styles.cropCornerTR, { pointerEvents: "none" }]} />
        <View style={[styles.cropCornerBL, { pointerEvents: "none" }]} />
        <View style={[styles.cropCornerBR, { pointerEvents: "none" }]} />
      </View>

      <View
        style={[styles.cropMoveArea, frame]}
        {...moveResponder.panHandlers}
      />

      <View
        style={[
          styles.handle,
          { left: frame.left - 12, top: frame.top - 12 },
        ]}
        {...topLeftResponder.panHandlers}
      >
        <View style={[styles.handleDot, { pointerEvents: "none" }]} />
      </View>
      <View
        style={[
          styles.handle,
          {
            left: frame.left + frame.width - 12,
            top: frame.top - 12,
          },
        ]}
        {...topRightResponder.panHandlers}
      >
        <View style={[styles.handleDot, { pointerEvents: "none" }]} />
      </View>
      <View
        style={[
          styles.handle,
          {
            left: frame.left - 12,
            top: frame.top + frame.height - 12,
          },
        ]}
        {...bottomLeftResponder.panHandlers}
      >
        <View style={[styles.handleDot, { pointerEvents: "none" }]} />
      </View>
      <View
        style={[
          styles.handle,
          {
            left: frame.left + frame.width - 12,
            top: frame.top + frame.height - 12,
          },
        ]}
        {...bottomRightResponder.panHandlers}
      >
        <View style={[styles.handleDot, { pointerEvents: "none" }]} />
      </View>
    </View>
  );
}
