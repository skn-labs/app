import { useEffect, useState } from 'react'
import { fetchSkinProfile } from '@/api/profile'
import { useAuth } from '@/store/AuthContext'
import type { SkinProfile } from '@/types'

/**
 * 온보딩에서 받은 피부 프로필을 읽는 공식 통로.
 *
 * 메인 화면 등 온보딩 밖에서는 `useOnboarding()`(입력 중 상태) 대신 이걸 쓰세요.
 * 지금은 브라우저에서 읽지만, 서버 엔드포인트가 생기면 이 훅 안만 바뀌고
 * 쓰는 쪽 코드는 그대로입니다.
 */
export function useSkinProfile() {
  const { user } = useAuth()
  const [profile, setProfile] = useState<SkinProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      setProfile(null)
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)

    fetchSkinProfile(user.userId)
      .then((p) => {
        if (!cancelled) setProfile(p)
      })
      .catch(() => {
        if (!cancelled) setProfile(null)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [user])

  return { profile, loading }
}
