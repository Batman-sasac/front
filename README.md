# BAT Frontend

BAT는 OCR로 학습 자료를 읽고, AI로 빈칸 문제를 생성해 학습과 복습을 돕는 Expo React Native 앱입니다.

## 주요 흐름

```txt
OCR → 텍스트 추출 → GPT → 빈칸 문제 생성 → 학습/복습 → 결과 저장
```

## 기술 스택

- Expo / React Native
- TypeScript
- AsyncStorage
- Supabase 연동 API
- Kakao OAuth / Apple Login
- OpenAI 기반 학습 문제 생성 API 연동

## 폴더 구조

```txt
front/
├─ App.tsx
├─ src/
│  ├─ api/              # API 호출 모듈
│  ├─ app/              # 앱 공통 provider, 진행도 hook, 앱 단위 유틸
│  ├─ components/       # 공통 UI 및 재사용 컴포넌트
│  ├─ data/             # 정적 데이터
│  ├─ lib/              # storage, config, auth 등 공통 라이브러리
│  ├─ navigation/       # 앱 route 타입 및 navigation 관련 코드
│  └─ screens/          # 화면 단위 컴포넌트
├─ assets/              # 이미지/아이콘 리소스
├─ codex.md             # Codex 작업 지침
└─ 지침/                 # 작업별 보조 지침
```

## Codex 작업 지침

- 기본 작업 지침은 [codex.md](./codex.md)를 따릅니다.

