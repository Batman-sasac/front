import { describe, expect, test } from "@jest/globals";

import { buildStepErrorMessage } from "./oauthErrors";

describe("OAuth error messages", () => {
  test("keeps the diagnostic step, status, endpoint and redirect URI", () => {
    expect(
      buildStepErrorMessage({
        step: "OAUTH_TOKEN_REQUEST_FAILED",
        provider: "kakao",
        message: "request failed",
        status: 401,
        endpoint: "https://api.example.com/auth/kakao/mobile",
        redirectUri: "https://api.example.com/auth/kakao/mobile",
      }),
    ).toBe(
      "[KAKAO_OAUTH_TOKEN_REQUEST_FAILED]\nrequest failed\nstatus=401\nendpoint=https://api.example.com/auth/kakao/mobile\nredirect_uri=https://api.example.com/auth/kakao/mobile",
    );
  });
});
