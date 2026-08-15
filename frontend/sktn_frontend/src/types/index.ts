/**
 * 서버 스펙(openapi.json)의 components/schemas 와 1:1로 맞춘 타입.
 * 스펙이 바뀌면 여기부터 고치세요.
 */

/** #/components/schemas/Auth — 로그인·회원가입·/auth/me 의 공통 응답 */
export interface Auth {
  userId: number
  username: string
  displayName: string
  demo: boolean
  /** ⚠️ 서버가 말하는 온보딩은 "화장품 선택"(POST /auth/onboarding)입니다. */
  onboardingCompleted: boolean
}

/** #/components/schemas/SignUpRequest */
export interface SignUpRequest {
  username: string
  password: string
}

/** #/components/schemas/LoginRequest */
export type LoginRequest = SignUpRequest

/** #/components/schemas/QuickAccount — 시연 환경에서만 제공 */
export interface QuickAccount {
  username: string
  displayName: string
}

/* ────────────────────────────────────────────────────────────
   아래 피부 프로필은 **아직 서버에 대응하는 엔드포인트가 없습니다.**
   와이어프레임의 온보딩 질문을 담아두는 클라이언트 전용 형태이고,
   지금은 브라우저에만 저장됩니다. (src/api/profile.ts 참고)
   ──────────────────────────────────────────────────────────── */

export interface SkinProfile {
  ageRange: string | null
  gender: 'male' | 'female' | null
  skinType: string | null
  skinCondition: number | null
  concerns: string[]
  textures: string[]
  avoids: string[]
  avoidNote: string
  trialFrequency: string | null
}

export const emptySkinProfile: SkinProfile = {
  ageRange: null,
  gender: null,
  skinType: null,
  skinCondition: null,
  concerns: [],
  textures: [],
  avoids: [],
  avoidNote: '',
  trialFrequency: null,
}

/** 서버 스펙에 맞춘 입력 규칙 */
export const USERNAME_PATTERN = /^[a-z0-9_]{4,24}$/
export const PASSWORD_MIN = 8
export const PASSWORD_MAX = 72
