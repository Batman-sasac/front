import { KAKAO_REDIRECT_URI, NAVER_REDIRECT_URI } from "./authClient";
import type { LoginProvider } from "./authTypes";

export const OAUTH_STEP_LABEL = {
  configFetch: "OAUTH_CONFIG_FETCH_FAILED",
  authUrlBuild: "OAUTH_AUTH_URL_BUILD_FAILED",
  tokenRequest: "OAUTH_TOKEN_REQUEST_FAILED",
  tokenExchange: "OAUTH_TOKEN_EXCHANGE_FAILED",
  responseParse: "OAUTH_RESPONSE_PARSE_FAILED",
} as const;

export function stringifyErrorValue(value: unknown): string {
  if (typeof value === "string") return value;
  if (value === null || value === undefined) return "";
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function providerLabel(provider: LoginProvider): string {
  if (provider === "kakao") return "KAKAO";
  if (provider === "naver") return "NAVER";
  return "APPLE";
}

export function buildStepErrorMessage(params: {
  step: string;
  provider: LoginProvider;
  message: string;
  endpoint?: string;
  status?: number;
  redirectUri?: string;
}) {
  const { step, provider, message, endpoint, status, redirectUri } = params;
  const lines = [`[${providerLabel(provider)}_${step}]`, message];
  if (status) lines.push(`status=${status}`);
  if (endpoint) lines.push(`endpoint=${endpoint}`);
  if (redirectUri) lines.push(`redirect_uri=${redirectUri}`);
  return lines.join("\n");
}

export function buildAuthErrorMessage(params: {
  error: Record<string, unknown>;
  fallback: string;
  provider: LoginProvider;
  endpoint: string;
  status: number;
}) {
  const { error, fallback, provider, endpoint, status } = params;
  const errorMessage = stringifyErrorValue(error.error ?? fallback);
  const detail = stringifyErrorValue(error.detail ?? error.details).trim();
  const baseMessage = detail ? `${errorMessage}: ${detail}` : errorMessage;

  if (provider === "kakao") {
    return buildStepErrorMessage({
      step: OAUTH_STEP_LABEL.tokenExchange,
      provider,
      message: `${baseMessage}\nRender KAKAO_REDIRECT_URI와 카카오 콘솔 Redirect URI를 같은 값으로 맞추세요.`,
      endpoint,
      status,
      redirectUri: KAKAO_REDIRECT_URI,
    });
  }
  if (provider === "apple") {
    return buildStepErrorMessage({
      step: OAUTH_STEP_LABEL.tokenExchange,
      provider,
      message: `${baseMessage}\nRender APPLE_BUNDLE_ID / APPLE_CLIENT_ID가 com.batman.bat와 같은지 확인하세요.`,
      endpoint,
      status,
    });
  }
  return buildStepErrorMessage({
    step: OAUTH_STEP_LABEL.tokenExchange,
    provider,
    message: baseMessage,
    endpoint,
    status,
    redirectUri: NAVER_REDIRECT_URI,
  });
}
