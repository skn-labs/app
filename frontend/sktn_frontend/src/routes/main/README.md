# 메인 화면 붙이기 (다른 브랜치 연계용)

이 폴더는 **온보딩 브랜치와 메인 브랜치가 만나는 지점**입니다.
서로 같은 파일을 고치지 않도록 접점을 한 곳으로 좁혀뒀습니다.

## 붙이는 방법

메인 화면 컴포넌트를 이 폴더(또는 어디든)에 두고, **`index.tsx` 의 import 한 줄만** 바꾸세요.

```tsx
// src/routes/main/index.tsx
import MainScreen from './MainPlaceholder'   // ← 이 줄만 교체
import MainScreen from '@/routes/main/HomeScreen'
```

그다음 `MainPlaceholder.tsx` 는 지워도 됩니다.
**`App.tsx`, `ProtectedRoute.tsx`, `ProfileComplete.tsx` 는 건드릴 필요가 없습니다.**

## 지켜야 할 것 세 가지

**1. 등장 애니메이션을 넣지 마세요.**
프로필 완성 화면이 불투명도 100→0 으로 사라지고, 그 자리를 `MainTransition` 이 페이드인으로
이어받습니다. 메인 화면에 또 등장 효과를 넣으면 두 번 겹쳐 보입니다.

**2. `<PhoneFrame>` 을 다시 감싸지 마세요.**
라우트 쪽에서 이미 감싸고 있습니다. 메인 화면은 그 안의 내용만 그리면 됩니다.
상태바·홈 인디케이터가 필요하면 `@/components/StatusBar`, `@/components/HomeIndicator` 를 쓰세요.

**3. 이 화면은 "로그인 O + 온보딩 O" 일 때만 그려집니다.**
`ProtectedRoute requireOnboarded` 가 앞에서 걸러주므로, 메인 화면 안에서 로그인 여부를
다시 확인할 필요는 없습니다.

## 쓸 수 있는 데이터

```tsx
import { useAuth } from '@/store/AuthContext'
import { useSkinProfile } from '@/hooks/useSkinProfile'

const { user, logout } = useAuth()
// user: { userId, username, displayName, demo, onboardingCompleted }

const { profile, loading } = useSkinProfile()
// profile: 온보딩 8단계 답변 (SkinProfile | null)
```

`useOnboarding()` 은 **질문에 답하는 중**의 임시 상태라 메인 화면에서는 쓰지 마세요.
완료된 프로필은 `useSkinProfile()` 이 공식 통로입니다.

## 서버 호출

`fetch` 를 직접 쓰지 말고 `@/api/client` 의 `request()` 를 쓰세요.
`/api/v1` 붙이기, 세션 쿠키(`credentials: 'include'`), RFC 9457 Problem 파싱,
401 자동 로그아웃이 모두 들어 있습니다.

```tsx
import { request } from '@/api/client'

const home = await request<Home>('/home')   // GET /api/v1/home
```

`request()` 가 던지는 `ApiError` 에는 `status` · `message`(Problem 의 detail) · `code` 가 담깁니다.

## 라우트 이름을 바꾸고 싶다면

`/main` 이라는 경로는 `App.tsx` · `ProfileComplete.tsx` · `ProtectedRoute.tsx` · `Splash.tsx`
네 곳에 나옵니다. 바꿔야 하면 알려주세요 — 상수로 빼는 게 안전합니다.
