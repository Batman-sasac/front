import React from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";

import { styles } from "../styles/SelectPicture.styles";

type SelectPictureCategorySectionProps = {
  subjectName: string;
  onSelectCategory: (category: string) => void;
  allCategories: string[];
  customCategories: string[];
  isAddingCategory: boolean;
  newCategoryName: string;
  onChangeNewCategoryName: (value: string) => void;
  onAddCategory: () => void;
  onBeginAddingCategory: () => void;
  onCancelAddingCategory: () => void;
  onOpenCategoryEditor: (category: string) => void;
};

export default function SelectPictureCategorySection({
  subjectName,
  onSelectCategory,
  allCategories,
  customCategories,
  isAddingCategory,
  newCategoryName,
  onChangeNewCategoryName,
  onAddCategory,
  onBeginAddingCategory,
  onCancelAddingCategory,
  onOpenCategoryEditor,
}: SelectPictureCategorySectionProps) {
  return (
    <View style={styles.categorySection}>
      <Text style={styles.categoryLabel}>카테고리 선택</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoryRow}
      >
        {allCategories.map((category) => {
          const selected = subjectName === category;
          const isCustomCategory = customCategories.includes(category);

          return (
            <Pressable
              key={category}
              style={[
                styles.categoryButton,
                selected && styles.categoryButtonActive,
              ]}
              onPress={() => onSelectCategory(category)}
              onLongPress={
                isCustomCategory
                  ? () => onOpenCategoryEditor(category)
                  : undefined
              }
            >
              <Text
                style={[
                  styles.categoryButtonText,
                  selected && styles.categoryButtonTextActive,
                ]}
              >
                {category}
              </Text>
            </Pressable>
          );
        })}
        {isAddingCategory ? (
          <View style={styles.categoryInputWrap}>
            <TextInput
              style={styles.categoryInput}
              value={newCategoryName}
              onChangeText={onChangeNewCategoryName}
              placeholder="카테고리"
              placeholderTextColor="#9CA3AF"
              autoFocus
              maxLength={20}
              returnKeyType="done"
              onSubmitEditing={onAddCategory}
              onBlur={() => {
                if (!newCategoryName.trim()) {
                  onCancelAddingCategory();
                }
              }}
            />
          </View>
        ) : (
          <Pressable
            style={styles.categoryAddButton}
            onPress={onBeginAddingCategory}
          >
            <Text style={styles.categoryAddText}>+</Text>
          </Pressable>
        )}
      </ScrollView>
    </View>
  );
}
