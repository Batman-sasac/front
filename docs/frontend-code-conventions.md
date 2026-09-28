# BAT Frontend 코드 컨벤션

이 문서는 현재 BAT `front` 저장소의 Expo, React Native, TypeScript 구성과 기존 폴더 구조를 기준으로 한다. 리팩토링은 기존 UI, 사용자 흐름, `AppStep`, props, API 요청·응답 형식을 유지하는 것을 우선한다.

## 현재 검증 도구

- 패키지 매니저는 `package-lock.json`을 기준으로 npm을 사용한다.
- 타입 검사는 `npx tsc --noEmit`으로 실행한다. `tsconfig.json`의 `strict: true`, `noEmit: true`를 유지한다.
- 테스트는 현재 등록된 `npm run test:study`를 실행한다.
- 저장소에 ESLint, Prettier, 일반 앱 `build` 스크립트는 없다. 해당 검사를 통과했다고 기록하지 않으며, 도구 추가가 필요하면 별도 작업으로 먼저 합의한다.
- Storybook 변경이 포함된 경우 `npm run build-storybook`을 추가로 실행한다.
- 각 작업 단위에서 `git diff --check`와 `git diff --cached`로 의도하지 않은 변경을 확인한다.

## 파일과 식별자 이름

- React 컴포넌트 파일과 컴포넌트 이름은 `PascalCase`를 사용한다. 기존 공개 파일명이 다른 경우 import 호환성을 위해 리팩토링만으로 이름을 바꾸지 않는다.
- hook 파일과 함수는 `use`로 시작하는 `camelCase`를 사용한다.
- 순수 유틸리티, service, 상수, type 파일은 역할이 드러나는 `camelCase` 이름을 사용한다.
- 이벤트 함수는 `handleSubjectAction` 형태로 선언하고 하위 컴포넌트에 전달되는 callback prop은 `onSubjectAction` 형태로 선언한다.
- boolean 값은 `is`, `has`, `can`, `should` 중 의미에 맞는 접두사를 사용한다.
- 상수는 모듈 내부 값이면 의미가 명확한 `camelCase` 또는 기존 관례를 따르고, 고정 설정·매핑은 `UPPER_SNAKE_CASE`를 사용한다.

## 타입과 props

- `any`를 사용하지 않는다. 외부 입력은 `unknown`으로 받은 뒤 type guard 또는 정규화 함수에서 좁힌다.
- 컴포넌트 props는 해당 파일 가까이에 `type ComponentNameProps`로 선언한다. 기존에 외부에서 import하는 props 타입은 named export를 유지한다.
- API 요청·응답 타입은 해당 API 도메인의 `types` 파일에 두고 화면 전용 view model과 구분한다.
- 불필요한 타입 단언으로 오류를 숨기지 않는다. 타입 단언이 필요한 플랫폼 경계는 이유와 안전 조건이 코드에 드러나야 한다.
- 기존 props 이름과 optional 여부를 리팩토링만으로 바꾸지 않는다.

## import와 export

- import는 React·React Native·Expo·외부 패키지, 내부 절대 범위, 같은 feature의 상대 경로 순으로 그룹화하고 그룹 사이에 빈 줄을 둔다.
- 현재 alias 설정이 없으므로 상대 경로를 사용한다. 새 경로 alias는 별도 설정 변경 없이 도입하지 않는다.
- 타입 전용 import는 `import type`을 사용한다.
- 화면과 단일 컴포넌트는 기존 관례에 맞춰 default export를 유지한다. hooks, utils, constants, types, services는 발견성과 자동 import를 위해 named export를 기본으로 한다.
- barrel 파일은 순환 의존이나 실제 탐색 비용을 늘리지 않는 feature 경계에서만 만든다.

## 화면과 feature 책임

- Screen 컴포넌트는 화면 흐름 조합, 상위 props 연결, 화면 단위 상태의 최종 연결을 담당한다.
- 독립적인 레이아웃 영역이 자체 props 계약을 가질 때 화면 전용 `components`로 분리한다. 짧고 한 번만 쓰는 JSX는 분리하지 않는다.
- 상태와 여러 이벤트·effect가 하나의 사용자 동작을 구성하면 화면 전용 `hooks`로 분리한다.
- 입력에 따라 같은 출력을 내는 변환·계산은 `utils` 또는 `logic`으로 분리하고 React에 의존하지 않게 한다.
- 고정 데이터와 매핑은 `constants`, 공유되는 도메인 타입은 `types`, 네트워크·저장소 접근은 기존 `api` 또는 feature `services` 경계에 둔다.
- 특정 화면에서만 사용하는 코드는 `src/screens/<feature>/` 아래에 둔다. 두 곳 이상에서 실제로 쓰이는 UI만 `src/components/<domain>/` 또는 `src/components/common/`으로 이동한다.
- 공용 코드는 화면 전용 스타일·문구·도메인 분기를 props 없이 직접 참조하지 않는다.

권장 화면 전용 구조는 다음과 같다.

```text
src/screens/<feature>/
  FeatureScreen.tsx
  components/
  hooks/
  logic/ 또는 utils/
  constants/
  types/
  styles/
```

모든 폴더를 의무적으로 만들지 않고 실제로 분리할 책임이 있을 때만 추가한다.

## 상태, 이벤트, 비동기 처리

- 파생 가능한 값은 별도 `useState`로 복제하지 않고 계산하거나 `useMemo`를 사용한다. `useMemo`는 계산 비용 또는 참조 안정성이 필요한 경우에만 사용한다.
- effect는 외부 시스템 동기화, 구독, 비동기 로딩에만 사용한다. 하나의 effect가 여러 독립 책임을 가지면 분리한다.
- 비동기 effect는 unmount 이후 state 갱신을 막는 취소 플래그 또는 API가 지원하는 취소 수단을 사용한다.
- 연속 호출에서 최신 요청만 반영돼야 하는 목록·검색·페이지네이션은 요청 순서와 중복 실행을 명시적으로 관리한다.
- 이벤트 핸들러는 조기 반환으로 사전 조건을 표현하고, UI callback 안에 긴 데이터 변환이나 API 흐름을 직접 작성하지 않는다.
- 타이머, listener, 구독은 cleanup에서 반드시 해제한다.

## API, 저장소, 에러

- endpoint, HTTP method, header, request body, response parsing은 `src/api` 또는 해당 feature service에 둔다. Screen에서 직접 `fetch`하지 않는다.
- API 리팩토링 시 URL, method, header, body field, timeout, 오류 메시지와 반환 타입을 변경하지 않는다.
- 저장소 key와 직렬화 형식은 `src/lib/storage.ts` 또는 전용 storage service에서 관리한다.
- `catch` 값은 `unknown`으로 취급하고 기존 `getErrorMessage`, `getErrorCode` 등 공통 경계를 사용한다.
- 사용자에게 복구 방법이 필요한 실패는 기존 `Alert` 또는 오류 화면 흐름을 유지한다. 로깅만 하고 오류를 삼키는 새 코드를 만들지 않는다.
- 로딩, 성공, 실패 state 전이는 hook 또는 service 호출부에서 한 흐름으로 읽히게 구성한다.

## StyleSheet와 UI 보존

- 작은 단일 컴포넌트의 스타일은 같은 파일 하단에 둔다.
- 화면 스타일이 JSX 탐색을 방해하거나 여러 화면 영역의 토큰·스타일이 섞이면 `styles/<ScreenName>.styles.ts`로 분리한다.
- 스타일 분리 시 값, 배열 결합 순서, 플랫폼 조건, 동적 style 우선순위를 그대로 유지한다.
- 색상·scale 함수는 기존 `src/styles`와 `src/lib/layout`을 우선 사용한다. 디자인 변경 없이 토큰을 일괄 치환하지 않는다.
- 접근성 label, hitSlop, disabled 조건, keyboard 동작도 UI 동작의 일부로 보고 보존한다.

## 주석과 중복 코드

- 주석은 코드가 무엇을 하는지 반복하지 않고 비정상 입력, 플랫폼 차이, 좌표계, API 제약처럼 이유가 필요한 곳에 작성한다.
- 오래된 TODO, 이모지 중심 디버그 로그, 코드와 불일치하는 설명은 해당 책임을 수정할 때 정리한다.
- 두 곳 이상에서 같은 정책이나 변환이 반복되고 변경 이유도 같을 때 공용화한다. 모양만 비슷하고 도메인 규칙이 다른 코드는 합치지 않는다.
- 공용화 때문에 props가 과도해지거나 조건 분기가 늘면 화면 전용 구현을 유지한다.

## 테스트와 작업 단위

- 순수 계산, 정규화, 좌표 변환, 중복 처리, 상태 전이처럼 회귀 위험이 높은 로직을 분리할 때 단위 테스트를 추가하거나 기존 테스트를 보완한다.
- UI 추출만으로 동작이 변하지 않고 현재 렌더러 테스트 기반이 없는 경우, 타입 검사와 기존 테스트를 우선하고 억지 snapshot 테스트를 추가하지 않는다.
- 한 커밋은 하나의 화면 또는 하나의 명확한 목적만 포함한다.
- 작업 단위마다 타입 검사, 등록된 테스트, 관련 Storybook 빌드, diff 검사를 마친 뒤에만 커밋한다. 실패 상태에서는 커밋하거나 다음 단위로 넘어가지 않는다.
