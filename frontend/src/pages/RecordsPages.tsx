import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronRight, CircleUserRound, LogOut, Sparkles } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api, ApiError } from '../lib/api'
import { startChatPath } from '../lib/chat'
import type { ExperienceRecord, SkinProfile } from '../lib/types'
import { AiBadge, AppHeader, BottomSheet, Button, Card, ErrorState, Loading, Screen, TopBar } from '../components/ui'

const SKIN_TYPE_LABELS: Record<SkinProfile['skinType'], string> = {
  DRY: '건성',
  OILY: '지성',
  COMBINATION: '복합성',
  NORMAL: '중성',
  UNSURE: '잘 모르겠어요',
}

function isNotFound(error: unknown) {
  return error instanceof ApiError && error.status === 404
}

export function RecordsPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [showAllRecords, setShowAllRecords] = useState(false)
  const auth = useQuery({ queryKey: ['auth'], queryFn: api.me })
  const records = useQuery({ queryKey: ['records'], queryFn: api.records })
  const patterns = useQuery({ queryKey: ['patterns'], queryFn: api.patterns })
  const products = useQuery({ queryKey: ['user-products'], queryFn: api.userProducts })
  const profile = useQuery({ queryKey: ['skin-profile'], queryFn: api.skinProfile, retry: false })
  const current = useQuery({ queryKey: ['current-routine'], queryFn: api.currentRoutine, retry: false })
  const baseline = useQuery({ queryKey: ['baseline-routine'], queryFn: api.baselineRoutine, retry: false })
  const logout = useMutation({ mutationFn: api.logout, onSuccess: () => { queryClient.clear(); window.location.href = '/' } })
  const deleteAccount = useMutation({ mutationFn: api.deleteAccount, onSuccess: () => { queryClient.clear(); window.location.href = '/' } })
  const reset = useMutation({ mutationFn: (scenario: 'default' | 'empty-experience' | 'cold-start') => api.resetDemo(scenario), onSuccess: () => { queryClient.invalidateQueries(); navigate('/') } })

  const pending = auth.isPending || records.isPending || patterns.isPending || products.isPending || profile.isPending || current.isPending || baseline.isPending
  if (pending) return <Screen><AppHeader back backTo="/"/><Loading label="내 기록을 연결하는 중"/></Screen>

  const loadError = auth.error
    || records.error
    || patterns.error
    || products.error
    || (profile.error && !isNotFound(profile.error) ? profile.error : null)
    || (current.error && !isNotFound(current.error) ? current.error : null)
    || (baseline.error && !isNotFound(baseline.error) ? baseline.error : null)
  if (loadError) return <Screen><AppHeader back backTo="/"/><ErrorState message={loadError.message} onRetry={() => {
    auth.refetch()
    records.refetch()
    patterns.refetch()
    products.refetch()
    profile.refetch()
    current.refetch()
    baseline.refetch()
  }}/></Screen>

  const visibleRecords = showAllRecords ? records.data : records.data.slice(0, 5)
  const connectedRoutineCount = new Set([current.data?.id, baseline.data?.id].filter(Boolean)).size

  return <Screen>
    <AppHeader back backTo="/"/>
    <div className="px-5 pb-8">
      <div className="flex min-w-0 items-center gap-4">
        <div className="grid size-[60px] shrink-0 place-items-center rounded-full bg-soft text-ink"><CircleUserRound size={28}/></div>
        <div className="min-w-0"><h1 className="truncate text-[30px] font-medium leading-tight tracking-[-.04em]">{auth.data.displayName} 님</h1><p className="mt-1 truncate text-sm text-black/60">ID · {auth.data.username}</p></div>
      </div>

      <section className="mt-6 rounded-[22px] bg-[#f6f9fe] p-5" aria-labelledby="archive-summary-title">
        <p className="text-[11px] font-semibold tracking-[.08em] text-[#5f7396]">MY SKINCARE ARCHIVE</p>
        <h2 id="archive-summary-title" className="mt-2 text-[20px] font-semibold tracking-[-.03em]">{records.data.length ? `${records.data.length}개의 경험을 다음 탐색에 연결해요` : '첫 경험부터 차곡차곡 보관해요'}</h2>
        <p className="mt-2 text-xs leading-5 text-[#646b76]">원문 기록과 AI 해석을 구분하고, 반복된 경험만 패턴으로 보여줍니다.</p>
      </section>

      <div className="mt-4 flex rounded-[20px] border border-[#d9e6ff] bg-[#fbfdff] py-5">
        <Stat label="내 화장품" value={products.data.length}/>
        <div className="w-px bg-[#d9e6ff]"/>
        <Stat label="연결 루틴" value={connectedRoutineCount}/>
        <div className="w-px bg-[#d9e6ff]"/>
        <Stat label="사용 경험" value={records.data.length}/>
      </div>

      <section className="mt-10" aria-labelledby="self-profile-title">
        <div className="flex items-end justify-between gap-3"><div><p className="text-[11px] font-semibold tracking-[.08em] text-[#73766f]">SELF REPORT</p><h2 id="self-profile-title" className="mt-1 text-[18px] font-semibold tracking-[-.03em]">내가 직접 입력한 프로필</h2></div></div>
        <p className="mt-2 text-xs leading-5 text-[#73766f]">진단이나 AI 추론이 아닌, 온보딩에서 직접 고른 현재 맥락입니다.</p>
        {profile.data ? <ProfileFacts profile={profile.data}/> : <Card className="mt-4 border-dashed"><p className="text-sm font-semibold">저장된 자기보고 프로필이 없어요</p><p className="mt-1 text-xs leading-5 text-[#73766f]">제품과 경험 기록은 그대로 사용할 수 있어요.</p></Card>}
      </section>

      <section className="mt-10" aria-labelledby="patterns-title">
        <div className="flex items-end justify-between gap-3"><div><p className="text-[11px] font-semibold tracking-[.08em] text-[#73766f]">MY INSIGHT</p><h2 id="patterns-title" className="mt-1 text-[18px] font-semibold tracking-[-.03em]">반복해서 나타난 경험</h2></div><span className="text-xs font-semibold text-[#73766f]">{patterns.data.length}개</span></div>
        {patterns.data.length ? <div className="mt-4 space-y-3">{patterns.data.map(pattern => <Link key={pattern.id} to={`/patterns/${pattern.id}`} className="flex items-center gap-4 rounded-[20px] border border-[#d9e6ff] bg-[#fbfdff] p-4 transition hover:border-[#a9c6f3] active:scale-[.99]"><span className="grid size-10 shrink-0 place-items-center rounded-full bg-[#e7efff] text-[#5365f5]"><Sparkles size={18}/></span><span className="min-w-0 flex-1"><span className="line-clamp-2 text-sm font-semibold leading-5">{pattern.title}</span><span className="mt-1 block text-[10px] text-[#73766f]">지지 {pattern.supportingCount}건 · 반대 {pattern.contradictingCount}건</span></span><ChevronRight size={18} className="shrink-0 text-[#73766f]"/></Link>)}</div> : <Card className="mt-4 border-dashed"><p className="text-sm font-semibold">아직 반복된 경험이 없어요</p><p className="mt-1 text-xs leading-5 text-[#73766f]">서로 관련 있는 경험이 두 건 이상 쌓이면 근거와 반대 기록을 함께 보여드려요.</p></Card>}
      </section>

      <section className="mt-10" aria-labelledby="records-title">
        <div className="flex items-end justify-between"><div><p className="text-[11px] font-semibold tracking-[.08em] text-[#73766f]">HISTORY</p><h2 id="records-title" className="mt-1 text-[18px] font-semibold tracking-[-.03em]">나의 경험 기록</h2></div><span className="text-xs font-semibold text-[#73766f]">{records.data.length}건</span></div>
        {records.data.length ? <div className="mt-4 rounded-[20px] border border-[#d9e6ff] bg-[#fbfdff]/60 p-5">
          <div className="relative space-y-6 border-l border-line pl-5">{visibleRecords.map(record => <RecordRow key={record.id} record={record}/>)}</div>
          {records.data.length > 5 && <button type="button" onClick={() => setShowAllRecords(value => !value)} aria-expanded={showAllRecords} className="mt-6 min-h-11 w-full rounded-full text-center text-sm font-semibold hover:bg-white">{showAllRecords ? '최근 기록만 보기' : `기록 ${records.data.length - 5}건 더보기`}</button>}
        </div> : <Card className="mt-4 border-dashed"><p className="text-sm font-semibold">아직 남긴 경험이 없어요</p><Link to="/explore" className="mx-auto mt-5 flex min-h-12 w-fit items-center justify-center rounded-full bg-ink px-6 text-sm font-semibold text-white">첫 경험 시작하기</Link></Card>}
      </section>

      {auth.data.demo && <details className="mt-8 rounded-[18px] border border-dashed border-line p-4"><summary className="cursor-pointer text-xs font-bold text-muted">시연 상태 바꾸기</summary><p className="mt-3 text-[11px] leading-5 text-muted">빈 상태를 빠르게 확인하는 해커톤 시연용 도구예요.</p><div className="mt-3 grid grid-cols-3 gap-2">{[['default','기본'],['empty-experience','경험 없음'],['cold-start','첫 사용']].map(([value,label]) => <button type="button" key={value} disabled={reset.isPending} onClick={() => reset.mutate(value as 'default' | 'empty-experience' | 'cold-start')} className="rounded-xl bg-soft px-2 py-2 text-[10px] font-semibold">{label}</button>)}</div>{reset.isError && <p role="alert" className="mt-3 text-xs text-danger">상태를 바꾸지 못했어요. 다시 시도해주세요.</p>}</details>}
      <button type="button" disabled={logout.isPending} onClick={() => logout.mutate()} className="mt-9 flex min-h-12 w-full items-center gap-2 rounded-xl px-2 text-[15px] text-black/60 hover:bg-soft"><LogOut size={16}/>{logout.isPending ? '로그아웃하는 중…' : '로그아웃'}</button>
      {logout.isError && <p role="alert" className="mt-1 text-xs text-danger">로그아웃하지 못했어요. 다시 시도해주세요.</p>}
      {!auth.data.demo && <button type="button" onClick={() => setDeleteOpen(true)} className="flex min-h-12 w-full items-center rounded-xl px-2 text-left text-[15px] text-danger hover:bg-[#fff7f7]">계정 탈퇴</button>}
    </div>

    <BottomSheet open={deleteOpen} onClose={() => setDeleteOpen(false)} title="계정을 삭제할까요?">
      <p className="-mt-2 text-sm leading-6 text-muted">내 화장품, 루틴, 경험, 패턴과 AI 대화가 모두 삭제되며 되돌릴 수 없어요.</p>
      {deleteAccount.error && <p role="alert" className="mt-3 text-xs text-danger">{deleteAccount.error.message}</p>}
      <Button variant="danger" disabled={deleteAccount.isPending} onClick={() => deleteAccount.mutate()} className="mt-5 w-full">{deleteAccount.isPending ? '삭제하는 중…' : '계정과 기록 모두 삭제'}</Button>
      <Button variant="ghost" disabled={deleteAccount.isPending} onClick={() => setDeleteOpen(false)} className="mt-1 w-full">취소</Button>
    </BottomSheet>
  </Screen>
}

function ProfileFacts({ profile }: { profile: SkinProfile }) {
  const facts = [
    { label: '피부 타입', value: SKIN_TYPE_LABELS[profile.skinType] },
    { label: '최근 상태', value: `직접 선택 ${profile.skinCondition} / 5` },
    { label: '주요 고민', value: profile.concerns.slice(0, 3).join(' · ') || '선택 없음' },
    { label: '선호 사용감', value: profile.textures.slice(0, 3).join(' · ') || '선택 없음' },
  ]
  return <dl className="mt-4 grid grid-cols-2 gap-2">{facts.map(fact => <div key={fact.label} className="min-w-0 rounded-[18px] border border-[#d9e6ff] bg-[#fbfdff] p-4"><dt className="text-[10px] font-semibold text-[#5f7396]">{fact.label}</dt><dd className="mt-2 text-[13px] font-semibold leading-5">{fact.value}</dd></div>)}</dl>
}

function Stat({ label, value }: { label: string; value: number }) {
  return <div className="min-w-0 flex-1 px-1 text-center"><p className="text-[30px] font-medium tabular-nums text-[#7892bb]">{value}<span className="ml-0.5 text-sm font-normal">개</span></p><p className="mt-1 text-xs">{label}</p></div>
}

function RecordRow({ record }: { record: ExperienceRecord }) {
  const liked = record.sentiment === 'LIKED'
  const disappointed = record.sentiment === 'DISAPPOINTED'
  return <article className="relative"><span aria-hidden="true" className={`absolute -left-[26px] top-1 size-3 rounded-full ${liked ? 'bg-accent' : disappointed ? 'bg-[#d78989]' : 'bg-[#a7aaa3]'}`}/><div className="flex items-start justify-between gap-3"><h3 className="text-[15px] font-medium leading-5">{record.productName}</h3><p className="shrink-0 text-[10px] text-black/55">{formatDate(record.createdAt)}</p></div><p className="mt-1 text-xs text-[#5f7396]">{liked ? '마음에 들어요' : disappointed ? '아쉬워요' : '아직 모르겠어요'}{record.discomfort === 'REPORTED' && ' · 불편함 기록'}</p>{record.note && <p className="mt-2 line-clamp-2 text-xs leading-5 text-[#73766f]">{record.note}</p>}</article>
}

export function PatternPage() {
  const { id } = useParams()
  const patternId = Number(id)
  const navigate = useNavigate()
  const pattern = useQuery({ queryKey: ['pattern', patternId], queryFn: () => api.pattern(patternId), enabled: Number.isSafeInteger(patternId) && patternId > 0 })

  if (!Number.isSafeInteger(patternId) || patternId < 1) return <Screen nav={false}><TopBar title="내 패턴" back/><ErrorState message="패턴 주소를 확인해주세요."/></Screen>
  if (pattern.isPending) return <Screen nav={false}><TopBar title="내 패턴" back/><Loading/></Screen>
  if (pattern.isError) return <Screen nav={false}><TopBar title="내 패턴" back/><ErrorState message={pattern.error.message} onRetry={() => pattern.refetch()}/></Screen>

  const data = pattern.data
  const openPatternChat = () => navigate(startChatPath('PATTERN', `“${data.title}” 패턴을 지지하는 기록과 반대하는 기록을 함께 설명해줘.`))
  return <Screen nav={false} className="pb-28">
    <TopBar title="내 패턴" back/>
    <div className="px-5 py-7"><AiBadge/><h1 className="mt-4 text-[27px] font-bold leading-9 tracking-[-.045em]">{data.title}</h1><p className="mt-4 text-sm leading-6 text-muted">{data.summary}</p><div className="mt-5 flex gap-2"><span className="rounded-full bg-[#ecf5d5] px-3 py-1.5 text-xs font-bold">지지 {data.supportingCount}</span><span className="rounded-full bg-[#f6eaea] px-3 py-1.5 text-xs font-bold">반대 {data.contradictingCount}</span></div><p className="mt-3 text-[11px] leading-5 text-muted">{data.confidenceNote}</p>
      <section className="mt-9"><h2 className="text-lg font-bold">연결된 경험</h2><div className="mt-3 space-y-3">{data.evidence.map(item => <Card key={item.recordId}><div className="flex items-center justify-between"><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${item.polarity === 'SUPPORTS' ? 'bg-[#ecf5d5]' : 'bg-[#f6eaea]'}`}>{item.polarity === 'SUPPORTS' ? '지지하는 기록' : '다른 경험'}</span><span className="text-[10px] text-muted">{formatDate(item.createdAt)}</span></div><h3 className="mt-3 text-sm font-bold">{item.productName}</h3><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted">“{item.note}”</p></Card>)}</div></section>
      <div className="mt-7 rounded-2xl bg-soft p-4 text-xs leading-5 text-muted">이 패턴은 피부 타입이나 성분 효과 판정이 아니에요. 내가 남긴 경험 사이의 반복과 차이를 보여줍니다.</div>
    </div>
    <div className="safe-bottom fixed inset-x-0 bottom-0 z-20 mx-auto max-w-[430px] border-t border-line bg-white/96 p-4 backdrop-blur"><Button onClick={openPatternChat} className="w-full">이 패턴을 AI와 살펴보기<Sparkles size={17}/></Button></div>
  </Screen>
}

function formatDate(value: string) {
  const normalized = /Z$|[+-]\d\d:\d\d$/.test(value) ? value : `${value.replace(' ', 'T')}Z`
  const date = new Date(normalized)
  return Number.isNaN(date.getTime()) ? value.slice(0, 10) : new Intl.DateTimeFormat('ko-KR', { month: 'long', day: 'numeric' }).format(date)
}
