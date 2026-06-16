import { useState, type Dispatch, type SetStateAction } from "react";
import type { HintType } from "../../components/study/ScaffoldingHintModal";

const CHOSUNG = [
  "ㄱ",
  "ㄲ",
  "ㄴ",
  "ㄷ",
  "ㄸ",
  "ㄹ",
  "ㅁ",
  "ㅂ",
  "ㅃ",
  "ㅅ",
  "ㅆ",
  "ㅇ",
  "ㅈ",
  "ㅉ",
  "ㅊ",
  "ㅋ",
  "ㅌ",
  "ㅍ",
  "ㅎ",
] as const;

function getChosung(char: string): string {
  const code = char.charCodeAt(0) - 0xac00;
  if (code < 0 || code > 11171) return char;
  return CHOSUNG[Math.floor(code / 588)] ?? char;
}

function getChosungText(word: string): string {
  return word
    .split("")
    .map((char) => getChosung(char))
    .join("");
}

function getHintText(type: HintType, word: string) {
  if (type === "first") return word[0] || "";
  if (type === "last") return word[word.length - 1] || "";
  return getChosungText(word);
}

export function useScaffoldingHints({
  setAnswers,
}: {
  setAnswers: Dispatch<SetStateAction<Record<number, string>>>;
}) {
  const [hintWord, setHintWord] = useState<number | null>(null);
  const [hintType, setHintType] = useState<HintType | null>(null);
  const [hintPosition, setHintPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);

  const closeHint = () => {
    setHintWord(null);
    setHintType(null);
    setHintPosition(null);
  };

  const applyHint = (type: HintType, word: string, instanceId: number) => {
    setHintType(type);
    setAnswers((prev) => ({
      ...prev,
      [instanceId]: getHintText(type, word),
    }));
  };

  return {
    hintWord,
    hintType,
    hintPosition,
    setHintWord,
    setHintType,
    setHintPosition,
    closeHint,
    applyHint,
  };
}
