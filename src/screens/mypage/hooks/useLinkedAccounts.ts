import { useEffect, useState } from "react";
import { Alert, Platform } from "react-native";
import * as AppleAuthentication from "expo-apple-authentication";

import {
  connectAccount,
  disconnectAccount,
  getOAuthUrl,
  loginWithApple,
  withdrawAccount,
} from "../../../api/auth";
import { getErrorCode, getErrorMessage } from "../../../app/error/errors";
import {
  clearAuthData,
  getToken,
  getUserInfo,
  type AuthProvider,
} from "../../../lib/storage";

type LinkedProvider = "kakao" | "naver" | "apple";

type UseLinkedAccountsParams = {
  onWithdraw?: () => void;
};

const inferProviderFromEmail = (
  email: string | null,
): AuthProvider | null => {
  if (!email) return null;
  const lowered = email.toLowerCase();
  if (lowered.endsWith("@kakao.oauth") || lowered.startsWith("kakao_")) {
    return "kakao";
  }
  if (lowered.endsWith("@naver.oauth") || lowered.startsWith("naver_")) {
    return "naver";
  }
  if (
    lowered.endsWith("@apple.oauth") ||
    lowered.startsWith("apple_") ||
    lowered.endsWith("@privaterelay.appleid.com")
  ) {
    return "apple";
  }
  return null;
};

export function useLinkedAccounts({ onWithdraw }: UseLinkedAccountsParams) {
  const [kakaoEmail, setKakaoEmail] = useState<string | null>(null);
  const [naverEmail, setNaverEmail] = useState<string | null>(null);
  const [appleEmail, setAppleEmail] = useState<string | null>(null);
  const [showOAuthWebView, setShowOAuthWebView] = useState(false);
  const [oauthProvider, setOauthProvider] = useState<"kakao" | "naver">(
    "kakao",
  );
  const [oauthUrl, setOauthUrl] = useState("");
  const [showSingleDisconnectModal, setShowSingleDisconnectModal] =
    useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadStoredAccount = async () => {
      try {
        const token = await getToken();
        if (!token) return;
        const stored = await getUserInfo();
        if (cancelled) return;
        const storedEmail = stored.email ?? null;
        const provider = stored.provider ?? inferProviderFromEmail(storedEmail);
        setKakaoEmail(provider === "kakao" ? storedEmail : null);
        setNaverEmail(provider === "naver" ? storedEmail : null);
        setAppleEmail(provider === "apple" ? storedEmail : null);
      } catch (error) {
        console.error("계정 정보 로드 실패:", error);
        if (!cancelled) {
          Alert.alert("오류", "계정 정보를 불러오지 못했습니다.");
        }
      }
    };

    void loadStoredAccount();
    return () => {
      cancelled = true;
    };
  }, []);

  const openOAuth = async (provider: "kakao" | "naver") => {
    try {
      const url = await getOAuthUrl(provider);
      setOauthProvider(provider);
      setOauthUrl(url);
      setShowOAuthWebView(true);
    } catch (error) {
      const providerLabel = provider === "kakao" ? "카카오" : "네이버";
      Alert.alert(
        "오류",
        getErrorMessage(error, `${providerLabel} 로그인 URL 생성 실패`),
      );
    }
  };

  const handleConnectApple = async () => {
    if (Platform.OS !== "ios") {
      Alert.alert("안내", "Apple 계정 연동은 iOS에서만 가능합니다.");
      return;
    }

    try {
      const available = await AppleAuthentication.isAvailableAsync();
      if (!available) {
        Alert.alert(
          "안내",
          "이 기기에서는 Apple 로그인 기능을 사용할 수 없습니다.",
        );
        return;
      }
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      if (!credential.identityToken) {
        Alert.alert("오류", "Apple 인증 토큰을 받지 못했습니다.");
        return;
      }

      const result = await loginWithApple(credential.identityToken);
      if (
        result.status === "success" ||
        result.status === "nickname_required" ||
        result.status === "NICKNAME_REQUIRED"
      ) {
        setAppleEmail(result.email);
        Alert.alert("성공", "Apple 계정을 연동했습니다.");
        return;
      }
      Alert.alert("오류", result.message || "Apple 계정 연동에 실패했습니다.");
    } catch (error) {
      if (getErrorCode(error) === "ERR_REQUEST_CANCELED") return;
      Alert.alert("오류", getErrorMessage(error, "Apple 계정 연동 실패"));
    }
  };

  const handleOAuthCode = async (code: string) => {
    try {
      const token = await getToken();
      if (!token) {
        Alert.alert("오류", "로그인이 필요합니다.");
        return;
      }
      const result = await connectAccount(token, oauthProvider, code);
      if (oauthProvider === "kakao") {
        setKakaoEmail(result.connected_email);
      } else {
        setNaverEmail(result.connected_email);
      }
      Alert.alert("성공", result.message);
    } catch (error) {
      Alert.alert("오류", getErrorMessage(error, "계정 연동 실패"));
    }
  };

  const tryDisconnect = async (provider: LinkedProvider) => {
    const connectedCount =
      (kakaoEmail ? 1 : 0) + (naverEmail ? 1 : 0) + (appleEmail ? 1 : 0);
    if (connectedCount <= 1) {
      setShowSingleDisconnectModal(true);
      return;
    }

    try {
      const token = await getToken();
      if (!token) {
        Alert.alert("오류", "로그인이 필요합니다.");
        return;
      }
      await disconnectAccount(token, provider);
      if (provider === "kakao") setKakaoEmail(null);
      else if (provider === "naver") setNaverEmail(null);
      else setAppleEmail(null);

      const label =
        provider === "kakao"
          ? "카카오"
          : provider === "naver"
            ? "네이버"
            : "Apple";
      Alert.alert("성공", `${label} 계정 연동을 해제했습니다.`);
    } catch (error) {
      Alert.alert("오류", getErrorMessage(error, "연동 해제 실패"));
    }
  };

  const handleWithdraw = async () => {
    try {
      const token = await getToken();
      if (!token) {
        Alert.alert("오류", "로그인이 필요합니다.");
        return;
      }
      await withdrawAccount(token);
      await clearAuthData();
      setShowWithdrawModal(false);
      Alert.alert("완료", "회원 탈퇴가 완료되었습니다.", [
        { text: "확인", onPress: onWithdraw },
      ]);
    } catch (error) {
      Alert.alert("오류", getErrorMessage(error, "회원 탈퇴 실패"));
    }
  };

  return {
    kakaoEmail,
    naverEmail,
    appleEmail,
    showOAuthWebView,
    setShowOAuthWebView,
    oauthProvider,
    oauthUrl,
    showSingleDisconnectModal,
    setShowSingleDisconnectModal,
    showWithdrawModal,
    setShowWithdrawModal,
    handleConnectKakao: () => openOAuth("kakao"),
    handleConnectNaver: () => openOAuth("naver"),
    handleConnectApple,
    handleOAuthCode,
    tryDisconnect,
    handleWithdraw,
  };
}
