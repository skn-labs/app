import { useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import OnboardingLayout from './OnboardingLayout'
import GenderPicker from '@/components/GenderPicker'
import AgeWheel from '@/components/AgeWheel'
import ScaleSelector from '@/components/ScaleSelector'
import { Chip, GroupTitle, OptionRow } from '@/components/ui'
import { useOnboarding } from '@/store/OnboardingContext'
import { useAuth } from '@/store/AuthContext'
import { saveSkinProfile } from '@/api/profile'
import {
  AGE_RANGES,
  AVOID_GROUPS,
  AVOID_NOTE_PLACEHOLDER,
  CONCERN_GROUPS,
  SKIN_CONDITION_SCALE,
  SKIN_TYPES,
  STEP_COPY,
  STEP_ORDER,
  TEXTURE_GROUPS,
  TRIAL_FREQUENCIES,
  chipId,
} from '@/config/onboarding'
import type { ChipGroup, StepKey } from '@/config/onboarding'

const isStepKey = (v: string | undefined): v is StepKey =>
  v !== undefined && (STEP_ORDER as readonly string[]).includes(v)

export default function OnboardingFlow() {
  const { step } = useParams<{ step: string }>()
  const navigate = useNavigate()
  const { profile, patch, toggle, canProceed, totalSteps } = useOnboarding()
  const { user, markSkinProfileDone } = useAuth()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  if (!isStepKey(step)) return <Navigate to={`/onboarding/${STEP_ORDER[0]}`} replace />

  const index = STEP_ORDER.indexOf(step)
  const isLast = index === STEP_ORDER.length - 1

  const goPrev = () => {
    if (index === 0) navigate('/welcome')
    else navigate(`/onboarding/${STEP_ORDER[index - 1]}`)
  }

  const goNext = async () => {
    if (!isLast) {
      navigate(`/onboarding/${STEP_ORDER[index + 1]}`)
      return
    }
    // 마지막 단계 → 프로필 저장 후 완료 화면
    if (!user) return
    setBusy(true)
    setError('')
    try {
      await saveSkinProfile(user.userId, profile)
      markSkinProfileDone()
      navigate('/onboarding/complete', { replace: true })
    } catch (e) {
      setError(e instanceof Error ? e.message : '저장에 실패했어요. 잠시 후 다시 시도해주세요.')
    } finally {
      setBusy(false)
    }
  }

  const copy = STEP_COPY[step]

  return (
    <OnboardingLayout
      stepIndex={index}
      totalSteps={totalSteps}
      title={copy.title}
      subtitle={copy.subtitle}
      canProceed={canProceed(step)}
      nextLabel={isLast ? '완료' : '다음'}
      onPrev={goPrev}
      onNext={goNext}
      busy={busy}
    >
      {error && <p className="mb-4 text-[12px] text-danger">{error}</p>}

      {/* 1. 연령대 */}
      {step === 'age' && (
        <AgeWheel
          options={AGE_RANGES}
          value={profile.ageRange}
          onChange={(v) => patch({ ageRange: v })}
        />
      )}

      {/* 2. 성별 */}
      {step === 'gender' && (
        <div role="radiogroup" aria-label="성별">
          <GenderPicker value={profile.gender} onChange={(gender) => patch({ gender })} />
        </div>
      )}

      {/* 3. 피부 타입 */}
      {step === 'skinType' && (
        <div className="flex flex-col gap-2.5">
          {SKIN_TYPES.map((t) => (
            <OptionRow
              key={t}
              selected={profile.skinType === t}
              onClick={() => patch({ skinType: t })}
            >
              {t}
            </OptionRow>
          ))}
        </div>
      )}

      {/* 4. 피부 상태 척도 */}
      {step === 'skinCondition' && (
        <div className="pt-4">
          <ScaleSelector
            min={SKIN_CONDITION_SCALE.min}
            max={SKIN_CONDITION_SCALE.max}
            value={profile.skinCondition}
            labels={{
              min: SKIN_CONDITION_SCALE.minLabel,
              mid: SKIN_CONDITION_SCALE.midLabel,
              max: SKIN_CONDITION_SCALE.maxLabel,
            }}
            onChange={(v) => patch({ skinCondition: v })}
          />
        </div>
      )}

      {/* 5. 고민 (복수) */}
      {step === 'concerns' && (
        <ChipGroups
          groups={CONCERN_GROUPS}
          selected={profile.concerns}
          onToggle={(v) => toggle('concerns', v)}
        />
      )}

      {/* 6. 사용감 (복수) */}
      {step === 'textures' && (
        <ChipGroups
          groups={TEXTURE_GROUPS}
          selected={profile.textures}
          onToggle={(v) => toggle('textures', v)}
        />
      )}

      {/* 7. 피하고 싶은 것 (복수 + 직접 입력) */}
      {step === 'avoids' && (
        <>
          <ChipGroups
            groups={AVOID_GROUPS}
            selected={profile.avoids}
            onToggle={(v) => toggle('avoids', v)}
          />
          <textarea
            value={profile.avoidNote}
            onChange={(e) => patch({ avoidNote: e.target.value })}
            placeholder={AVOID_NOTE_PLACEHOLDER}
            rows={3}
            className="mt-5 w-full resize-none rounded-card border border-line bg-field p-3.5 text-[14px] leading-relaxed outline-none placeholder:text-ink-faint focus:border-ink"
          />
        </>
      )}

      {/* 8. 시도 빈도 */}
      {step === 'trialFrequency' && (
        <div className="flex flex-col gap-2.5">
          {TRIAL_FREQUENCIES.map((f) => (
            <OptionRow
              key={f}
              selected={profile.trialFrequency === f}
              onClick={() => patch({ trialFrequency: f })}
            >
              {f}
            </OptionRow>
          ))}
        </div>
      )}
    </OnboardingLayout>
  )
}

/**
 * 그룹으로 묶인 칩 목록 (고민 / 사용감 / 기피)
 *
 * 저장하는 값은 보이는 글자가 아니라 `그룹키:선택지` 입니다.
 * 「촉촉한」처럼 두 그룹에 같은 이름이 있어도 따로 선택됩니다.
 */
function ChipGroups({
  groups,
  selected,
  onToggle,
}: {
  groups: readonly ChipGroup[]
  selected: string[]
  onToggle: (value: string) => void
}) {
  return (
    <div className="flex flex-col gap-6">
      {groups.map((group) => (
        <section key={group.key}>
          <GroupTitle>{group.title}</GroupTitle>
          <div className="flex flex-wrap gap-2">
            {group.options.map((option) => {
              const id = chipId(group.key, option)
              return (
                <Chip key={id} selected={selected.includes(id)} onClick={() => onToggle(id)}>
                  {option}
                </Chip>
              )
            })}
          </div>
        </section>
      ))}
    </div>
  )
}
