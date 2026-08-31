import { getToken } from "../lib/storage";
import {
  AUTH_API_BASE,
  KAKAO_REDIRECT_URI,
  KAKAO_REST_API_KEY,
  NAVER_CLIENT_ID,
  NAVER_REDIRECT_URI,
} from "./authClient";
import {
  buildAuthErrorMessage,
  buildStepErrorMessage,
  OAUTH_STEP_LABEL,
  stringifyErrorValue,
} from "./oauthErrors";
import type {
  LoginResponse,
  OAuthConfig,
  SetNicknameResponse,
  SocialProvider,
} from "./authTypes";

export async function loginWithOAuth(
  provider: SocialProvider,
  code: string,
): Promise<LoginResponse> {
  const endpoint = `${AUTH_API_BASE}/auth/${provider}/mobile`;
  const formData = new FormData();
  formData.append("code", code);
  if (provider === "naver") formData.append("state", "naver_mobile");

  let response: Response;
  try {
    response = await fetch(endpoint, { method: "POST", body: formData });
  } catch (error) {
    throw new Error(
      buildStepErrorMessage({
        step: OAUTH_STEP_LABEL.tokenRequest,
        provider,
        message:
          stringifyErrorValue(error) ||
          "백엔드 토큰 교환 API 호출에 실패했습니다.",
        endpoint,
        redirectUri:
          provider === "kakao" ? KAKAO_REDIRECT_URI : NAVER_REDIRECT_URI,
      }),
    );
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      buildAuthErrorMessage({
        error,
        fallback: "로그인 실패",
        provider,
        endpoint,
        status: response.status,
      }),
    );
  }
  try {
    return await response.json();
  } catch (error) {
    throw new Error(
      buildStepErrorMessage({
        step: OAUTH_STEP_LABEL.responseParse,
        provider,
        message:
          stringifyErrorValue(error) ||
          "백엔드 로그인 응답을 JSON으로 읽지 못했습니다.",
        endpoint,
        status: response.status,
      }),
    );
  }
}

export async function loginWithApple(
  identityToken: string,
): Promise<LoginResponse> {
  const endpoint = `${AUTH_API_BASE}/auth/apple/mobile`;
  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identity_token: identityToken }),
    });
  } catch (error) {
    throw new Error(
      buildStepErrorMessage({
        step: OAUTH_STEP_LABEL.tokenRequest,
        provider: "apple",
        message:
          stringifyErrorValue(error) || "Apple 로그인 API 호출에 실패했습니다.",
        endpoint,
      }),
    );
  }
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      buildAuthErrorMessage({
        error,
        fallback: "로그인 실패",
        provider: "apple",
        endpoint,
        status: response.status,
      }),
    );
  }
  try {
    return await response.json();
  } catch (error) {
    throw new Error(
      buildStepErrorMessage({
        step: OAUTH_STEP_LABEL.responseParse,
        provider: "apple",
        message:
          stringifyErrorValue(error) ||
          "Apple 로그인 응답을 JSON으로 읽지 못했습니다.",
        endpoint,
        status: response.status,
      }),
    );
  }
}

export async function setNickname(
  nickname: string,
  email: string,
  socialId: string,
): Promise<SetNicknameResponse> {
  const token = await getToken();
  if (!token) throw new Error("로그인이 필요합니다. 토큰이 없습니다.");
  const response = await fetch(`${AUTH_API_BASE}/auth/set-nickname`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ nickname, email, social_id: socialId }),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || error.error || "닉네임 설정 실패");
  }
  return response.json();
}

export async function fetchOAuthConfig(): Promise<OAuthConfig> {
  const endpoint = `${AUTH_API_BASE}/config`;
  let response: Response;
  try {
    response = await fetch(endpoint);
  } catch (error) {
    throw new Error(
      buildStepErrorMessage({
        step: OAUTH_STEP_LABEL.configFetch,
        provider: "kakao",
        message:
          stringifyErrorValue(error) ||
          "백엔드 OAuth 설정 API 호출에 실패했습니다.",
        endpoint,
      }),
    );
  }
  if (!response.ok) {
    throw new Error(
      buildStepErrorMessage({
        step: OAUTH_STEP_LABEL.configFetch,
        provider: "kakao",
        message: "백엔드 OAuth 설정을 불러올 수 없습니다.",
        endpoint,
        status: response.status,
      }),
    );
  }
  try {
    return await response.json();
  } catch (error) {
    throw new Error(
      buildStepErrorMessage({
        step: OAUTH_STEP_LABEL.responseParse,
        provider: "kakao",
        message:
          stringifyErrorValue(error) ||
          "백엔드 OAuth 설정 응답을 JSON으로 읽지 못했습니다.",
        endpoint,
        status: response.status,
      }),
    );
  }
}

export async function getOAuthUrl(provider: SocialProvider): Promise<string> {
  let kakaoRestApiKey = KAKAO_REST_API_KEY;
  let naverClientId = NAVER_CLIENT_ID;
  if (!kakaoRestApiKey || !naverClientId) {
    const serverConfig = await fetchOAuthConfig();
    kakaoRestApiKey =
      kakaoRestApiKey || serverConfig.kakao_rest_api_key || "";
    naverClientId = naverClientId || serverConfig.naver_client_id || "";
  }
  if (provider === "kakao") {
    if (!kakaoRestApiKey) {
      throw new Error(
        buildStepErrorMessage({
          step: OAUTH_STEP_LABEL.authUrlBuild,
          provider,
          message:
            "KAKAO_REST_API_KEY가 없습니다. .env 파일 또는 서버 설정을 확인하세요.",
          redirectUri: KAKAO_REDIRECT_URI,
        }),
      );
    }
    return `https://kauth.kakao.com/oauth/authorize?client_id=${encodeURIComponent(kakaoRestApiKey)}&redirect_uri=${encodeURIComponent(KAKAO_REDIRECT_URI)}&response_type=code`;
  }
  if (!naverClientId) {
    throw new Error(
      buildStepErrorMessage({
        step: OAUTH_STEP_LABEL.authUrlBuild,
        provider,
        message:
          "NAVER_CLIENT_ID가 없습니다. .env 파일 또는 서버 설정을 확인하세요.",
        redirectUri: NAVER_REDIRECT_URI,
      }),
    );
  }
  return `https://nid.naver.com/oauth2.0/authorize?client_id=${encodeURIComponent(naverClientId)}&redirect_uri=${encodeURIComponent(NAVER_REDIRECT_URI)}&response_type=code&state=naver_mobile`;
}
