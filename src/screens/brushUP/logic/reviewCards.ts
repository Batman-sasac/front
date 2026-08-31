import type { ReviewCardApiItem } from "../../../api/ocr";
import type { Card, Subject } from "../../../components/brushup/types";
import { BASE_SUBJECTS } from "../constants";

export function mapReviewCardItems(
  items: ReviewCardApiItem[],
  now = new Date(),
): Card[] {
  return items.map((item) => {
    const created = new Date(item.created_at);
    const daysAgo = Math.floor(
      (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24),
    );

    return {
      id: String(item.id),
      title: item.study_name,
      subject: item.subject_name,
      description: item.ocr_preview || "학습 데이터",
      progress: 100,
      daysAgo,
      quiz_id: item.id,
    };
  });
}

export function buildBrushupSubjects(
  cards: Card[],
  customCategories: string[],
): Subject[] {
  const savedCardSubjects = new Set(cards.map((card) => card.subject));
  const visibleCustomCategories = customCategories.filter((category) =>
    savedCardSubjects.has(category),
  );

  return [
    ...BASE_SUBJECTS,
    ...visibleCustomCategories.map((category) => ({
      id: `custom-${category}`,
      icon: "",
      name: category,
      emoji: "",
    })),
  ];
}
