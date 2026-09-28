import config from "../lib/config";

export const AUTH_API_BASE =
  process.env.EXPO_PUBLIC_API_BASE_URL ?? config.apiBaseUrl;
export const KAKAO_REST_API_KEY =
  process.env.EXPO_PUBLIC_KAKAO_REST_API_KEY ?? "";
export const NAVER_CLIENT_ID =
  process.env.EXPO_PUBLIC_NAVER_CLIENT_ID ?? "";
export const KAKAO_REDIRECT_URI =
  process.env.EXPO_PUBLIC_KAKAO_REDIRECT_URI ||
  `${AUTH_API_BASE}/auth/kakao/mobile`;
export const NAVER_REDIRECT_URI =
  process.env.EXPO_PUBLIC_NAVER_REDIRECT_URI ||
  `${AUTH_API_BASE}/auth/naver/mobile`;
