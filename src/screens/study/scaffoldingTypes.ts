import type { BlankItemSave, ScaffoldingPayload } from "../../api/ocr";
import type { StudySource } from "../input_data/studySource";

export type ScaffoldingStep =
  | "1-1"
  | "1-2"
  | "1-3"
  | "2-1"
  | "2-2"
  | "2-3"
  | "3-1"
  | "3-2"
  | "3-3";

export type GradeState = "idle" | "correct" | "wrong";

export type BlankItem = {
  id: number;
  word: string;
  meaningLong?: string;
};

export type SavePayload = {
  answers: string[];
  selectedBlankIds: number[];
  selectedBlankItems?: BlankItemSave[];
};

export type SaveResult = {
  earnedXp: number;
  totalEarnedXp?: number;
  handledCompletion?: boolean;
};

export type ScaffoldingScreenProps = {
  onBack: () => void;
  onBackFromCompletion?: () => void;
  sources: StudySource[];
  selectedIndex: number;
  payload: ScaffoldingPayload | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onSave?: (payload: SavePayload) => Promise<SaveResult | void>;
  initialRound?: ScaffoldingStep;
  reviewQuizId?: number | null;
  subjectName?: string;
  currentStudyIndex?: number;
  totalStudyCount?: number;
  accumulatedEarnedXp?: number;
};
