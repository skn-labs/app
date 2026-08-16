import { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { ArrowRight, BookOpen, Check, ChevronDown, ChevronRight, Clock3, GripVertical, PencilLine, Plus, Repeat2, Search, Sparkles, X } from 'lucide-react'
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { api, ApiError, uid } from '../lib/api'
import { startChatPath } from '../lib/chat'
import type { Experience, ExperienceRecord, RoutineItemInput, SavedRecord, UserProduct } from '../lib/types'
import { BeforeChangeSheet } from '../components/BeforeChangeSheet'
import { BrandIdentity } from '../components/BrandIdentity'
import { ExperienceRecordItem } from '../components/ExperienceRecordItem'
import { ExperienceActionIcon } from '../components/ExperienceActionIcon'
import { ExperienceDiscomfortToggle, ExperienceRecordStatus, ExperienceSentimentPicker, ExperienceStatusBadge, type ExperienceSentiment } from '../components/ExperienceStatusBadge'
import { ProductAddSheet } from '../components/ProductAddSheet'
import { AiBadge, AppHeader, BottomSheet, BrandMark, Button, ErrorState, Loading, PageHeading, ProductGlyph, Screen, StickyActionBar, TopBar } from '../components/ui'
import heroWave from '../assets/figma/hero-wave.webp'

export function ExperiencePage() {
  const { id } = useParams(); const experienceId = Number(id)
  const navigate = useNavigate()
  const validExperienceId = Number.isSafeInteger(experienceId) && experienceId > 0
  const experience = useQuery({ queryKey: ['experience', experienceId], queryFn: () => api.experience(experienceId), enabled: validExperienceId })
  const records = useQuery({ queryKey: ['records'], queryFn: api.records, enabled: validExperienceId })
  const sessionRecords = useMemo(() => (records.data || [])
    .filter(record => record.sessionId === experienceId)
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()), [experienceId, records.data])
  if (!validExperienceId) return <Screen nav={false}><AppHeader back profile={false} notifications={false}/><ErrorState message="사용 경험 주소를 확인해주세요."/></Screen>
  if (experience.isPending) return <Screen nav={false}><AppHeader back profile={false} notifications={false}/><Loading/></Screen>
  if (experience.isError) return <Screen nav={false}><AppHeader back profile={false} notifications={false}/><ErrorState message={experience.error.message} onRetry={() => experience.refetch()}/></Screen>
  const data = experience.data
  const day = Math.max(1, Math.min(7, data.day))
  const active = data.status === 'ACTIVE'
  const visibleRecords = sessionRecords.length ? sessionRecords : data.latestRecord ? [data.latestRecord] : []
  const recordCount = visibleRecords.length
  return <Screen nav={false} className={`bg-[#fbfcff] ${active ? 'pb-32' : ''}`}>
    <AppHeader back profile={false} notifications={false} sticky/>
    <div className="px-5 pb-10 pt-4">
      <PageHeading eyebrow={active ? '진행 중인 사용 기록' : '마친 사용 기록'} title={data.title} description={active ? '느낀 순간마다 남기고, 7일째에 지금까지의 흐름을 돌아봐요.' : `${formatExperienceDate(data.startedAt)}에 시작한 기록을 다시 살펴보세요.`}/>

      <section className="relative mt-7 overflow-hidden rounded-[26px] border border-[#dce6f5] shadow-[0_10px_30px_rgba(37,55,92,.09)]" aria-label={active ? `7일 중 ${day}일째 진행 상황` : '마친 사용 기록 요약'}>
        <img src={heroWave} alt="" aria-hidden className="absolute inset-0 size-full object-cover object-bottom"/>
        <div aria-hidden className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,.92)_0%,rgba(247,250,255,.72)_52%,rgba(232,240,255,.38)_100%)]"/>
        <div className="relative px-5 py-5">
          <div className="flex items-start justify-between gap-4"><div><p className="text-[11px] font-semibold tracking-[.08em] text-[#667996]">{active ? '진행 상황' : '기록 요약'}</p><p className="mt-2 text-[18px] font-semibold leading-6 tracking-[-.03em] text-[#172033]">{active ? data.reviewDue ? '지금까지의 느낌을 돌아볼 때예요' : `${data.daysUntilReview}일 뒤 함께 돌아봐요` : '이 사용 기록을 마쳤어요'}</p></div><strong className="shrink-0 rounded-full border border-white/90 bg-white/72 px-3 py-2 text-[11px] font-semibold tracking-[.04em] text-[#465b7d] shadow-[0_3px_10px_rgba(53,79,119,.08)] backdrop-blur tabular-nums">DAY {day} / 7</strong></div>
          <div role="progressbar" aria-label={`7일 중 ${day}일`} aria-valuemin={1} aria-valuemax={7} aria-valuenow={day} className="mt-5 flex gap-1.5">{Array.from({ length: 7 }, (_, index) => <span key={index} className={`h-1.5 flex-1 rounded-full ${index < day ? 'bg-[#172033]' : 'bg-[#172033]/15'}`}/>)}</div>
          <div className="mt-4 flex items-center justify-between gap-3"><span className="text-[10px] font-medium text-[#71809a]">최근 느낌</span><ExperienceRecordStatus record={visibleRecords[0]}/></div>
          <dl className="mt-5 grid grid-cols-3 divide-x divide-black/10 border-t border-black/10 pt-4 text-center"><div><dt className="text-[10px] font-medium text-black/42">시작한 날</dt><dd className="mt-1.5 text-[12px] font-semibold text-[#2b3547]">{formatExperienceDate(data.startedAt)}</dd></div><div><dt className="text-[10px] font-medium text-black/42">돌아보는 날</dt><dd className="mt-1.5 text-[12px] font-semibold text-[#2b3547]">{formatExperienceDate(data.reviewDueAt)}</dd></div><div><dt className="text-[10px] font-medium text-black/42">남긴 느낌</dt><dd className="mt-1.5 text-[12px] font-semibold text-[#2b3547]">{records.isPending ? '불러오는 중' : `${recordCount}개`}</dd></div></dl>
        </div>
      </section>

      <ExperienceSubjectSummary experience={data}/>
      <ExperienceJournal records={visibleRecords} loading={records.isPending} failed={records.isError} onRetry={() => records.refetch()}/>

      <div className="mt-7 flex items-start gap-3 rounded-[20px] border border-[#e5e9f5] bg-[#f3f6ff] p-4"><Clock3 size={18} className="mt-0.5 shrink-0 text-[#6579a3]"/><div><p className="text-[13px] font-semibold text-[#465577]">7일을 채우지 않아도 언제든 남길 수 있어요.</p><p className="mt-1 text-[11px] leading-5 text-[#687594]">7일은 안전이나 효능을 판정하는 기간이 아니라, 지금까지의 사용 경험을 돌아보는 기본 시점이에요.</p></div></div>
      {active ? <button type="button" onClick={() => navigate(`/experiences/${experienceId}/record?end=1`)} className="mx-auto mt-5 flex min-h-11 items-center px-3 text-[12px] font-semibold text-[#757e8d] underline decoration-[#cbd1da] underline-offset-4">느낌을 남기고 이 확인 마치기</button> : <Button onClick={() => navigate('/records?view=history')} variant="secondary" className="mt-6 w-full">전체 기록에서 보기</Button>}
    </div>
    {active && <div className="safe-bottom pointer-events-none fixed inset-x-0 bottom-0 z-20 mx-auto max-w-[430px] px-5">
      <div className="grid grid-cols-2 gap-2.5">
        <button type="button" onClick={() => navigate(`/experiences/${experienceId}/record`)} className="pointer-events-auto flex min-h-[58px] min-w-0 items-center justify-center gap-2 rounded-[18px] bg-[#111722] px-3 text-[13px] font-[600] leading-none tracking-[-.01em] text-white shadow-[0_14px_32px_rgba(17,23,34,.25)] transition hover:-translate-y-0.5 hover:bg-black active:translate-y-0 active:scale-[.985]"><ExperienceActionIcon name="feeling" className="size-5 shrink-0"/><span className="min-w-0 whitespace-nowrap font-[600]">느낌 남기기</span></button>
        <button type="button" aria-label="피부 불편함을 별도로 기록" onClick={() => navigate(`/experiences/${experienceId}/record?discomfort=1`)} className="pointer-events-auto flex min-h-[58px] min-w-0 items-center justify-center gap-2 rounded-[18px] border border-[#dfd2cd] bg-white/96 px-3 text-[13px] font-[600] leading-none tracking-[-.01em] text-[#744f49] shadow-[0_11px_26px_rgba(62,48,44,.12)] backdrop-blur-md transition hover:-translate-y-0.5 hover:border-[#cfbbb4] active:translate-y-0 active:scale-[.985]"><ExperienceActionIcon name="discomfort" className="size-5 shrink-0"/><span className="min-w-0 whitespace-nowrap font-[600]">불편함 기록</span></button>
      </div>
    </div>}
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
  const [sentiment, setSentiment] = useState<ExperienceSentiment | ''>('')
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
  const tagOptions = ['가벼움','촉촉함','산뜻함','흡수가 빠름','밀림 없음','답답함','무거움','따가움','붉어짐','계절 차이']
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
        <ExperienceSentimentPicker value={sentiment} onChange={setSentiment} className="mt-7"/>
      </> : <>
        <div className="mt-6 flex min-h-12 items-center justify-between border-y border-[#e2e6ec] px-1"><div className="flex items-center gap-2"><span className="text-xs text-muted">전체 느낌</span><ExperienceStatusBadge status={sentiment as ExperienceSentiment}/></div><button type="button" onClick={() => setStep(1)} className="min-h-10 rounded-full px-3 text-xs font-semibold text-[#627ead]">바꾸기</button></div>
        <PageHeading className="mt-7" title={detailCopy.title} description={detailCopy.body}/>
        <section className="mt-8"><div className="flex items-center justify-between gap-4"><h2 className="text-sm font-semibold">기억할 사용감 <span className="font-normal text-muted">선택</span></h2>{tags.length > 0 && <span className="text-[10px] font-medium text-muted">{tags.length} / 8</span>}</div><div className="mt-3 flex flex-wrap gap-2">{tagOptions.map(tag => {
          const selected = tags.includes(tag)
          const limitReached = tags.length >= 8 && !selected
          return <button type="button" aria-pressed={selected} disabled={limitReached} key={tag} onClick={() => setTags(value => value.includes(tag) ? value.filter(x => x !== tag) : [...value, tag])} className={`min-h-11 rounded-full border px-4 py-2 text-sm font-semibold transition disabled:opacity-35 ${selected ? 'border-ink bg-ink text-white' : 'border-line bg-white text-muted'}`}>{tag}</button>
        })}</div></section>
        <label className="mt-8 block"><span className="text-sm font-semibold">내 말로 남기기 <span className="font-normal text-muted">선택</span></span><textarea value={note} onChange={e => setNote(e.target.value)} maxLength={1200} rows={5} placeholder={detailCopy.placeholder} className="mt-3 w-full resize-none rounded-[18px] border border-[#dce5f2] bg-[#f8faff] p-4 text-base font-normal leading-7 text-ink outline-none transition placeholder:text-[#9ba6b5] hover:border-[#cad8ea] focus:border-[#91a9cf] focus:bg-white focus:shadow-[0_0_0_4px_rgba(226,235,250,.9)]"/><span className="mt-2 block text-right text-[11px] text-[#8b929d]">{note.length}/1200</span></label>
        <section className="mt-7" aria-labelledby="discomfort-title"><div className="mb-3 flex items-center justify-between gap-3"><h2 id="discomfort-title" className="text-sm font-semibold">피부 불편함</h2><span className="text-[10px] font-medium text-muted">별도 선택</span></div><ExperienceDiscomfortToggle checked={discomfort === 'REPORTED'} onChange={checked => setDiscomfort(checked ? 'REPORTED' : 'NOT_REPORTED')}/></section>
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
  const content = <div className="flex min-w-0 flex-1 items-center gap-3">
    {experience.subjectType === 'PRODUCT' && <ProductGlyph category={experience.product?.product?.category || experience.product?.customCategory} size="sm" src={experience.product?.product?.imageUrl}/>}
    <span className="min-w-0"><span className="block text-[10px] font-semibold tracking-[.02em] text-[#647796]">기록 중인 {experience.subjectType === 'ROUTINE' ? '루틴' : '제품'} · DAY {day}</span><strong id="record-subject-title" className="mt-1 block truncate text-[16px] font-semibold leading-5 tracking-[-.025em] text-[#172033]">{experience.title}</strong><span className="mt-1 block truncate text-[11px] leading-4 text-[#687386]">{experience.subtitle}</span></span>
  </div>
  return <section className="mt-5 overflow-hidden rounded-[18px] border border-[#dbe4f1] bg-[#f7f9fd]" aria-labelledby="record-subject-title">
    {hasRoutineDetails ? <button type="button" aria-expanded={expanded} aria-controls="record-routine-detail" onClick={onToggle} className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition active:bg-[#edf3fc]">{content}<span className="flex shrink-0 items-center gap-1 text-[10px] font-semibold text-[#657797]">{routine?.items.length}개<ChevronDown size={17} className={`transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}/></span></button> : <div className="flex items-center px-4 py-3.5">{content}</div>}
    {hasRoutineDetails && expanded && <div id="record-routine-detail" className="border-t border-[#dfe7f2] bg-white px-4 pb-3">{groups.map(group => <div key={group.key} className="pt-3"><p className="mb-1 text-[10px] font-semibold text-[#748097]">{group.label}</p><ol className="divide-y divide-[#edf0f4]">{group.items.map((item, index) => <li key={`${group.key}-${item.userProductId}`} className="grid min-h-10 grid-cols-[20px_minmax(0,1fr)_auto] items-center gap-2"><span className="text-[10px] font-semibold tabular-nums text-[#71809a]">{String(index + 1).padStart(2, '0')}</span><span className="truncate text-[12px] font-medium text-[#303b4e]">{item.productName}</span><span className="shrink-0 text-[10px] text-[#858e9d]">{item.frequency}</span></li>)}</ol></div>)}</div>}
  </section>
}

function SavedRecordResult({ saved, reviewCompleted, experienceEnded, onRescue, onContinue, onComplete, completing, completeError }: { saved: SavedRecord; reviewCompleted: boolean; experienceEnded: boolean; onRescue: () => void; onContinue: () => void; onComplete: () => void; completing: boolean; completeError?: string }) {
  const completed = reviewCompleted || experienceEnded
  return <Screen nav={false}><AppHeader profile={false} notifications={false}/><div className="px-5 pb-10 pt-6"><p className="text-[11px] font-semibold tracking-[.08em] text-[#6680a7]">기록 저장됨</p><h1 className="mt-2 max-w-[330px] text-[30px] font-semibold leading-[1.18] tracking-[-.045em]">{reviewCompleted ? '7일의 경험이 쌓였어요' : experienceEnded ? '지금까지의 경험을 남겼어요' : '오늘의 경험을 남겼어요'}</h1><p className="mt-3 max-w-80 text-[13px] leading-6 text-muted">원문과 선택한 상태를 그대로 보관했어요.</p>
    <div className="mt-7 border-y border-[#e2e6ec]"><ExperienceRecordItem record={saved.record}/></div>
    {saved.linkedPatternId && <Link to={`/patterns/${saved.linkedPatternId}`} className="mt-6 flex min-h-[64px] items-center gap-3 border-b border-[#dfe5ee] pb-4 text-left"><AiBadge/><span className="min-w-0 flex-1"><strong className="block text-[13px] font-semibold">기존 패턴에 연결됐어요</strong><span className="mt-1 block text-[11px] leading-4 text-muted">같은 기록과 다른 기록을 함께 확인해요.</span></span><ChevronRight size={16} className="shrink-0 text-[#7d8795]"/></Link>}
    {saved.rescueSuggested ? <section className="mt-6 border-t border-[#eadbdb] pt-5"><div className="flex items-start gap-3"><ExperienceStatusBadge status="DISCOMFORT"/><div className="min-w-0 flex-1"><h2 className="text-[14px] font-semibold">무엇이 달라졌는지 살펴볼까요?</h2><p className="mt-1 text-[11px] leading-5 text-muted">지금 기록을 연결해 진단 없이 루틴의 변경점부터 확인해요.</p></div></div><Button onClick={onRescue} className="mt-5 w-full">AI와 변경점 확인</Button></section> : <Button onClick={onContinue} className="mt-7 w-full">{completed ? '홈으로 가기' : '계속 써보기'}</Button>}
    {!completed && <button type="button" disabled={completing} onClick={onComplete} className="mx-auto mt-4 flex min-h-11 items-center px-3 text-sm font-medium text-muted underline decoration-line underline-offset-4 disabled:opacity-50">{completing ? '마치는 중…' : '이 경험은 여기서 마치기'}</button>}
    {completeError && <p role="alert" className="mt-2 text-xs text-danger">{completeError}</p>}
  </div></Screen>
}

export function RoutineEditPage() {
  const navigate = useNavigate(); const location = useLocation(); const queryClient = useQueryClient()
  const creating = location.pathname === '/routine/new'
  const draftMode = creating ? 'create' : 'edit'
  const auth = useQuery({ queryKey: ['auth'], queryFn: api.me })
  const products = useQuery({ queryKey: ['user-products'], queryFn: api.userProducts })
  const current = useQuery({ queryKey: ['current-routine'], queryFn: api.currentRoutine, retry: false, enabled: !creating })
  const home = useQuery({ queryKey: ['home'], queryFn: api.home })
  const [selected, setSelected] = useState<number[]>([])
  const [settings, setSettings] = useState<Record<number, Pick<RoutineItemInput, 'timeSlot' | 'frequency'>>>({})
  const [initialized, setInitialized] = useState(false)
  const saveRequestId = useRef(uid())
  const transitionRecordRequestId = useRef(uid())
  const [confirmChange, setConfirmChange] = useState(false)
  const [earlyError, setEarlyError] = useState('')
  const [transitioning, setTransitioning] = useState(false)
  const [settingProductId, setSettingProductId] = useState<number | null>(null)
  const [addMenuOpen, setAddMenuOpen] = useState(false)
  const [ownedPickerOpen, setOwnedPickerOpen] = useState(false)
  const [productAddOpen, setProductAddOpen] = useState(false)
  const [createdExperience, setCreatedExperience] = useState<Experience | null>(null)
  const sortSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )
  useEffect(() => {
    if (initialized || !auth.data || (!creating && current.isPending)) return
    const draft = readRoutineDraft(auth.data.userId, draftMode)
    if (draft) {
      setSelected(draft.selected)
      setSettings(draft.settings)
    } else if (!creating && current.data) {
      setSelected(current.data.items.map(item => item.userProductId))
      setSettings(Object.fromEntries(current.data.items.map(item => [item.userProductId, { timeSlot: item.timeSlot, frequency: item.frequency }])))
    }
    setInitialized(true)
  }, [auth.data, creating, current.data, current.isPending, draftMode, initialized])
  useEffect(() => {
    if (!initialized || !auth.data) return
    try { sessionStorage.setItem(routineDraftKey(auth.data.userId, draftMode), JSON.stringify({ version: 1, selected, settings })) } catch { /* 저장소가 막혀도 편집은 유지한다 */ }
  }, [auth.data, draftMode, initialized, selected, settings])
  const routineItems = () => selected.map(userProductId => ({ userProductId, timeSlot: settings[userProductId]?.timeSlot || 'EVENING', frequency: settings[userProductId]?.frequency || '매일' } as RoutineItemInput))
  const save = useMutation({ mutationFn: () => api.replaceRoutine(creating ? '새 루틴' : current.data?.name || '내 스킨케어 루틴', routineItems(), saveRequestId.current), onSuccess: value => {
    if (auth.data) try { sessionStorage.removeItem(routineDraftKey(auth.data.userId, draftMode)) } catch { /* 서버 저장이 우선이다 */ }
    queryClient.invalidateQueries()
    if (creating) setCreatedExperience(value)
    else navigate(`/experiences/${value.id}`)
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
  const finishSorting = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return
    setSelected(value => {
      const from = value.indexOf(Number(active.id))
      const to = value.indexOf(Number(over.id))
      return from < 0 || to < 0 ? value : arrayMove(value, from, to)
    })
  }
  const updateSetting = (productId: number, patch: Partial<Pick<RoutineItemInput, 'timeSlot' | 'frequency'>>) => setSettings(value => ({ ...value, [productId]: { timeSlot: value[productId]?.timeSlot || 'EVENING', frequency: value[productId]?.frequency || '매일', ...patch } }))
  const byId = useMemo(() => new Map((products.data || []).map(item => [item.id, item])), [products.data])
  const currentError = !creating && current.error && !(current.error instanceof ApiError && current.error.status === 404) ? current.error : null
  const pageTitle = creating ? '새 루틴 만들기' : '루틴 편집'
  if (createdExperience) return <RoutineNamingFlow experience={createdExperience}/>
  if (auth.isPending || products.isPending || (!creating && current.isPending) || home.isPending || !initialized) return <Screen nav={false}><TopBar title={pageTitle} back/><Loading label={creating ? '새 루틴을 준비하는 중' : '편집 중인 루틴을 불러오는 중'}/></Screen>
  const loadError = auth.error || products.error || currentError || home.error
  if (loadError) return <Screen nav={false}><TopBar title={pageTitle} back/><ErrorState message={loadError.message} onRetry={() => { auth.refetch(); products.refetch(); if (!creating) current.refetch(); home.refetch() }}/></Screen>
  const canAdd = selected.length < 12
  const availableCount = products.data.filter(item => !selected.includes(item.id)).length
  return <Screen nav={false} className="pb-32">
    <TopBar title={pageTitle} back/>
    <div className="px-5 pb-8 pt-5">
      <PageHeading title="사용할 제품과 순서" description="위에서부터 실제로 바르는 순서대로 담아주세요."/>

      <section className="mt-7" aria-labelledby="selected-products-title">
        <div className="flex min-h-10 items-start justify-between gap-4"><div><h2 id="selected-products-title" className="text-[19px] font-semibold tracking-[-.03em]">사용 순서</h2>{selected.length > 1 && <p id="routine-sort-instructions" className="mt-1.5 flex items-center gap-1 text-[10px] font-medium text-[#7f8b9d]"><GripVertical size={13}/>왼쪽 핸들을 끌어 순서를 바꿔요</p>}</div><span className="inline-flex min-h-7 shrink-0 items-center rounded-full bg-[#edf3fc] px-3 text-[11px] font-semibold tabular-nums text-[#5c7292]">{selected.length} / 12</span></div>
        {selected.length ? <DndContext sensors={sortSensors} collisionDetection={closestCenter} onDragEnd={finishSorting} accessibility={{ screenReaderInstructions: { draggable: '순서를 바꾸려면 스페이스 키를 누른 뒤 방향키로 이동하고, 다시 스페이스 키를 눌러 놓으세요.' } }}>
          <SortableContext items={selected} strategy={verticalListSortingStrategy}>
            <ol className="mt-3 rounded-[22px] border border-[#dfe6ef] bg-white shadow-[0_8px_26px_rgba(39,53,77,.045)]">{selected.map((id, index) => <SortableRoutineItem
              key={id}
              id={id}
              index={index}
              item={byId.get(id)}
              setting={settings[id] || { timeSlot: 'EVENING', frequency: '매일' }}
              describedBy={selected.length > 1 ? 'routine-sort-instructions' : undefined}
              onOpenSetting={() => setSettingProductId(id)}
              onRemove={() => { setSelected(value => value.filter(x => x !== id)); if (settingProductId === id) setSettingProductId(null) }}
            />)}</ol>
          </SortableContext>
        </DndContext> : <div className="mt-3 rounded-[22px] border border-dashed border-[#d7e0eb] bg-[#f9fbfe] px-5 py-7 text-center"><p className="text-[14px] font-semibold text-[#354052]">아직 담긴 제품이 없어요</p><p className="mt-1 text-[11px] leading-5 text-[#828c99]">제품 하나만 담아도 루틴을 만들 수 있어요.</p><button type="button" onClick={() => setAddMenuOpen(true)} className="mt-4 min-h-11 rounded-full bg-[#182033] px-5 text-[12px] font-semibold text-white">제품 추가하기</button></div>}
      </section>

      {selected.length > 0 && <button type="button" disabled={!canAdd} onClick={() => setAddMenuOpen(true)} className="group mt-3 flex min-h-[54px] w-full items-center gap-3 rounded-[18px] border border-[#d5e0ee] bg-[#f3f7fd] px-3.5 text-left transition hover:border-[#c7d5e8] hover:bg-[#edf3fb] active:scale-[.99] disabled:opacity-45"><span className="grid size-8 shrink-0 place-items-center rounded-full bg-white text-[#587294] shadow-[0_2px_8px_rgba(48,68,98,.08)]"><Plus size={17}/></span><span className="min-w-0 flex-1"><strong className="block text-[13px] font-semibold tracking-[-.02em] text-[#34445d]">제품 추가</strong><span className="mt-0.5 block truncate text-[10px] font-medium text-[#7c8aa0]">{!canAdd ? '최대 12개까지 담을 수 있어요' : availableCount ? `내 화장품 ${availableCount}개 또는 새 제품` : '새 화장품을 찾아 담기'}</span></span><ChevronRight size={17} className="shrink-0 text-[#7f91aa] transition group-hover:translate-x-0.5"/></button>}
      {save.error && <p role="alert" className="mt-4 text-sm text-danger">{save.error.message}</p>}
    </div>
    <StickyActionBar className="px-4 pb-4 pt-3"><RoutineCommitButton creating={creating} count={selected.length} pending={save.isPending} onClick={() => home.data?.currentExperience ? setConfirmChange(true) : save.mutate()}/></StickyActionBar>
    <BeforeChangeSheet open={confirmChange} title={home.data?.currentExperience?.title || '지금 사용 중인 조합'} pending={transitioning || save.isPending} error={earlyError} onClose={() => setConfirmChange(false)} onChoose={choice => finishAndSave(choice)} onSkip={() => finishAndSave()}/>
    <RoutineSettingSheet open={settingProductId !== null} product={settingProductId === null ? undefined : byId.get(settingProductId)} setting={settingProductId === null ? { timeSlot: 'EVENING', frequency: '매일' } : settings[settingProductId] || { timeSlot: 'EVENING', frequency: '매일' }} onClose={() => setSettingProductId(null)} onChange={patch => { if (settingProductId !== null) updateSetting(settingProductId, patch) }}/>
    <RoutineAddMenuSheet open={addMenuOpen} ownedCount={availableCount} onClose={() => setAddMenuOpen(false)} onOwned={() => { setAddMenuOpen(false); setOwnedPickerOpen(true) }} onNew={() => { setAddMenuOpen(false); setProductAddOpen(true) }}/>
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
      navigate(`/explore?returnTo=${encodeURIComponent(location.pathname)}`)
    }}/>
  </Screen>
}

function RoutineCommitButton({ creating, count, pending, onClick }: { creating: boolean; count: number; pending: boolean; onClick: () => void }) {
  const label = pending ? '루틴을 저장하는 중…' : creating ? '이 순서로 루틴 만들기' : '변경한 루틴 시작하기'
  return <button type="button" disabled={!count || pending} onClick={onClick} className="group relative flex min-h-[66px] w-full items-center justify-center rounded-[21px] bg-[#111722] px-[60px] text-white shadow-[0_12px_28px_rgba(17,23,34,.24)] transition hover:bg-black active:scale-[.985] disabled:cursor-not-allowed disabled:bg-[#dfe3e9] disabled:text-[#989faa] disabled:shadow-none disabled:active:scale-100">
    <strong className="block truncate text-center text-[17px] font-[600] tracking-[-.03em]">{label}</strong>
    <span className="absolute right-3.5 grid size-10 place-items-center rounded-full bg-white/10 text-white transition group-hover:translate-x-0.5 group-disabled:bg-white/45 group-disabled:text-[#989faa]"><ArrowRight size={19} strokeWidth={1.9}/></span>
  </button>
}

function SortableRoutineItem({ id, index, item, setting, describedBy, onOpenSetting, onRemove }: {
  id: number
  index: number
  item?: UserProduct
  setting: Pick<RoutineItemInput, 'timeSlot' | 'frequency'>
  describedBy?: string
  onOpenSetting: () => void
  onRemove: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  const verticalTransform = transform ? { ...transform, x: 0 } : null
  const name = displayName(item)
  return <li
    ref={setNodeRef}
    style={{ transform: CSS.Transform.toString(verticalTransform), transition }}
    className={`relative bg-white px-2.5 py-2 first:rounded-t-[21px] last:rounded-b-[21px] [&+&]:border-t [&+&]:border-[#e8ecf2] ${isDragging ? 'z-10 border-y border-[#cbd9ec] bg-[#f7faff] shadow-[0_16px_34px_rgba(38,57,88,.16)]' : ''}`}
  >
    <div className="flex min-h-12 items-center gap-1.5">
      <button
        type="button"
        className={`grid size-10 shrink-0 touch-none select-none place-items-center rounded-[12px] text-[#8794a7] outline-none transition focus-visible:bg-[#e9f0fa] focus-visible:ring-2 focus-visible:ring-[#91a9cf] active:cursor-grabbing active:bg-[#eaf1fa] ${isDragging ? 'cursor-grabbing bg-[#e6eef9] text-[#4f6789]' : 'cursor-grab hover:bg-[#f0f4f9]'}`}
        {...attributes}
        {...listeners}
        aria-label={`${name} 순서 이동, 현재 ${index + 1}번째`}
        aria-describedby={describedBy}
      ><GripVertical size={20}/></button>
      <span className="relative shrink-0">
        <ProductGlyph category={category(item)} size="xs" src={item?.product?.imageUrl}/>
        <span aria-hidden className="absolute -left-1 -top-1 grid size-[22px] place-items-center rounded-full border-2 border-white bg-[#627b9f] text-[9px] font-bold tabular-nums text-white shadow-[0_3px_8px_rgba(49,68,99,.18)]">{index + 1}</span>
      </span>
      <button type="button" aria-haspopup="dialog" onClick={onOpenSetting} className="group min-w-0 flex-1 rounded-[10px] px-1.5 py-1.5 text-left outline-none transition hover:bg-[#f7f9fc] focus-visible:ring-2 focus-visible:ring-[#91a9cf] active:bg-[#f0f4f9]"><span className="flex items-center gap-1"><strong className="min-w-0 flex-1 truncate text-[13px] font-semibold tracking-[-.023em] text-[#18202e]">{name}</strong><ChevronRight size={14} className="shrink-0 text-[#9aa5b3] transition group-hover:translate-x-0.5"/></span><span className="mt-1 flex min-w-0 items-center gap-1.5 text-[10px] font-medium"><span className="truncate text-[#8a929e]">{category(item)}</span><i aria-hidden className="size-0.5 shrink-0 rounded-full bg-[#c3cad4]"/><span className="shrink-0 text-[#607796]">{timeSlotLabel(setting.timeSlot)}</span><i aria-hidden className="size-0.5 shrink-0 rounded-full bg-[#c3cad4]"/><span className="shrink-0 text-[#607796]">{setting.frequency}</span></span></button>
      <button type="button" aria-label={`${name} 루틴에서 제거`} onClick={onRemove} className="grid size-9 shrink-0 place-items-center rounded-full text-[#9299a4] transition hover:bg-[#f5f6f8] hover:text-[#646d79] active:scale-95 active:bg-[#fff0f0] active:text-[#b95c5c]"><X size={16}/></button>
    </div>
  </li>
}

function RoutineNamingFlow({ experience }: { experience: Experience }) {
  const navigate = useNavigate(); const queryClient = useQueryClient()
  const routine = experience.routine
  const [draftName, setDraftName] = useState('')
  const [editing, setEditing] = useState(false)
  const fallbackName = useMemo(() => {
    if (!routine) return '나의 스킨케어 루틴'
    if (routine.items.length === 1) {
      const time = routine.dayPart === 'MORNING' ? '아침' : routine.dayPart === 'EVENING' ? '저녁' : '아침·저녁'
      return `${time} ${routine.items[0].category} 루틴`.slice(0, 40)
    }
    if (routine.dayPart === 'MORNING') return '아침에 쓰는 루틴'
    if (routine.dayPart === 'EVENING') return '저녁에 쓰는 루틴'
    return '아침과 저녁에 쓰는 루틴'
  }, [routine])
  const suggestion = useQuery({
    queryKey: ['routine-name-suggestion', routine?.id],
    enabled: Boolean(routine?.id),
    retry: false,
    queryFn: async () => {
      const minimum = new Promise(resolve => window.setTimeout(resolve, 2000))
      try {
        const [value] = await Promise.all([api.suggestRoutineName(routine!.id), minimum])
        return value
      } catch {
        await minimum
        return { name: fallbackName, aiGenerated: false }
      }
    },
  })
  useEffect(() => {
    if (!suggestion.data) return
    setDraftName(suggestion.data.name)
    setEditing(false)
  }, [suggestion.data])
  const rename = useMutation({ mutationFn: () => api.renameRoutine(routine!.id, draftName.trim()), onSuccess: () => {
    queryClient.invalidateQueries()
    navigate(`/experiences/${experience.id}`, { replace: true })
  } })
  if (!routine) return <Screen nav={false}><ErrorState message="만든 루틴 정보를 불러오지 못했어요." onRetry={() => navigate(`/experiences/${experience.id}`, { replace: true })}/></Screen>
  const loading = suggestion.isPending || !suggestion.data

  return <Screen nav={false} className="routine-name-screen bg-[#fbfcff]">
    <div className="relative flex min-h-full flex-col overflow-hidden px-6 pb-[max(28px,env(safe-area-inset-bottom))] pt-[max(26px,env(safe-area-inset-top))]">
      <div aria-hidden className="routine-name-glow routine-name-glow-one"/><div aria-hidden className="routine-name-glow routine-name-glow-two"/>
      <div className="relative flex min-h-9 items-center"><BrandMark compact/></div>

      <div className="relative flex flex-1 flex-col items-center justify-center py-10 text-center" aria-live="polite">
        <RoutineNamingMark ready={!loading}/>
        {loading ? <div className="mt-10 animate-rise"><p className="inline-flex items-center gap-1.5 rounded-full bg-[#edf3ff] px-3 py-1.5 text-[11px] font-semibold text-[#5f7396]"><Sparkles size={13}/>SKN AI가 이름을 짓는 중</p><h1 className="mx-auto mt-4 max-w-[290px] text-[27px] font-semibold leading-[1.25] tracking-[-.045em] text-[#182033]">순서와 사용 시간을<br/>한 이름에 담고 있어요</h1><p className="mt-4 text-[12px] leading-5 text-[#828c9b]">루틴은 먼저 안전하게 저장했어요.</p></div>
          : <div className="routine-name-reveal mt-9 w-full"><p className="mx-auto flex w-fit items-center gap-2 text-[10px] font-semibold tracking-[.035em]"><i aria-hidden className="h-px w-5 bg-[#aab8cc]"/><span className={suggestion.data.aiGenerated ? 'text-[#344760]' : 'text-[#687790]'}>{suggestion.data.aiGenerated ? <><b className="font-bold tracking-[.08em]">SKN AI</b><span className="ml-1 font-medium text-[#7e8998]">가 지은 루틴 이름</span></> : '구성을 바탕으로 준비한 이름'}</span><i aria-hidden className="h-px w-5 bg-[#aab8cc]"/></p><h1 className="mx-auto mt-5 max-w-[340px] text-[clamp(34px,10vw,43px)] font-semibold leading-[1.12] tracking-[-.058em] text-[#121a2a]">{suggestion.data.name}</h1><p className="mx-auto mt-5 max-w-[300px] text-[12px] font-medium leading-5 text-[#7b8594]">{routine.items.length}개 제품 · {routine.dayPart === 'MORNING' ? '아침' : routine.dayPart === 'EVENING' ? '저녁' : '아침과 저녁'} 루틴</p></div>}
      </div>

      {!loading && <div className="relative routine-name-actions">
        {editing && <label className="mb-3 block"><span className="sr-only">루틴 이름 직접 입력</span><input autoFocus value={draftName} onChange={event => setDraftName(event.target.value)} maxLength={40} className="h-14 w-full rounded-[18px] border border-[#cbd8eb] bg-white px-4 text-center text-[16px] font-semibold tracking-[-.025em] text-[#182033] outline-none shadow-[0_8px_24px_rgba(50,72,110,.08)] focus:border-[#8fa7cb] focus:ring-4 focus:ring-[#e9f0fb]"/></label>}
        {rename.error && <p role="alert" className="mb-3 text-center text-[12px] font-medium text-danger">{rename.error.message}</p>}
        <Button disabled={!draftName.trim() || rename.isPending} onClick={() => rename.mutate()} className="h-[58px] w-full rounded-[19px] text-[16px] font-extrabold tracking-[-.025em] shadow-[0_10px_25px_rgba(17,23,34,.2)]">{rename.isPending ? '이름을 적용하는 중…' : <strong className="font-extrabold">이 이름으로 시작</strong>}</Button>
        <button type="button" disabled={rename.isPending} onClick={() => { if (editing) setDraftName(suggestion.data.name); setEditing(value => !value) }} className={`mt-2.5 flex min-h-[54px] w-full items-center justify-center gap-2 rounded-[18px] border px-4 text-[14px] font-[600] tracking-[-.02em] shadow-[0_4px_14px_rgba(42,58,84,.04)] transition active:scale-[.985] disabled:opacity-50 ${editing ? 'border-[#cad6e7] bg-[#f3f7fd] text-[#536b8c]' : 'border-[#d9e1ec] bg-white text-[#3e4c61]'}`}>{editing ? <X size={16}/> : <PencilLine size={16}/>} {editing ? '추천 이름으로 돌아가기' : '직접 이름 정하기'}</button>
      </div>}
    </div>
  </Screen>
}

function RoutineNamingMark({ ready }: { ready: boolean }) {
  return <div className={`routine-naming-mark ${ready ? 'is-ready' : ''}`} aria-hidden>
    <svg viewBox="0 0 160 160" className="size-[160px] overflow-visible" fill="none">
      <circle cx="80" cy="80" r="55" stroke="#d9e4f3" strokeWidth="1" strokeDasharray="2 7"/>
      <circle className="routine-name-orbit" cx="80" cy="25" r="4" fill="#6f89b2"/>
      <path className="routine-name-path" d="M42 88C56 61 70 102 83 76C96 51 104 89 119 66" stroke="#7890b7" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="42" cy="88" r="4.5" fill="#fbfcff" stroke="#7890b7" strokeWidth="2"/><circle cx="83" cy="76" r="4.5" fill="#fbfcff" stroke="#7890b7" strokeWidth="2"/><circle cx="119" cy="66" r="4.5" fill="#fbfcff" stroke="#7890b7" strokeWidth="2"/>
      <path className="routine-name-check" d="M61 81L74 94L101 65" stroke="#182033" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  </div>
}

function RoutineAddMenuSheet({ open, ownedCount, onClose, onOwned, onNew }: { open: boolean; ownedCount: number; onClose: () => void; onOwned: () => void; onNew: () => void }) {
  return <BottomSheet open={open} onClose={onClose} title="제품 추가">
    <p className="-mt-2 text-[12px] leading-5 text-[#7b8593]">루틴에 넣을 제품을 어디서 찾을지 골라주세요.</p>
    <div className="mt-5 overflow-hidden rounded-[20px] border border-[#dfe5ee] bg-white">
      <button type="button" disabled={!ownedCount} onClick={onOwned} className="group flex min-h-[72px] w-full items-center gap-3.5 px-4 text-left transition hover:bg-[#f7faff] active:bg-[#eef4fb] disabled:opacity-40"><span className="grid size-10 shrink-0 place-items-center rounded-[13px] bg-[#eaf1fb] text-[#587395]"><Plus size={19}/></span><span className="min-w-0 flex-1"><strong className="block text-[14px] font-semibold tracking-[-.02em] text-[#202938]">내 화장품에서 선택</strong><span className="mt-1 block text-[11px] text-[#828c99]">{ownedCount ? `담을 수 있는 제품 ${ownedCount}개` : '담을 수 있는 보유 제품이 없어요'}</span></span><ChevronRight size={18} className="text-[#8a98aa] transition group-hover:translate-x-0.5"/></button>
      <button type="button" onClick={onNew} className="group flex min-h-[72px] w-full items-center gap-3.5 border-t border-[#e7ebf1] px-4 text-left transition hover:bg-[#fafbfd] active:bg-[#f3f5f8]"><span className="grid size-10 shrink-0 place-items-center rounded-[13px] bg-[#f1f3f6] text-[#667184]"><Search size={18}/></span><span className="min-w-0 flex-1"><strong className="block text-[14px] font-semibold tracking-[-.02em] text-[#202938]">새 화장품 찾기</strong><span className="mt-1 block text-[11px] text-[#828c99]">AI 추천 또는 제품명으로 검색</span></span><ChevronRight size={18} className="text-[#8a98aa] transition group-hover:translate-x-0.5"/></button>
    </div>
  </BottomSheet>
}

function RoutineProductPickerSheet({ open, products, selected, onClose, onToggle }: { open: boolean; products: UserProduct[]; selected: number[]; onClose: () => void; onToggle: (item: UserProduct) => void }) {
  const [query, setQuery] = useState('')
  const atLimit = selected.length >= 12
  const normalizedQuery = query.trim().toLocaleLowerCase('ko-KR')
  const visibleProducts = normalizedQuery
    ? products.filter(item => [displayName(item), category(item), item.product?.brand, item.customBrand].filter(Boolean).some(value => value!.toLocaleLowerCase('ko-KR').includes(normalizedQuery)))
    : products
  useEffect(() => { if (!open) setQuery('') }, [open])
  return <BottomSheet open={open} onClose={onClose} title="루틴에 제품 추가">
    <div className="flex min-h-8 items-center justify-between gap-4"><p className="text-[12px] font-medium text-[#7b8593]">{selected.length ? `${selected.length}개 선택됨` : `내 화장품 ${products.length}개`}</p><span className={`inline-flex min-h-7 shrink-0 items-center rounded-full px-3 text-[11px] font-semibold tabular-nums ${atLimit ? 'bg-[#182033] text-white' : 'bg-[#edf3fc] text-[#587093]'}`}>{selected.length} / 12</span></div>
    {products.length > 5 && <label className="mt-3 flex h-12 items-center gap-2.5 rounded-[16px] border border-[#dfe6ef] bg-[#f7f9fc] px-3.5 transition focus-within:border-[#9fb4d3] focus-within:bg-white focus-within:ring-4 focus-within:ring-[#edf3fc]"><Search size={17} className="shrink-0 text-[#8290a3]"/><span className="sr-only">내 화장품 검색</span><input value={query} onChange={event => setQuery(event.target.value)} placeholder="제품명이나 브랜드 검색" className="min-w-0 flex-1 bg-transparent text-[14px] font-medium text-[#202938] outline-none placeholder:text-[#9aa3af]"/>{query && <button type="button" aria-label="검색어 지우기" onClick={() => setQuery('')} className="grid size-8 shrink-0 place-items-center rounded-full text-[#7f8997] active:bg-[#eef1f5]"><X size={15}/></button>}</label>}
    <div className="hide-scrollbar mt-3 max-h-[50svh] overflow-y-auto rounded-[20px] border border-[#e0e6ee] bg-white shadow-[0_7px_22px_rgba(38,52,76,.035)]">{visibleProducts.map((item, index) => {
      const checked = selected.includes(item.id)
      const disabled = atLimit && !checked
      const order = selected.indexOf(item.id) + 1
      const brand = item.product?.brand || item.customBrand
      const logoUrl = item.product?.brandLogoUrl || item.brandLogoUrl
      return <button type="button" role="checkbox" aria-checked={checked} aria-label={`${displayName(item)}${checked ? `, ${order}번째로 선택됨` : ', 선택하기'}`} disabled={disabled} key={item.id} onClick={() => onToggle(item)} className={`flex min-h-[74px] w-full items-center gap-3 px-3.5 py-2.5 text-left transition disabled:opacity-35 ${index ? 'border-t border-[#e8ecf1]' : ''} ${checked ? 'bg-[#f2f6fc]' : 'bg-white hover:bg-[#fafbfd] active:bg-[#f5f7fa]'}`}><span aria-hidden className="shrink-0"><ProductGlyph category={category(item)} size="sm" src={item.product?.imageUrl}/></span><span className="min-w-0 flex-1"><strong className="block truncate text-[14px] font-semibold tracking-[-.022em] text-[#18202e]">{displayName(item)}</strong><span className="mt-1 flex min-w-0 items-center gap-1.5">{brand && <BrandIdentity name={brand} logoUrl={logoUrl} size="xs" className="min-w-0"/>}<span className="shrink-0 text-[10px] font-medium text-[#8a929e]">{brand ? '· ' : ''}{category(item)}</span></span></span><span className={`grid size-8 shrink-0 place-items-center rounded-full border text-[11px] font-semibold tabular-nums transition ${checked ? 'border-[#607da9] bg-[#607da9] text-white shadow-[0_4px_12px_rgba(72,99,141,.2)]' : 'border-[#cfd6df] bg-white text-[#748196]'}`}>{checked ? order : <Plus size={15}/>}</span></button>
    })}{!visibleProducts.length && <div className="grid min-h-[150px] place-items-center px-5 text-center"><div><p className="text-[14px] font-semibold text-[#394354]">검색 결과가 없어요</p><p className="mt-1 text-[11px] text-[#858e9a]">다른 제품명이나 브랜드를 입력해보세요.</p></div></div>}</div>
    {atLimit && <p className="mt-3 text-center text-[11px] font-medium text-[#6f7e94]">루틴에는 최대 12개까지 담을 수 있어요.</p>}
    <Button disabled={!selected.length} onClick={onClose} className="mt-4 h-[54px] w-full rounded-[18px]">선택 완료 <span className="text-white/65">{selected.length}개</span></Button>
  </BottomSheet>
}

function RoutineSettingSheet({ open, product, setting, onClose, onChange }: { open: boolean; product?: UserProduct; setting: Pick<RoutineItemInput, 'timeSlot' | 'frequency'>; onClose: () => void; onChange: (patch: Partial<Pick<RoutineItemInput, 'timeSlot' | 'frequency'>>) => void }) {
  const timeOptions: Array<{ value: RoutineItemInput['timeSlot']; label: string }> = [
    { value: 'MORNING', label: '아침' },
    { value: 'EVENING', label: '저녁' },
    { value: 'BOTH', label: '아침 · 저녁' },
  ]
  const frequencyOptions = ['매일', '주 2~3회', '필요할 때']
  return <BottomSheet open={open} onClose={onClose} title="제품 사용 설정">
    <div className="-mt-2 flex min-w-0 items-center gap-3 rounded-[16px] bg-[#f5f8fc] p-2.5"><ProductGlyph category={category(product)} size="xs" src={product?.product?.imageUrl}/><span className="min-w-0"><strong className="block truncate text-[13px] font-semibold tracking-[-.02em] text-[#263143]">{displayName(product)}</strong><span className="mt-0.5 block text-[10px] font-medium text-[#8791a0]">{category(product)}</span></span></div>
    <fieldset className="mt-5"><legend className="flex items-center gap-1.5 text-[12px] font-semibold text-[#3c495c]"><Clock3 size={15} className="text-[#637b9d]"/>사용 시간</legend><div className="mt-2 grid grid-cols-3 gap-2" role="radiogroup">{timeOptions.map(option => {
      const selected = setting.timeSlot === option.value
      return <button type="button" role="radio" aria-checked={selected} key={option.value} onClick={() => onChange({ timeSlot: option.value })} className={`relative min-h-[48px] rounded-[15px] border px-2 text-[12px] font-semibold transition active:scale-[.98] ${selected ? 'border-[#7791b7] bg-[#edf3fc] text-[#415a7d] shadow-[inset_0_0_0_1px_rgba(119,145,183,.12)]' : 'border-[#dfe4eb] bg-white text-[#697483]'}`}>{option.label}{selected && <Check size={13} className="absolute right-2 top-2 text-[#607a9f]"/>}</button>
    })}</div></fieldset>
    <fieldset className="mt-5"><legend className="flex items-center gap-1.5 text-[12px] font-semibold text-[#3c495c]"><Repeat2 size={15} className="text-[#637b9d]"/>사용 빈도</legend><div className="mt-2 grid grid-cols-3 gap-2" role="radiogroup">{frequencyOptions.map(option => {
      const selected = setting.frequency === option
      return <button type="button" role="radio" aria-checked={selected} key={option} onClick={() => onChange({ frequency: option })} className={`relative min-h-[48px] rounded-[15px] border px-2 text-[12px] font-semibold transition active:scale-[.98] ${selected ? 'border-[#7791b7] bg-[#edf3fc] text-[#415a7d] shadow-[inset_0_0_0_1px_rgba(119,145,183,.12)]' : 'border-[#dfe4eb] bg-white text-[#697483]'}`}>{option}{selected && <Check size={13} className="absolute right-2 top-2 text-[#607a9f]"/>}</button>
    })}</div></fieldset>
    <Button onClick={onClose} className="mt-6 h-[54px] w-full rounded-[18px]">설정 완료</Button>
  </BottomSheet>
}

function timeSlotLabel(value: RoutineItemInput['timeSlot']) {
  return value === 'MORNING' ? '아침' : value === 'BOTH' ? '아침 · 저녁' : '저녁'
}

function displayName(item?: UserProduct) { return item?.product?.name || item?.customName || '제품' }
function category(item?: UserProduct) { return item?.product?.category || item?.customCategory || '기타' }
function formatExperienceDate(value: string) {
  const normalized = /Z$|[+-]\d\d:\d\d$/.test(value) ? value : `${value.replace(' ', 'T')}Z`
  const date = new Date(normalized)
  return Number.isNaN(date.getTime()) ? value.slice(0, 10) : new Intl.DateTimeFormat('ko-KR', { month: 'long', day: 'numeric' }).format(date)
}

function ExperienceSubjectSummary({ experience }: { experience: Experience }) {
  if (experience.routine) {
    const routine = experience.routine
    const preview = routine.items.slice(0, 3).map(item => item.productName).join(' · ') || '담긴 제품 없음'
    const remaining = Math.max(0, routine.items.length - 3)
    const content = <><span aria-hidden="true" className="flex size-12 shrink-0 flex-col justify-center gap-1.5 rounded-[16px] bg-[#eef3fb] px-3.5"><i className="h-0.5 w-full rounded-full bg-[#7189ad]"/><i className="h-0.5 w-4/5 rounded-full bg-[#93a7c5]"/><i className="h-0.5 w-3/5 rounded-full bg-[#b1bfd3]"/></span>
      <span className="min-w-0 flex-1"><strong className="block truncate text-[15px] font-semibold tracking-[-.025em] text-[#1b2331]">{routine.name}</strong><span className="mt-1.5 block truncate text-[11px] font-medium text-[#7a8390]">{preview}{remaining > 0 ? ` 외 ${remaining}개` : ''}</span><span className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-[#607493]">{experience.status === 'ACTIVE' ? <>제품 구성과 순서 보기 <ChevronRight size={13}/></> : '이 기록을 남길 때 사용한 구성'}</span></span></>
    return <section className="mt-8" aria-labelledby="experience-subject-title">
      <div className="flex items-end justify-between gap-4"><div><p className="text-[10px] font-semibold tracking-[.12em] text-[#7a879a]">확인 대상</p><h2 id="experience-subject-title" className="mt-1.5 text-[21px] font-semibold tracking-[-.035em] text-[#171d29]">함께 쓰는 루틴</h2></div><span className="shrink-0 text-[11px] font-semibold text-[#7f8998]">{routine.items.length}개 제품</span></div>
      {experience.status === 'ACTIVE'
        ? <Link to={`/routines/${routine.id}`} className="interactive-card mt-4 flex min-h-[104px] items-center gap-4 rounded-[22px] border border-[#e1e7f0] bg-white p-4 shadow-[0_7px_24px_rgba(36,50,73,.055)]">{content}</Link>
        : <div className="mt-4 flex min-h-[104px] items-center gap-4 rounded-[22px] border border-[#e1e7f0] bg-white p-4 shadow-[0_7px_24px_rgba(36,50,73,.055)]">{content}</div>}
    </section>
  }
  if (!experience.product) return null
  const product = experience.product
  return <section className="mt-8" aria-labelledby="experience-subject-title">
    <p className="text-[10px] font-semibold tracking-[.12em] text-[#7a879a]">확인 대상</p><h2 id="experience-subject-title" className="mt-1.5 text-[21px] font-semibold tracking-[-.035em] text-[#171d29]">사용 중인 제품</h2>
    <Link to={`/my-products/${product.id}`} className="interactive-card mt-4 flex min-h-[104px] items-center gap-4 rounded-[22px] border border-[#e1e7f0] bg-white p-4 shadow-[0_7px_24px_rgba(36,50,73,.055)]">
      <ProductGlyph category={product.product?.category || product.customCategory} size="sm" src={product.product?.imageUrl}/>
      <span className="min-w-0 flex-1"><BrandIdentity name={product.product?.brand || product.customBrand} logoUrl={product.brandLogoUrl} size="xs" className="max-w-full"/><strong className="mt-1.5 block truncate text-[15px] font-semibold tracking-[-.025em] text-[#1b2331]">{product.product?.name || product.customName}</strong><span className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-[#607493]">제품 상세 보기 <ChevronRight size={13}/></span></span>
    </Link>
  </section>
}

function ExperienceJournal({ records, loading, failed, onRetry }: { records: ExperienceRecord[]; loading: boolean; failed: boolean; onRetry: () => void }) {
  return <section className="mt-9" aria-labelledby="experience-journal-title">
    <div className="flex items-end justify-between gap-4"><div><p className="text-[10px] font-semibold tracking-[.12em] text-[#7a879a]">사용 기록</p><h2 id="experience-journal-title" className="mt-1.5 text-[23px] font-semibold tracking-[-.04em] text-[#171d29]">남긴 느낌</h2></div>{records.length > 0 && <Link to="/records?view=history" className="min-h-10 shrink-0 px-2 pt-3 text-[11px] font-semibold text-[#697589]">전체 기록</Link>}</div>
    {loading && !records.length && <div className="mt-4 space-y-3" aria-label="느낌 기록을 불러오는 중"><div className="h-28 animate-pulse rounded-[22px] bg-[#eef1f5]"/><div className="h-24 animate-pulse rounded-[22px] bg-[#f2f4f7]"/></div>}
    {!loading && !records.length && <div className="mt-4 rounded-[22px] border border-dashed border-[#d9e0ea] bg-white px-5 py-7 text-center"><span className="mx-auto grid size-10 place-items-center rounded-full bg-[#f0f4fa] text-[#7385a1]"><BookOpen size={18}/></span><p className="mt-3 text-[14px] font-semibold text-[#303949]">{failed ? '느낌 기록을 불러오지 못했어요' : '아직 남긴 느낌이 없어요'}</p><p className="mt-1 text-[11px] leading-5 text-[#818995]">{failed ? '잠시 뒤 다시 시도해주세요.' : '좋았던 점도, 애매한 점도 결론 없이 남겨도 괜찮아요.'}</p>{failed && <button type="button" onClick={onRetry} className="mt-3 min-h-10 rounded-full border border-[#d7dde7] bg-white px-4 text-[11px] font-semibold text-[#657187]">다시 시도</button>}</div>}
    {records.length > 0 && <div className="mt-4 divide-y divide-[#e5e9ef] border-y border-[#e5e9ef]">{records.slice(0, 3).map(record => <ExperienceRecordItem key={record.id} record={record} showTitle={false}/>)}</div>}
    {failed && records.length > 0 && <div className="mt-3 flex items-center justify-center gap-2 text-[10px] text-[#8b7272]"><span>전체 목록을 불러오지 못해 최근 기록만 보여드려요.</span><button type="button" onClick={onRetry} className="min-h-8 shrink-0 px-1 font-semibold underline underline-offset-2">다시 시도</button></div>}
  </section>
}

type RoutineDraft = {
  version: 1
  selected: number[]
  settings: Record<number, Pick<RoutineItemInput, 'timeSlot' | 'frequency'>>
}

function routineDraftKey(userId: number, mode: 'create' | 'edit') {
  return `skn:routine-draft:${userId}:${mode}`
}

function readRoutineDraft(userId: number, mode: 'create' | 'edit'): RoutineDraft | null {
  try {
    const value = JSON.parse(sessionStorage.getItem(routineDraftKey(userId, mode)) || 'null') as RoutineDraft | null
    if (!value || value.version !== 1 || !Array.isArray(value.selected) || !value.settings) return null
    return value
  } catch {
    return null
  }
}
