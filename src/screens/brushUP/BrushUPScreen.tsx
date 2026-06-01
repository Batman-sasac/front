import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
  Modal,
  ActivityIndicator,
} from "react-native";
import { scale, fontScale } from "../../lib/layout";
import Sidebar from "../../components/Sidebar";
import config from "../../lib/config";
import { getToken } from "../../lib/storage";
import type { Screen } from "../../components/Sidebar";
import { confirmLogout } from "../../lib/auth";
import AppConfirmDialog from "../../components/common/AppConfirmDialog";
import AppSearchBar from "../../components/common/AppSearchBar";
import ReviewCard from "../../components/brushup/ReviewCard";
import SubjectFilterChip from "../../components/brushup/SubjectFilterChip";
import BrushupLoadingState from "../../components/brushup/BrushupLoadingState";
import BrushupEmptyState from "../../components/brushup/BrushupEmptyState";
import BrushupLoadMoreButton from "../../components/brushup/BrushupLoadMoreButton";
import type { Card, Subject } from "../../components/brushup/types";

export type { Card } from "../../components/brushup/types";

const API_BASE_URL = config.apiBaseUrl;

type Props = {
  onBack: () => void;
  onCardPress?: (card: Card) => void;
  onNavigate: (screen: Screen) => void;
  onLogout?: () => void;
};

const SUBJECTS: Subject[] = [
  { id: "all", icon: "📚", name: "전체", emoji: "📚" },
  { id: "korean", icon: "📖", name: "국어", emoji: "📖" },
  { id: "english", icon: "abc", name: "영어", emoji: "abc" },
  { id: "math", icon: "🧮", name: "수학", emoji: "🧮" },
  { id: "science", icon: "🔬", name: "과학", emoji: "🔬" },
  { id: "society", icon: "🌍", name: "사회", emoji: "🌍" },
  { id: "history", icon: "🏺", name: "역사", emoji: "🏺" },
  { id: "law", icon: "⚖️", name: "법", emoji: "⚖️" },
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
  const PAGE_SIZE = 20;

  // 복습 카드 로드
  useEffect(() => {
    void loadReviewCards(1, true);
  }, []);

  const loadReviewCards = async (nextPage: number, reset = false) => {
    try {
      if (reset) setLoading(true);
      else setLoadingMore(true);
      const token = await getToken();

      // /ocr/list에서 복습 카드 데이터 조회
      const response = await fetch(
        `${API_BASE_URL}/ocr/list?page=${nextPage}&size=${PAGE_SIZE}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const data = await response.json();

      if (data.data && Array.isArray(data.data)) {
        // OCR 데이터를 카드 형식으로 변환
        const cardList: Card[] = data.data.map((item: any) => {
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
      if (reset) setCards([]);
      setHasMore(false);
    } finally {
      if (reset) setLoading(false);
      setLoadingMore(false);
    }
  };

  const getSubjectIcon = (subjectName: string) => {
    const subject = SUBJECTS.find((s) => s.name === subjectName);
    return subject?.emoji ?? "📚";
  };

  const filteredCards =
    selectedSubject === "all"
      ? cards
      : cards.filter(
          (card) =>
            card.subject ===
            SUBJECTS.find((s) => s.id === selectedSubject)?.name,
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
      const token = await getToken();
      const response = await fetch(
        `${API_BASE_URL}/ocr/ocr-data/delete/${cardToDelete.quiz_id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (response.ok) {
        // 카드 목록에서 제거
        setCards((prevCards) =>
          prevCards.filter((c) => c.id !== cardToDelete.id),
        );
        setDeleteModalVisible(false);
        setCardToDelete(null);
      } else {
        console.error("삭제 실패:", await response.text());
        alert("삭제에 실패했습니다.");
      }
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
            {SUBJECTS.map((subject) => (
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
                    <View style={styles.loadMoreLoading}>
                      <ActivityIndicator size="small" color="#5E82FF" />
                    </View>
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

      {/* 검색 모달 */}
      <Modal
        visible={searchModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setSearchModalVisible(false)}
      >
        <View style={styles.searchModalContainer}>
          <View style={styles.searchModalContent}>
            <View style={styles.searchModalHeader}>
              <Text style={styles.searchModalTitle}>카드 검색</Text>
              <Pressable onPress={() => setSearchModalVisible(false)}>
                <Image
                  source={require("../../../assets/delete.png")}
                  style={styles.searchModalCloseIcon}
                  resizeMode="contain"
                />
              </Pressable>
            </View>

            <View style={styles.searchInputContainer}>
              <Text style={styles.searchIcon}>🔎</Text>
              <Text style={styles.searchPlaceholder}>검색어를 입력하세요.</Text>
            </View>

            <Text style={styles.searchHint}>
              제목, 과목명, 설명에서 검색할 수 있어요.
            </Text>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "#F6F7FB",
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
    backgroundColor: "#FFFFFF",
    marginHorizontal: scale(20),
    marginBottom: scale(20),
    borderRadius: scale(20),
    padding: scale(24),
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  pageTitle: {
    fontSize: fontScale(28),
    fontWeight: "900",
    color: "#111827",
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
  searchModalContainer: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  searchModalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: scale(24),
    borderTopRightRadius: scale(24),
    padding: scale(24),
    minHeight: scale(300),
  },
  searchModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: scale(20),
  },
  searchModalTitle: {
    fontSize: fontScale(22),
    fontWeight: "800",
    color: "#111827",
  },
  searchModalCloseIcon: {
    width: scale(24),
    height: scale(24),
  },
  searchInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    borderRadius: scale(12),
    padding: scale(16),
    gap: scale(12),
    marginBottom: scale(12),
  },
  searchIcon: {
    fontSize: fontScale(20),
  },
  searchPlaceholder: {
    fontSize: fontScale(16),
    color: "#9CA3AF",
    flex: 1,
  },
  searchHint: {
    fontSize: fontScale(13),
    color: "#9CA3AF",
    textAlign: "center",
  },
});
