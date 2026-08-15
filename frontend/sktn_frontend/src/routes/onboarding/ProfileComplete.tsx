import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import CompletionScreen from '@/components/CompletionScreen'
import { useOnboarding } from '@/store/OnboardingContext'

/**
 * 온보딩 마지막 화면 — "나만의 피부 프로필이 완성됐어요."
 * 체크표시 애니메이션 → 화면이 사라짐 → 메인창.
 */
export default function ProfileComplete() {
  const navigate = useNavigate()
  const { profile } = useOnboarding()

  const summary = [
    profile.ageRange,
    profile.gender === 'male' ? '남성' : profile.gender === 'female' ? '여성' : null,
    profile.skinType,
  ]
    .filter(Boolean)
    .join(' · ')

  const goMain = useCallback(() => navigate('/main', { replace: true }), [navigate])

  return (
    <CompletionScreen
      title={
        <>
          나만의 피부 프로필이
          <br />
          완성됐어요.
        </>
      }
      subtitle={summary || undefined}
      hint="잠시 후 메인 화면으로 이동해요"
      onDone={goMain}
    />
  )
}
