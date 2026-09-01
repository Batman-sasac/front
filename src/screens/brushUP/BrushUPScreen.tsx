import React, { useState } from "react";
import { ScrollView, Text, View } from "react-native";

import AppConfirmDialog from "../../components/common/AppConfirmDialog";
import AppLoadingState from "../../components/common/AppLoadingState";
import AppSearchBar from "../../components/common/AppSearchBar";
import BrushupEmptyState from "../../components/brushup/BrushupEmptyState";
import BrushupErrorState from "../../components/brushup/BrushupErrorState";
import BrushupLoadMoreButton from "../../components/brushup/BrushupLoadMoreButton";
import BrushupLoadingState from "../../components/brushup/BrushupLoadingState";
import BrushupSearchModal from "../../components/brushup/BrushupSearchModal";
import ReviewCard from "../../components/brushup/ReviewCard";
import SubjectFilterChip from "../../components/brushup/SubjectFilterChip";
import type { Card } from "../../components/brushup/types";
import Sidebar, { type Screen } from "../../components/Sidebar";
import { confirmLogout } from "../../lib/auth";
import { useReviewCards } from "./hooks/useReviewCards";
import { styles } from "./styles/BrushUPScreen.styles";

export type { Card } from "../../components/brushup/types";

type Props = {
  onBack: () => void;
  onCardPress?: (card: Card) => void;
  onNavigate: (screen: Screen) => void;
  onLogout?: () => void;
};

export default function BrushUPScreen({
  onBack,
  onCardPress,
  onNavigate,
  onLogout,
}: Props) {
  const [searchModalVisible, setSearchModalVisible] = useState(false);
  const reviewCards = useReviewCards();

  const handleNavigate = (screen: Screen) => {
    if (screen === "home") {
      onBack();
      return;
    }
    onNavigate(screen);
  };

  const handleLogout = () => {
    confirmLogout(() => {
      if (onLogout) onLogout();
      else onBack();
    });
  };

  return (
    <View style={styles.root}>
      <Sidebar
        activeScreen="brushup"
        onNavigate={handleNavigate}
        onLogout={handleLogout}
      />

      <View style={styles.mainContent}>
        <View style={styles.headerCard}>
          <Text style={styles.pageTitle}>복습</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.subjectScroll}
          >
            {reviewCards.subjects.map((subject) => (
              <SubjectFilterChip
                key={subject.id}
                subject={subject}
                selected={reviewCards.selectedSubject === subject.id}
                onPress={() => reviewCards.setSelectedSubject(subject.id)}
              />
            ))}
          </ScrollView>
          <AppSearchBar
            placeholder="검색어를 입력하세요."
            onSearchPress={() => setSearchModalVisible(true)}
            style={styles.searchBar}
          />
        </View>

        <ScrollView contentContainerStyle={styles.cardList}>
          {reviewCards.loading ? (
            <BrushupLoadingState />
          ) : reviewCards.loadError ? (
            <BrushupErrorState
              onRetry={() => void reviewCards.loadReviewCards(1, true)}
            />
          ) : reviewCards.filteredCards.length === 0 ? (
            <BrushupEmptyState />
          ) : (
            <>
              {reviewCards.filteredCards.map((card) => (
                <ReviewCard
                  key={card.id}
                  card={card}
                  subjectIcon={reviewCards.getSubjectIcon(card.subject)}
                  suppressPress={reviewCards.suppressCardPress}
                  onPress={(nextCard) => onCardPress?.(nextCard)}
                  onDeletePress={reviewCards.handleDeletePress}
                  onDeletePressIn={reviewCards.handleDeletePressIn}
                />
              ))}

              {reviewCards.selectedSubject === "all" && (
                <>
                  {reviewCards.loadingMore && (
                    <AppLoadingState
                      size="small"
                      style={styles.loadMoreLoading}
                    />
                  )}
                  {!reviewCards.loadingMore && reviewCards.hasMore && (
                    <BrushupLoadMoreButton
                      onPress={() =>
                        void reviewCards.loadReviewCards(
                          reviewCards.page + 1,
                          false,
                        )
                      }
                    />
                  )}
                </>
              )}
            </>
          )}
        </ScrollView>
      </View>

      <AppConfirmDialog
        visible={reviewCards.deleteModalVisible}
        title="정말 삭제하시겠어요?"
        message={
          <>
            삭제한 기록은 복구할 수 없어요.{"\n"}그래도 삭제할까요?
          </>
        }
        cancelLabel="취소"
        confirmLabel="삭제"
        onCancel={reviewCards.handleCancelDelete}
        onConfirm={reviewCards.handleConfirmDelete}
      />

      <BrushupSearchModal
        visible={searchModalVisible}
        onClose={() => setSearchModalVisible(false)}
      />
    </View>
  );
}
