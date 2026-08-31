import React from "react";
import { ScrollView, View } from "react-native";

import OAuthWebView from "../../components/OAuthWebView";
import Sidebar from "../../components/Sidebar";
import MyPageModals from "../../components/mypage/MyPageModals";
import { confirmLogout } from "../../lib/auth";
import LinkedAccountsSection from "./components/LinkedAccountsSection";
import MyPageProfileSection from "./components/MyPageProfileSection";
import { useLinkedAccounts } from "./hooks/useLinkedAccounts";
import { useMyPageProfile } from "./hooks/useMyPageProfile";
import { useMyPageStats } from "./hooks/useMyPageStats";
import { styles } from "./styles/MyPageScreen.styles";

type Screen =
  | "home"
  | "league"
  | "alarm"
  | "mypage"
  | "takePicture"
  | "brushup";

type Props = {
  nickname: string;
  typeLabel: string;
  level: number;
  totalStudyCount: number;
  continuousDays: number;
  monthlyGoal: number | null;
  onNavigate: (screen: Screen) => void;
  onMonthlyGoalChange?: (goal: number) => void;
  onNicknameChange?: (nickname: string) => void;
  onWithdraw?: () => void;
  onLogout?: () => void;
  isSubscribed?: boolean;
  onPlanManage?: () => void;
};

export default function MyPageScreen({
  nickname,
  typeLabel,
  level,
  totalStudyCount,
  continuousDays,
  monthlyGoal,
  onNavigate,
  onMonthlyGoalChange,
  onNicknameChange,
  onWithdraw,
  onLogout,
  isSubscribed = false,
  onPlanManage,
}: Props) {
  const stats = useMyPageStats({
    totalStudyCount,
    continuousDays,
    monthlyGoal,
    onMonthlyGoalChange,
  });
  const profile = useMyPageProfile({ nickname, onNicknameChange });
  const accounts = useLinkedAccounts({ onWithdraw });

  const handleLogoutPress = () => {
    confirmLogout(() => {
      if (onLogout) onLogout();
      else onNavigate("home");
    });
  };

  return (
    <View style={styles.root}>
      <Sidebar
        activeScreen="mypage"
        onNavigate={onNavigate}
        onLogout={handleLogoutPress}
      />

      <ScrollView style={styles.main} contentContainerStyle={styles.mainContent}>
        <MyPageProfileSection
          nickname={profile.currentNickname}
          typeLabel={typeLabel}
          level={level}
          totalStudyCount={stats.totalStudyCountState}
          continuousDays={stats.continuousDaysState}
          monthlyGoal={stats.monthlyGoalState}
          isSubscribed={isSubscribed}
          onEditNickname={profile.handleOpenNicknameModal}
          onEditMonthlyGoal={() => stats.setShowMonthlyGoalModal(true)}
          onPlanManage={onPlanManage}
        />
        <LinkedAccountsSection
          kakaoEmail={accounts.kakaoEmail}
          naverEmail={accounts.naverEmail}
          appleEmail={accounts.appleEmail}
          onConnectKakao={accounts.handleConnectKakao}
          onConnectNaver={accounts.handleConnectNaver}
          onConnectApple={accounts.handleConnectApple}
          onDisconnect={accounts.tryDisconnect}
          onWithdraw={() => accounts.setShowWithdrawModal(true)}
        />
      </ScrollView>

      <MyPageModals
        showSingleDisconnect={accounts.showSingleDisconnectModal}
        showNickname={profile.showNicknameModal}
        showMonthlyGoal={stats.showMonthlyGoalModal}
        showWithdraw={accounts.showWithdrawModal}
        tempNickname={profile.tempNickname}
        tempGoal={stats.tempGoal}
        onTempNicknameChange={profile.setTempNickname}
        onTempGoalChange={stats.setTempGoal}
        onCloseSingleDisconnect={() =>
          accounts.setShowSingleDisconnectModal(false)
        }
        onCloseNickname={() => profile.setShowNicknameModal(false)}
        onCloseMonthlyGoal={() => stats.setShowMonthlyGoalModal(false)}
        onCloseWithdraw={() => accounts.setShowWithdrawModal(false)}
        onConfirmNickname={profile.handleNicknameChange}
        onConfirmMonthlyGoal={stats.handleConfirmMonthlyGoal}
        onConfirmWithdraw={async () => {
          accounts.setShowWithdrawModal(false);
          await accounts.handleWithdraw();
        }}
      />

      <OAuthWebView
        visible={accounts.showOAuthWebView}
        provider={accounts.oauthProvider}
        oauthUrl={accounts.oauthUrl}
        onCode={accounts.handleOAuthCode}
        onClose={() => accounts.setShowOAuthWebView(false)}
      />
    </View>
  );
}
