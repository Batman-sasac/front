import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from "react-native";
import { appColors, appShadow, scale, fontScale } from "../../styles/theme";
import Sidebar from "../../components/Sidebar";
import type { Screen } from "../../components/Sidebar";
import { confirmLogout } from "../../lib/auth";
import { deleteReviewCard, getReviewCards } from "../../api/ocr";
import { getCustomStudyCategories } from "../../lib/storage";
import AppConfirmDialog from "../../components/common/AppConfirmDialog";
import AppSearchBar from "../../components/common/AppSearchBar";
import BrushupSearchModal from "../../components/brushup/BrushupSearchModal";
import ReviewCard from "../../components/brushup/ReviewCard";
import SubjectFilterChip from "../../components/brushup/SubjectFilterChip";
import BrushupLoadingState from "../../components/brushup/BrushupLoadingState";
import BrushupEmptyState from "../../components/brushup/BrushupEmptyState";
import BrushupErrorState from "../../components/brushup/BrushupErrorState";
import BrushupLoadMoreButton from "../../components/brushup/BrushupLoadMoreButton";
import type { Card, Subject } from "../../components/brushup/types";
import AppLoadingState from "../../components/common/AppLoadingState";

export type { Card } from "../../components/brushup/types";

type Props = {
  onBack: () => void;
  onCardPress?: (card: Card) => void;
  onNavigate: (screen: Screen) => void;
  onLogout?: () => void;
};

const BASE_SUBJECTS: Subject[] = [
  { id: "all", icon: "", name: "전체", emoji: "" },
  { id: "korean", icon: "", name: "국어", emoji: "" },
  { id: "english", icon: "", name: "영어", emoji: "" },
  { id: "math", icon: "", name: "수학", emoji: "" },
  { id: "science", icon: "", name: "과학", emoji: "" },
  { id: "society", icon: "", name: "사회", emoji: "" },
  { id: "history", icon: "", name: "역사", emoji: "" },
  { id: "law", icon: "", name: "법", emoji: "" },
];

export default function BrushUPScreen({
  onBack,
  onCardPress,
  onNavigate,
  onLogout,
}: Props) {
  const [selectedSubject, setSelectedSubject] = React.useState("all");
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [cardToDelete, setCardToDelete] = useState<Card | null>(null);
  const [suppressCardPress, setSuppressCardPress] = useState(false);
  const [searchModalVisible, setSearchModalVisible] = useState(false);
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const PAGE_SIZE = 20;
  const subjects = React.useMemo<Subject[]>(
    () => {
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
    },
    [cards, customCategories],
  );

  // 복습 카드 로드
  useEffect(() => {
    void loadReviewCards(1, true);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadCustomCategories = async () => {
      const storedCategories = await getCustomStudyCategories();
      if (!cancelled) {
        setCustomCategories(storedCategories);
      }
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

  const loadReviewCards = async (nextPage: number, reset = false) => {
    try {
      if (reset) setLoading(true);
      else setLoadingMore(true);
      setLoadError(false);
      const data = await getReviewCards(nextPage, PAGE_SIZE);

      if (data.data && Array.isArray(data.data)) {
        // OCR 데이터를 카드 형식으로 변환
        const cardList: Card[] = data.data.map((item) => {
          // 경과 일수 계산
          const created = new Date(item.created_at);
          const now = new Date();
          const daysAgo = Math.floor(
            (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24),
          );

          return {
            id: String(item.id),
            title: item.study_name,
            subject: item.subject_name,
            description: item.ocr_preview || "학습 데이터",
            progress: 100, // 일단 100% 표시
            daysAgo: daysAgo,
            quiz_id: item.id,
          };
        });

        setCards((prev) => (reset ? cardList : [...prev, ...cardList]));
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

  const getSubjectIcon = (subjectName: string) => {
    const subject = subjects.find((s) => s.name === subjectName);
    return subject?.emoji ?? "";
  };

  const filteredCards =
    selectedSubject === "all"
      ? cards
      : cards.filter(
          (card) =>
            card.subject ===
            subjects.find((s) => s.id === selectedSubject)?.name,
        );

  const handleDeletePress = (card: Card) => {
    setSuppressCardPress(true);
    setCardToDelete(card);
    setDeleteModalVisible(true);
    setTimeout(() => setSuppressCardPress(false), 250);
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
      setCards((prevCards) =>
        prevCards.filter((c) => c.id !== cardToDelete.id),
      );
      setDeleteModalVisible(false);
      setCardToDelete(null);
    } catch (error) {
      console.error("삭제 오류:", error);
      alert("삭제 중 오류가 발생했습니다.");
    }
  };

  const handleCancelDelete = () => {
    setDeleteModalVisible(false);
    setCardToDelete(null);
  };

  return (
    <View style={styles.root}>
      {/* Sidebar */}
      <Sidebar
        activeScreen="brushup"
        onNavigate={(screen) => {
          if (screen === "home") {
            onBack();
            return;
          }
          onNavigate(screen);
        }}
        onLogout={() =>
          confirmLogout(() => {
            if (onLogout) onLogout();
            else onBack();
          })
        }
      />

      {/* 메인 콘텐츠 */}
      <View style={styles.mainContent}>
        {/* 상단 카드 컨테이너 */}
        <View style={styles.headerCard}>
          {/* 타이틀 */}
          <Text style={styles.pageTitle}>복습</Text>

          {/* 과목 필터 */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.subjectScroll}
          >
            {subjects.map((subject) => (
              <SubjectFilterChip
                key={subject.id}
                subject={subject}
                selected={selectedSubject === subject.id}
                onPress={() => setSelectedSubject(subject.id)}
              />
            ))}
          </ScrollView>

          {/* 검색 바 */}
          <AppSearchBar
            placeholder="검색어를 입력하세요."
            onSearchPress={() => setSearchModalVisible(true)}
            style={styles.searchBar}
          />
        </View>

        {/* 카드 목록 */}
        <ScrollView contentContainerStyle={styles.cardList}>
          {loading ? (
            <BrushupLoadingState />
          ) : loadError ? (
            <BrushupErrorState onRetry={() => void loadReviewCards(1, true)} />
          ) : filteredCards.length === 0 ? (
            <BrushupEmptyState />
          ) : (
            <>
              {filteredCards.map((card) => (
                <ReviewCard
                  key={card.id}
                  card={card}
                  subjectIcon={getSubjectIcon(card.subject)}
                  suppressPress={suppressCardPress}
                  onPress={(nextCard) => onCardPress?.(nextCard)}
                  onDeletePress={handleDeletePress}
                  onDeletePressIn={() => setSuppressCardPress(true)}
                />
              ))}

              {selectedSubject === "all" && (
                <>
                  {loadingMore && (
                    <AppLoadingState size="small" style={styles.loadMoreLoading} />
                  )}
                  {!loadingMore && hasMore && (
                    <BrushupLoadMoreButton onPress={() => void loadReviewCards(page + 1, false)} />
                  )}
                </>
              )}
            </>
          )}
        </ScrollView>
      </View>

      {/* 삭제 확인 모달 */}
      <AppConfirmDialog
        visible={deleteModalVisible}
        title="정말 삭제하시겠어요?"
        message={
          <>
            삭제한 기록은 복구할 수 없어요.{"\n"}그래도 삭제할까요?
          </>
        }
        cancelLabel="취소"
        confirmLabel="삭제"
        onCancel={handleCancelDelete}
        onConfirm={handleConfirmDelete}
      />

      <BrushupSearchModal
        visible={searchModalVisible}
        onClose={() => setSearchModalVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: appColors.screenBg,
  },
  mainContent: {
    flex: 1,
    paddingTop: scale(20),
  },
  loadMoreLoading: {
    alignSelf: "center",
    marginTop: scale(10),
    marginBottom: scale(24),
  },
  // 상단 카드 컨테이너
  headerCard: {
    backgroundColor: appColors.white,
    marginHorizontal: scale(20),
    marginBottom: scale(20),
    borderRadius: scale(20),
    padding: scale(24),
    ...appShadow.card,
  },
  pageTitle: {
    fontSize: fontScale(28),
    fontWeight: "900",
    color: appColors.text,
    marginBottom: scale(20),
  },
  // 검색 바
  searchBar: {
    marginTop: scale(16),
  },
  // 과목 필터 스크롤
  subjectScroll: {
    paddingBottom: scale(4),
    gap: scale(10),
  },
  // 카드 목록 레이아웃 (2열 그리드)
  cardList: {
    paddingHorizontal: scale(20),
    paddingTop: scale(4),
    paddingBottom: scale(24),
    gap: scale(14),
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
});
