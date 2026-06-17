import React, { type ReactNode } from "react";
import {
  Pressable,
  Platform,
  ScrollView,
  Text,
  View,
  type GestureResponderHandlers,
  type LayoutRectangle,
} from "react-native";
import { scale } from "../../../../lib/layout";
import { styles } from "../styles/ScaffoldingScreen.styles";

type DragState = {
  text: string;
  box: { x: number; y: number; w: number; h: number };
};

export default function ScaffoldingStudyContent({
  hasStructuredPages,
  structuredContent,
  legacyContent,
  flowLayoutRef,
  dragResponder,
  dragSelection,
  dragConfirm,
  isReviewMode,
  pageIndicatorLabel,
  onFlowLayout,
  onConfirmDragSelection,
}: {
  hasStructuredPages: boolean;
  structuredContent: ReactNode;
  legacyContent: ReactNode;
  flowLayoutRef: React.MutableRefObject<LayoutRectangle | null>;
  dragResponder: { panHandlers: GestureResponderHandlers } | null;
  dragSelection: DragState | null;
  dragConfirm: DragState | null;
  isReviewMode: boolean;
  pageIndicatorLabel: string;
  onFlowLayout: (layout: LayoutRectangle) => void;
  onConfirmDragSelection: () => void;
}) {
  return (
    <>
      <View style={styles.rightCard}>
        <ScrollView
          contentContainerStyle={styles.textContainer}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
        >
          {hasStructuredPages ? (
            <View style={styles.pageList}>{structuredContent}</View>
          ) : (
            <View
              style={styles.flow}
              onLayout={(event) => onFlowLayout(event.nativeEvent.layout)}
              {...(dragResponder ? dragResponder.panHandlers : {})}
            >
              {legacyContent}
            </View>
          )}
        </ScrollView>
        {dragSelection?.box && flowLayoutRef.current && (
          <View
            style={[
              styles.dragSelectionBox,
              {
                left: flowLayoutRef.current.x + dragSelection.box.x,
                top: flowLayoutRef.current.y + dragSelection.box.y,
                width: dragSelection.box.w,
                height: dragSelection.box.h,
              },
            ]}
            pointerEvents="none"
          />
        )}
        {dragConfirm?.box && flowLayoutRef.current && (
          <Pressable
            style={[
              styles.dragConfirmBtn,
              {
                left:
                  flowLayoutRef.current.x +
                  dragConfirm.box.x +
                  dragConfirm.box.w / 2 -
                  scale(52),
                top: Math.max(
                  0,
                  flowLayoutRef.current.y + dragConfirm.box.y - scale(34),
                ),
              },
            ]}
            onPress={onConfirmDragSelection}
          >
            <Text style={styles.dragConfirmText}>빈칸 만들기</Text>
          </Pressable>
        )}
      </View>
      {!isReviewMode && (
        <View pointerEvents="none" style={styles.pageIndicatorWrap}>
          <Text style={styles.pageIndicatorText}>{pageIndicatorLabel}</Text>
        </View>
      )}
    </>
  );
}
