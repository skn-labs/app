import { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertCircle, ArrowDown, ArrowUp, Check, ChevronRight, Clock3, GripVertical, Plus, Sparkles } from 'lucide-react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { api, ApiError, uid } from '../lib/api'
import { startChatPath } from '../lib/chat'
import type { Routine, RoutineItemInput, SavedRecord, UserProduct } from '../lib/types'
import { BeforeChangeSheet } from '../components/BeforeChangeSheet'
import { AiBadge, Button, Card, ErrorState, Loading, PageHeading, ProductGlyph, Screen, StickyActionBar, TopBar } from '../components/ui'

export function ExperiencePage() {
  const { id } = useParams(); const experienceId = Number(id)
  const navigate = useNavigate()
  const validExperienceId = Number.isSafeInteger(experienceId) && experienceId > 0
  const experience = useQuery({ queryKey: ['experience', experienceId], queryFn: () => api.experience(experienceId), enabled: validExperienceId })
  if (!validExperienceId) return <Screen nav={false}><TopBar title="사용 경험" back/><ErrorState message="사용 경험 주소를 확인해주세요."/></Screen>
  if (experience.isPending) return <Screen nav={false}><TopBar title="사용 경험" back/><Loading/></Screen>
  if (experience.isError) return <Screen nav={false}><TopBar title="사용 경험" back/><ErrorState message={experience.error.message}/></Screen>
  const data = experience.data
  const progress = Math.min(100, Math.max(8, data.day / 7 * 100))
  if (data.status !== 'ACTIVE') return <Screen nav={false}><TopBar title="지난 사용 경험" back/><div className="px-5 py-8"><div className="soft-card p-5"><p className="text-xs font-medium text-muted">마친 경험</p><h1 className="mt-3 text-[24px] font-medium tracking-[-.04em]">{data.title}</h1><p className="mt-2 text-sm text-muted">{data.subtitle}</p></div>{data.latestRecord && <Card className="mt-5"><p className="text-xs font-medium text-muted">마지막으로 남긴 느낌</p><p className="mt-2 text-sm leading-6">{data.latestRecord.note || sentimentLabel(data.latestRecord.sentiment)}</p></Card>}<Button onClick={() => navigate('/records')} className="mt-7 w-full">내 기록에서 보기</Button></div></Screen>
  return <Screen nav={false} className="pb-32">
    <TopBar title="지금 써보는 조합" back/>
    <div className="px-5 py-6">
      <div className="rounded-[24px] bg-ink p-5 text-white shadow-[0_10px_30px_rgba(23,24,22,.12)]"><div className="flex items-center justify-between"><span className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-lime">DAY {data.day}</span><span className="text-xs text-white/55">{data.reviewDue ? '전체 확인할 때예요' : `${data.daysUntilReview}일 뒤 전체 확인`}</span></div><h1 className="mt-6 text-[25px] font-medium leading-8 tracking-[-.04em]">{data.title}</h1><p className="mt-2 text-sm text-white/60">{data.subtitle}</p><div className="mt-6 h-1.5 overflow-hidden rounded-full bg-white/15"><div className="h-full rounded-full bg-lime" style={{ width: `${progress}%` }}/></div></div>

      {data.routine && <RoutineSteps routine={data.routine}/>} 
      {!data.routine && data.product && <Card className="mt-7 flex items-center gap-4"><ProductGlyph category={data.product.product?.category || data.product.customCategory} src={data.product.product?.imageUrl}/><div><p className="text-xs text-muted">{data.product.product?.brand || data.product.customBrand}</p><p className="mt-1 font-bold">{data.product.product?.name || data.product.customName}</p><p className="mt-2 text-xs leading-5 text-muted">루틴은 바꾸지 않고 이 제품의 경험만 남기고 있어요.</p></div></Card>}

      {data.latestRecord && <Card className="mt-5 bg-soft"><p className="text-xs font-bold text-muted">가장 최근에 남긴 느낌</p><p className="mt-2 text-sm leading-6">{data.latestRecord.note || sentimentLabel(data.latestRecord.sentiment)}</p></Card>}
      <div className="mt-8 flex items-start gap-3 rounded-2xl bg-accent-soft p-4"><Clock3 size={18} className="mt-0.5 shrink-0 text-accent"/><p className="text-xs leading-5 text-[#515ba6]">매일 쓸 필요는 없어요. 기억이 선명할 때만 남기고, 7일에 전반적인 느낌을 확인해요.</p></div>
      <button type="button" onClick={() => navigate(`/experiences/${experienceId}/record?end=1`)} className="mx-auto mt-8 block min-h-11 px-3 text-xs font-semibold text-muted underline decoration-line underline-offset-4">느낌을 남기고 일찍 마치기</button>
    </div>
    <StickyActionBar className="grid grid-cols-[1fr_auto] gap-2"><Button onClick={() => navigate(`/experiences/${experienceId}/record`)}>지금 느낌 남기기</Button><Button variant="danger" aria-label="피부 불편함 기록" onClick={() => navigate(`/experiences/${experienceId}/record?discomfort=1`)}><AlertCircle size={18}/></Button></StickyActionBar>
  </Screen>
}

export function RecordPage() {
  const { id } = useParams(); const experienceId = Number(id)
  const [params] = useSearchParams(); const navigate = useNavigate(); const queryClient = useQueryClient()
  const validExperienceId = Number.isSafeInteger(experienceId) && experienceId > 0
  const recordRequestId = useRef(uid())
  const endAfterSave = params.get('end') === '1'
  const experience = useQuery({ queryKey: ['experience', experienceId], queryFn: () => api.experience(experienceId), enabled: validExperienceId })
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
  if (!validExperienceId) return <Screen nav={false}><TopBar title="느낌 남기기" back/><ErrorState message="사용 경험 주소를 확인해주세요."/></Screen>
  if (experience.isPending) return <Screen nav={false}><TopBar title="느낌 남기기" back/><Loading/></Screen>
  if (experience.isError) return <Screen nav={false}><TopBar title="느낌 남기기" back/><ErrorState message={experience.error.message}/></Screen>
  if (saved) return <SavedRecordResult saved={saved} reviewCompleted={experience.data.reviewDue} experienceEnded={endAfterSave} onRescue={openRescueChat} onContinue={() => navigate('/')} onComplete={() => complete.mutate()} completing={complete.isPending} completeError={complete.error?.message}/>
  const options = [
    { value: 'LIKED', emoji: '☺', title: '마음에 들어요', body: '다시 손이 갈 것 같아요' },
    { value: 'UNSURE', emoji: '◌', title: '아직 모르겠어요', body: '좀 더 써보고 싶어요' },
    { value: 'DISAPPOINTED', emoji: '↘', title: '아쉬워요', body: '기대한 경험과 달랐어요' },
  ]
  const tagOptions = ['가벼움','촉촉함','산뜻함','흡수가 빠름','밀림 없음','답답함','무거움','따가움','붉어짐','계절 차이']
  return <Screen nav={false} className="pb-28">
    <TopBar title={experience.data.reviewDue ? '7일 경험 남기기' : '지금 느낌 남기기'} back/>
    <div className="px-5 py-6"><PageHeading eyebrow={experience.data.title} title={<>지금까지 써보니<br/>어떠셨나요?</>}/>
      <div role="radiogroup" aria-label="전반적인 인상" className="mt-6 space-y-2">{options.map(option => <button type="button" role="radio" aria-checked={sentiment === option.value} key={option.value} onClick={() => setSentiment(option.value)} className={`interactive-card flex w-full items-center gap-4 rounded-[20px] border p-4 text-left ${sentiment === option.value ? 'border-accent bg-accent-soft shadow-[0_6px_18px_rgba(83,101,245,.08)]' : 'border-line bg-white'}`}><span className="grid size-10 place-items-center rounded-full bg-white text-xl">{option.emoji}</span><span className="flex-1"><b className="block text-sm font-medium">{option.title}</b><span className="mt-1 block text-xs text-muted">{option.body}</span></span>{sentiment === option.value && <Check size={18} className="text-accent"/>}</button>)}</div>

      <section className="mt-7"><h2 className="text-sm font-bold">어떤 느낌이었나요? <span className="font-normal text-muted">선택</span></h2><div className="mt-3 flex flex-wrap gap-2">{tagOptions.map(tag => <button type="button" aria-pressed={tags.includes(tag)} key={tag} onClick={() => setTags(value => value.includes(tag) ? value.filter(x => x !== tag) : [...value, tag])} className={`min-h-11 rounded-full border px-3 py-2 text-xs font-semibold ${tags.includes(tag) ? 'border-ink bg-ink text-white' : 'border-line bg-white text-muted'}`}>{tag}</button>)}</div></section>
      <label className="mt-7 block"><span className="text-sm font-medium">기억해둘 말 <span className="font-normal text-muted">선택</span></span><textarea value={note} onChange={e => setNote(e.target.value)} maxLength={1200} rows={4} placeholder="예: 화장 전에 써도 밀리지 않았고, 저녁에는 조금 답답했어요." className="field-control mt-3 w-full resize-none p-4 text-sm leading-6"/><span className="mt-1 block text-right text-[10px] text-muted">{note.length}/1200</span></label>
      <label className={`mt-5 flex cursor-pointer items-start gap-3 rounded-[18px] border p-4 ${discomfort === 'REPORTED' ? 'border-[#f2caca] bg-[#fff7f7]' : 'border-line bg-white'}`}><input type="checkbox" checked={discomfort === 'REPORTED'} onChange={e => setDiscomfort(e.target.checked ? 'REPORTED' : 'NOT_REPORTED')} className="mt-1 accent-[#d65454]"/><span><b className="block text-sm">피부 불편함도 있었어요</b><span className="mt-1 block text-xs leading-5 text-muted">선택하면 기록 후 변경점을 AI와 확인할 수 있어요.</span></span></label>
      {record.error && <p role="alert" className="mt-4 text-sm text-danger">{record.error.message}</p>}
    </div>
    <StickyActionBar><Button disabled={!sentiment || record.isPending} onClick={() => record.mutate()} className="w-full">{record.isPending ? '기록하는 중…' : '이 경험 남기기'}</Button></StickyActionBar>
  </Screen>
}

function SavedRecordResult({ saved, reviewCompleted, experienceEnded, onRescue, onContinue, onComplete, completing, completeError }: { saved: SavedRecord; reviewCompleted: boolean; experienceEnded: boolean; onRescue: () => void; onContinue: () => void; onComplete: () => void; completing: boolean; completeError?: string }) {
  const completed = reviewCompleted || experienceEnded
  return <Screen nav={false}><TopBar title={reviewCompleted ? '7일 경험 완료' : experienceEnded ? '사용 경험 완료' : '기록 완료'}/><div className="px-5 py-10 text-center"><div className="mx-auto grid size-16 place-items-center rounded-full bg-lime text-ink"><Check size={28}/></div><h1 className="mt-6 text-[26px] font-bold tracking-[-.04em]">{reviewCompleted ? '7일의 경험이 쌓였어요' : experienceEnded ? '지금까지의 경험을 남겼어요' : '오늘의 경험을 남겼어요'}</h1><p className="mx-auto mt-3 max-w-72 text-sm leading-6 text-muted">이 기록은 다음 제품을 살펴보거나 과거 경험을 비교할 때 다시 쓰입니다.</p>
    {saved.linkedPatternId && <Link to={`/patterns/${saved.linkedPatternId}`} className="mt-6 block rounded-[20px] border border-[#d9ddff] bg-accent-soft p-4 text-left"><AiBadge/><p className="mt-2 text-sm font-bold">기존 패턴에 새 기록이 연결됐어요</p><p className="mt-1 text-xs text-muted">어떤 기록과 같고 다른지 확인해보세요.</p></Link>}
    {saved.rescueSuggested ? <Card className="mt-6 border-[#f2d8d8] text-left"><div className="flex gap-3"><AlertCircle className="shrink-0 text-danger" size={20}/><div><h2 className="text-sm font-bold">불편함의 변경점을 확인할까요?</h2><p className="mt-1 text-xs leading-5 text-muted">AI 채팅에 지금 기록이 자동으로 들어가고, 안전 확인부터 시작해요.</p></div></div><Button onClick={onRescue} className="mt-4 w-full">AI와 변경점 확인<Sparkles size={17}/></Button></Card> : <Button onClick={onContinue} className="mt-7 w-full">{completed ? '홈으로 가기' : '계속 써보기'}</Button>}
    {!completed && <button type="button" disabled={completing} onClick={onComplete} className="mt-5 min-h-11 px-3 text-xs font-semibold text-muted underline decoration-line underline-offset-4 disabled:opacity-50">{completing ? '마치는 중…' : '이 경험은 여기서 마치기'}</button>}
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
        <div className="flex items-end justify-between gap-4"><div><h2 id="selected-products-title" className="section-title">사용할 제품</h2><p className="mt-1 text-xs text-muted">위에서 아래 순서로 사용해요.</p></div><span className="rounded-full bg-soft px-3 py-1.5 text-[11px] font-medium text-muted">{selected.length} / 12</span></div>
        {selected.length ? <div className="mt-4 space-y-3">{selected.map((id, index) => {
          const item = byId.get(id)
          const setting = settings[id] || { timeSlot: 'EVENING', frequency: '매일' }
          return <article key={id} className="surface-card overflow-hidden p-0">
            <div className="flex items-center gap-3 px-3.5 py-3"><span className="grid size-8 shrink-0 place-items-center rounded-full bg-ink text-xs font-medium text-white">{index + 1}</span><GripVertical size={16} className="shrink-0 text-muted"/><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{displayName(item)}</p><p className="mt-0.5 text-[10px] text-muted">{category(item)}</p></div><div className="flex rounded-full bg-soft p-0.5"><button type="button" aria-label={`${displayName(item)} 위로 이동`} onClick={() => move(index, -1)} disabled={index === 0} className="grid size-8 place-items-center rounded-full transition hover:bg-white disabled:opacity-20"><ArrowUp size={14}/></button><button type="button" aria-label={`${displayName(item)} 아래로 이동`} onClick={() => move(index, 1)} disabled={index === selected.length - 1} className="grid size-8 place-items-center rounded-full transition hover:bg-white disabled:opacity-20"><ArrowDown size={14}/></button></div><button type="button" aria-label={`${displayName(item)} 제거`} onClick={() => setSelected(value => value.filter(x => x !== id))} className="grid size-9 place-items-center rounded-full text-lg text-muted transition hover:bg-soft">×</button></div>
            <div className="grid grid-cols-2 gap-2 border-t border-line bg-[#fcfcfa] p-3"><label className="text-[10px] font-medium text-muted">사용 시간<select aria-label={`${displayName(item)} 사용 시간`} value={setting.timeSlot} onChange={event => setSettings(value => ({ ...value, [id]: { ...setting, timeSlot: event.target.value as RoutineItemInput['timeSlot'] } }))} className="mt-1.5 h-11 w-full rounded-xl border border-line bg-white px-3 text-[12px] font-medium text-ink outline-none focus:border-accent"><option value="MORNING">아침</option><option value="EVENING">저녁</option><option value="BOTH">아침·저녁</option></select></label><label className="text-[10px] font-medium text-muted">사용 빈도<select aria-label={`${displayName(item)} 사용 빈도`} value={setting.frequency} onChange={event => setSettings(value => ({ ...value, [id]: { ...setting, frequency: event.target.value } }))} className="mt-1.5 h-11 w-full rounded-xl border border-line bg-white px-3 text-[12px] font-medium text-ink outline-none focus:border-accent"><option>매일</option><option>주 2~3회</option><option>필요할 때</option></select></label></div>
          </article>
        })}</div> : <div className="mt-4 rounded-[22px] border border-dashed border-line bg-[#fafbf8] px-5 py-8 text-center"><p className="text-sm font-medium">아래에서 사용할 제품을 골라주세요</p><p className="mt-1.5 text-xs leading-5 text-muted">제품 하나만으로도 경험을 시작할 수 있어요.</p></div>}
      </section>

      <section className="mt-9" aria-labelledby="available-products-title"><div className="flex items-end justify-between"><h2 id="available-products-title" className="section-title">추가할 화장품</h2>{!canAdd && <span className="text-[11px] font-medium text-danger">최대 12개</span>}</div><div className="mt-4 space-y-2">{products.data.filter(item => !selected.includes(item.id)).map(item => <button type="button" key={item.id} disabled={!canAdd} onClick={() => { setSelected(value => [...value, item.id]); setSettings(value => ({ ...value, [item.id]: { timeSlot: 'EVENING', frequency: '매일' } })) }} className="interactive-card flex w-full items-center gap-3 rounded-[18px] border border-line bg-white p-3 text-left disabled:cursor-not-allowed disabled:opacity-45"><ProductGlyph category={category(item)} size="sm" src={item.product?.imageUrl}/><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{displayName(item)}</p><p className="mt-0.5 text-[11px] text-muted">{category(item)}</p></div><span className="grid size-9 place-items-center rounded-full bg-accent-soft text-accent"><Plus size={17}/></span></button>)}</div><Link to="/my-products" className="mt-4 flex min-h-11 items-center justify-center gap-1 text-xs font-medium text-accent">새 화장품 추가 <ChevronRight size={14}/></Link>{save.error && <p role="alert" className="mt-4 text-sm text-danger">{save.error.message}</p>}</section>
    </div>
    <StickyActionBar><Button disabled={!selected.length || save.isPending} onClick={() => home.data?.currentExperience ? setConfirmChange(true) : save.mutate()} className="w-full">{save.isPending ? '저장하는 중…' : `이 순서로 새 경험 시작 (${selected.length})`}</Button></StickyActionBar>
    <BeforeChangeSheet open={confirmChange} title={home.data?.currentExperience?.title || '지금 사용 중인 조합'} pending={transitioning || save.isPending} error={earlyError} onClose={() => setConfirmChange(false)} onChoose={choice => finishAndSave(choice)} onSkip={() => finishAndSave()}/>
  </Screen>
}

function displayName(item?: UserProduct) { return item?.product?.name || item?.customName || '제품' }
function category(item?: UserProduct) { return item?.product?.category || item?.customCategory || '기타' }
function sentimentLabel(value: string) { return value === 'LIKED' ? '마음에 들어요' : value === 'DISAPPOINTED' ? '아쉬워요' : '아직 모르겠어요' }

function RoutineSteps({ routine }: { routine: Routine }) {
  const groups = [
    { key: 'MORNING', label: '아침', items: routine.items.filter(item => item.timeSlot === 'MORNING' || item.timeSlot === 'BOTH') },
    { key: 'EVENING', label: '저녁', items: routine.items.filter(item => item.timeSlot === 'EVENING' || item.timeSlot === 'BOTH') },
  ].filter(group => group.items.length > 0)
  return <section className="mt-8"><div className="mb-3 flex items-end justify-between"><h2 className="section-title">바르는 순서</h2><Link to="/routine/edit" className="text-xs font-medium text-accent">편집</Link></div><div className="space-y-3">{groups.map(group => <div key={group.key} className="surface-card overflow-hidden p-0"><div className="bg-soft px-4 py-2 text-[11px] font-medium text-muted">{group.label}</div>{group.items.map((item, index) => <div key={`${group.key}-${item.userProductId}`} className="flex items-center gap-3 border-t border-line px-4 py-3.5"><span className="grid size-7 shrink-0 place-items-center rounded-full bg-soft text-xs font-medium">{index + 1}</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{item.productName}</p><p className="mt-0.5 text-[11px] text-muted">{item.category} · {item.frequency}</p></div></div>)}</div>)}</div></section>
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
