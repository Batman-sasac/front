// config.ts

/**
 * EXPO_PUBLIC_ 접두사가 붙은 환경 변수는 Expo 빌드 시 자동으로 주입됩니다.
 * 1. 로컬 개발 시: .env 파일의 값을 참조
 * 2. EAS 빌드 시: EAS Secrets에 등록된 값을 참조
 */
const config = {
    apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL,
};

// 개발 중 실수 방지를 위한 간단한 체크
if (!config.apiBaseUrl) {
    console.error(
        "❌ API_BASE_URL이 설정되지 않았습니다!\n" +
        "로컬 환경: .env 파일에 EXPO_PUBLIC_API_BASE_URL를 정의하세요.\n" +
        "배포 환경: EAS Secrets에 해당 변수를 등록하세요."
    );
}

export default config;