import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import * as authApi from '@/api/auth'
import { setUnauthorizedHandler } from '@/api/client'
import { hasSkinProfile } from '@/api/profile'
import type { Auth } from '@/types'

interface AuthContextValue {
  user: Auth | null
  status: 'loading' | 'authed' | 'guest'
  /** 이 계정이 피부 프로필 질문을 끝냈는지 (지금은 브라우저 저장 기준) */
  skinProfileDone: boolean
  login: (username: string, password: string) => Promise<Auth>
  signUp: (username: string, password: string) => Promise<Auth>
  enterDemo: () => Promise<Auth>
  logout: () => Promise<void>
  /** 온보딩 마지막 단계에서 호출 */
  markSkinProfileDone: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Auth | null>(null)
  const [status, setStatus] = useState<AuthContextValue['status']>('loading')
  const [skinProfileDone, setSkinProfileDone] = useState(false)

  const adopt = useCallback((next: Auth) => {
    setUser(next)
    setSkinProfileDone(hasSkinProfile(next.userId))
    setStatus('authed')
    return next
  }, [])

  const clear = useCallback(() => {
    setUser(null)
    setSkinProfileDone(false)
    setStatus('guest')
  }, [])

  /**
   * 새로고침 시 세션 복구.
   * 토큰을 들고 있지 않으므로 그냥 /auth/me 를 물어봅니다.
   * 쿠키가 살아 있으면 200, 아니면 401 이 옵니다.
   */
  useEffect(() => {
    let cancelled = false
    authApi
      .fetchMe()
      .then((me) => {
        if (!cancelled) adopt(me)
      })
      .catch(() => {
        if (!cancelled) clear()
      })
    return () => {
      cancelled = true
    }
  }, [adopt, clear])

  // 어떤 요청에서든 401 이 오면(세션 만료) 로그인 화면으로 되돌립니다.
  useEffect(() => {
    setUnauthorizedHandler(() => clear())
    return () => setUnauthorizedHandler(null)
  }, [clear])

  const login = useCallback(
    async (username: string, password: string) => adopt(await authApi.login({ username, password })),
    [adopt],
  )

  const signUp = useCallback(
    async (username: string, password: string) =>
      adopt(await authApi.signUp({ username, password })),
    [adopt],
  )

  const enterDemo = useCallback(async () => adopt(await authApi.enterDemo()), [adopt])

  const logout = useCallback(async () => {
    try {
      await authApi.logout()
    } catch {
      // 이미 만료된 세션이어도 화면은 로그아웃 상태로 만들어야 합니다.
    }
    clear()
  }, [clear])

  const markSkinProfileDone = useCallback(() => setSkinProfileDone(true), [])

  const value = useMemo(
    () => ({ user, status, skinProfileDone, login, signUp, enterDemo, logout, markSkinProfileDone }),
    [user, status, skinProfileDone, login, signUp, enterDemo, logout, markSkinProfileDone],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
