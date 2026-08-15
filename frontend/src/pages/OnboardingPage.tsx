import { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Check, ChevronLeft, ChevronRight, LoaderCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import type { Auth, SkinProfile } from '../lib/types'
import { api } from '../lib/api'
import { AssetMotion } from '../components/ui'
import { PrototypeHomeIndicator, PrototypePhone, PrototypeStatusBar, PrototypeTopMark } from '../components/PrototypeChrome'

type DraftProfile = {
  ageRange: SkinProfile['ageRange'] | null
  gender: SkinProfile['gender'] | null
  skinType: SkinProfile['skinType'] | null
  skinCondition: number | null
  concerns: string[]
  textures: string[]
  avoids: string[]
  avoidNote: string
  trialFrequency: SkinProfile['trialFrequency'] | null
}

type Draft = { version: 6; step: number; profile: DraftProfile }
type StepKey = keyof Pick<DraftProfile, 'ageRange' | 'gender' | 'skinType' | 'skinCondition' | 'concerns' | 'textures' | 'avoids' | 'trialFrequency'>

const AGE_RANGES = [
  ['10S', '10대'], ['20S', '20대'], ['30S', '30대'], ['40S', '40대'],
  ['50S', '50대'], ['60_PLUS', '60대 이상'],
] as const
const GENDERS = [['MALE', '남성'], ['FEMALE', '여성']] as const
const SKIN_TYPES = [
  ['DRY', '건성'], ['OILY', '지성'], ['COMBINATION', '복합성'],
  ['NORMAL', '중성'], ['UNSURE', '잘 모르겠어요'],
] as const
const CONCERN_GROUPS = [
  { title: '수분·유분', options: ['건조함', '당김', '유분기', '번들거림'] },
  { title: '트러블·자극', options: ['여드름', '좁쌀 트러블', '홍조', '민감함'] },
  { title: '톤·색소', options: ['잡티', '칙칙함', '다크서클', '색소침착'] },
  { title: '결·모공', options: ['각질', '거친 피부결', '모공', '블랙헤드'] },
  { title: '탄력·주름', options: ['주름', '탄력 저하', '처짐'] },
] as const
const TEXTURE_GROUPS = [
  { title: '발림', options: [{ value: '가벼운 발림', label: '가벼운' }, { value: '촉촉한 발림', label: '촉촉한' }, { value: '쫀쫀한 발림', label: '쫀쫀한' }, { value: '무거운 발림', label: '무거운' }] },
  { title: '마무리감', options: [{ value: '산뜻한 마무리', label: '산뜻한' }, { value: '보송한 마무리', label: '보송한' }, { value: '촉촉한 마무리', label: '촉촉한' }, { value: '윤기 있는 마무리', label: '윤기 있는' }] },
  { title: '향', options: [{ value: '무향', label: '무향' }, { value: '시트러스·허브 향', label: '시트러스·허브' }, { value: '플로럴 향', label: '플로럴' }, { value: '우디·머스크 향', label: '우디·머스크' }, { value: '기타 향', label: '기타' }] },
] as const
const AVOID_GROUPS = [
  { title: '성분', options: [{ value: '알러지 유발 성분', label: '알레르기 유발 성분' }, '향료', '알코올', '에센셜 오일', '실리콘'] },
  { title: '사용감', options: ['답답함', '끈적거림', '따가움', '향이 강한 것', '무거운 잔여감'] },
] as const
const TRIAL_FREQUENCIES = [
  ['RARELY', '거의 시도하지 않아요'],
  ['EVERY_FEW_MONTHS', '몇 달에 한 번 시도해요'],
  ['ONE_OR_TWO_MONTHLY', '한 달에 1~2개 정도 시도해요'],
  ['THREE_PLUS_MONTHLY', '한 달에 3개 이상 시도해요'],
] as const
const CONDITION_LABELS: Record<number, string> = {
  1: '많이 예민하고 불안정해요',
  2: '평소보다 조금 불안정해요',
  3: '평소와 비슷해요',
  4: '대체로 편안하고 안정적이에요',
  5: '아주 편안하고 안정적이에요',
}
const STEPS: { key: StepKey; title: string; subtitle: string }[] = [
  { key: 'ageRange', title: '현재 연령대를 알려주세요.', subtitle: '피부 변화의 맥락을 이해하는 참고 정보로만 활용해요.' },
  { key: 'gender', title: '성별을 선택해주세요.', subtitle: '직접 선택한 정보는 개인화의 참고 정보로만 활용해요.' },
  { key: 'skinType', title: '피부 타입은 어떻게 알고 있나요?', subtitle: '정확하지 않아도 괜찮아요. 나중에 다시 바꿀 수 있어요.' },
  { key: 'skinCondition', title: '지금 피부 상태는 어떤가요?', subtitle: '최근 2주 정도의 컨디션을 기준으로 골라주세요.' },
  { key: 'concerns', title: '요즘 가장 신경 쓰이는 부분은?', subtitle: '해당하는 고민을 하나 이상 골라주세요. 여러 개 선택할 수 있어요.' },
  { key: 'textures', title: '어떤 사용감을 선호하시나요?', subtitle: '편하게 느꼈던 발림·마무리·향을 떠올려주세요.' },
  { key: 'avoids', title: '사용하면서 피하고 싶은 것이 있나요?', subtitle: '피하고 싶은 요소는 개인화 참고 정보로 활용해요.' },
  { key: 'trialFrequency', title: '새로운 제품을 얼마나 자주 시도하시나요?', subtitle: '새 제품을 탐색하는 성향의 참고 정보로만 활용해요.' },
]

const EMPTY_PROFILE: DraftProfile = {
  ageRange: null, gender: null, skinType: null, skinCondition: null,
  concerns: [], textures: [], avoids: [], avoidNote: '', trialFrequency: null,
}

export function OnboardingPage({ auth }: { auth: Auth }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const draftKey = `skn:onboarding:${auth.userId}`
  const draft = useMemo(() => readDraft(draftKey), [draftKey])
  const [step, setStep] = useState(draft.step)
  const [profile, setProfile] = useState<DraftProfile>(draft.profile)
  const [completed, setCompleted] = useState<{ user: Auth; profile: SkinProfile } | null>(null)
  const [direction, setDirection] = useState<'forward' | 'back'>('forward')
  const heading = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    try { localStorage.setItem(draftKey, JSON.stringify({ version: 6, step, profile })) } catch { /* 저장이 막혀도 진행은 유지한다 */ }
  }, [draftKey, step, profile])

  const complete = useMutation({
    mutationFn: () => api.completeOnboarding(toSkinProfile(profile)),
    onSuccess: result => {
      try { localStorage.removeItem(draftKey) } catch { /* 서버 완료가 우선이다 */ }
      setCompleted(result)
    },
  })

  const current = STEPS[step]
  const canProceed = isComplete(current.key, profile)
  const selectionSummary = summaryFor(current.key, profile)
  const optionalEmpty = current.key === 'avoids' && profile.avoids.length === 0 && !profile.avoidNote.trim()
  const patch = (value: Partial<DraftProfile>) => setProfile(currentValue => ({ ...currentValue, ...value }))
  const toggle = (field: 'concerns' | 'textures' | 'avoids', value: string) => setProfile(currentValue => ({
    ...currentValue,
    [field]: currentValue[field].includes(value) ? currentValue[field].filter(item => item !== value) : [...currentValue[field], value],
  }))
  const move = (nextStep: number, nextDirection: 'forward' | 'back') => {
    setDirection(nextDirection)
    setStep(nextStep)
  }

  useEffect(() => {
    heading.current?.focus({ preventScroll: true })
  }, [step])

  if (completed) return <CompleteStep profile={completed.profile} onDone={() => {
    queryClient.setQueryData(['auth'], completed.user)
    queryClient.invalidateQueries({ predicate: query => query.queryKey[0] !== 'auth' })
    navigate('/', { replace: true })
  }}/>

  return <PrototypePhone>
    <PrototypeStatusBar/>
    <PrototypeTopMark/>
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-7">
      <div className="flex items-center justify-between pt-5">
        <ProgressDashes current={step} total={STEPS.length}/>
        <span className="rounded-full bg-[#f2f2f7] px-2.5 py-1 text-[10px] font-semibold tabular-nums text-[#636366]">{step + 1} / {STEPS.length}</span>
      </div>
      <header key={`heading-${current.key}`} className={`${direction === 'forward' ? 'animate-onboard-forward' : 'animate-onboard-back'} pt-6`}>
        {current.key === 'avoids' && <span className="mb-2 inline-flex rounded-full bg-[#f2f2f7] px-2.5 py-1 text-[10px] font-semibold text-[#8e8e93]">선택 사항</span>}
        <h1 ref={heading} tabIndex={-1} className="text-[21px] font-bold leading-[1.4] tracking-[-.02em] outline-none">{current.title}</h1>
        <p className="mt-2.5 text-[13px] leading-[1.6] text-[#8e8e93]">{current.subtitle}</p>
        <div aria-live="polite" className="mt-3 min-h-7">
          {selectionSummary && <span className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-[#f2f2f7] px-3 py-1.5 text-[11px] font-semibold text-[#3a3a3c]"><Check size={12} strokeWidth={2.5}/><span className="truncate">{selectionSummary}</span></span>}
        </div>
      </header>

      <div key={current.key} className={`hide-scrollbar mt-4 min-h-0 flex-1 overflow-y-auto pb-5 ${direction === 'forward' ? 'animate-onboard-forward' : 'animate-onboard-back'}`}>
        {current.key === 'ageRange' && <AgeWheel value={profile.ageRange} onChange={value => patch({ ageRange: value })}/>}
        {current.key === 'gender' && <GenderPicker value={profile.gender} onChange={value => patch({ gender: value })}/>}
        {current.key === 'skinType' && <OptionList options={SKIN_TYPES} value={profile.skinType} onChange={value => patch({ skinType: value })}/>}
        {current.key === 'skinCondition' && <ConditionScale value={profile.skinCondition} onChange={value => patch({ skinCondition: value })}/>}
        {current.key === 'concerns' && <ChipGroups groups={CONCERN_GROUPS} selected={profile.concerns} onToggle={value => toggle('concerns', value)}/>}
        {current.key === 'textures' && <ChipGroups groups={TEXTURE_GROUPS} selected={profile.textures} onToggle={value => toggle('textures', value)}/>}
        {current.key === 'avoids' && <><ChipGroups groups={AVOID_GROUPS} selected={profile.avoids} onToggle={value => toggle('avoids', value)}/><label className="mt-6 block"><span className="mb-2 block text-[12px] font-semibold text-[#8e8e93]">직접 입력 <span className="font-normal text-[#c7c7cc]">· 선택</span></span><textarea value={profile.avoidNote} maxLength={300} rows={3} onChange={event => patch({ avoidNote: event.target.value })} placeholder="목록에 없는 성분이나 사용감을 적어주세요" className="w-full resize-none rounded-[16px] border border-transparent bg-[#f2f2f7] p-4 text-sm leading-[1.6] outline-none transition placeholder:text-[#a1a1a6] focus:border-[#0a0a0a] focus:bg-white focus:ring-4 focus:ring-black/5"/><span className="mt-1.5 block text-right text-[10px] tabular-nums text-[#c7c7cc]">{profile.avoidNote.length} / 300</span></label></>}
        {current.key === 'trialFrequency' && <OptionList options={TRIAL_FREQUENCIES} value={profile.trialFrequency} onChange={value => patch({ trialFrequency: value })}/>}
      </div>

      {complete.error && <p role="alert" className="mb-3 text-xs text-danger">{complete.error.message}</p>}
      <div className="-mx-1 flex shrink-0 gap-2 border-t border-[#f2f2f7] bg-white px-1 pb-2 pt-3">
        <button type="button" aria-label="이전 단계" onClick={() => move(Math.max(0, step - 1), 'back')} disabled={step === 0 || complete.isPending} className="grid size-[52px] shrink-0 place-items-center rounded-full bg-[#f2f2f7] text-[#0a0a0a] transition active:scale-[.96] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:text-[#c7c7cc] disabled:active:scale-100"><ChevronLeft size={21}/></button>
        <button type="button" disabled={!canProceed || complete.isPending} onClick={() => step === STEPS.length - 1 ? complete.mutate() : move(step + 1, 'forward')} className="flex h-[52px] flex-1 items-center justify-center gap-1.5 rounded-full bg-[#0a0a0a] px-5 text-[15px] font-semibold text-white shadow-[0_8px_20px_rgba(0,0,0,.12)] transition active:scale-[.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:bg-[#e5e5ea] disabled:text-[#a1a1a6] disabled:shadow-none disabled:active:scale-100">{complete.isPending ? <><LoaderCircle size={17} className="animate-spin"/>프로필 저장 중…</> : step === STEPS.length - 1 ? <>프로필 완성하기<ChevronRight size={17}/></> : <>{optionalEmpty ? '건너뛰기' : '다음'}<ChevronRight size={17}/></>}</button>
      </div>
    </div>
    <PrototypeHomeIndicator/>
  </PrototypePhone>
}

function ProgressDashes({ current, total }: { current: number; total: number }) {
  return <div role="progressbar" aria-valuemin={1} aria-valuemax={total} aria-valuenow={current + 1} aria-label={`${total}단계 중 ${current + 1}단계`} className="flex min-w-0 flex-1 shrink-0 gap-1.5 pr-4">
    {Array.from({ length: total }, (_, index) => <i key={index} className={`h-1 min-w-0 flex-1 rounded-full transition-all duration-300 ${index <= current ? 'bg-[#0a0a0a]' : 'bg-[#e5e5ea]'}`}/>) }
  </div>
}

function AgeWheel({ value, onChange }: { value: DraftProfile['ageRange']; onChange: (value: SkinProfile['ageRange']) => void }) {
  const list = useRef<HTMLDivElement>(null)
  const settleTimer = useRef<number | null>(null)
  useEffect(() => {
    if (!value) return
    const index = AGE_RANGES.findIndex(([code]) => code === value)
    if (list.current && index >= 0 && Math.abs(list.current.scrollTop - index * 56) > 2) list.current.scrollTo({ top: index * 56, behavior: 'smooth' })
  }, [value])

  useEffect(() => () => { if (settleTimer.current) window.clearTimeout(settleTimer.current) }, [])

  const handleScroll = () => {
    if (settleTimer.current) window.clearTimeout(settleTimer.current)
    settleTimer.current = window.setTimeout(() => {
      if (!list.current) return
      const index = Math.max(0, Math.min(AGE_RANGES.length - 1, Math.round(list.current.scrollTop / 56)))
      onChange(AGE_RANGES[index][0])
    }, 100)
  }

  return <div><p className="mb-2 text-center text-[11px] text-[#8e8e93]">위아래로 움직이거나 나이대를 눌러주세요</p><div className="relative h-[280px]">
    <div aria-hidden="true" className="absolute left-7 right-7 top-1/2 h-[54px] -translate-y-1/2 rounded-[16px] border border-[#e5e5ea] bg-[#f7f7f8] shadow-[0_5px_18px_rgba(0,0,0,.04)]"/>
    <div ref={list} onScroll={handleScroll} role="radiogroup" aria-label="연령대" className="hide-scrollbar relative h-full snap-y snap-mandatory overflow-y-auto py-[112px]">
      {AGE_RANGES.map(([code, label]) => <button type="button" role="radio" key={code} onClick={() => onChange(code)} aria-checked={value === code} className={`block h-14 w-full snap-center bg-transparent text-center transition-all focus-visible:outline-none ${value === code ? 'scale-105 text-[26px] font-bold text-[#0a0a0a]' : 'text-[21px] font-medium text-[#c7c7cc]'}`}>{label}</button>)}
    </div>
    <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-white to-transparent"/><div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-white to-transparent"/>
  </div></div>
}

function GenderPicker({ value, onChange }: { value: DraftProfile['gender']; onChange: (value: SkinProfile['gender']) => void }) {
  return <div role="radiogroup" aria-label="성별" className="grid grid-cols-2 gap-3 pt-2">
    {GENDERS.map(([code, label]) => { const asset = `onboarding-gender-${code === 'MALE' ? 'male' : 'female'}`; const selected = value === code; return <button type="button" role="radio" aria-checked={selected} key={code} onClick={() => onChange(code)} className={`relative flex min-w-0 flex-col items-center gap-2 rounded-[24px] border bg-[#fff] px-2 pb-4 pt-2 transition-all duration-200 active:scale-[.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${selected ? 'border-[#0a0a0a] shadow-[0_10px_28px_rgba(0,0,0,.09)]' : 'border-[#e5e5ea]'}`}>
      <AssetMotion name={asset} poster={`/skn-assets/${asset}-poster.png`} loop playing={selected} className={`size-[128px] transition-all duration-200 ${value && !selected ? 'scale-[.94] opacity-40 grayscale-[.2]' : 'scale-100 opacity-100'}`}/>
      <span className={`text-[15px] ${selected ? 'font-bold text-[#0a0a0a]' : 'font-medium text-[#636366]'}`}>{label}</span>
      <span aria-hidden="true" className={`absolute right-3 top-3 grid size-6 place-items-center rounded-full border transition-all ${selected ? 'scale-100 border-[#0a0a0a] bg-[#0a0a0a] text-white' : 'scale-90 border-[#d1d1d6] bg-white text-transparent'}`}><Check size={13} strokeWidth={3}/></span>
    </button>})}
  </div>
}

function OptionList<T extends string>({ options, value, onChange }: { options: readonly (readonly [T, string])[]; value: T | null; onChange: (value: T) => void }) {
  return <div role="radiogroup" aria-label="선택 항목" className="flex flex-col gap-2.5">{options.map(([code, label]) => { const selected = value === code; return <button type="button" role="radio" aria-checked={selected} key={code} onClick={() => onChange(code)} className={`flex min-h-[56px] w-full items-center justify-between rounded-[16px] border px-5 text-left text-[15px] transition-all duration-200 active:scale-[.99] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${selected ? 'border-[#0a0a0a] bg-white font-semibold text-[#0a0a0a] shadow-[0_7px_20px_rgba(0,0,0,.08)]' : 'border-transparent bg-[#f2f2f7] font-medium text-[#3a3a3c]'}`}><span>{label}</span><span aria-hidden="true" className={`grid size-6 place-items-center rounded-full border transition-all ${selected ? 'border-[#0a0a0a] bg-[#0a0a0a] text-white' : 'border-[#c7c7cc] bg-white text-transparent'}`}><Check size={13} strokeWidth={3}/></span></button>})}</div>
}

function ConditionScale({ value, onChange }: { value: number | null; onChange: (value: number) => void }) {
  const progress = value ? (value - 1) / 4 : 0
  return <div className="pt-3"><div className="mb-4 flex justify-between text-[11px] font-medium text-[#8e8e93]"><span>불안정</span><span>보통</span><span>안정적</span></div><div role="radiogroup" aria-label="현재 피부 상태" className="relative flex justify-between">
    <span aria-hidden="true" className="absolute left-[22px] right-[22px] top-1/2 h-1 -translate-y-1/2 rounded-full bg-[#e5e5ea]"/>
    <span aria-hidden="true" style={{ transform: `translateY(-50%) scaleX(${progress})`, transformOrigin: 'left center' }} className="absolute left-[22px] right-[22px] top-1/2 h-1 rounded-full bg-[#0a0a0a] transition-transform duration-300"/>
    {[1, 2, 3, 4, 5].map(number => { const selected = value === number; const reached = value !== null && number <= value; return <button type="button" role="radio" aria-checked={selected} aria-label={`${number}점, ${CONDITION_LABELS[number]}`} key={number} onClick={() => onChange(number)} className={`relative z-10 size-11 rounded-full border text-[14px] transition-all active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${selected ? 'scale-110 border-[#0a0a0a] bg-[#0a0a0a] font-bold text-white shadow-[0_5px_16px_rgba(0,0,0,.18)]' : reached ? 'border-[#0a0a0a] bg-white font-semibold text-[#0a0a0a]' : 'border-[#d1d1d6] bg-white text-[#8e8e93]'}`}>{number}</button>})}
  </div><div aria-live="polite" className={`mt-7 rounded-[16px] border px-4 py-3.5 text-center text-[13px] font-medium transition-all ${value ? 'border-[#e5e5ea] bg-[#f7f7f8] text-[#3a3a3c]' : 'border-transparent bg-transparent text-[#c7c7cc]'}`}>{value ? CONDITION_LABELS[value] : '가장 가까운 상태를 골라주세요'}</div></div>
}

type ChipOption = string | { readonly value: string; readonly label: string }

function ChipGroups({ groups, selected, onToggle }: { groups: readonly { title: string; options: readonly ChipOption[] }[]; selected: string[]; onToggle: (value: string) => void }) {
  return <div className="flex flex-col gap-6">{groups.map(group => {
    const groupCount = group.options.filter(option => selected.includes(chipValue(option))).length
    return <section key={group.title}><div className="mb-2.5 flex items-center justify-between"><h2 className="text-[13px] font-semibold text-[#636366]">{group.title}</h2><span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold transition-colors ${groupCount > 0 ? 'bg-[#0a0a0a] text-white' : 'bg-transparent text-transparent'}`}>{groupCount}개</span></div><div className="flex flex-wrap gap-2">{group.options.map(option => {
      const value = chipValue(option)
      const selectedOption = selected.includes(value)
      return <button type="button" aria-pressed={selectedOption} key={`${group.title}-${value}`} onClick={() => onToggle(value)} className={`inline-flex min-h-11 items-center rounded-full border px-4 py-2 text-sm transition-all duration-200 active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${selectedOption ? 'border-[#0a0a0a] bg-[#0a0a0a] font-semibold text-white shadow-[0_5px_14px_rgba(0,0,0,.1)]' : 'border-transparent bg-[#f2f2f7] font-medium text-[#3a3a3c]'}`}>{selectedOption && <Check aria-hidden="true" size={13} strokeWidth={3} className="mr-1.5"/>}{chipLabel(option)}</button>
    })}</div></section>
  })}</div>
}

function chipValue(option: ChipOption) {
  return typeof option === 'string' ? option : option.value
}

function chipLabel(option: ChipOption) {
  return typeof option === 'string' ? option : option.label
}

function CompleteStep({ profile, onDone }: { profile: SkinProfile; onDone: () => void }) {
  const shownAt = useRef(Date.now())
  const exitScheduled = useRef(false)
  const timers = useRef<number[]>([])
  const [exiting, setExiting] = useState(false)
  const scheduleExit = (skipHold = false) => {
    if (exitScheduled.current) return
    exitScheduled.current = true
    const elapsed = Date.now() - shownAt.current
    const delay = skipHold ? 0 : Math.max(700, 2600 - elapsed)
    timers.current.push(window.setTimeout(() => setExiting(true), delay))
  }

  useEffect(() => {
    const activeTimers = timers.current
    activeTimers.push(window.setTimeout(() => scheduleExit(true), 6000))
    return () => activeTimers.forEach(timer => window.clearTimeout(timer))
  }, [])

  useEffect(() => {
    if (!exiting) return
    timers.current.push(window.setTimeout(onDone, 600))
  }, [exiting, onDone])

  const summary = [labelFor(AGE_RANGES, profile.ageRange), labelFor(GENDERS, profile.gender), labelFor(SKIN_TYPES, profile.skinType)].join(' · ')
  return <PrototypePhone><button type="button" onClick={() => scheduleExit(true)} aria-label="완료 화면을 닫고 메인으로 이동" className={`flex min-h-0 flex-1 flex-col text-[#0a0a0a] transition-opacity duration-[600ms] ease-out ${exiting ? 'opacity-0' : 'opacity-100'}`}><PrototypeStatusBar/><PrototypeTopMark/><div className="flex min-h-0 flex-1 flex-col px-7"><div className="pt-14 text-center"><h1 className="text-[22px] font-bold leading-[1.4] tracking-[-.02em]">나만의 피부 프로필이<br/>완성됐어요.</h1><p className="mt-3 text-[13px] text-[#8e8e93]">{summary}</p></div><div className="flex flex-1 items-center justify-center"><AssetMotion name="check-motion" poster="/skn-assets/check-motion.png" alt="프로필 설정 완료" className="size-[240px]" onEnded={() => scheduleExit(false)}/></div><p className="pb-10 text-center text-xs text-[#c7c7cc]">화면을 누르면 바로 시작할 수 있어요</p></div><PrototypeHomeIndicator/></button></PrototypePhone>
}

function labelFor<T extends string>(options: readonly (readonly [T, string])[], value: T) {
  return options.find(([code]) => code === value)?.[1] || value
}

function summaryFor(key: StepKey, profile: DraftProfile) {
  if (key === 'ageRange' && profile.ageRange) return `${labelFor(AGE_RANGES, profile.ageRange)} 선택됨`
  if (key === 'gender' && profile.gender) return `${labelFor(GENDERS, profile.gender)} 선택됨`
  if (key === 'skinType' && profile.skinType) return `${labelFor(SKIN_TYPES, profile.skinType)} 선택됨`
  if (key === 'skinCondition' && profile.skinCondition) return CONDITION_LABELS[profile.skinCondition]
  if (key === 'concerns' && profile.concerns.length) return `${profile.concerns.length}개 고민 선택됨`
  if (key === 'textures' && profile.textures.length) return `${profile.textures.length}개 사용감 선택됨`
  if (key === 'avoids') {
    const count = profile.avoids.length + (profile.avoidNote.trim() ? 1 : 0)
    return count ? `${count}개 항목 선택됨` : ''
  }
  if (key === 'trialFrequency' && profile.trialFrequency) return labelFor(TRIAL_FREQUENCIES, profile.trialFrequency)
  return ''
}

function isComplete(key: StepKey, profile: DraftProfile) {
  if (key === 'concerns' || key === 'textures') return profile[key].length > 0
  if (key === 'avoids') return true
  return profile[key] !== null
}

function toSkinProfile(profile: DraftProfile): SkinProfile {
  if (!profile.ageRange || !profile.gender || !profile.skinType || profile.skinCondition === null || !profile.trialFrequency) throw new Error('온보딩 항목을 모두 확인해주세요.')
  return { ...profile, ageRange: profile.ageRange, gender: profile.gender, skinType: profile.skinType, skinCondition: profile.skinCondition, trialFrequency: profile.trialFrequency }
}

function readDraft(key: string): Draft {
  try {
    const value = JSON.parse(localStorage.getItem(key) || '{}') as Partial<Draft>
    if (value.version !== 6 || !value.profile) return { version: 6, step: 0, profile: EMPTY_PROFILE }
    return { version: 6, step: typeof value.step === 'number' && value.step >= 0 && value.step < STEPS.length ? value.step : 0, profile: { ...EMPTY_PROFILE, ...value.profile } }
  } catch { return { version: 6, step: 0, profile: EMPTY_PROFILE } }
}
