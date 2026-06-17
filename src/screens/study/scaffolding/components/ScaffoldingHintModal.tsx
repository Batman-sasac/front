import React from "react";
import { Modal, Pressable, Text, View } from "react-native";
import SpeechBubbleShell from "../../../../components/SpeechBubbleShell";
import { HINT_BUBBLE_WIDTH } from "../logic/scaffoldingConstants";
import { styles } from "../styles/ScaffoldingScreen.styles";

export type HintType = "first" | "last" | "chosung";

type HintTarget = {
  instanceId: number;
  word: string;
};

export default function ScaffoldingHintModal({
  target,
  hintType,
  hintPosition,
  onClose,
  onApplyHint,
}: {
  target: HintTarget | null;
  hintType: HintType | null;
  hintPosition: { x: number; y: number } | null;
  onClose: () => void;
  onApplyHint: (type: HintType, word: string, instanceId: number) => void;
}) {
  if (!target) return null;

  return (
    <Modal visible transparent onRequestClose={onClose}>
      <Pressable style={styles.hintModalOverlay} onPress={onClose}>
        <View
          style={[
            styles.hintBalloonContainer,
            hintPosition && {
              position: "absolute" as const,
              top: hintPosition.y,
              left: hintPosition.x,
              transform: [{ translateX: -(HINT_BUBBLE_WIDTH / 2) }],
            },
          ]}
        >
          <SpeechBubbleShell
            width={HINT_BUBBLE_WIDTH}
            minHeightRatio={86 / 505}
            tailRatio={34 / 505}
            bubbleStyle={styles.hintBalloonBubble}
          >
            <View style={styles.hintContent}>
              {(["first", "last", "chosung"] as const).map((type, index) => {
                const active = hintType === type;

                return (
                  <Pressable
                    key={type}
                    style={[
                      styles.hintButton,
                      active && styles.hintButtonActive,
                      !active && styles.hintButtonInactive,
                    ]}
                    onPress={() => onApplyHint(type, target.word, target.instanceId)}
                  >
                    <Text
                      style={[
                        styles.hintButtonText,
                        active && styles.hintButtonTextActive,
                        !active && styles.hintButtonTextInactive,
                      ]}
                    >
                      {`H${index + 1}`}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </SpeechBubbleShell>
        </View>
      </Pressable>
    </Modal>
  );
}
