// API 설정 (.env 또는 EXPO_PUBLIC_* 환경변수 사용)
const config = {
    apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:8000',
    kakaoRestApiKey: process.env.EXPO_PUBLIC_KAKAO_REST_API_KEY ?? '',
    kakaoRedirectUri: process.env.EXPO_PUBLIC_KAKAO_REDIRECT_URI ?? '',
    naverClientId: process.env.EXPO_PUBLIC_NAVER_CLIENT_ID ?? '',
    naverRedirectUri: process.env.EXPO_PUBLIC_NAVER_REDIRECT_URI ?? '',
};

export default config;
