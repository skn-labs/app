import { Navigate, Outlet, useLocation } from 'react-router-dom'
import PhoneFrame from '@/components/PhoneFrame'
import { useAuth } from '@/store/AuthContext'

/**
 * 로그인 여부 게이트.
 *  - 세션 확인 중이면 대기
 *  - 비로그인 → /welcome
 *  - 피부 프로필 미완료인데 /main 접근 → /onboarding
 *  - 완료했는데 질문 화면 접근 → /main
 *
 * ⚠️ 여기서 쓰는 "온보딩 완료"는 서버의 user.onboardingCompleted(화장품 선택)가 아니라
 *    피부 프로필 질문 완료 여부입니다. (src/api/profile.ts 주석 참고)
 */
export default function ProtectedRoute({ requireOnboarded }: { requireOnboarded?: boolean }) {
  const { status, skinProfileDone } = useAuth()
  const location = useLocation()

  if (status === 'loading') {
    return (
      <PhoneFrame>
        <div className="flex flex-1 items-center justify-center">
          <span className="text-[15px] text-ink-faint">불러오는 중…</span>
        </div>
      </PhoneFrame>
    )
  }

  if (status === 'guest') return <Navigate to="/welcome" replace />

  if (requireOnboarded && !skinProfileDone) {
    return <Navigate to="/onboarding" replace />
  }

  if (!requireOnboarded && skinProfileDone && !location.pathname.includes('complete')) {
    return <Navigate to="/main" replace />
  }

  return <Outlet />
}
