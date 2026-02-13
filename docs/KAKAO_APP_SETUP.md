# 앱에서 카카오 로그인 설정 (네이티브/WebView)

웹에서는 동작하는데 **앱(iOS/Android)에서만** 카카오 로그인이 안 될 때 아래를 순서대로 확인하세요.

## 1. 리다이렉트 URI 등록 (필수)

앱은 로그인 후 **앱 전용 주소**로 돌아와야 합니다. 이 프로젝트는 `bat://oauth-callback` 을 사용합니다.

1. [카카오 디벨로퍼스](https://developers.kakao.com/console/app) → 내 애플리케이션
2. **앱** → **플랫폼** → **REST API 키** 선택
3. **리다이렉트 URI**에 아래를 **추가** 후 저장  
   `bat://oauth-callback`

여러 개 등록 가능하므로, 웹용 URI는 그대로 두고 위 한 줄만 추가하면 됩니다.

## 2. .env (선택)

앱 전용 리다이렉트를 쓰려면 `.env` 에 다음을 넣을 수 있습니다.  
**넣지 않아도** 코드에서 네이티브일 때 자동으로 `bat://oauth-callback` 을 사용합니다.

```env
# 앱에서 카카오 로그인 시 사용 (선택)
EXPO_PUBLIC_KAKAO_REDIRECT_URI=bat://oauth-callback
```

웹과 앱에서 서로 다른 redirect를 쓰는 경우에만 위처럼 구분해서 설정하면 됩니다.

## 3. "네이티브 키" 관련 오류가 날 때

에러 메시지에 **네이티브 앱 키**, **android_key_hash**, **ios_bundle_id** 등이 나오면,  
카카오 콘솔에 **앱 플랫폼**을 등록해야 합니다. (WebView 방식이어도 앱 식별용으로 필요할 수 있음)

### 네이티브 앱 키 추가

1. [카카오 디벨로퍼스](https://developers.kakao.com/console/app) → 내 애플리케이션
2. **앱** → **플랫폼** → **키 추가** → **네이티브 앱 키** 선택
3. 아래 정보 입력 후 저장

| 플랫폼 | 설정 항목 | 이 프로젝트 값 |
|--------|-----------|----------------|
| Android | 패키지명 | `com.anonymous.frontend` (또는 실제 패키지명) |
| Android | 키 해시 | [키 해시 발급 방법](https://developers.kakao.com/docs/latest/ko/android/getting-started#before-you-begin-add-key-hash) 참고 |
| iOS | 번들 ID | `com.batman.bat` |

- **Android 키 해시**: 디버그/릴리즈용 각각 등록하는 것을 권장합니다.
- **iOS**: Xcode에서 Bundle Identifier가 `com.batman.bat` 인지 확인하세요.

### app.json 과 맞추기

- `app.json` 의 `scheme`: `bat` (이미 설정됨 → `bat://` 로 리다이렉트)
- iOS `bundleIdentifier`: `com.batman.bat`
- Android `package`: `com.anonymous.frontend` (필요 시 `com.batman.bat` 로 통일 가능)

## 4. 카카오 로그인 사용 설정

1. **카카오 로그인** → **사용 설정** → **상태**를 **ON**으로 변경
2. **동의항목**에서 필요한 항목(예: 이메일) 설정

## 5. 정리

- **REST API 키**: 그대로 사용 (웹과 동일한 키로 authorize URL 호출)
- **리다이렉트 URI**: REST API 키 설정에 `bat://oauth-callback` 추가
- **네이티브 앱 키**: 오류가 나면 플랫폼(Android/iOS) 등록용으로 추가
- **앱 scheme**: `app.json` 에 `"scheme": "bat"` 유지

이후 앱을 다시 빌드/실행해서 카카오 로그인을 테스트하면 됩니다.
