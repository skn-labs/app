import { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import type { Auth, SkinProfile } from '../lib/types'
import { api } from '../lib/api'
import { BrandMotion } from '../components/ui'
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

type Draft = { version: 5; step: number; profile: DraftProfile }
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
  { title: '발림', options: ['가벼운', '촉촉한', '쫀쫀한', '무거운'] },
  { title: '마무리감', options: ['산뜻한', '보송한', '촉촉한', '윤기 있는'] },
  { title: '향', options: ['무향', '시트러스·허브', '플로럴', '우디·머스크', '기타'] },
] as const
const AVOID_GROUPS = [
  { title: '성분', options: ['알러지 유발 성분', '향료', '알코올', '에센셜 오일', '실리콘'] },
  { title: '사용감', options: ['답답함', '끈적거림', '따가움', '향이 강한 것', '무거운 잔여감'] },
] as const
const TRIAL_FREQUENCIES = [
  ['RARELY', '거의 시도하지 않아요'],
  ['EVERY_FEW_MONTHS', '몇 달에 한 번 시도해요'],
  ['ONE_OR_TWO_MONTHLY', '한 달에 1~2개 정도 시도해요'],
  ['THREE_PLUS_MONTHLY', '한 달에 3개 이상 시도해요'],
] as const
const STEPS: { key: StepKey; title: string; subtitle: string }[] = [
  { key: 'ageRange', title: '현재 연령대를 알려주세요.', subtitle: '나이대에 따라 피부 변화와 추천할 케어 방향이 달라져요.' },
  { key: 'gender', title: '성별을 선택해주세요.', subtitle: '성별에 따라 피부 분비와 추천 제품이 달라질 수 있어요.' },
  { key: 'skinType', title: '피부 타입은 어떻게 알고 있나요?', subtitle: '정확하지 않아도 괜찮아요. 나중에 다시 바꿀 수 있어요.' },
  { key: 'skinCondition', title: '지금 피부 상태는 어떤가요?', subtitle: '최근 2주 정도의 컨디션을 기준으로 골라주세요.' },
  { key: 'concerns', title: '지금 가장 해결하고 싶은 것은?', subtitle: '가장 신경 쓰이는 고민을 골라주세요. (복수 선택 가능)' },
  { key: 'textures', title: '어떤 사용감을 선호하시나요?', subtitle: '평소에 손이 자주 가는 제형을 떠올리면 쉬워요.' },
  { key: 'avoids', title: '사용하면서 피하고 싶은 것이 있나요?', subtitle: '피해야 할 성분이 있다면 추천에서 빼드릴게요.' },
  { key: 'trialFrequency', title: '새로운 제품을 얼마나 자주 시도하시나요?', subtitle: '추천 주기와 제품 수를 정하는 데 쓰여요.' },
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

  useEffect(() => {
    try { localStorage.setItem(draftKey, JSON.stringify({ version: 5, step, profile })) } catch { /* 저장이 막혀도 진행은 유지한다 */ }
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
  const patch = (value: Partial<DraftProfile>) => setProfile(currentValue => ({ ...currentValue, ...value }))
  const toggle = (field: 'concerns' | 'textures' | 'avoids', value: string) => patch({
    [field]: profile[field].includes(value) ? profile[field].filter(item => item !== value) : [...profile[field], value],
  })

  if (completed) return <CompleteStep profile={completed.profile} onDone={() => {
    queryClient.setQueryData(['auth'], completed.user)
    queryClient.invalidateQueries({ predicate: query => query.queryKey[0] !== 'auth' })
    navigate('/', { replace: true })
  }}/>

  return <PrototypePhone>
    <PrototypeStatusBar/>
    <PrototypeTopMark/>
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-7">
      <ProgressDashes current={step} total={STEPS.length}/>
      <header className="pt-6">
        <h1 className="text-[21px] font-bold leading-[1.4] tracking-[-.02em]">{current.title}</h1>
        <p className="mt-2.5 text-[13px] leading-[1.6] text-[#8e8e93]">{current.subtitle}</p>
      </header>

      <div key={current.key} className="hide-scrollbar mt-7 min-h-0 flex-1 overflow-y-auto pb-4 animate-rise">
        {current.key === 'ageRange' && <AgeWheel value={profile.ageRange} onChange={value => patch({ ageRange: value })}/>}
        {current.key === 'gender' && <GenderPicker value={profile.gender} onChange={value => patch({ gender: value })}/>}
        {current.key === 'skinType' && <OptionList options={SKIN_TYPES} value={profile.skinType} onChange={value => patch({ skinType: value })}/>}
        {current.key === 'skinCondition' && <ConditionScale value={profile.skinCondition} onChange={value => patch({ skinCondition: value })}/>}
        {current.key === 'concerns' && <ChipGroups groups={CONCERN_GROUPS} selected={profile.concerns} onToggle={value => toggle('concerns', value)}/>}
        {current.key === 'textures' && <ChipGroups groups={TEXTURE_GROUPS} selected={profile.textures} onToggle={value => toggle('textures', value)}/>}
        {current.key === 'avoids' && <><ChipGroups groups={AVOID_GROUPS} selected={profile.avoids} onToggle={value => toggle('avoids', value)}/><textarea value={profile.avoidNote} maxLength={300} rows={3} onChange={event => patch({ avoidNote: event.target.value })} placeholder="피하고 싶은 성분을 직접 적어주세요. (선택)" className="mt-5 w-full resize-none rounded-[14px] border border-[#e5e5ea] bg-[#f2f2f7] p-3.5 text-sm leading-[1.6] outline-none placeholder:text-[#c7c7cc] focus:border-[#0a0a0a]"/></>}
        {current.key === 'trialFrequency' && <OptionList options={TRIAL_FREQUENCIES} value={profile.trialFrequency} onChange={value => patch({ trialFrequency: value })}/>}
      </div>

      {complete.error && <p role="alert" className="mb-3 text-xs text-danger">{complete.error.message}</p>}
      <div className="flex shrink-0 gap-2 pb-2">
        <button type="button" onClick={() => setStep(value => Math.max(0, value - 1))} disabled={step === 0 || complete.isPending} className="h-[52px] w-[110px] shrink-0 rounded-full bg-[#f2f2f7] text-[15px] font-semibold disabled:text-[#c7c7cc]">이전</button>
        <button type="button" disabled={!canProceed || complete.isPending} onClick={() => step === STEPS.length - 1 ? complete.mutate() : setStep(value => value + 1)} className="h-[52px] flex-1 rounded-full bg-[#0a0a0a] text-[15px] font-semibold text-white disabled:bg-[#e5e5ea] disabled:text-[#c7c7cc]">{complete.isPending ? '저장 중…' : step === STEPS.length - 1 ? '완료' : '다음'}</button>
      </div>
    </div>
    <PrototypeHomeIndicator/>
  </PrototypePhone>
}

function ProgressDashes({ current, total }: { current: number; total: number }) {
  return <div role="progressbar" aria-valuemin={1} aria-valuemax={total} aria-valuenow={current + 1} aria-label={`${total}단계 중 ${current + 1}단계`} className="flex shrink-0 gap-1.5 pt-5">
    {Array.from({ length: total }, (_, index) => <i key={index} className={`h-[3px] w-5 rounded-full ${index <= current ? 'bg-[#0a0a0a]' : 'bg-[#e5e5ea]'}`}/>) }
  </div>
}

function AgeWheel({ value, onChange }: { value: DraftProfile['ageRange']; onChange: (value: SkinProfile['ageRange']) => void }) {
  const list = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const index = Math.max(0, AGE_RANGES.findIndex(([code]) => code === value))
    if (list.current) list.current.scrollTop = index * 56
  }, [value])

  return <div className="relative h-[280px]">
    <div aria-hidden="true" className="absolute left-8 right-8 top-1/2 h-[52px] -translate-y-1/2 rounded-xl bg-[#f2f2f7]"/>
    <div ref={list} className="hide-scrollbar relative h-full snap-y snap-mandatory overflow-y-auto py-[112px]">
      {AGE_RANGES.map(([code, label]) => <button type="button" key={code} onClick={() => onChange(code)} aria-pressed={value === code} className={`block h-14 w-full snap-center bg-transparent text-center transition ${value === code ? 'text-[26px] font-bold text-[#0a0a0a]' : 'text-[22px] font-medium text-[#c7c7cc]'}`}>{label}</button>)}
    </div>
    <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-white to-transparent"/><div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-white to-transparent"/>
  </div>
}

function GenderPicker({ value, onChange }: { value: DraftProfile['gender']; onChange: (value: SkinProfile['gender']) => void }) {
  return <div role="radiogroup" aria-label="성별" className="flex gap-4 pt-6">
    {GENDERS.map(([code, label]) => <button type="button" role="radio" aria-checked={value === code} key={code} onClick={() => onChange(code)} className="flex flex-1 flex-col items-center gap-4 bg-transparent">
      <img src={`/skn-assets/onboarding-gender-${code === 'MALE' ? 'male' : 'female'}.png`} alt="" className={`size-[130px] object-contain transition-opacity ${value && value !== code ? 'opacity-35' : 'opacity-100'}`}/>
      <span className={`text-[15px] ${value === code ? 'font-bold text-[#0a0a0a]' : 'text-[#c7c7cc]'}`}>{label}</span>
    </button>)}
  </div>
}

function OptionList<T extends string>({ options, value, onChange }: { options: readonly (readonly [T, string])[]; value: T | null; onChange: (value: T) => void }) {
  return <div role="radiogroup" className="flex flex-col gap-2.5">{options.map(([code, label]) => <button type="button" role="radio" aria-checked={value === code} key={code} onClick={() => onChange(code)} className={`h-[54px] w-full rounded-[14px] border text-[15px] transition ${value === code ? 'border-[#0a0a0a] bg-[#0a0a0a] font-semibold text-white' : 'border-[#e5e5ea] bg-[#f2f2f7] text-[#0a0a0a]'}`}>{label}</button>)}</div>
}

function ConditionScale({ value, onChange }: { value: number | null; onChange: (value: number) => void }) {
  return <div className="pt-4"><div className="mb-3 flex justify-between text-xs text-[#8e8e93]"><span>매우 불안정</span><span>보통</span><span>매우 안정</span></div><div role="radiogroup" aria-label="현재 피부 상태" className="flex justify-between">{[1, 2, 3, 4, 5].map(number => <button type="button" role="radio" aria-checked={value === number} key={number} onClick={() => onChange(number)} className={`size-11 rounded-full border text-[15px] transition ${value === number ? 'border-[#0a0a0a] bg-[#0a0a0a] font-semibold text-white' : 'border-[#e5e5ea] bg-white text-[#8e8e93]'}`}>{number}</button>)}</div></div>
}

function ChipGroups({ groups, selected, onToggle }: { groups: readonly { title: string; options: readonly string[] }[]; selected: string[]; onToggle: (value: string) => void }) {
  return <div className="flex flex-col gap-6">{groups.map(group => <section key={group.title}><h2 className="mb-2.5 text-[13px] font-semibold text-[#8e8e93]">{group.title}</h2><div className="flex flex-wrap gap-2">{group.options.map(option => <button type="button" aria-pressed={selected.includes(option)} key={`${group.title}-${option}`} onClick={() => onToggle(option)} className={`h-[38px] rounded-full border px-4 text-sm transition ${selected.includes(option) ? 'border-[#0a0a0a] bg-[#0a0a0a] font-semibold text-white' : 'border-[#e5e5ea] bg-white text-[#0a0a0a]'}`}>{option}</button>)}</div></section>)}</div>
}

function CompleteStep({ profile, onDone }: { profile: SkinProfile; onDone: () => void }) {
  const finished = useRef(false)
  const finish = () => { if (!finished.current) { finished.current = true; onDone() } }
  useEffect(() => { const timer = setTimeout(finish, 6000); return () => clearTimeout(timer) })
  const summary = [labelFor(AGE_RANGES, profile.ageRange), labelFor(GENDERS, profile.gender), labelFor(SKIN_TYPES, profile.skinType)].join(' · ')
  return <PrototypePhone><button type="button" onClick={finish} aria-label="완료 화면을 닫고 메인으로 이동" className="flex min-h-0 flex-1 flex-col text-[#0a0a0a]"><PrototypeStatusBar/><PrototypeTopMark/><div className="flex min-h-0 flex-1 flex-col px-7"><div className="pt-14 text-center"><h1 className="text-[22px] font-bold leading-[1.4] tracking-[-.02em]">나만의 피부 프로필이<br/>완성됐어요.</h1><p className="mt-3 text-[13px] text-[#8e8e93]">{summary}</p></div><div className="flex flex-1 items-center justify-center"><BrandMotion name="check-motion" poster="/skn-assets/check-motion.png" alt="프로필 설정 완료" className="size-[240px] object-contain" onEnded={finish}/></div><p className="pb-10 text-center text-xs text-[#c7c7cc]">잠시 후 메인 화면으로 이동해요</p></div><PrototypeHomeIndicator/></button></PrototypePhone>
}

function labelFor<T extends string>(options: readonly (readonly [T, string])[], value: T) {
  return options.find(([code]) => code === value)?.[1] || value
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
    if (value.version !== 5 || !value.profile) return { version: 5, step: 0, profile: EMPTY_PROFILE }
    return { version: 5, step: typeof value.step === 'number' && value.step >= 0 && value.step < STEPS.length ? value.step : 0, profile: { ...EMPTY_PROFILE, ...value.profile } }
  } catch { return { version: 5, step: 0, profile: EMPTY_PROFILE } }
}
