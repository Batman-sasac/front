import { getUserInfo as getStoredUserInfo } from "../lib/storage";
import { AUTH_API_BASE } from "./authClient";
import type { LoginProvider, SocialProvider, UserInfoResponse } from "./authTypes";
import { loginWithOAuth } from "./oauth";

export async function getUserInfo(token: string): Promise<UserInfoResponse> {
  const response = await fetch(`${AUTH_API_BASE}/auth/user-info`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
  if (!response.ok) {
    if (response.status === 404) {
      const stored = await getStoredUserInfo();
      const email = stored.email ?? "";
      const nickname = stored.nickname ?? "";
      return {
        status: "success",
        email,
        nickname,
        kakao_connected: !!email,
        naver_connected: false,
        kakao_email: email || null,
        naver_email: null,
      };
    }
    let message = "사용자 정보 조회 실패";
    try {
      const error = await response.json();
      message = error.error || error.message || message;
    } catch {
      // JSON 오류 응답이 아니면 기본 메시지를 사용한다.
    }
    throw new Error(message);
  }
  return response.json();
}

export async function connectAccount(
  token: string,
  provider: SocialProvider,
  code: string,
): Promise<{ status: string; message: string; connected_email: string }> {
  void token;
  const result = await loginWithOAuth(provider, code);
  if (result.status !== "success") {
    throw new Error(result.message || "계정 연결 실패");
  }
  return {
    status: "success",
    message: "계정이 연결되었습니다.",
    connected_email: result.email,
  };
}

export async function disconnectAccount(
  token: string,
  provider: LoginProvider,
): Promise<{ status: string; message: string }> {
  void token;
  void provider;
  throw new Error("백엔드에서 계정 연결 해제를 지원하지 않습니다.");
}

export async function withdrawAccount(
  token: string,
): Promise<{ status: string; message: string }> {
  void token;
  throw new Error("백엔드에 회원 탈퇴 API가 없습니다.");
}

export async function logout(): Promise<{ status: string; message: string }> {
  return {
    status: "success",
    message: "로그아웃은 클라이언트에서 처리합니다.",
  };
}

export async function updateNickname(
  token: string,
  nickname: string,
): Promise<{ status: string; message: string }> {
  const response = await fetch(`${AUTH_API_BASE}/auth/set-nickname`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ nickname }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "닉네임 변경 실패");
  }
  return response.json();
}
