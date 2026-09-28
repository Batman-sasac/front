import { useEffect, useMemo, useRef, useState } from "react";

import { deleteReviewCard, getReviewCards } from "../../../api/ocr";
import type { Card } from "../../../components/brushup/types";
import { getCustomStudyCategories } from "../../../lib/storage";
import { BRUSHUP_PAGE_SIZE } from "../constants";
import { buildBrushupSubjects, mapReviewCardItems } from "../logic/reviewCards";

export function useReviewCards() {
  const [selectedSubject, setSelectedSubject] = useState("all");
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [cardToDelete, setCardToDelete] = useState<Card | null>(null);
  const [suppressCardPress, setSuppressCardPress] = useState(false);
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const suppressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const subjects = useMemo(
    () => buildBrushupSubjects(cards, customCategories),
    [cards, customCategories],
  );

  const loadReviewCards = async (nextPage: number, reset = false) => {
    try {
      if (reset) setLoading(true);
      else setLoadingMore(true);
      setLoadError(false);

      const data = await getReviewCards(nextPage, BRUSHUP_PAGE_SIZE);
      if (Array.isArray(data.data)) {
        const cardList = mapReviewCardItems(data.data);
        setCards((current) => (reset ? cardList : [...current, ...cardList]));
        setPage(nextPage);
        setHasMore(Boolean(data.has_more));
      } else {
        console.error("카드 로드 실패:", data);
        if (reset) setCards([]);
        setHasMore(false);
      }
    } catch (error) {
      console.error("카드 로드 오류:", error);
      if (reset) {
        setCards([]);
        setLoadError(true);
      }
      setHasMore(false);
    } finally {
      if (reset) setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    void loadReviewCards(1, true);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const loadCustomCategories = async () => {
      const storedCategories = await getCustomStudyCategories();
      if (!cancelled) setCustomCategories(storedCategories);
    };
    void loadCustomCategories();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!subjects.some((subject) => subject.id === selectedSubject)) {
      setSelectedSubject("all");
    }
  }, [selectedSubject, subjects]);

  useEffect(
    () => () => {
      if (suppressTimerRef.current) clearTimeout(suppressTimerRef.current);
    },
    [],
  );

  const filteredCards = useMemo(
    () =>
      selectedSubject === "all"
        ? cards
        : cards.filter(
            (card) =>
              card.subject ===
              subjects.find((subject) => subject.id === selectedSubject)?.name,
          ),
    [cards, selectedSubject, subjects],
  );

  const handleDeletePress = (card: Card) => {
    setSuppressCardPress(true);
    setCardToDelete(card);
    setDeleteModalVisible(true);
    suppressTimerRef.current = setTimeout(() => {
      setSuppressCardPress(false);
      suppressTimerRef.current = null;
    }, 250);
  };

  const handleConfirmDelete = async () => {
    if (!cardToDelete) return;
    if (typeof cardToDelete.quiz_id !== "number") {
      alert("삭제할 카드 ID를 찾을 수 없습니다.");
      setDeleteModalVisible(false);
      setCardToDelete(null);
      return;
    }

    try {
      await deleteReviewCard(cardToDelete.quiz_id);
      setCards((current) =>
        current.filter((card) => card.id !== cardToDelete.id),
      );
      setDeleteModalVisible(false);
      setCardToDelete(null);
    } catch (error) {
      console.error("삭제 오류:", error);
      alert("삭제 중 오류가 발생했습니다.");
    }
  };

  return {
    selectedSubject,
    setSelectedSubject,
    deleteModalVisible,
    suppressCardPress,
    subjects,
    filteredCards,
    loading,
    page,
    hasMore,
    loadingMore,
    loadError,
    loadReviewCards,
    handleDeletePress,
    handleConfirmDelete,
    handleCancelDelete: () => {
      setDeleteModalVisible(false);
      setCardToDelete(null);
    },
    handleDeletePressIn: () => setSuppressCardPress(true),
    getSubjectIcon: (subjectName: string) =>
      subjects.find((subject) => subject.name === subjectName)?.emoji ?? "",
  };
}
