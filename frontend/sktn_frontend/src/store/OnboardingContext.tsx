import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { emptySkinProfile } from '@/types'
import type { SkinProfile } from '@/types'
import { STEP_ORDER, isKnownChipId } from '@/config/onboarding'
import type { StepKey } from '@/config/onboarding'

const DRAFT_KEY = 'sktn.onboardingDraft'

interface OnboardingContextValue {
  profile: SkinProfile
  /** 부분 업데이트 — patch({ ageRange: '30대' }) */
  patch: (next: Partial<SkinProfile>) => void
  /** 배열 필드 토글 — toggle('concerns', '건조함') */
  toggle: (key: 'concerns' | 'textures' | 'avoids', value: string) => void
  reset: () => void
  /** 해당 단계가 '다음'으로 넘어갈 수 있는 상태인지 */
  canProceed: (step: StepKey) => boolean
  stepIndex: (step: StepKey) => number
  totalSteps: number
}

const OnboardingContext = createContext<OnboardingContextValue | null>(null)

function loadDraft(): SkinProfile {
  try {
    const raw = localStorage.getItem(DRAFT_KEY)
    if (!raw) return emptySkinProfile

    const saved = { ...emptySkinProfile, ...(JSON.parse(raw) as Partial<SkinProfile>) }

    // 예전 형식(그룹 없이 '촉촉한' 만 저장)이나 지금 없어진 선택지는 버립니다.
    // 안 걸러내면 화면에는 아무것도 안 켜졌는데 '다음' 은 눌리는 상태가 됩니다.
    return {
      ...saved,
      concerns: saved.concerns.filter(isKnownChipId),
      textures: saved.textures.filter(isKnownChipId),
      avoids: saved.avoids.filter(isKnownChipId),
    }
  } catch {
    /* 손상된 값이면 그냥 새로 시작 */
  }
  return emptySkinProfile
}

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<SkinProfile>(loadDraft)

  const save = useCallback((next: SkinProfile) => {
    setProfile(next)
    // 중간에 앱을 껐다 켜도 답변이 남도록 임시 저장
    localStorage.setItem(DRAFT_KEY, JSON.stringify(next))
  }, [])

  const patch = useCallback(
    (next: Partial<SkinProfile>) => {
      setProfile((prev) => {
        const merged = { ...prev, ...next }
        localStorage.setItem(DRAFT_KEY, JSON.stringify(merged))
        return merged
      })
    },
    [],
  )

  const toggle = useCallback((key: 'concerns' | 'textures' | 'avoids', value: string) => {
    setProfile((prev) => {
      const list = prev[key]
      const merged = {
        ...prev,
        [key]: list.includes(value) ? list.filter((v) => v !== value) : [...list, value],
      }
      localStorage.setItem(DRAFT_KEY, JSON.stringify(merged))
      return merged
    })
  }, [])

  const reset = useCallback(() => {
    localStorage.removeItem(DRAFT_KEY)
    save(emptySkinProfile)
  }, [save])

  const canProceed = useCallback(
    (step: StepKey) => {
      switch (step) {
        case 'age':
          return profile.ageRange !== null
        case 'gender':
          return profile.gender !== null
        case 'skinType':
          return profile.skinType !== null
        case 'skinCondition':
          return profile.skinCondition !== null
        case 'concerns':
          return profile.concerns.length > 0
        case 'textures':
          return profile.textures.length > 0
        case 'avoids':
          return true // 피하고 싶은 게 없을 수도 있으니 선택 없이도 통과
        case 'trialFrequency':
          return profile.trialFrequency !== null
        default:
          return false
      }
    },
    [profile],
  )

  const stepIndex = useCallback((step: StepKey) => STEP_ORDER.indexOf(step), [])

  const value = useMemo(
    () => ({
      profile,
      patch,
      toggle,
      reset,
      canProceed,
      stepIndex,
      totalSteps: STEP_ORDER.length,
    }),
    [profile, patch, toggle, reset, canProceed, stepIndex],
  )

  return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useOnboarding() {
  const ctx = useContext(OnboardingContext)
  if (!ctx) throw new Error('useOnboarding must be used inside <OnboardingProvider>')
  return ctx
}
