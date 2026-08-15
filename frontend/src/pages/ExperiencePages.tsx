import { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertCircle, ArrowDown, ArrowUp, Check, ChevronRight, Clock3, GripVertical, Plus, Sparkles } from 'lucide-react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { api, ApiError, uid } from '../lib/api'
import { startChatPath } from '../lib/chat'
import type { Routine, RoutineItemInput, SavedRecord, UserProduct } from '../lib/types'
import { BeforeChangeSheet } from '../components/BeforeChangeSheet'
import { AiBadge, AppHeader, Button, Card, ErrorState, Loading, PageHeading, ProductGlyph, Screen, StickyActionBar, TopBar } from '../components/ui'
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
  return <Screen nav={false} className="pb-32">
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
    { value: 'LIKED', emoji: '☺', title: '마음에 들어요', body: '다시 손이 갈 것 같아요' },
    { value: 'UNSURE', emoji: '◌', title: '아직 모르겠어요', body: '좀 더 써보고 싶어요' },
    { value: 'DISAPPOINTED', emoji: '↘', title: '아쉬워요', body: '기대한 경험과 달랐어요' },
  ]
  const tagOptions = ['가벼움','촉촉함','산뜻함','흡수가 빠름','밀림 없음','답답함','무거움','따가움','붉어짐','계절 차이']
  const selectedOption = options.find(option => option.value === sentiment)
  const detailCopy = sentiment === 'LIKED'
    ? { title: '어떤 점이 좋았나요?', body: '다음 탐색에서 다시 찾고 싶은 사용감을 남겨주세요.', placeholder: '예: 화장 전에 발라도 밀리지 않았고, 저녁까지 촉촉함이 남았어요.' }
    : sentiment === 'DISAPPOINTED'
      ? { title: '어떤 점이 아쉬웠나요?', body: '기대와 달랐던 사용감이나 당시 조건을 남겨주세요.', placeholder: '예: 저녁에는 괜찮았지만 아침 화장 전에 바르면 조금 밀렸어요.' }
      : { title: '조금 더 지켜볼 점이 있나요?', body: '아직 모르는 상태도 충분한 기록이에요. 결론 없이 지금의 느낌만 남겨도 돼요.', placeholder: '예: 촉촉한지는 조금 더 써봐야 알 것 같고, 흡수는 빨랐어요.' }
  return <Screen nav={false} className="pb-28">
    <AppHeader back onBack={step === 2 ? () => setStep(1) : undefined} profile={false} notifications={false} sticky/>
    <div className="px-5 pb-8 pt-4">
      <div className="flex items-center gap-2" aria-label={`기록 2단계 중 ${step}단계`}><span className="h-1.5 flex-1 rounded-full bg-ink"/><span className={`h-1.5 flex-1 rounded-full ${step === 2 ? 'bg-ink' : 'bg-line'}`}/><span className="ml-2 text-xs font-medium tabular-nums text-muted">{step} / 2</span></div>

      {step === 1 ? <>
        <PageHeading className="mt-8" eyebrow={experience.data.title} title={<>이번 경험은<br/>어떠셨나요?</>} description={params.get('discomfort') === '1' ? '피부 불편 여부와는 별개로, 전반적인 인상을 먼저 남겨주세요.' : '좋고 나쁨을 판정하지 않아요. 지금 느낀 전반적인 인상을 골라주세요.'}/>
        <div role="radiogroup" aria-label="전반적인 인상" className="mt-8 space-y-3">{options.map(option => <button type="button" role="radio" aria-checked={sentiment === option.value} key={option.value} onClick={() => setSentiment(option.value)} className={`interactive-card flex min-h-[88px] w-full items-center gap-4 rounded-[22px] border p-4 text-left ${sentiment === option.value ? 'border-ink bg-[#f5f8ff] shadow-[0_8px_24px_rgba(37,55,92,.08)]' : 'border-line bg-white'}`}><span className={`grid size-12 shrink-0 place-items-center rounded-full text-xl ${sentiment === option.value ? 'bg-ink text-white' : 'bg-soft text-ink'}`}>{option.emoji}</span><span className="min-w-0 flex-1"><b className="block text-lg font-medium tracking-[-.025em]">{option.title}</b><span className="mt-1 block text-xs leading-5 text-muted">{option.body}</span></span>{sentiment === option.value && <Check size={20}/>}</button>)}</div>
      </> : <>
        <div className="mt-8 flex items-center justify-between rounded-[18px] bg-[#f7f9fd] px-4 py-3"><div><p className="text-xs text-muted">전반적인 인상</p><p className="mt-1 text-sm font-medium">{selectedOption?.title}</p></div><button type="button" onClick={() => setStep(1)} className="min-h-10 rounded-full px-3 text-xs font-medium text-accent">바꾸기</button></div>
        <PageHeading className="mt-7" title={detailCopy.title} description={detailCopy.body}/>
        <section className="mt-8"><h2 className="text-sm font-medium">기억할 사용감 <span className="font-normal text-muted">선택</span></h2><div className="mt-3 flex flex-wrap gap-2">{tagOptions.map(tag => <button type="button" aria-pressed={tags.includes(tag)} key={tag} onClick={() => setTags(value => value.includes(tag) ? value.filter(x => x !== tag) : [...value, tag])} className={`min-h-11 rounded-full border px-4 py-2 text-sm font-medium ${tags.includes(tag) ? 'border-ink bg-ink text-white' : 'border-line bg-white text-muted'}`}>{tag}</button>)}</div></section>
        <label className="mt-8 block"><span className="text-sm font-medium">내 말로 남기기 <span className="font-normal text-muted">선택</span></span><textarea value={note} onChange={e => setNote(e.target.value)} maxLength={1200} rows={5} placeholder={detailCopy.placeholder} className="field-control mt-3 w-full resize-none p-4 text-base font-normal leading-7"/><span className="mt-2 block text-right text-xs text-muted">{note.length}/1200</span></label>
        <label className={`mt-6 flex cursor-pointer items-start gap-3 rounded-[20px] border p-4 transition ${discomfort === 'REPORTED' ? 'border-[#e8bcbc] bg-[#fff7f7]' : 'border-line bg-white'}`}><input type="checkbox" checked={discomfort === 'REPORTED'} onChange={e => setDiscomfort(e.target.checked ? 'REPORTED' : 'NOT_REPORTED')} className="mt-1 size-4 accent-[#d65454]"/><span><b className="block text-base font-medium">피부 불편함이 있었어요</b><span className="mt-1 block text-xs leading-5 text-muted">만족도와 별도의 관찰 사실이에요. 선택하면 저장 뒤 AI와 변경점을 확인할 수 있어요.</span></span></label>
        {endAfterSave && <div className="mt-5 rounded-[18px] bg-soft p-4 text-xs leading-5 text-muted">이 기록을 저장하면 확인 중인 경험도 함께 마칩니다. 현재 사용 루틴은 그대로 유지돼요.</div>}
        {record.error && <p role="alert" className="mt-4 text-sm text-danger">{record.error.message}</p>}
      </>}
    </div>
    <StickyActionBar><Button disabled={!sentiment || record.isPending} onClick={() => step === 1 ? setStep(2) : record.mutate()} className="w-full">{step === 1 ? '다음' : record.isPending ? '기록하는 중…' : endAfterSave ? '기록하고 경험 마치기' : '이 경험 남기기'}</Button></StickyActionBar>
  </Screen>
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
  const byId = useMemo(() => new Map((products.data || []).map(item => [item.id, item])), [products.data])
  const currentError = current.error && !(current.error instanceof ApiError && current.error.status === 404) ? current.error : null
  if (auth.isPending || products.isPending || current.isPending || home.isPending || !initialized) return <Screen nav={false}><TopBar title="루틴 편집" back/><Loading label="편집 중인 루틴을 불러오는 중"/></Screen>
  const loadError = auth.error || products.error || currentError || home.error
  if (loadError) return <Screen nav={false}><TopBar title="루틴 편집" back/><ErrorState message={loadError.message} onRetry={() => { auth.refetch(); products.refetch(); current.refetch(); home.refetch() }}/></Screen>
  const canAdd = selected.length < 12
  return <Screen nav={false} className="pb-32">
    <TopBar title="루틴 편집" back/>
    <div className="px-5 py-6">
      <PageHeading title="실제로 바르는 순서" description={<>제품마다 시간과 빈도를 정하고 순서를 맞춰주세요.<br/>저장하면 과거 루틴은 보존되고 새 경험이 시작됩니다.</>}/>

      <section className="mt-8" aria-labelledby="selected-products-title">
        <div className="flex items-end justify-between gap-4"><div><h2 id="selected-products-title" className="section-title">사용할 제품</h2><p className="mt-1 text-xs text-muted">위에서 아래 순서로 사용해요.</p></div><span className="rounded-full bg-soft px-3 py-1.5 text-xs font-medium text-muted">{selected.length} / 12</span></div>
        {selected.length ? <div className="mt-4 space-y-3">{selected.map((id, index) => {
          const item = byId.get(id)
          const setting = settings[id] || { timeSlot: 'EVENING', frequency: '매일' }
          return <article key={id} className="surface-card overflow-hidden p-0">
            <div className="flex items-center gap-3 px-3.5 py-3"><span className="grid size-8 shrink-0 place-items-center rounded-full bg-ink text-xs font-medium text-white">{index + 1}</span><GripVertical size={16} className="shrink-0 text-muted"/><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{displayName(item)}</p><p className="mt-0.5 text-xs text-muted">{category(item)}</p></div><div className="flex rounded-full bg-soft p-0.5"><button type="button" aria-label={`${displayName(item)} 위로 이동`} onClick={() => move(index, -1)} disabled={index === 0} className="grid size-8 place-items-center rounded-full transition hover:bg-white disabled:opacity-20"><ArrowUp size={14}/></button><button type="button" aria-label={`${displayName(item)} 아래로 이동`} onClick={() => move(index, 1)} disabled={index === selected.length - 1} className="grid size-8 place-items-center rounded-full transition hover:bg-white disabled:opacity-20"><ArrowDown size={14}/></button></div><button type="button" aria-label={`${displayName(item)} 제거`} onClick={() => setSelected(value => value.filter(x => x !== id))} className="grid size-9 place-items-center rounded-full text-lg text-muted transition hover:bg-soft">×</button></div>
            <div className="grid grid-cols-2 gap-2 border-t border-line bg-[#fcfcfa] p-3"><label className="text-xs font-medium text-muted">사용 시간<select aria-label={`${displayName(item)} 사용 시간`} value={setting.timeSlot} onChange={event => setSettings(value => ({ ...value, [id]: { ...setting, timeSlot: event.target.value as RoutineItemInput['timeSlot'] } }))} className="mt-1.5 h-11 w-full rounded-xl border border-line bg-white px-3 text-xs font-medium text-ink outline-none focus:border-accent"><option value="MORNING">아침</option><option value="EVENING">저녁</option><option value="BOTH">아침·저녁</option></select></label><label className="text-xs font-medium text-muted">사용 빈도<select aria-label={`${displayName(item)} 사용 빈도`} value={setting.frequency} onChange={event => setSettings(value => ({ ...value, [id]: { ...setting, frequency: event.target.value } }))} className="mt-1.5 h-11 w-full rounded-xl border border-line bg-white px-3 text-xs font-medium text-ink outline-none focus:border-accent"><option>매일</option><option>주 2~3회</option><option>필요할 때</option></select></label></div>
          </article>
        })}</div> : <div className="mt-4 rounded-[22px] border border-dashed border-line bg-[#fafbf8] px-5 py-8 text-center"><p className="text-sm font-medium">아래에서 사용할 제품을 골라주세요</p><p className="mt-1.5 text-xs leading-5 text-muted">제품 하나만으로도 경험을 시작할 수 있어요.</p></div>}
      </section>

      <section className="mt-9" aria-labelledby="available-products-title"><div className="flex items-end justify-between"><h2 id="available-products-title" className="section-title">추가할 화장품</h2>{!canAdd && <span className="text-xs font-medium text-danger">최대 12개</span>}</div><div className="mt-4 space-y-2">{products.data.filter(item => !selected.includes(item.id)).map(item => <button type="button" key={item.id} disabled={!canAdd} onClick={() => { setSelected(value => [...value, item.id]); setSettings(value => ({ ...value, [item.id]: { timeSlot: 'EVENING', frequency: '매일' } })) }} className="interactive-card flex w-full items-center gap-3 rounded-[18px] border border-line bg-white p-3 text-left disabled:cursor-not-allowed disabled:opacity-45"><ProductGlyph category={category(item)} size="sm" src={item.product?.imageUrl}/><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{displayName(item)}</p><p className="mt-0.5 text-xs text-muted">{category(item)}</p></div><span className="grid size-9 place-items-center rounded-full bg-accent-soft text-accent"><Plus size={17}/></span></button>)}</div><Link to="/explore?returnTo=%2Froutine%2Fedit" className="mt-4 flex min-h-11 items-center justify-center gap-1 text-xs font-medium text-accent">새 화장품 찾아보기 <ChevronRight size={14}/></Link>{save.error && <p role="alert" className="mt-4 text-sm text-danger">{save.error.message}</p>}</section>
    </div>
    <StickyActionBar><Button disabled={!selected.length || save.isPending} onClick={() => home.data?.currentExperience ? setConfirmChange(true) : save.mutate()} className="w-full">{save.isPending ? '저장하는 중…' : `이 순서로 새 경험 시작 (${selected.length})`}</Button></StickyActionBar>
    <BeforeChangeSheet open={confirmChange} title={home.data?.currentExperience?.title || '지금 사용 중인 조합'} pending={transitioning || save.isPending} error={earlyError} onClose={() => setConfirmChange(false)} onChoose={choice => finishAndSave(choice)} onSkip={() => finishAndSave()}/>
  </Screen>
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
