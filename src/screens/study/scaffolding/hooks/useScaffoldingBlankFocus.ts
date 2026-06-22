import { useRef, type Dispatch, type MutableRefObject, type SetStateAction } from "react";
import { Keyboard, type TextInput, type View } from "react-native";

export function useScaffoldingBlankFocus({
  orderedSelectedBlanks,
  inputRefs,
  blankRefs,
  setActiveBlankId,
  setHintWord,
  setHintType,
  setHintPosition,
  closeHint,
}: {
  orderedSelectedBlanks: number[];
  inputRefs: MutableRefObject<Record<number, TextInput | null>>;
  blankRefs: MutableRefObject<Record<number, View | null>>;
  setActiveBlankId: Dispatch<SetStateAction<number | null>>;
  setHintWord: Dispatch<SetStateAction<number | null>>;
  setHintType: Dispatch<SetStateAction<"first" | "last" | "chosung" | null>>;
  setHintPosition: Dispatch<SetStateAction<{ x: number; y: number } | null>>;
  closeHint: () => void;
}) {
  const suppressPressAfterLongPressRef = useRef(false);

  const onLongPressBlank = (instanceId: number) => {
    suppressPressAfterLongPressRef.current = true;
    Keyboard.dismiss();
    inputRefs.current[instanceId]?.blur();
    setActiveBlankId(null);
    setHintWord(instanceId);
    setHintType(null);

    const blankRef = blankRefs.current[instanceId];
    if (blankRef) {
      blankRef.measure((fx, fy, width, height, px, py) => {
        setHintPosition({
          x: px + width / 2,
          y: py - 80,
        });
      });
    }
  };

  const onPressBlank = (instanceId: number) => {
    if (suppressPressAfterLongPressRef.current) {
      suppressPressAfterLongPressRef.current = false;
      return;
    }
    setActiveBlankId(instanceId);
    closeHint();
    requestAnimationFrame(() => inputRefs.current[instanceId]?.focus());
  };

  const focusAdjacentBlank = (instanceId: number, direction: 1 | -1 = 1) => {
    const currentIndex = orderedSelectedBlanks.indexOf(instanceId);
    if (currentIndex < 0) return;

    const nextInstanceId = orderedSelectedBlanks[currentIndex + direction];
    if (typeof nextInstanceId !== "number") {
      setActiveBlankId(null);
      inputRefs.current[instanceId]?.blur();
      return;
    }

    setActiveBlankId(nextInstanceId);
    closeHint();
    requestAnimationFrame(() => inputRefs.current[nextInstanceId]?.focus());
  };

  return {
    onLongPressBlank,
    onPressBlank,
    focusAdjacentBlank,
  };
}
