import { useState } from 'react'
import StatusBar from '@/components/StatusBar'
import HomeIndicator from '@/components/HomeIndicator'
import { Button } from '@/components/ui'
import { useAuth } from '@/store/AuthContext'
import { useSkinProfile } from '@/hooks/useSkinProfile'
import { useOnboarding } from '@/store/OnboardingContext'
import { describeChip } from '@/config/onboarding'

/**
 * 임시 메인 화면.
 *
 * ⚠️ 다른 브랜치의 진짜 메인 화면이 오면 이 파일은 지워도 됩니다.
 *    지금은 온보딩이 제대로 저장됐는지 눈으로 확인하는 용도예요.
 */
export default function MainPlaceholder() {
  const { user, logout } = useAuth()
  const { profile } = useSkinProfile()
  const { reset } = useOnboarding()
  const [signingOut, setSigningOut] = useState(false)

  const rows: [string, string][] = [
    ['연령대', profile?.ageRange ?? '-'],
    ['성별', profile?.gender === 'male' ? '남성' : profile?.gender === 'female' ? '여성' : '-'],
    ['피부 타입', profile?.skinType ?? '-'],
    ['피부 상태', profile?.skinCondition ? `${profile.skinCondition} / 5` : '-'],
    ['고민', profile?.concerns.map(describeChip).join(', ') || '-'],
    ['선호 사용감', profile?.textures.map(describeChip).join(', ') || '-'],
    [
      '기피',
      [...(profile?.avoids ?? []).map(describeChip), profile?.avoidNote]
        .filter(Boolean)
        .join(', ') || '-',
    ],
    ['시도 빈도', profile?.trialFrequency ?? '-'],
  ]

  return (
    <>
      <StatusBar />

      <div className="flex flex-1 flex-col overflow-hidden px-7">
        <header className="pt-8">
          <h1 className="text-[24px] font-bold tracking-tight text-ink">메인창</h1>
          <p className="mt-2 text-[13px] text-ink-muted">
            {user?.displayName ?? user?.username}
            {user?.demo && <span className="ml-2 text-ink-faint">데모 계정</span>}
          </p>
          <p className="mt-1 text-[11px] text-ink-faint">
            다른 브랜치의 메인 화면이 들어올 자리예요.
          </p>
        </header>

        <div className="mt-6 flex-1 overflow-y-auto">
          <div className="rounded-card border border-line">
            {rows.map(([label, value], i) => (
              <div
                key={label}
                className={`flex gap-4 px-4 py-3.5 ${i > 0 ? 'border-t border-line' : ''}`}
              >
                <span className="w-20 shrink-0 text-[13px] text-ink-muted">{label}</span>
                <span className="text-[13px] leading-relaxed break-keep text-ink">{value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-2 pt-4 pb-2">
          <Button
            variant="secondary"
            full
            disabled={signingOut}
            onClick={() => {
              setSigningOut(true)
              reset()
              void logout().finally(() => setSigningOut(false))
            }}
          >
            {signingOut ? '로그아웃 중…' : '로그아웃'}
          </Button>
        </div>
      </div>

      <HomeIndicator />
    </>
  )
}
