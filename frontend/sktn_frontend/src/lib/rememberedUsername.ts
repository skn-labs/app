const KEY = 'sktn.rememberedUsername'

/**
 * "아이디 저장" 값.
 *
 * ⚠️ **아이디만** 저장합니다. 비밀번호는 어떤 경우에도 저장하지 않아요.
 *    로그인 상태 자체는 서버가 준 HttpOnly 세션 쿠키가 들고 있습니다.
 */
export const rememberedUsername = {
  get(): string | null {
    try {
      return localStorage.getItem(KEY)
    } catch {
      // 시크릿 모드 등에서 localStorage 가 막혀 있어도 로그인은 되게 둡니다.
      return null
    }
  },

  set(username: string): void {
    try {
      localStorage.setItem(KEY, username)
    } catch {
      /* 무시 */
    }
  },

  clear(): void {
    try {
      localStorage.removeItem(KEY)
    } catch {
      /* 무시 */
    }
  },
}
