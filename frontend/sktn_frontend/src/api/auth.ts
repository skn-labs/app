import type { Auth, LoginRequest, QuickAccount, SignUpRequest } from '@/types'
import { ApiError, delay, isMock, request } from './client'

/**
 * 인증 API. openapi.json 의 Auth 태그를 그대로 구현했습니다.
 * 세션 쿠키 방식이라 응답에 토큰이 없고, 저장할 것도 없습니다.
 */

/* ────────────────────────────────────────────────────────────
   목 모드 계정 저장소 (VITE_USE_MOCK=true 일 때만)

   회원가입한 계정으로 바로 로그인할 수 있도록 메모리에 들고 있습니다.
   비밀번호를 localStorage 에 남기지 않으려고 일부러 메모리에만 두었고,
   그래서 새로고침하면 초기 계정만 남습니다.
   진짜 저장이 필요하면 `npm run mock` 쪽 목 서버를 쓰세요.
   ──────────────────────────────────────────────────────────── */
const mockAccounts = new Map<string, string>([['sktn_test', 'password123']])
let mockNextId = 2

const mockAuth = (username: string, onboardingCompleted = false): Auth => ({
  userId: mockNextId++,
  username,
  displayName: username,
  demo: false,
  onboardingCompleted,
})

/** 목 모드에서 로그인 상태를 유지하는 자리 (세션 쿠키 대신) */
const mockSession = {
  save: (user: Auth) => sessionStorage.setItem('sktn.mockUser', JSON.stringify(user)),
  clear: () => sessionStorage.removeItem('sktn.mockUser'),
}

/** POST /auth/signup → 201 Auth (409 이미 있음, 422 형식 오류) */
export async function signUp(body: SignUpRequest): Promise<Auth> {
  if (isMock) {
    await delay()
    if (mockAccounts.has(body.username)) {
      throw new ApiError(409, '이미 사용 중인 아이디예요.')
    }
    mockAccounts.set(body.username, body.password)

    const user = mockAuth(body.username)
    mockSession.save(user)
    return user
  }
  return request<Auth>('/auth/signup', {
    method: 'POST',
    body: JSON.stringify(body),
    skipUnauthorizedHandler: true,
  })
}

/** POST /auth/login → 200 Auth (422 인증 실패) */
export async function login(body: LoginRequest): Promise<Auth> {
  if (isMock) {
    await delay()
    // 가입한 적 없는 아이디와 비밀번호가 틀린 경우의 메시지를 같게 둡니다.
    if (mockAccounts.get(body.username) !== body.password) {
      throw new ApiError(422, '아이디 또는 비밀번호가 일치하지 않아요.')
    }
    const user = mockAuth(body.username)
    mockSession.save(user)
    return user
  }
  return request<Auth>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(body),
    // 로그인 실패는 "세션 만료"가 아니므로 전역 로그아웃 훅을 타면 안 됩니다.
    skipUnauthorizedHandler: true,
  })
}

/** GET /auth/me → 200 Auth (401 비로그인) — 새로고침 시 세션 복구용 */
export async function fetchMe(): Promise<Auth> {
  if (isMock) {
    await delay(150)
    const cached = sessionStorage.getItem('sktn.mockUser')
    if (!cached) throw new ApiError(401, '세션이 없어요.')
    return JSON.parse(cached) as Auth
  }
  return request<Auth>('/auth/me', { skipUnauthorizedHandler: true })
}

/** POST /auth/logout → 204 */
export async function logout(): Promise<void> {
  if (isMock) {
    // 계정 목록은 남기고 로그인 상태만 지웁니다 (가입한 계정으로 다시 로그인 가능하도록)
    mockSession.clear()
    return
  }
  await request<void>('/auth/logout', { method: 'POST' })
}

/** POST /auth/demo → 200 Auth. 기록이 채워진 시연 계정으로 바로 들어갑니다. */
export async function enterDemo(): Promise<Auth> {
  if (isMock) {
    await delay(300)
    const user = { ...mockAuth('demo_user'), displayName: '데모 계정', demo: true }
    mockSession.save(user)
    return user
  }
  return request<Auth>('/auth/demo', { method: 'POST', skipUnauthorizedHandler: true })
}

/**
 * GET /auth/quick-accounts → 시연 환경(TEST_HARNESS_ENABLED=true)에서만 200.
 * 그 외에는 404 가 오므로 호출 쪽에서 조용히 무시하면 됩니다.
 */
export async function listQuickAccounts(): Promise<QuickAccount[]> {
  if (isMock) return []
  return request<QuickAccount[]>('/auth/quick-accounts', { skipUnauthorizedHandler: true })
}

/** POST /auth/quick-login/{username} → 200 Auth (시연 환경 전용) */
export async function quickLogin(username: string): Promise<Auth> {
  return request<Auth>(`/auth/quick-login/${encodeURIComponent(username)}`, {
    method: 'POST',
    skipUnauthorizedHandler: true,
  })
}
