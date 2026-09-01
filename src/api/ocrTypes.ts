export type BlankItem = {
  id: number;
  word: string;
  meaningLong?: string;
};

export type OcrTableBlock = {
  rows: string[][];
};

export type LayoutBlock = {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

export type BlankCandidate = {
  id: string;
  text: string;
  page_index: number;
  x: number;
  y: number;
  width: number;
  height: number;
};

export type PageItem = {
  original_text: string;
  keywords: string[];
  tables?: OcrTableBlock[];
  layout_blocks?: LayoutBlock[];
  blank_candidates?: BlankCandidate[];
};

export type BlankItemSave = {
  blank_index: number;
  word: string;
  page_index: number;
  candidate_id?: string;
};

export type ScaffoldingPayload = {
  title: string;
  extractedText: string;
  blanks: BlankItem[];
  pages?: PageItem[];
  blankItems?: BlankItemSave[];
  layoutMeta?: Record<string, unknown>;
  imageUrl?: string | null;
  user_answers?: string[];
};

export type OcrResponse =
  | { status: "success"; original_text: string; keywords: string[] }
  | { status: "error"; message: string };

export type OcrUsageResponse = {
  status: "ok" | "limit_reached" | "error";
  pages_used: number;
  pages_limit: number;
  remaining: number;
  message?: string;
  is_unlimited?: boolean;
  plan?: "free" | "basic" | "pro";
  plan_limit?: number;
  page_bonus?: number;
  product_id?: string | null;
  is_subscribed?: boolean;
};

export type OcrProgressMessage = {
  type: "ocr_progress";
  status: "page_done" | "page_error";
  page: number;
  total_pages: number;
  filename?: string;
};

export type ReviewCardApiItem = {
  id: number;
  study_name: string;
  subject_name: string;
  ocr_preview?: string | null;
  created_at: string;
};

export type ReviewCardListResponse = {
  status?: string;
  message?: string;
  data?: ReviewCardApiItem[];
  has_more?: boolean;
};

export type SaveTestRequest = {
  subject_name: string;
  study_name?: string;
  original?: string;
  answers?: string[];
  pages?: PageItem[];
  blanks?: BlankItemSave[];
  user_answers?: string[];
  quiz?: string;
};

export type GradeStudyRequest = {
  quiz_id: number;
  correct_answers: string[];
  answer: string[];
  user_answer: string[];
  quiz_html: string;
  ocr_text: {
    pages: PageItem[];
    blanks: BlankItemSave[];
    quiz: { raw: string };
    layout_meta?: Record<string, unknown>;
  };
  page_correct_counts?: number[];
  page_question_counts?: number[];
  user_answers?: string[];
  study_name?: string;
  subject_name?: string;
  original_text?: string[];
  keywords?: string[];
  grade_cnt?: number;
};

export type GradeStudyResponse = {
  status: "success" | "error";
  score?: number;
  reward_given?: number;
  new_points?: number | null;
  message?: string;
};

export type QuizForReviewResponse = {
  status: string;
  data?: {
    quiz_id: number;
    title: string;
    extractedText: string;
    blanks: BlankItem[];
    user_answers?: string[];
    pages?: PageItem[];
    layout_meta?: Record<string, unknown>;
    image_url?: string | null;
  };
  message?: string;
};

export type WeeklyGrowthResponse = {
  labels: string[];
  data: number[];
};

export type MonthlyStatsResponse = {
  status: string;
  compare: {
    last_month_name: string;
    last_month_count: number;
    this_month_name: string;
    this_month_count: number;
    target_count: number;
    diff: number;
  };
};

export type ReviewStudyRequest = {
  quiz_id: number;
  user_answers: string[];
};

export type ReviewStudyResponse = {
  status: "success" | "error";
  new_points?: number;
  message?: string;
};

export type HintResponse = {
  status: string;
  quiz_id: number;
  data: Array<{
    h1: string;
    h2: string;
    h3: string;
  }>;
};
