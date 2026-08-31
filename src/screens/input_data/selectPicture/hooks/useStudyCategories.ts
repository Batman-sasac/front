import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { Alert } from "react-native";

import {
  getCustomStudyCategories,
  setCustomStudyCategories,
} from "../../../../lib/storage";
import { STUDY_CATEGORIES } from "../constants";

type UseStudyCategoriesParams = {
  subjectName: string;
  setSubjectName: Dispatch<SetStateAction<string>>;
};

const normalizeCategoryName = (value: string) =>
  value.trim().replace(/\s+/g, " ");

export function useStudyCategories({
  subjectName,
  setSubjectName,
}: UseStudyCategoriesParams) {
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [editingCategoryName, setEditingCategoryName] = useState<string | null>(
    null,
  );
  const [editCategoryName, setEditCategoryName] = useState("");

  const allCategories = useMemo(
    () => [...STUDY_CATEGORIES, ...customCategories],
    [customCategories],
  );

  useEffect(() => {
    let cancelled = false;

    const loadCustomCategories = async () => {
      const storedCategories = await getCustomStudyCategories();
      if (!cancelled) {
        setCustomCategories(storedCategories);
      }
    };

    loadCustomCategories();
    return () => {
      cancelled = true;
    };
  }, []);

  const saveCustomCategoryList = async (nextCategories: string[]) => {
    setCustomCategories(nextCategories);
    await setCustomStudyCategories(nextCategories);
  };

  const handleAddCategory = async () => {
    const nextName = normalizeCategoryName(newCategoryName);
    if (!nextName) return;
    if (allCategories.includes(nextName)) {
      Alert.alert("안내", "이미 있는 카테고리입니다.");
      return;
    }

    await saveCustomCategoryList([...customCategories, nextName]);
    setSubjectName(nextName);
    setNewCategoryName("");
    setIsAddingCategory(false);
  };

  const handleUpdateCategory = async () => {
    if (!editingCategoryName) return;

    const nextName = normalizeCategoryName(editCategoryName);
    if (!nextName) return;
    if (
      STUDY_CATEGORIES.includes(nextName as (typeof STUDY_CATEGORIES)[number])
    ) {
      Alert.alert("안내", "기본 카테고리와 같은 이름은 사용할 수 없습니다.");
      return;
    }
    if (
      customCategories.some(
        (category) => category !== editingCategoryName && category === nextName,
      )
    ) {
      Alert.alert("안내", "이미 있는 카테고리입니다.");
      return;
    }

    const nextCategories = customCategories.map((category) =>
      category === editingCategoryName ? nextName : category,
    );
    await saveCustomCategoryList(nextCategories);
    if (subjectName === editingCategoryName) {
      setSubjectName(nextName);
    }
    setEditingCategoryName(null);
    setEditCategoryName("");
  };

  const handleDeleteCategory = async () => {
    if (!editingCategoryName) return;

    await saveCustomCategoryList(
      customCategories.filter((category) => category !== editingCategoryName),
    );
    if (subjectName === editingCategoryName) {
      setSubjectName("");
    }
    setEditingCategoryName(null);
    setEditCategoryName("");
  };

  const handleOpenCategoryEditor = (category: string) => {
    setEditingCategoryName(category);
    setEditCategoryName(category);
  };

  const handleCloseCategoryEditor = () => {
    setEditingCategoryName(null);
    setEditCategoryName("");
  };

  const handleBeginAddingCategory = () => {
    setNewCategoryName("");
    setIsAddingCategory(true);
  };

  return {
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
  };
}
