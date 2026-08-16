import { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertCircle, ArrowDown, ArrowUp, Check, ChevronDown, ChevronRight, Clock3, Plus, Sparkles, X } from 'lucide-react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { api, ApiError, uid } from '../lib/api'
import { startChatPath } from '../lib/chat'
import type { Experience, Routine, RoutineItemInput, SavedRecord, UserProduct } from '../lib/types'
import { BeforeChangeSheet } from '../components/BeforeChangeSheet'
import { ProductAddSheet } from '../components/ProductAddSheet'
import { AiBadge, AppHeader, BottomSheet, Button, Card, ErrorState, Loading, PageHeading, ProductGlyph, Screen, StickyActionBar, TopBar } from '../components/ui'
import heroWave from '../assets/figma/hero-wave.webp'

export function ExperiencePage() {
  const { id } = useParams(); const experienceId = Number(id)
  const navigate = useNavigate()
  const validExperienceId = Number.isSafeInteger(experienceId) && experienceId > 0
  const experience = useQuery({ queryKey: ['experience', experienceId], queryFn: () => api.experience(experienceId), enabled: validExperienceId })
  if (!validExperienceId) return <Screen nav={false}><AppHeader back profile={false} notifications={false}/><ErrorState message="사용 경험 주소를 확인해주세요."/></Screen>
  if (experience.isPending) return <Screen nav={false}><AppHeader back profile={false} notifications={false}/><Loading/></Screen>
  if (experience.isError) return <Screen nav={false}><AppHeader back profile={false} notifications={false}/><ErrorState message={experience.error.message}/></Screen>
  const data = experience.data
  const day = Math.max(1, Math.min(7, data.day))
  if (data.status !== 'ACTIVE') return <Screen nav={false}><AppHeader back profile={false} notifications={false}/><div className="px-5 pb-10 pt-5"><PageHeading eyebrow="마친 경험" title={data.title} description={data.subtitle}/><div className="soft-card mt-8 p-5"><p className="text-sm font-medium text-muted">마지막으로 남긴 느낌</p><p className="mt-3 text-base leading-7">{data.latestRecord?.note || (data.latestRecord ? sentimentLabel(data.latestRecord.sentiment) : '아직 남긴 기록이 없어요.')}</p></div><Button onClick={() => navigate('/records')} className="mt-7 w-full">내 기록에서 보기</Button></div></Screen>
  return <Screen nav={false} className="bg-[#fbfcff] pb-32">
    <AppHeader back profile={false} notifications={false} sticky/>
    <div className="px-5 pb-8 pt-4">
      <PageHeading eyebrow="확인 중인 경험" title={data.title} description={data.subtitle}/>

      <section className="relative mt-7 overflow-hidden rounded-[24px] border border-[#dfe8f8] shadow-[0_8px_28px_rgba(37,55,92,.09)]" aria-label={`7일 중 ${day}일째 경험`}>
        <img src={heroWave} alt="" aria-hidden className="absolute inset-0 size-full object-cover object-bottom"/>
        <div aria-hidden className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,.92)_0%,rgba(247,250,255,.72)_52%,rgba(232,240,255,.38)_100%)]"/>
        <div className="relative p-5">
          <div className="flex items-center justify-between"><span className="text-sm font-medium text-black/60">{data.reviewDue ? '돌아볼 시간이에요' : `${data.daysUntilReview}일 뒤 함께 돌아봐요`}</span><strong className="text-base font-medium tabular-nums">DAY {day} / 7</strong></div>
          <div role="progressbar" aria-label={`7일 중 ${day}일`} aria-valuemin={1} aria-valuemax={7} aria-valuenow={day} className="mt-4 flex gap-1.5">{Array.from({ length: 7 }, (_, index) => <span key={index} className={`h-1.5 flex-1 rounded-full ${index < day ? 'bg-ink' : 'bg-ink/15'}`}/>)}</div>
          <div className="mt-8 grid grid-cols-2 gap-4 border-t border-black/10 pt-4"><div><p className="text-xs text-black/45">시작한 날</p><p className="mt-1 text-sm font-medium">{formatExperienceDate(data.startedAt)}</p></div><div className="text-right"><p className="text-xs text-black/45">함께 돌아보는 날</p><p className="mt-1 text-sm font-medium">{formatExperienceDate(data.reviewDueAt)}</p></div></div>
        </div>
      </section>

      {data.routine && <RoutineSteps routine={data.routine}/>} 
      {!data.routine && data.product && <Card className="mt-8 flex items-center gap-4"><ProductGlyph category={data.product.product?.category || data.product.customCategory} src={data.product.product?.imageUrl}/><div className="min-w-0"><p className="text-xs text-muted">{data.product.product?.brand || data.product.customBrand}</p><p className="mt-1 truncate text-base font-medium">{data.product.product?.name || data.product.customName}</p><p className="mt-2 text-sm leading-6 text-muted">현재 루틴은 바꾸지 않고 이 제품의 경험만 남기고 있어요.</p></div></Card>}

      {data.latestRecord && <section className="mt-8 rounded-[22px] border border-line bg-[#fafbf8] p-5"><div className="flex items-center justify-between gap-3"><h2 className="text-lg font-medium">최근에 남긴 느낌</h2><span className="rounded-full bg-white px-3 py-1.5 text-xs text-muted">{sentimentLabel(data.latestRecord.sentiment)}</span></div><p className="mt-3 text-sm leading-6 text-muted">{data.latestRecord.note || '짧은 선택으로 기록했어요.'}</p></section>}
      <div className="mt-8 flex items-start gap-3 rounded-[20px] bg-accent-soft p-4"><Clock3 size={19} className="mt-0.5 shrink-0 text-accent"/><div><p className="text-sm font-medium text-[#46519a]">기억이 선명할 때만 남겨도 충분해요.</p><p className="mt-1 text-xs leading-5 text-[#626aa1]">7일은 안전이나 효능을 판정하는 기간이 아니라, 지금까지의 경험을 함께 돌아보는 기본 시점이에요.</p></div></div>
      <button type="button" onClick={() => navigate(`/experiences/${experienceId}/record?end=1`)} className="mx-auto mt-6 flex min-h-11 items-center px-3 text-sm font-medium text-muted underline decoration-line underline-offset-4">기록을 남기고 이 경험 마치기</button>
    </div>
    <StickyActionBar className="grid grid-cols-[minmax(0,1fr)_auto] gap-2"><Button onClick={() => navigate(`/experiences/${experienceId}/record`)}>{data.reviewDue ? '7일 경험 남기기' : '지금 느낌 남기기'}</Button><Button variant="danger" aria-label="피부 불편함을 별도로 기록" onClick={() => navigate(`/experiences/${experienceId}/record?discomfort=1`)} className="px-4"><AlertCircle size={18}/>불편 기록</Button></StickyActionBar>
  </Screen>
}

export function RecordPage() {
  const { id } = useParams(); const experienceId = Number(id)
  const [params] = useSearchParams(); const navigate = useNavigate(); const queryClient = useQueryClient()
  const validExperienceId = Number.isSafeInteger(experienceId) && experienceId > 0
  const recordRequestId = useRef(uid())
  const endAfterSave = params.get('end') === '1'
  const experience = useQuery({ queryKey: ['experience', experienceId], queryFn: () => api.experience(experienceId), enabled: validExperienceId })
  const [step, setStep] = useState<1 | 2>(1)
  const [contextOpen, setContextOpen] = useState(false)
  const [sentiment, setSentiment] = useState<string>('')
  const [note, setNote] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [discomfort, setDiscomfort] = useState(params.get('discomfort') === '1' ? 'REPORTED' : 'NOT_REPORTED')
  const [saved, setSaved] = useState<SavedRecord | null>(null)
  const record = useMutation({ mutationFn: async () => {
    const value = await api.recordExperience(experienceId, { sentiment, note, tags, discomfort }, recordRequestId.current)
    if (endAfterSave) await api.completeExperience(experienceId)
    return value
  }, onSuccess: value => { setSaved(value); queryClient.invalidateQueries() } })
  const openRescueChat = () => navigate(startChatPath('RESCUE', note.trim() || '지금 사용 중인 조합에서 불편함이 있었어.', { experienceId }))
  const complete = useMutation({ mutationFn: () => api.completeExperience(experienceId), onSuccess: () => { queryClient.invalidateQueries(); navigate('/') } })
  if (!validExperienceId) return <Screen nav={false}><AppHeader back profile={false} notifications={false}/><ErrorState message="사용 경험 주소를 확인해주세요."/></Screen>
  if (experience.isPending) return <Screen nav={false}><AppHeader back profile={false} notifications={false}/><Loading/></Screen>
  if (experience.isError) return <Screen nav={false}><AppHeader back profile={false} notifications={false}/><ErrorState message={experience.error.message}/></Screen>
  if (saved) return <SavedRecordResult saved={saved} reviewCompleted={experience.data.reviewDue} experienceEnded={endAfterSave} onRescue={openRescueChat} onContinue={() => navigate('/')} onComplete={() => complete.mutate()} completing={complete.isPending} completeError={complete.error?.message}/>
  const options = [
    { value: 'LIKED', title: '마음에 들어요' },
    { value: 'UNSURE', title: '아직 모르겠어요' },
    { value: 'DISAPPOINTED', title: '아쉬워요' },
  ]
  const tagOptions = ['가벼움','촉촉함','산뜻함','흡수가 빠름','밀림 없음','답답함','무거움','따가움','붉어짐','계절 차이']
  const selectedOption = options.find(option => option.value === sentiment)
  const detailCopy = sentiment === 'LIKED'
    ? { title: '어떤 점이 좋았나요?', body: '다음 탐색에서 다시 찾고 싶은 사용감을 남겨주세요.', placeholder: '예: 화장 전에 발라도 밀리지 않았고, 저녁까지 촉촉함이 남았어요.' }
    : sentiment === 'DISAPPOINTED'
      ? { title: '어떤 점이 아쉬웠나요?', body: '기대와 달랐던 사용감이나 당시 조건을 남겨주세요.', placeholder: '예: 저녁에는 괜찮았지만 아침 화장 전에 바르면 조금 밀렸어요.' }
      : { title: '조금 더 지켜볼 점이 있나요?', body: '아직 모르는 상태도 충분한 기록이에요. 결론 없이 지금의 느낌만 남겨도 돼요.', placeholder: '예: 촉촉한지는 조금 더 써봐야 알 것 같고, 흡수는 빨랐어요.' }
  const subjectLabel = experience.data.subjectType === 'ROUTINE' ? '루틴' : '제품'
  return <Screen nav={false} className="pb-28">
    <AppHeader back onBack={step === 2 ? () => setStep(1) : undefined} profile={false} notifications={false} sticky/>
    <div className="px-5 pb-8 pt-4">
      <div aria-label={`기록 2단계 중 ${step}단계`}><div className="flex gap-1.5"><span className="h-1 flex-1 rounded-full bg-ink"/><span className={`h-1 flex-1 rounded-full ${step === 2 ? 'bg-ink' : 'bg-[#dde1e8]'}`}/></div><div className="mt-2 flex justify-between text-[10px] font-semibold"><span className={step === 1 ? 'text-ink' : 'text-muted'}>전체 느낌</span><span className={step === 2 ? 'text-ink' : 'text-[#a0a5ad]'}>자세히 남기기</span></div></div>

      <RecordSubjectCard experience={experience.data} expanded={contextOpen} onToggle={() => setContextOpen(value => !value)}/>

      {step === 1 ? <>
        <PageHeading className="mt-8" title={<>이번 {subjectLabel}은<br/>어떠셨나요?</>} description={params.get('discomfort') === '1' ? '불편 여부와 별개로, 전반적인 느낌을 먼저 골라주세요.' : '지금 느끼는 인상에 가장 가까운 것을 골라주세요.'}/>
        <div role="radiogroup" aria-label="전반적인 인상" className="mt-7 overflow-hidden rounded-[22px] border border-[#dfe4eb] bg-white">{options.map((option, index) => {
          const selected = sentiment === option.value
          return <button type="button" role="radio" aria-checked={selected} key={option.value} onClick={() => setSentiment(option.value)} className={`interactive-card flex min-h-[64px] w-full items-center gap-3 px-4 text-left ${index ? 'border-t border-[#e7eaf0]' : ''} ${selected ? 'bg-[#f3f7ff]' : 'bg-white'}`}><span className={`grid size-6 shrink-0 place-items-center rounded-full border ${selected ? 'border-[#7894c5] bg-white' : 'border-[#cfd4dc]'}`}>{selected && <span className="size-2.5 rounded-full bg-[#627ead]"/>}</span><b className={`min-w-0 flex-1 text-[16px] font-semibold tracking-[-.02em] ${selected ? 'text-[#16243a]' : 'text-ink'}`}>{option.title}</b>{selected && <Check size={18} className="text-[#627ead]"/>}</button>
        })}</div>
      </> : <>
        <div className="mt-6 flex min-h-12 items-center justify-between border-y border-[#e2e6ec] px-1"><p className="text-xs text-muted">전체 느낌 <strong className="ml-2 text-sm font-semibold text-ink">{selectedOption?.title}</strong></p><button type="button" onClick={() => setStep(1)} className="min-h-10 rounded-full px-3 text-xs font-semibold text-[#627ead]">바꾸기</button></div>
        <PageHeading className="mt-7" title={detailCopy.title} description={detailCopy.body}/>
        <section className="mt-8"><div className="flex items-center justify-between gap-4"><h2 className="text-sm font-semibold">기억할 사용감 <span className="font-normal text-muted">선택</span></h2>{tags.length > 0 && <span className="text-[10px] font-medium text-muted">{tags.length} / 8</span>}</div><div className="mt-3 flex flex-wrap gap-2">{tagOptions.map(tag => {
          const selected = tags.includes(tag)
          const limitReached = tags.length >= 8 && !selected
          return <button type="button" aria-pressed={selected} disabled={limitReached} key={tag} onClick={() => setTags(value => value.includes(tag) ? value.filter(x => x !== tag) : [...value, tag])} className={`min-h-11 rounded-full border px-4 py-2 text-sm font-semibold transition disabled:opacity-35 ${selected ? 'border-ink bg-ink text-white' : 'border-line bg-white text-muted'}`}>{tag}</button>
        })}</div></section>
        <label className="mt-8 block"><span className="text-sm font-semibold">내 말로 남기기 <span className="font-normal text-muted">선택</span></span><textarea value={note} onChange={e => setNote(e.target.value)} maxLength={1200} rows={5} placeholder={detailCopy.placeholder} className="mt-3 w-full resize-none rounded-[18px] border border-[#dce5f2] bg-[#f8faff] p-4 text-base font-normal leading-7 text-ink outline-none transition placeholder:text-[#9ba6b5] hover:border-[#cad8ea] focus:border-[#91a9cf] focus:bg-white focus:shadow-[0_0_0_4px_rgba(226,235,250,.9)]"/><span className="mt-2 block text-right text-[11px] text-[#8b929d]">{note.length}/1200</span></label>
        <label className={`mt-6 flex cursor-pointer items-start gap-3 rounded-[20px] border p-4 transition ${discomfort === 'REPORTED' ? 'border-[#e8bcbc] bg-[#fff7f7]' : 'border-line bg-white'}`}><input type="checkbox" checked={discomfort === 'REPORTED'} onChange={e => setDiscomfort(e.target.checked ? 'REPORTED' : 'NOT_REPORTED')} className="mt-1 size-4 accent-[#d65454]"/><span><b className="block text-base font-medium">피부 불편함이 있었어요</b><span className="mt-1 block text-xs leading-5 text-muted">만족도와 별도의 관찰 사실이에요. 선택하면 저장 뒤 AI와 변경점을 확인할 수 있어요.</span></span></label>
        {endAfterSave && <div className="mt-5 rounded-[18px] bg-soft p-4 text-xs leading-5 text-muted">이 기록을 저장하면 확인 중인 경험도 함께 마칩니다. 현재 사용 루틴은 그대로 유지돼요.</div>}
        {record.error && <p role="alert" className="mt-4 text-sm text-danger">{record.error.message}</p>}
      </>}
    </div>
    <StickyActionBar><Button disabled={!sentiment || record.isPending} onClick={() => step === 1 ? setStep(2) : record.mutate()} className="w-full">{step === 1 ? '다음' : record.isPending ? '기록하는 중…' : endAfterSave ? '기록하고 경험 마치기' : '이 경험 남기기'}</Button></StickyActionBar>
  </Screen>
}

function RecordSubjectCard({ experience, expanded, onToggle }: { experience: Experience; expanded: boolean; onToggle: () => void }) {
  const routine = experience.routine
  const hasRoutineDetails = Boolean(routine?.items.length)
  const day = Math.max(1, Math.min(7, experience.day))
  const groups = routine ? [
    { key: 'MORNING', label: '아침', items: routine.items.filter(item => item.timeSlot === 'MORNING' || item.timeSlot === 'BOTH') },
    { key: 'EVENING', label: '저녁', items: routine.items.filter(item => item.timeSlot === 'EVENING' || item.timeSlot === 'BOTH') },
  ].filter(group => group.items.length) : []
  const content = <div className="flex min-w-0 flex-1 items-center gap-3.5">
    {experience.subjectType === 'ROUTINE'
      ? <span aria-hidden="true" className="flex size-11 shrink-0 flex-col justify-center gap-1.5 rounded-[15px] border border-[#d9e3f2] bg-white px-3 shadow-[0_5px_16px_rgba(46,67,103,.06)]"><i className="h-0.5 w-full rounded-full bg-[#7f98c2]"/><i className="h-0.5 w-4/5 rounded-full bg-[#a7b9d6]"/><i className="h-0.5 w-3/5 rounded-full bg-[#c0cee2]"/></span>
      : <ProductGlyph category={experience.product?.product?.category || experience.product?.customCategory} size="sm" src={experience.product?.product?.imageUrl}/>}
    <span className="min-w-0"><span className="block text-[10px] font-semibold tracking-[-.01em] text-[#647796]">지금 기록하는 {experience.subjectType === 'ROUTINE' ? '루틴' : '제품'} · DAY {day}</span><strong id="record-subject-title" className="mt-1 block truncate text-[16px] font-semibold leading-5 tracking-[-.025em] text-[#172033]">{experience.title}</strong><span className="mt-1 block truncate text-[11px] leading-4 text-[#687386]">{experience.subtitle}</span></span>
  </div>
  return <section className="mt-5 overflow-hidden rounded-[22px] border border-[#dbe4f1] bg-[#f6f9ff]" aria-labelledby="record-subject-title">
    {hasRoutineDetails ? <button type="button" aria-expanded={expanded} aria-controls="record-routine-detail" onClick={onToggle} className="flex w-full items-center gap-3 p-4 text-left transition active:bg-[#edf3fc]">{content}<span className="flex shrink-0 flex-col items-center gap-1 text-[9px] font-semibold text-[#71809a]"><ChevronDown size={18} className={`transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}/>{expanded ? '접기' : '순서'}</span></button> : <div className="flex items-center p-4">{content}</div>}
    {hasRoutineDetails && expanded && <div id="record-routine-detail" className="border-t border-[#dfe7f2] bg-white px-4 pb-4 pt-1">{groups.map(group => <div key={group.key} className="pt-3"><p className="mb-1.5 text-[10px] font-semibold text-[#748097]">{group.label}</p><ol className="space-y-1">{group.items.map((item, index) => <li key={`${group.key}-${item.userProductId}`} className="flex min-h-9 items-center gap-2.5"><span className="grid size-5 shrink-0 place-items-center rounded-full bg-[#eef3fb] text-[9px] font-semibold text-[#607493]">{index + 1}</span><span className="min-w-0 flex-1 truncate text-[12px] font-medium text-[#303b4e]">{item.productName}</span><span className="shrink-0 text-[10px] text-[#858e9d]">{item.frequency}</span></li>)}</ol></div>)}</div>}
  </section>
}

function SavedRecordResult({ saved, reviewCompleted, experienceEnded, onRescue, onContinue, onComplete, completing, completeError }: { saved: SavedRecord; reviewCompleted: boolean; experienceEnded: boolean; onRescue: () => void; onContinue: () => void; onComplete: () => void; completing: boolean; completeError?: string }) {
  const completed = reviewCompleted || experienceEnded
  return <Screen nav={false}><AppHeader profile={false} notifications={false}/><div className="px-5 pb-10 pt-7 text-center"><div className="relative mx-auto grid size-20 place-items-center rounded-full bg-[#edf3ff]"><span className="absolute inset-2 rounded-full bg-white shadow-[0_7px_22px_rgba(37,55,92,.10)]"/><Check size={30} className="relative"/></div><h1 className="mx-auto mt-7 max-w-[330px] text-3xl font-medium leading-[1.2] tracking-[-.04em]">{reviewCompleted ? '7일의 경험이 쌓였어요' : experienceEnded ? '지금까지의 경험을 남겼어요' : '오늘의 경험을 남겼어요'}</h1><p className="mx-auto mt-4 max-w-72 text-sm leading-6 text-muted">원문은 그대로 보관하고, 다음 제품을 살펴보거나 지난 경험을 비교할 때 다시 연결해요.</p>
    {saved.linkedPatternId && <Link to={`/patterns/${saved.linkedPatternId}`} className="mt-8 block rounded-[22px] border border-[#d9e6ff] bg-[#f7f9fd] p-5 text-left"><AiBadge/><p className="mt-3 text-base font-medium">기존 패턴에 새 기록이 연결됐어요</p><p className="mt-1 text-xs leading-5 text-muted">같았던 기록과 다른 기록을 함께 확인할 수 있어요.</p><span className="mt-4 inline-flex items-center gap-1 text-sm font-medium">근거 보기<ChevronRight size={16}/></span></Link>}
    {saved.rescueSuggested ? <Card className="mt-6 rounded-[22px] border-[#f0d3d3] bg-[#fffafa] text-left"><div className="flex gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-full bg-[#fff0f0] text-danger"><AlertCircle size={20}/></span><div><h2 className="text-base font-medium">불편함의 변경점을 확인할까요?</h2><p className="mt-1 text-xs leading-5 text-muted">지금 기록을 같은 AI 대화에 연결하고, 진단 없이 바뀐 점부터 차근히 살펴봐요.</p></div></div><Button onClick={onRescue} className="mt-5 w-full">AI와 변경점 확인<Sparkles size={17}/></Button></Card> : <Button onClick={onContinue} className="mt-8 w-full">{completed ? '홈으로 가기' : '계속 써보기'}</Button>}
    {!completed && <button type="button" disabled={completing} onClick={onComplete} className="mt-5 min-h-11 px-3 text-sm font-medium text-muted underline decoration-line underline-offset-4 disabled:opacity-50">{completing ? '마치는 중…' : '이 경험은 여기서 마치기'}</button>}
    {completeError && <p role="alert" className="mt-2 text-xs text-danger">{completeError}</p>}
  </div></Screen>
}

export function RoutineEditPage() {
  const navigate = useNavigate(); const queryClient = useQueryClient()
  const auth = useQuery({ queryKey: ['auth'], queryFn: api.me })
  const products = useQuery({ queryKey: ['user-products'], queryFn: api.userProducts })
  const current = useQuery({ queryKey: ['current-routine'], queryFn: api.currentRoutine, retry: false })
  const home = useQuery({ queryKey: ['home'], queryFn: api.home })
  const [selected, setSelected] = useState<number[]>([])
  const [settings, setSettings] = useState<Record<number, Pick<RoutineItemInput, 'timeSlot' | 'frequency'>>>({})
  const [initialized, setInitialized] = useState(false)
  const saveRequestId = useRef(uid())
  const transitionRecordRequestId = useRef(uid())
  const [confirmChange, setConfirmChange] = useState(false)
  const [earlyError, setEarlyError] = useState('')
  const [transitioning, setTransitioning] = useState(false)
  const [settingPicker, setSettingPicker] = useState<{ productId: number; field: 'timeSlot' | 'frequency' } | null>(null)
  const [ownedPickerOpen, setOwnedPickerOpen] = useState(false)
  const [productAddOpen, setProductAddOpen] = useState(false)
  useEffect(() => {
    if (initialized || !auth.data || current.isPending) return
    const draft = readRoutineDraft(auth.data.userId)
    if (draft) {
      setSelected(draft.selected)
      setSettings(draft.settings)
    } else if (current.data) {
      setSelected(current.data.items.map(item => item.userProductId))
      setSettings(Object.fromEntries(current.data.items.map(item => [item.userProductId, { timeSlot: item.timeSlot, frequency: item.frequency }])))
    }
    setInitialized(true)
  }, [auth.data, current.data, current.isPending, initialized])
  useEffect(() => {
    if (!initialized || !auth.data) return
    try { sessionStorage.setItem(routineDraftKey(auth.data.userId), JSON.stringify({ version: 1, selected, settings })) } catch { /* 저장소가 막혀도 편집은 유지한다 */ }
  }, [auth.data, initialized, selected, settings])
  const routineItems = () => selected.map(userProductId => ({ userProductId, timeSlot: settings[userProductId]?.timeSlot || 'EVENING', frequency: settings[userProductId]?.frequency || '매일' } as RoutineItemInput))
  const save = useMutation({ mutationFn: () => api.replaceRoutine('내 스킨케어 루틴', routineItems(), saveRequestId.current), onSuccess: value => {
    if (auth.data) try { sessionStorage.removeItem(routineDraftKey(auth.data.userId)) } catch { /* 서버 저장이 우선이다 */ }
    queryClient.invalidateQueries()
    navigate(`/experiences/${value.id}`)
  } })
  const finishAndSave = async (sentiment?: 'LIKED' | 'UNSURE' | 'DISAPPOINTED') => {
    const active = home.data?.currentExperience
    if (!active) { save.mutate(); return }
    setEarlyError('')
    setTransitioning(true)
    try {
      if (sentiment) await api.recordExperience(active.id, { sentiment, note: '', tags: [], discomfort: 'UNKNOWN' }, transitionRecordRequestId.current)
      await api.completeExperience(active.id)
      setConfirmChange(false)
      save.mutate()
    } catch (error) {
      setEarlyError(error instanceof Error ? error.message : '현재 경험을 정리하지 못했어요.')
    } finally {
      setTransitioning(false)
    }
  }
  const move = (index: number, direction: -1 | 1) => setSelected(value => { const next = [...value]; const target = index + direction; if (target < 0 || target >= next.length) return value; [next[index], next[target]] = [next[target], next[index]]; return next })
  const updateSetting = (productId: number, patch: Partial<Pick<RoutineItemInput, 'timeSlot' | 'frequency'>>) => setSettings(value => ({ ...value, [productId]: { timeSlot: value[productId]?.timeSlot || 'EVENING', frequency: value[productId]?.frequency || '매일', ...patch } }))
  const byId = useMemo(() => new Map((products.data || []).map(item => [item.id, item])), [products.data])
  const currentError = current.error && !(current.error instanceof ApiError && current.error.status === 404) ? current.error : null
  if (auth.isPending || products.isPending || current.isPending || home.isPending || !initialized) return <Screen nav={false}><TopBar title="루틴 편집" back/><Loading label="편집 중인 루틴을 불러오는 중"/></Screen>
  const loadError = auth.error || products.error || currentError || home.error
  if (loadError) return <Screen nav={false}><TopBar title="루틴 편집" back/><ErrorState message={loadError.message} onRetry={() => { auth.refetch(); products.refetch(); current.refetch(); home.refetch() }}/></Screen>
  const canAdd = selected.length < 12
  const availableCount = products.data.filter(item => !selected.includes(item.id)).length
  return <Screen nav={false} className="pb-32">
    <TopBar title="루틴 편집" back/>
    <div className="px-5 py-6">
      <PageHeading title="실제로 바르는 순서" description="제품마다 언제, 얼마나 자주 쓰는지 정리해요."/>

      <section className="mt-8" aria-labelledby="selected-products-title">
        <div className="flex items-end justify-between gap-4"><div><p className="text-[11px] font-semibold text-[#7695c7]">위에서 아래 순서로 사용해요</p><h2 id="selected-products-title" className="mt-1 text-[20px] font-semibold tracking-[-.03em]">사용할 제품</h2></div><span className="pb-0.5 text-xs font-medium tabular-nums text-muted">{selected.length} / 12</span></div>
        {selected.length ? <div className="mt-4 space-y-3">{selected.map((id, index) => {
          const item = byId.get(id)
          const setting = settings[id] || { timeSlot: 'EVENING', frequency: '매일' }
          return <article key={id} className="overflow-hidden rounded-[22px] border border-[#dce6f5] bg-white shadow-[0_5px_18px_rgba(55,78,119,.045)]">
            <div className="flex min-h-[72px] items-center gap-3 px-3.5 py-3"><span className="grid size-8 shrink-0 place-items-center rounded-full bg-[#172033] text-[12px] font-semibold text-white">{index + 1}</span><div className="min-w-0 flex-1"><p className="truncate text-[15px] font-semibold tracking-[-.02em]">{displayName(item)}</p><p className="mt-0.5 text-[11px] text-[#8a929e]">{category(item)}</p></div><div className="flex shrink-0 items-center"><button type="button" aria-label={`${displayName(item)} 위로 이동`} onClick={() => move(index, -1)} disabled={index === 0} className="grid size-9 place-items-center rounded-full text-[#26354b] transition hover:bg-[#f3f5f8] active:scale-95 disabled:text-[#d3d8e0]"><ArrowUp size={16}/></button><button type="button" aria-label={`${displayName(item)} 아래로 이동`} onClick={() => move(index, 1)} disabled={index === selected.length - 1} className="grid size-9 place-items-center rounded-full text-[#26354b] transition hover:bg-[#f3f5f8] active:scale-95 disabled:text-[#d3d8e0]"><ArrowDown size={16}/></button><span className="ml-1 border-l border-[#e7e9ed] pl-1"><button type="button" aria-label={`${displayName(item)} 제거`} onClick={() => { setSelected(value => value.filter(x => x !== id)); if (settingPicker?.productId === id) setSettingPicker(null) }} className="grid size-9 place-items-center rounded-full text-[#7d8591] transition hover:bg-[#f3f5f8] active:scale-95"><X size={17}/></button></span></div></div>
            <div className="grid grid-cols-2 gap-2.5 border-t border-[#dfe8f5] bg-[#f6f9ff] px-3.5 pb-3.5 pt-3">
              <RoutineSettingButton label="사용 시간" value={timeSlotLabel(setting.timeSlot)} onClick={() => setSettingPicker({ productId: id, field: 'timeSlot' })}/>
              <RoutineSettingButton label="사용 빈도" value={setting.frequency} onClick={() => setSettingPicker({ productId: id, field: 'frequency' })}/>
            </div>
          </article>
        })}</div> : <div className="mt-4 rounded-[22px] border border-dashed border-line bg-[#fafbf8] px-5 py-8 text-center"><p className="text-sm font-medium">아래에서 사용할 제품을 골라주세요</p><p className="mt-1.5 text-xs leading-5 text-muted">제품 하나만으로도 경험을 시작할 수 있어요.</p></div>}
      </section>

      <section className="mt-9" aria-labelledby="available-products-title"><div className="flex items-end justify-between"><h2 id="available-products-title" className="text-[20px] font-semibold tracking-[-.03em]">제품 더하기</h2>{!canAdd && <span className="text-xs font-medium text-danger">최대 12개</span>}</div><div className="mt-4 overflow-hidden rounded-[20px] border border-[#dce6f5] bg-[#f8faff]">
        <button type="button" disabled={!products.data.length} onClick={() => setOwnedPickerOpen(true)} className="flex min-h-[72px] w-full items-center gap-3.5 px-4 text-left transition hover:bg-white active:bg-[#f1f6fd] disabled:opacity-45"><span className="grid size-10 shrink-0 place-items-center rounded-[14px] border border-white bg-[#edf3fc] text-[#5e7393]"><Plus size={18}/></span><span className="min-w-0 flex-1"><strong className="block text-[14px] font-semibold tracking-[-.02em]">내 화장품에서 선택</strong><span className="mt-1 block text-[11px] text-[#7f8b9c]">{availableCount ? `추가할 수 있는 제품 ${availableCount}개` : '모든 보유 제품을 담았어요'}</span></span><ChevronRight size={17} className="shrink-0 text-[#8190a6]"/></button>
        <button type="button" onClick={() => setProductAddOpen(true)} className="flex min-h-[72px] w-full items-center gap-3.5 border-t border-[#dfe8f5] px-4 text-left transition hover:bg-white active:bg-[#f1f6fd]"><span className="grid size-10 shrink-0 place-items-center rounded-[14px] border border-white bg-[#eaf1fd] text-[#627ead]"><Sparkles size={18}/></span><span className="min-w-0 flex-1"><strong className="block text-[14px] font-semibold tracking-[-.02em]">새 화장품 찾기</strong><span className="mt-1 block text-[11px] text-[#7f8b9c]">AI 추천 또는 제품명으로 검색</span></span><ChevronRight size={17} className="shrink-0 text-[#788aa5]"/></button>
      </div>{save.error && <p role="alert" className="mt-4 text-sm text-danger">{save.error.message}</p>}</section>
      <p className="mt-7 text-center text-[11px] leading-5 text-[#8a929d]">저장하면 이전 루틴은 그대로 남고 새 경험이 시작돼요.</p>
    </div>
    <StickyActionBar><Button disabled={!selected.length || save.isPending} onClick={() => home.data?.currentExperience ? setConfirmChange(true) : save.mutate()} className="w-full">{save.isPending ? '저장하는 중…' : `이 순서로 새 경험 시작 (${selected.length})`}</Button></StickyActionBar>
    <BeforeChangeSheet open={confirmChange} title={home.data?.currentExperience?.title || '지금 사용 중인 조합'} pending={transitioning || save.isPending} error={earlyError} onClose={() => setConfirmChange(false)} onChoose={choice => finishAndSave(choice)} onSkip={() => finishAndSave()}/>
    <RoutineSettingSheet picker={settingPicker} productName={settingPicker ? displayName(byId.get(settingPicker.productId)) : ''} currentValue={settingPicker ? settings[settingPicker.productId]?.[settingPicker.field] || (settingPicker.field === 'timeSlot' ? 'EVENING' : '매일') : ''} onClose={() => setSettingPicker(null)} onChoose={value => {
      if (!settingPicker) return
      updateSetting(settingPicker.productId, settingPicker.field === 'timeSlot' ? { timeSlot: value as RoutineItemInput['timeSlot'] } : { frequency: value })
      setSettingPicker(null)
    }}/>
    <RoutineProductPickerSheet open={ownedPickerOpen} products={products.data} selected={selected} onClose={() => setOwnedPickerOpen(false)} onToggle={item => {
      if (selected.includes(item.id)) {
        setSelected(value => value.filter(id => id !== item.id))
        return
      }
      if (!canAdd) return
      setSelected(value => [...value, item.id])
      setSettings(value => ({ ...value, [item.id]: value[item.id] || { timeSlot: 'EVENING', frequency: '매일' } }))
    }}/>
    <ProductAddSheet open={productAddOpen} onClose={() => setProductAddOpen(false)} onAi={() => {
      setProductAddOpen(false)
      navigate(startChatPath('RECOMMEND', '지금 편집 중인 루틴과 내 사용 경험을 바탕으로 추가로 살펴볼 제품 후보를 찾아줘.'))
    }} onSearch={() => {
      setProductAddOpen(false)
      navigate(`/explore?returnTo=${encodeURIComponent('/routine/edit')}`)
    }}/>
  </Screen>
}

function RoutineSettingButton({ label, value, onClick }: { label: string; value: string; onClick: () => void }) {
  return <div><p className="mb-1.5 pl-2 text-[10px] font-medium text-[#809ac3]">{label}</p><button type="button" aria-haspopup="dialog" onClick={onClick} className="flex min-h-12 w-full items-center justify-between rounded-full border border-[#cbdcf4] bg-white px-4 text-[13px] font-semibold text-[#1d2939] shadow-[0_2px_8px_rgba(65,94,142,.035)] transition hover:border-[#adc4e7] active:scale-[.985]">{value}<ChevronDown size={16} className="text-[#607696]"/></button></div>
}

function RoutineProductPickerSheet({ open, products, selected, onClose, onToggle }: { open: boolean; products: UserProduct[]; selected: number[]; onClose: () => void; onToggle: (item: UserProduct) => void }) {
  const atLimit = selected.length >= 12
  return <BottomSheet open={open} onClose={onClose} title="루틴에 제품 추가">
    <div className="flex items-center justify-between gap-4"><p className="text-xs text-[#7c8592]">내 화장품에서 여러 개를 고를 수 있어요.</p><span className="shrink-0 text-xs font-semibold tabular-nums text-[#60718a]">{selected.length} / 12</span></div>
    <div className="hide-scrollbar -mx-1 mt-4 max-h-[46svh] space-y-2 overflow-y-auto px-1 pb-1">{products.map(item => {
      const checked = selected.includes(item.id)
      const disabled = atLimit && !checked
      return <button type="button" role="checkbox" aria-checked={checked} disabled={disabled} key={item.id} onClick={() => onToggle(item)} className={`flex min-h-[70px] w-full items-center gap-3 rounded-[18px] border px-3 text-left transition disabled:opacity-35 ${checked ? 'border-[#afc3e3] bg-[#f3f7ff]' : 'border-[#e3e7ec] bg-white hover:bg-[#fafbfd]'}`}><ProductGlyph category={category(item)} size="sm" src={item.product?.imageUrl}/><span className="min-w-0 flex-1"><strong className="block truncate text-[14px] font-semibold tracking-[-.02em]">{displayName(item)}</strong><span className="mt-0.5 block text-[11px] text-[#858d98]">{category(item)}</span></span><span className={`grid size-7 shrink-0 place-items-center rounded-full border ${checked ? 'border-[#718db9] bg-[#718db9] text-white' : 'border-[#d2d8e0] bg-white text-[#748094]'}`}>{checked ? <Check size={15}/> : <Plus size={15}/>}</span></button>
    })}</div>
    <Button onClick={onClose} className="mt-4 w-full">선택 완료 · {selected.length}개</Button>
  </BottomSheet>
}

function RoutineSettingSheet({ picker, productName, currentValue, onClose, onChoose }: { picker: { field: 'timeSlot' | 'frequency' } | null; productName: string; currentValue: string; onClose: () => void; onChoose: (value: string) => void }) {
  const options = picker?.field === 'timeSlot'
    ? [
        { value: 'MORNING', label: '아침', description: '아침 루틴에 사용해요' },
        { value: 'EVENING', label: '저녁', description: '저녁 루틴에 사용해요' },
        { value: 'BOTH', label: '아침 · 저녁', description: '두 루틴에 모두 사용해요' },
      ]
    : [
        { value: '매일', label: '매일', description: '매일 같은 순서로 사용해요' },
        { value: '주 2~3회', label: '주 2~3회', description: '간격을 두고 사용해요' },
        { value: '필요할 때', label: '필요할 때', description: '정해진 주기 없이 사용해요' },
      ]
  return <BottomSheet open={Boolean(picker)} onClose={onClose} title={picker?.field === 'timeSlot' ? '언제 사용하나요?' : '얼마나 자주 사용하나요?'}>
    <p className="-mt-2 truncate text-xs font-medium text-[#7c8796]">{productName}</p>
    <div role="radiogroup" aria-label={picker?.field === 'timeSlot' ? '사용 시간' : '사용 빈도'} className="mt-5 overflow-hidden rounded-[20px] border border-[#dfe5ee]">{options.map((option, index) => {
      const selected = currentValue === option.value
      return <button type="button" role="radio" aria-checked={selected} key={option.value} onClick={() => onChoose(option.value)} className={`flex min-h-[68px] w-full items-center gap-3 px-4 text-left transition ${index ? 'border-t border-[#e5e9ef]' : ''} ${selected ? 'bg-[#f3f7ff]' : 'bg-white hover:bg-[#fafbfd]'}`}><span className={`grid size-6 shrink-0 place-items-center rounded-full border ${selected ? 'border-[#7895c3] bg-white' : 'border-[#cfd5de]'}`}>{selected && <span className="size-2.5 rounded-full bg-[#627ead]"/>}</span><span className="min-w-0 flex-1"><strong className="block text-[15px] font-semibold tracking-[-.02em]">{option.label}</strong><span className="mt-0.5 block text-[11px] text-[#7b8491]">{option.description}</span></span>{selected && <Check size={18} className="text-[#627ead]"/>}</button>
    })}</div>
    <p className="mt-4 text-center text-[10px] leading-4 text-[#9198a3]">선택하면 바로 편집안에 반영돼요.</p>
  </BottomSheet>
}

function timeSlotLabel(value: RoutineItemInput['timeSlot']) {
  return value === 'MORNING' ? '아침' : value === 'BOTH' ? '아침 · 저녁' : '저녁'
}

function displayName(item?: UserProduct) { return item?.product?.name || item?.customName || '제품' }
function category(item?: UserProduct) { return item?.product?.category || item?.customCategory || '기타' }
function sentimentLabel(value: string) { return value === 'LIKED' ? '마음에 들어요' : value === 'DISAPPOINTED' ? '아쉬워요' : '아직 모르겠어요' }
function formatExperienceDate(value: string) {
  const normalized = /Z$|[+-]\d\d:\d\d$/.test(value) ? value : `${value.replace(' ', 'T')}Z`
  const date = new Date(normalized)
  return Number.isNaN(date.getTime()) ? value.slice(0, 10) : new Intl.DateTimeFormat('ko-KR', { month: 'long', day: 'numeric' }).format(date)
}

function RoutineSteps({ routine }: { routine: Routine }) {
  const groups = [
    { key: 'MORNING', label: '아침', items: routine.items.filter(item => item.timeSlot === 'MORNING' || item.timeSlot === 'BOTH') },
    { key: 'EVENING', label: '저녁', items: routine.items.filter(item => item.timeSlot === 'EVENING' || item.timeSlot === 'BOTH') },
  ].filter(group => group.items.length > 0)
  return <section className="mt-8"><div className="mb-3 flex items-end justify-between"><h2 className="section-title">바르는 순서</h2><Link to="/routine/edit" className="text-xs font-medium text-accent">편집</Link></div><div className="space-y-3">{groups.map(group => <div key={group.key} className="surface-card overflow-hidden p-0"><div className="bg-soft px-4 py-2 text-xs font-medium text-muted">{group.label}</div>{group.items.map((item, index) => <div key={`${group.key}-${item.userProductId}`} className="flex items-center gap-3 border-t border-line px-4 py-3.5"><span className="grid size-7 shrink-0 place-items-center rounded-full bg-soft text-xs font-medium">{index + 1}</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{item.productName}</p><p className="mt-0.5 text-xs text-muted">{item.category} · {item.frequency}</p></div></div>)}</div>)}</div></section>
}

type RoutineDraft = {
  version: 1
  selected: number[]
  settings: Record<number, Pick<RoutineItemInput, 'timeSlot' | 'frequency'>>
}

function routineDraftKey(userId: number) {
  return `skn:routine-draft:${userId}`
}

function readRoutineDraft(userId: number): RoutineDraft | null {
  try {
    const value = JSON.parse(sessionStorage.getItem(routineDraftKey(userId)) || 'null') as RoutineDraft | null
    if (!value || value.version !== 1 || !Array.isArray(value.selected) || !value.settings) return null
    return value
  } catch {
    return null
  }
}
