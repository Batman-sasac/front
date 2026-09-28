import { useState } from "react";
import { Alert } from "react-native";

import { updateNickname } from "../../../api/auth";
import { getErrorMessage } from "../../../app/error/errors";
import {
  getToken,
  getUserInfo,
  saveAuthData,
} from "../../../lib/storage";

type UseMyPageProfileParams = {
  nickname: string;
  onNicknameChange?: (nickname: string) => void;
};

export function useMyPageProfile({
  nickname,
  onNicknameChange,
}: UseMyPageProfileParams) {
  const [currentNickname, setCurrentNickname] = useState(nickname);
  const [tempNickname, setTempNickname] = useState(nickname);
  const [showNicknameModal, setShowNicknameModal] = useState(false);

  const handleOpenNicknameModal = () => {
    setTempNickname(currentNickname);
    setShowNicknameModal(true);
  };

  const handleNicknameChange = async () => {
    try {
      const token = await getToken();
      if (!token) {
        Alert.alert("오류", "로그인이 필요합니다.");
        return;
      }

      await updateNickname(token, tempNickname);
      const stored = await getUserInfo();
      await saveAuthData(token, stored.email ?? "", tempNickname);

      setCurrentNickname(tempNickname);
      onNicknameChange?.(tempNickname);
      setShowNicknameModal(false);
      Alert.alert("성공", "닉네임이 변경되었습니다.");
    } catch (error) {
      Alert.alert("오류", getErrorMessage(error, "닉네임 변경 실패"));
    }
  };

  return {
    currentNickname,
    tempNickname,
    setTempNickname,
    showNicknameModal,
    setShowNicknameModal,
    handleOpenNicknameModal,
    handleNicknameChange,
  };
}
