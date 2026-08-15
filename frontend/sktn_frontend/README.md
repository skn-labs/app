# sktn — 로그인 + 온보딩 플로우

와이어프레임의 로직(스플래시 → 로그인 → 온보딩 8단계 → 프로필 완성 → 메인창)을 그대로 구현한 React 앱입니다.

## 실행

```bash
npm install
npm run dev      # 목 API(8080) + 화면(5173) 을 한 번에
```

`npm run dev` 하나면 됩니다. `.env` 도 만들 필요 없어요.

- **8080 이 비어 있으면** 목 API 를 같이 띄웁니다.
- **8080 을 이미 쓰고 있으면**(= 진짜 Spring 서버가 떠 있으면) 목은 건너뛰고 그 서버에 붙습니다.

로그인은 **아이디(username) + 비밀번호** 입니다. 기본 계정은 `sktn_test` / `password123`.
**회원가입한 계정은 파일(`mock-server/data/db.json`)에 저장돼서 서버를 껐다 켜도 그대로 로그인됩니다.**

| 명령 | 하는 일 |
| --- | --- |
| `npm run dev` | 목 API + 화면 (기본) |
| `npm run dev:web` | 화면만 (목 없이) |
| `npm run mock` | 목 API 만 |
| `npm run mock:reset` | 가입한 목 계정 전부 지우기 |
| `npm test` | 전체 검증 |

로그인 화면의 **아이디 저장**을 켜면 다음에 열 때 아이디가 채워져 있습니다.
저장되는 건 아이디뿐이고 비밀번호는 어디에도 남기지 않습니다 (`src/lib/rememberedUsername.ts`).

### 비밀번호 조합 규칙 끄는 법

회원가입의 **영문+숫자+특수문자** 조건은 앱에서만 거는 규칙입니다.
서버 스펙(openapi.json)은 길이 8~72자만 요구하므로, 서버와 어긋나 가입이 막히면
**`src/lib/passwordRules.ts` 의 한 줄만** 바꾸면 됩니다.

```ts
export const ENFORCE_COMPOSITION = true   // → false
```

내리면 체크리스트·placeholder·에러 문구가 전부 길이 규칙만 남습니다.
`npm test` 에 켠 상태와 끈 상태 양쪽 동작이 다 들어 있어요.

**로그인은 이 규칙을 쓰지 않습니다.** 조합 규칙 없이 만든 기존 계정도 로그인은 항상 됩니다.
(목 서버도 스펙에 충실하게 길이만 검사해서 `password123` 계정이 그대로 살아 있습니다)

설치 없이 화면만 훑어보려면 **`public/prototype.html`** 을 브라우저로 바로 열면 됩니다.
(React 앱과 같은 영상·이미지를 쓰는 순수 HTML 버전)

## 애니메이션

디자인 소스의 영상 5개가 이렇게 붙어 있습니다.

| 화면 | 애니메이션 | 동작 |
| --- | --- | --- |
| 스플래시 | SKN 로고 | 재생이 끝나면 자동으로 다음 화면 (안 뜨면 2.1초 뒤 넘어감) |
| 시작 화면 | 패트리 접시 | 반복 재생 |
| 성별 선택 | 테스트 남성 / 여성 | **고른 쪽만 반복 재생**, 나머지는 첫 프레임에서 정지 |
| 로그인 버튼 누른 뒤 | 로딩창 | 요청이 끝날 때까지 반복, 최소 1.6초는 보이게 고정 |
| 회원가입 완료 | 체크표시 | 한 번 재생 → 0.7초 정지 → 화면이 사라지며 로그인 화면 |
| 프로필 완성 | 체크표시 | 한 번 재생 → 0.7초 정지 → 화면 전체가 사라지며 메인창 |

### 완료 화면 (회원가입 완료 · 프로필 완성)

두 화면 모두 `CompletionScreen` 하나를 씁니다.
체크 애니메이션이 끝나면 화면이 **불투명도 100 → 0** 으로 사라지고 다음 화면이 이어집니다.
타이밍은 `src/components/CompletionScreen.tsx` 상단의 상수 세 개로 조절하세요.

| 상수 | 기본값 | 뜻 |
| --- | --- | --- |
| `HOLD_AFTER_ANIM_MS` | 700ms | 애니메이션이 끝나고 사라지기 시작할 때까지 |
| `FADE_MS` | 600ms | 사라지는 데 걸리는 시간 |
| `MIN_VISIBLE_MS` | 2600ms | 영상이 안 떠도 문구는 읽히도록 하는 최소 노출 |

**회원가입 흐름:** 가입 성공(201) → 서버가 열어준 세션을 바로 닫음 → 완료 화면 →
로그인 화면(방금 만든 아이디가 채워진 상태). 세션을 안 닫으면 *로그인한 채로 로그인 화면에
서 있는* 어정쩡한 상태가 됩니다.

화면을 누르면 기다리지 않고 바로 넘어가고, `transitionend` 를 놓치거나
영상이 재생되지 않는 환경에서도 타이머가 받쳐주기 때문에 화면이 멈추는 일은 없습니다.
`prefers-reduced-motion` 을 켠 사용자에게는 메인창 페이드인이 생략됩니다.

`AssetVideo` 컴포넌트가 `webm → mp4 → poster 이미지` 순으로 대체하므로
코덱이나 자동재생 정책 때문에 화면이 비는 일은 없습니다.

## 화면 흐름

```
/                    Splash — 로고 애니메이션 후 세션 상태로 분기
/welcome             시작 화면 (패트리 접시 애니메이션) + 로그인 진입
/login               아이디 로그인
/signup              회원가입 (아이디·비밀번호 규칙 체크리스트 + 비밀번호 확인)
/signup/complete     회원가입 완료 (체크 애니메이션) → 로그인 화면으로
/onboarding/age              1. 연령대       (휠 선택)
/onboarding/gender           2. 성별         (애니메이션 2개)
/onboarding/skinType         3. 피부 타입    (단일 선택)
/onboarding/skinCondition    4. 피부 상태    (1~5 척도)
/onboarding/concerns         5. 해결하고 싶은 것 (칩 복수)
/onboarding/textures         6. 선호 사용감  (칩 복수)
/onboarding/avoids           7. 피하고 싶은 것 (칩 복수 + 직접 입력)
/onboarding/trialFrequency   8. 시도 빈도    (단일 선택)
/onboarding/complete         프로필 완성
/main                        메인창
```

`ProtectedRoute` 가 세 가지를 강제합니다.

- 비로그인 → `/welcome`
- 로그인했지만 피부 프로필 미완료 → `/main` 접근 시 `/onboarding` 으로
- 피부 프로필 완료 → 질문 화면으로 되돌아가지 않음

세션 만료(401)가 어떤 요청에서 나든 자동으로 로그아웃 처리돼 `/welcome` 으로 돌아갑니다.

## 폴더 구조

```
src/
  config/onboarding.ts   ★ 질문 문구·선택지가 전부 여기 (화면 코드 수정 불필요)
                         선택 값은 `그룹키:선택지` 형태 — 같은 이름이 두 그룹에 있어도 따로 선택됨
  api/
    client.ts            fetch 래퍼 (/api/v1 + 세션 쿠키 + Problem 파싱 + 401 훅)
    auth.ts              signUp / login / fetchMe / logout / enterDemo / quickLogin
    profile.ts           피부 프로필 (아직 로컬 저장)
  store/
    AuthContext.tsx      로그인 상태 (세션 쿠키 기준, /auth/me 로 복구)
    OnboardingContext.tsx  답변 상태 + 단계별 통과 조건 + 임시 저장
  components/            버튼·칩·휠·척도·영상 등 공용 UI
  hooks/useSkinProfile.ts  완료된 피부 프로필을 읽는 공식 통로
  routes/                화면
  routes/main/           ★ 다른 브랜치 메인 화면과의 접점 (README.md 참고)
  assets/README.md       ★ 디자인 에셋 사용법·원본 변환 명령
public/
  media/                 ★ 실제 에셋 (영상·로고·버블)
  prototype.html         설치 없이 열어보는 HTML 버전
mock-server/
  index.mjs              openapi.json 의 Auth 부분을 흉내 낸 목 API
  *.test.mjs             계약 검증 (npm run test:api)
```

## 메인 화면은 다른 브랜치와 연계

`/main` 은 `src/routes/main/index.tsx` 의 **import 한 줄**만 바꾸면 교체됩니다.
`App.tsx` · `ProtectedRoute.tsx` · `ProfileComplete.tsx` 는 손댈 필요가 없어요.

```tsx
// src/routes/main/index.tsx
import MainScreen from './MainPlaceholder'   // ← 이 줄만 교체
```

페이드인 전환은 화면 코드가 아니라 `MainTransition` 껍데기에 들어 있어서,
메인 화면이 무엇으로 바뀌든 그대로 유지됩니다.
자세한 규칙과 쓸 수 있는 데이터는 **`src/routes/main/README.md`** 를 보세요.

## 백엔드 붙이기 (SKN API)

`openapi.json` 의 **Auth 부분**에 맞춰 인증을 연결해뒀습니다.

### 스펙에서 가져온 전제

| 항목 | 값 |
| --- | --- |
| 기본 경로 | `/api/v1` (client.ts 가 자동으로 붙임) |
| 인증 방식 | **HttpOnly 세션 쿠키 (JSESSIONID)** — 프론트는 토큰을 저장하지 않음 |
| 로그인 식별자 | `email` 이 아니라 **`username`** (`^[a-z0-9_]{4,24}$`) |
| 비밀번호 | 8~72자 (**앱에서는 영문+숫자+특수문자 조합까지 추가로 요구** — `src/lib/passwordRules.ts`) |
| 에러 형식 | RFC 9457 Problem — `detail` → 화면 문구, `code` → 분기용 |

연결한 엔드포인트: `POST /auth/signup` · `POST /auth/login` · `GET /auth/me` ·
`POST /auth/logout` · `POST /auth/demo` · `GET /auth/quick-accounts` · `POST /auth/quick-login/{username}`

### ⚠️ 프록시를 쓰세요 (실측 결과)

세션 쿠키가 `SameSite=Lax` 라서, 프론트(5173)와 API(8080)가 **다른 출처면 로그인은 되지만
그다음 요청에 쿠키가 실리지 않습니다.** 실제 크롬으로 확인한 결과입니다.

```
같은 출처 (Vite 프록시)  → login 200,  me 200   ✅
다른 출처 (직접 연결)     → login 200,  me 401   ❌
```

그래서 `vite.config.ts` 에 `/api` 프록시를 넣어뒀습니다. `.env` 는 이렇게 두면 됩니다.

```bash
VITE_API_BASE_URL=              # 비워두기 (같은 출처로 요청)
API_PROXY_TARGET=http://localhost:8080
```

프록시 없이 직접 붙이려면 백엔드에서 `Access-Control-Allow-Credentials: true` 와
정확한 Origin(와일드카드 불가), 그리고 쿠키에 `SameSite=None; Secure` 가 필요합니다.

### 목 서버 (기본값)

Spring 서버가 안 떠 있어도 개발할 수 있게, 같은 스펙의 목 서버가 `npm run dev` 에 딸려 옵니다.

- 가입한 계정은 `mock-server/data/db.json` 에 저장 → **재시작해도 로그인 가능**
- 비밀번호는 scrypt 해시로만 저장 (평문 아님)
- 세션은 저장하지 않음 → 서버를 재시작하면 다시 로그인해야 합니다
- 초기화: `npm run mock:reset`

실서버에 붙일 때는 그냥 Spring 서버를 8080 에 띄우고 `npm run dev` 를 하면 됩니다.
목이 알아서 비켜줍니다.

`npm test` 로 36개(API 계약 + 비밀번호 규칙 + 칩 선택)를 검증합니다.

> 참고: `VITE_USE_MOCK=true` 는 **네트워크 없이** 프론트 안에서만 도는 별개 모드입니다.
> 이때는 가입 계정이 메모리에만 남아 새로고침하면 사라집니다. 보통은 쓸 일이 없어요.

### ❗ 아직 서버에 저장되지 않는 것

**피부 프로필(온보딩 질문 8개)은 브라우저에만 저장됩니다.**
스펙의 `POST /auth/onboarding` 은 "쓰는 화장품 고르기"라서 담는 내용이 다르기 때문입니다.
서버의 `user.onboardingCompleted` 도 그 화장품 온보딩을 가리키므로, 화면 분기에는 쓰지 않고
계정별 로컬 저장 여부(`src/api/profile.ts`)로 판단합니다.

서버에 남기려면 엔드포인트 하나만 있으면 됩니다.

```
PUT  /api/v1/me/skin-profile   body: SkinProfile → 200 SkinProfile
GET  /api/v1/me/skin-profile                     → 200 SkinProfile | 204
```

생기면 `src/api/profile.ts` 의 두 함수 안만 `request()` 호출로 바꾸면 되고, 화면 코드는 그대로입니다.

## 디자인 소스 적용

`src/assets/README.md` 에 이미지·아이콘·폰트·색 토큰 적용법을 정리해뒀습니다. 요약:

- **색/폰트/radius** → `src/index.css` 의 `@theme` 블록 한 곳
- **영상·버블 이미지** → `public/media/` (교체 방법은 위 문서에)
- **문구** → `src/config/onboarding.ts`
