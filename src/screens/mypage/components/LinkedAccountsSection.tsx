import React from "react";
import { Image, Pressable, Text, View, type ViewStyle } from "react-native";

import { styles } from "../styles/MyPageScreen.styles";

type LinkedProvider = "kakao" | "naver" | "apple";

type LinkedAccountsSectionProps = {
  kakaoEmail: string | null;
  naverEmail: string | null;
  appleEmail: string | null;
  onConnectKakao: () => void;
  onConnectNaver: () => void;
  onConnectApple: () => void;
  onDisconnect: (provider: LinkedProvider) => void;
  onWithdraw: () => void;
};

export default function LinkedAccountsSection({
  kakaoEmail,
  naverEmail,
  appleEmail,
  onConnectKakao,
  onConnectNaver,
  onConnectApple,
  onDisconnect,
  onWithdraw,
}: LinkedAccountsSectionProps) {
  return (
    <View style={styles.accountSection}>
      <Text style={styles.sectionTitle}>연결된 계정</Text>
      <AccountCard
        provider="kakao"
        label="카카오 계정"
        email={kakaoEmail}
        onConnect={onConnectKakao}
        onDisconnect={onDisconnect}
      />
      <AccountCard
        provider="apple"
        label="Apple 계정"
        email={appleEmail}
        onConnect={onConnectApple}
        onDisconnect={onDisconnect}
      />
      <AccountCard
        provider="naver"
        label="네이버 계정"
        email={naverEmail}
        onConnect={onConnectNaver}
        onDisconnect={onDisconnect}
        hidden
      />
      <Pressable style={styles.withdrawButton} onPress={onWithdraw}>
        <Text style={styles.withdrawText}>회원 탈퇴</Text>
      </Pressable>
    </View>
  );
}

type AccountCardProps = {
  provider: LinkedProvider;
  label: string;
  email: string | null;
  onConnect: () => void;
  onDisconnect: (provider: LinkedProvider) => void;
  hidden?: boolean;
};

function AccountCard({
  provider,
  label,
  email,
  onConnect,
  onDisconnect,
  hidden = false,
}: AccountCardProps) {
  const isApple = provider === "apple";
  const isNaver = provider === "naver";
  const connectedStyle =
    provider === "kakao"
      ? styles.accountContainerConnected
      : isApple
        ? styles.accountContainerConnectedApple
        : styles.accountContainerConnectedNaver;
  const providerBoxStyle =
    provider === "kakao"
      ? styles.kakaoBox
      : isApple
        ? styles.appleBox
        : styles.naverBox;
  const lightTextStyle = isApple
    ? styles.appleText
    : isNaver
      ? styles.naverText
      : undefined;
  const hiddenStyle: ViewStyle | undefined = hidden ? { display: "none" } : undefined;

  return (
    <View
      style={[
        styles.accountContainer,
        email != null && connectedStyle,
        hiddenStyle,
      ]}
    >
      <View style={[styles.accountBox, providerBoxStyle]}>
        <View style={styles.accountRow}>
          <View style={styles.providerInfo}>
            {isApple ? (
              <Text style={styles.appleProviderIcon}></Text>
            ) : (
              <Image
                source={
                  provider === "kakao"
                    ? require("../../../../assets/kakao.png")
                    : require("../../../../assets/naver-icon.png")
                }
                style={styles.providerIcon}
                resizeMode="contain"
              />
            )}
            <Text style={[styles.providerName, lightTextStyle]}>{label}</Text>
          </View>
          <Pressable
            style={styles.accountAction}
            onPress={email ? () => onDisconnect(provider) : onConnect}
          >
            <Text style={[styles.accountActionText, lightTextStyle]}>
              {email ? "연동 해제" : "연동하기"}
            </Text>
            <Image
              source={require("../../../../assets/shift.png")}
              style={styles.shiftIcon}
              resizeMode="contain"
              tintColor={isApple || isNaver ? "#FFFFFF" : undefined}
            />
          </Pressable>
        </View>
      </View>
      {email && (
        <View style={styles.emailBox}>
          <Text style={styles.emailText}>이메일: {email}</Text>
        </View>
      )}
    </View>
  );
}
