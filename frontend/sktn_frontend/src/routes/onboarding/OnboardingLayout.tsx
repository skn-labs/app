import type { ReactNode } from 'react'
import PhoneFrame from '@/components/PhoneFrame'
import StatusBar from '@/components/StatusBar'
import HomeIndicator from '@/components/HomeIndicator'
import TopMark from '@/components/TopMark'
import ProgressDashes from '@/components/ProgressDashes'
import { Button } from '@/components/ui'

/** 온보딩 모든 단계가 공유하는 껍데기 (진행 표시 + 이전/다음) */
export default function OnboardingLayout({
  stepIndex,
  totalSteps,
  title,
  subtitle,
  children,
  canProceed,
  nextLabel = '다음',
  onPrev,
  onNext,
  busy,
}: {
  stepIndex: number
  totalSteps: number
  title: string
  subtitle?: string
  children: ReactNode
  canProceed: boolean
  nextLabel?: string
  onPrev: () => void
  onNext: () => void
  busy?: boolean
}) {
  return (
    <PhoneFrame>
      <StatusBar />
      <TopMark />

      <div className="flex flex-1 flex-col overflow-hidden px-7">
        <div className="pt-5">
          <ProgressDashes current={stepIndex} total={totalSteps} />
        </div>

        <header className="pt-6">
          <h1 className="text-[21px] leading-[1.4] font-bold tracking-tight text-ink">{title}</h1>
          {subtitle && <p className="mt-2.5 text-[13px] leading-[1.6] text-ink-muted">{subtitle}</p>}
        </header>

        <div className="mt-7 flex-1 overflow-y-auto pb-4">{children}</div>

        <div className="flex shrink-0 gap-2 pb-2">
          <Button variant="secondary" className="w-[110px]" onClick={onPrev}>
            이전
          </Button>
          <Button full disabled={!canProceed || busy} onClick={onNext}>
            {busy ? '저장 중…' : nextLabel}
          </Button>
        </div>
      </div>

      <HomeIndicator />
    </PhoneFrame>
  )
}
