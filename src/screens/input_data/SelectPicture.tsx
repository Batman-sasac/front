import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

import AppModalShell from "../../components/common/AppModalShell";
import AppPrimaryButton from "../../components/common/AppPrimaryButton";
import FloatingBackButton from "../../components/common/FloatingBackButton";
import {
  isImageStudySource,
  type StudySource,
} from "./studySource";
import SelectPictureCategorySection from "./selectPicture/components/SelectPictureCategorySection";
import SelectPictureCropOverlay from "./selectPicture/components/SelectPictureCropOverlay";
import SelectPictureSourcePreview from "./selectPicture/components/SelectPictureSourcePreview";
import { useSelectPictureCrop } from "./selectPicture/hooks/useSelectPictureCrop";
import type { SourceCropMap } from "./selectPicture/hooks/useSelectPictureCrop";
import { useSelectPictureOcrUsage } from "./selectPicture/hooks/useSelectPictureOcrUsage";
import { useStudyCategories } from "./selectPicture/hooks/useStudyCategories";
import { styles } from "./selectPicture/styles/SelectPicture.styles";

type Props = {
  sources: StudySource[];
  onBack: () => void;
  onStartLearning: (
    finalSources: StudySource[],
    ocrLoading?: boolean,
    subjectName?: string,
    cropByIndex?: SourceCropMap,
  ) => Promise<void>;
};

function getSourceKey(
  source: StudySource | null | undefined,
  fallbackIndex = 0,
) {
  if (source == null) return `empty-${fallbackIndex}`;
  return source.uri ? `uri-${source.uri}` : `source-${fallbackIndex}`;
}

export default function SelectPicture({
  sources,
  onBack,
  onStartLearning,
}: Props) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [rotation, setRotation] = useState(0);
  const [subjectName, setSubjectName] = useState("");
  const [isCropping, setIsCropping] = useState(false);

  const allSources = useMemo(() => sources || [], [sources]);
  const selectedSource = useMemo(() => {
    if (allSources.length === 0) return null;
    return allSources[Math.min(selectedIndex, allSources.length - 1)];
  }, [allSources, selectedIndex]);
  const isSelectedImage = isImageStudySource(selectedSource);
  const sourcesSessionKey = useMemo(
    () =>
      allSources.map((source, index) => getSourceKey(source, index)).join("|"),
    [allSources],
  );
  const selectedSourceKey = useMemo(
    () => getSourceKey(selectedSource, selectedIndex),
    [selectedIndex, selectedSource],
  );

  useEffect(() => {
    setSelectedIndex(0);
    setRotation(0);
    setSubjectName("");
  }, [sourcesSessionKey]);

  const {
    allCategories,
    customCategories,
    isAddingCategory,
    setIsAddingCategory,
    newCategoryName,
    setNewCategoryName,
    editingCategoryName,
    editCategoryName,
    setEditCategoryName,
    handleAddCategory,
    handleUpdateCategory,
    handleDeleteCategory,
    handleOpenCategoryEditor,
    handleCloseCategoryEditor,
    handleBeginAddingCategory,
  } = useStudyCategories({ subjectName, setSubjectName });

  const {
    ocrUsage,
    ocrUsageError,
    isUnlimitedUser,
    remainingOcr,
    limitReached,
    exceedsRemainingOcr,
    showOcrLimitModal,
    setShowOcrLimitModal,
  } = useSelectPictureOcrUsage(sources.length);

  const {
    setCropByIndex,
    isCropUiReady,
    setContainerSize,
    persistCurrentCropForIndex,
    getCropMapWithCurrentCrop,
    overlayStyles,
    moveResponder,
    topLeftResponder,
    topRightResponder,
    bottomLeftResponder,
    bottomRightResponder,
  } = useSelectPictureCrop({
    sources,
    sourcesSessionKey,
    selectedIndex,
    selectedSource,
    selectedSourceKey,
    isSelectedImage,
  });

  const cropImage = async () => {
    if (!selectedSource) return;

    const nextCropByIndex = getCropMapWithCurrentCrop();
    if (!nextCropByIndex) return;

    if (!selectedSource.uri) {
      await onStartLearning(sources, false, subjectName);
      return;
    }

    try {
      setIsCropping(true);
      const missingIndex = sources.findIndex((source, index) => {
        if (!isImageStudySource(source)) return false;
        return !nextCropByIndex[index];
      });

      if (missingIndex >= 0) {
        Alert.alert(
          "안내",
          "이미지로 선택한 자료는 모두 한 번씩 선택해 크롭 영역을 확인해 주세요.",
        );
        setCropByIndex(nextCropByIndex);
        setSelectedIndex(missingIndex);
        return;
      }

      await onStartLearning(sources, true, subjectName, nextCropByIndex);
    } catch (error) {
      console.error("Crop 에러:", error);
      alert("사진 자르기에 실패했습니다.");
    } finally {
      setIsCropping(false);
    }
  };

  const handleStart = () => {
    if (!selectedSource) return;

    if (limitReached) {
      Alert.alert(
        "텍스트 추출 사용 한도",
        ocrUsage?.message ?? "이용가능한 무료 횟수를 다 사용하셨습니다",
        [{ text: "확인", onPress: onBack }],
      );
      return;
    }

    if (!isUnlimitedUser && ocrUsage && sources.length > remainingOcr) {
      Alert.alert(
        "텍스트 추출 횟수 부족",
        `선택한 사진은 ${sources.length}장인데 남은 텍스트 추출 횟수는 ${remainingOcr}회예요. 사진 수를 줄인 뒤 다시 시도해 주세요.`,
        [{ text: "확인", onPress: onBack }],
      );
      return;
    }

    void cropImage();
  };

  const isCategoryReady = subjectName.trim().length > 0;
  const isReadyToStart =
    selectedSource != null &&
    isCategoryReady &&
    (!isSelectedImage || isCropUiReady);
  const isStartDisabled =
    sources.length === 0 ||
    isCropping ||
    limitReached ||
    exceedsRemainingOcr ||
    !isReadyToStart;

  return (
    <View style={styles.root}>
      <FloatingBackButton onPress={onBack} hitSlop={10} />

      <View style={styles.centerWrap}>
        <View style={styles.topContent}>
          <Text style={styles.guide}>
            {isSelectedImage
              ? "원하는 개념 한 가지만 포함되도록 잘라주세요."
              : "파일 자료는 크롭 없이 그대로 학습에 사용돼요."}
          </Text>
          <Text style={styles.guideSubtext}>
            학습시작 버튼을 누르면 시간이 조금 소요될 수 있어요.
          </Text>

          <View style={styles.usageSlot}>
            {ocrUsage && (
              <View style={styles.usageChip}>
                <Text style={styles.usageText}>
                  {isUnlimitedUser
                    ? "텍스트 추출 무제한 이용 가능"
                    : `텍스트 추출 남은 횟수 ${remainingOcr}/${ocrUsage.pages_limit}`}
                </Text>
              </View>
            )}
            {ocrUsageError && (
              <Text style={styles.usageErrorText}>{ocrUsageError}</Text>
            )}
            {limitReached && ocrUsage?.message && !ocrUsageError && (
              <Text style={styles.usageErrorText}>{ocrUsage.message}</Text>
            )}
          </View>

          <SelectPictureCategorySection
            subjectName={subjectName}
            onSelectCategory={setSubjectName}
            allCategories={allCategories}
            customCategories={customCategories}
            isAddingCategory={isAddingCategory}
            newCategoryName={newCategoryName}
            onChangeNewCategoryName={setNewCategoryName}
            onAddCategory={handleAddCategory}
            onBeginAddingCategory={handleBeginAddingCategory}
            onCancelAddingCategory={() => setIsAddingCategory(false)}
            onOpenCategoryEditor={handleOpenCategoryEditor}
          />

          <View style={styles.previewWrap}>
            {selectedSource ? (
              <View
                style={styles.previewInner}
                onLayout={(event) => {
                  const { width, height } = event.nativeEvent.layout;
                  setContainerSize(width, height);
                }}
              >
                {isSelectedImage ? (
                  <Image
                    source={{ uri: selectedSource.uri }}
                    style={[
                      styles.previewImage,
                      { transform: [{ rotate: `${rotation}deg` }] },
                    ]}
                    resizeMode="contain"
                  />
                ) : (
                  <SelectPictureSourcePreview source={selectedSource} />
                )}

                {isSelectedImage && isCropUiReady && (
                  <SelectPictureCropOverlay
                    overlayStyles={overlayStyles}
                    moveResponder={moveResponder}
                    topLeftResponder={topLeftResponder}
                    topRightResponder={topRightResponder}
                    bottomLeftResponder={bottomLeftResponder}
                    bottomRightResponder={bottomRightResponder}
                  />
                )}
              </View>
            ) : (
              <View style={styles.empty}>
                <Text style={styles.emptyText}>선택된 자료가 없습니다.</Text>
              </View>
            )}
          </View>

          <View style={styles.rotateRow}>
            {isSelectedImage ? (
              <Pressable
                style={styles.rotateBtnLeft}
                onPress={() => setRotation((current) => current - 90)}
                hitSlop={10}
              >
                <Image
                  source={require("../../../assets/turn-icon.png")}
                  style={styles.rotateIcon}
                  resizeMode="contain"
                />
              </Pressable>
            ) : (
              <View style={styles.rotateButtonSpacer} />
            )}

            <View style={styles.recentWrap}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.recentRow}
              >
                {allSources.map((source, index) => {
                  const active = index === selectedIndex;
                  return (
                    <Pressable
                      key={String(index)}
                      onPress={() => {
                        persistCurrentCropForIndex(selectedIndex);
                        setSelectedIndex(index);
                      }}
                      style={[
                        styles.thumbBtn,
                        active && styles.thumbBtnActive,
                      ]}
                    >
                      <SelectPictureSourcePreview
                        source={source}
                        isThumbnail
                      />
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            {isSelectedImage ? (
              <Pressable
                style={styles.rotateBtnRight}
                onPress={() => setRotation((current) => current + 90)}
                hitSlop={10}
              >
                <Image
                  source={require("../../../assets/turn-icon.png")}
                  style={[styles.rotateIcon, styles.rotateRight]}
                  resizeMode="contain"
                />
              </Pressable>
            ) : (
              <View style={styles.rotateButtonSpacer} />
            )}
          </View>
        </View>

        <Pressable
          style={[styles.fab, isStartDisabled && { opacity: 0.5 }]}
          onPress={handleStart}
          disabled={isStartDisabled}
        >
          <Image
            source={require("../../../assets/study/start-study-button.png")}
            style={styles.fabImage}
            resizeMode="contain"
          />
        </Pressable>

        <AppModalShell
          visible={showOcrLimitModal}
          onClose={() => setShowOcrLimitModal(false)}
          showCloseButton={false}
          backdropStyle={styles.modalOverlay}
          cardStyle={styles.modalBox}
        >
          <Text style={styles.modalTitle}>텍스트 추출 횟수 부족</Text>
          <Text style={styles.modalMessage}>
            선택한 자료가 {sources.length}개예요.
          </Text>
          <Text style={styles.modalMessage}>
            현재 남은 텍스트 추출 {remainingOcr}회 이하로 줄여주세요.
          </Text>
          <AppPrimaryButton
            style={styles.modalPrimaryButton}
            textStyle={styles.modalPrimaryText}
            onPress={() => {
              setShowOcrLimitModal(false);
              onBack();
            }}
          >
            확인
          </AppPrimaryButton>
        </AppModalShell>

        <AppModalShell
          visible={editingCategoryName != null}
          onClose={handleCloseCategoryEditor}
          title="카테고리 수정"
          cardStyle={styles.categoryModalBox}
        >
          <View style={styles.categoryModalContent}>
            <TextInput
              style={styles.categoryModalInput}
              value={editCategoryName}
              onChangeText={setEditCategoryName}
              placeholder="카테고리명"
              placeholderTextColor="#9CA3AF"
              maxLength={20}
              returnKeyType="done"
              onSubmitEditing={handleUpdateCategory}
            />
            <View style={styles.categoryModalButtons}>
              <Pressable
                style={[styles.categoryModalButton, styles.categorySaveButton]}
                onPress={handleUpdateCategory}
              >
                <Text style={styles.categorySaveText}>수정</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.categoryModalButton,
                  styles.categoryDeleteButton,
                ]}
                onPress={handleDeleteCategory}
              >
                <Text style={styles.categoryDeleteText}>삭제</Text>
              </Pressable>
            </View>
          </View>
        </AppModalShell>
      </View>
    </View>
  );
}
