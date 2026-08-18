import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { BookOpen, Check, ChevronLeft, ChevronRight, CircleUserRound, LogOut, Pencil, Search } from 'lucide-react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { api, ApiError } from '../lib/api'
import { startChatPath } from '../lib/chat'
import { experienceRecordHref } from '../lib/experience'
import type { ExperienceRecord, Pattern, SkinProfile } from '../lib/types'
import { ExperienceRecordItem } from '../components/ExperienceRecordItem'
import { ExperienceStatusBadge } from '../components/ExperienceStatusBadge'
import { ProductAddSheet } from '../components/ProductAddSheet'
import { AiBadge, AppHeader, BottomSheet, Button, Card, ErrorState, Loading, PageHeading, Screen, Skeleton, StickyActionBar, TopBar } from '../components/ui'

const SKIN_TYPE_LABELS: Record<SkinProfile['skinType'], string> = {
  DRY: '건성',
  OILY: '지성',
  COMBINATION: '복합성',
  NORMAL: '중성',
  UNSURE: '잘 모르겠어요',
}

const AGE_RANGE_LABELS: Record<SkinProfile['ageRange'], string> = { '10S': '10대', '20S': '20대', '30S': '30대', '40S': '40대', '50S': '50대', '60_PLUS': '60대 이상' }
const GENDER_LABELS: Record<SkinProfile['gender'], string> = { MALE: '남성', FEMALE: '여성' }
const TRIAL_FREQUENCY_LABELS: Record<SkinProfile['trialFrequency'], string> = {
  RARELY: '새 제품을 거의 시도하지 않아요',
  EVERY_FEW_MONTHS: '몇 달에 한 번 시도해요',
  ONE_OR_TWO_MONTHLY: '한 달에 1~2개 정도 시도해요',
  THREE_PLUS_MONTHLY: '한 달에 3개 이상 시도해요',
}
const SKIN_CONDITION_LABELS: Record<number, string> = {
  1: '많이 예민한 편이에요',
  2: '조금 예민한 편이에요',
  3: '평소와 비슷해요',
  4: '편안한 편이에요',
  5: '아주 편안한 편이에요',
}
const PROFILE_CONCERNS = ['건조함', '당김', '유분기', '번들거림', '여드름', '좁쌀 트러블', '홍조', '민감함', '잡티', '칙칙함', '다크서클', '색소침착', '각질', '거친 피부결', '모공', '블랙헤드', '주름', '탄력 저하', '처짐']
const PROFILE_TEXTURES = ['가벼운 발림', '촉촉한 발림', '쫀쫀한 발림', '무거운 발림', '산뜻한 마무리', '보송한 마무리', '촉촉한 마무리', '윤기 있는 마무리', '무향', '시트러스·허브 향', '플로럴 향', '우디·머스크 향', '기타 향']
const PROFILE_AVOIDS = ['알러지 유발 성분', '향료', '알코올', '에센셜 오일', '실리콘', '답답함', '끈적거림', '따가움', '향이 강한 것', '무거운 잔여감']

function isNotFound(error: unknown) {
  return error instanceof ApiError && error.status === 404
}

function isExperienceSentiment(value: string): value is ExperienceRecord['sentiment'] {
  return value === 'LIKED' || value === 'DISAPPOINTED' || value === 'UNSURE'
}

export function RecordsPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const queryClient = useQueryClient()
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [productAddOpen, setProductAddOpen] = useState(false)
  const view = searchParams.get('view') === 'history' ? 'HISTORY' : 'PROFILE'
  const auth = useQuery({ queryKey: ['auth'], queryFn: api.me })
  const records = useQuery({ queryKey: ['records'], queryFn: api.records })
  const patterns = useQuery({ queryKey: ['patterns'], queryFn: api.patterns })
  const profile = useQuery({ queryKey: ['skin-profile'], queryFn: api.skinProfile, retry: false })
  const logout = useMutation({ mutationFn: api.logout, onSuccess: () => { queryClient.clear(); window.location.href = '/' } })
  const deleteAccount = useMutation({ mutationFn: api.deleteAccount, onSuccess: () => { queryClient.clear(); window.location.href = '/' } })
  const reset = useMutation({ mutationFn: (scenario: 'default' | 'empty-experience' | 'cold-start') => api.resetDemo(scenario), onSuccess: () => { queryClient.invalidateQueries(); navigate('/') } })

  const pending = auth.isPending || profile.isPending
  if (pending) return <Screen nav={false}><AppHeader back sticky profile={false} notifications={false}/><Loading variant="records" label="내 프로필을 불러오는 중"/></Screen>

  const loadError = auth.error || (profile.error && !isNotFound(profile.error) ? profile.error : null)
  if (loadError) return <Screen nav={false}><AppHeader back sticky profile={false} notifications={false}/><ErrorState message={loadError.message} onRetry={() => {
    auth.refetch()
    profile.refetch()
  }}/></Screen>

  const recordItems = records.data || []
  const patternItems = patterns.data || []
  const secondaryError = records.error || patterns.error

  return <Screen nav={false} className="bg-[#fbfcff]">
    <AppHeader back sticky profile={false} notifications={false}/>
    <div className="px-5 pb-12 pt-2">
      <div className="flex min-w-0 items-center gap-3.5">
        <div className="grid size-[52px] shrink-0 place-items-center rounded-full border border-[#d7e3f4] bg-[#f1f6fd] text-[#25364f]"><CircleUserRound size={25} strokeWidth={1.7}/></div>
        <div className="min-w-0 flex-1"><p className="text-[10px] font-semibold tracking-[.1em] text-[#7187a8]">MY SKN</p><h1 className="mt-0.5 truncate text-[26px] font-semibold leading-tight tracking-[-.04em]">{auth.data.displayName} 님</h1><p className="mt-0.5 truncate text-[11px] text-[#838b97]">{auth.data.username}</p></div>
      </div>

      <div className="mt-6 grid grid-cols-2 border-b border-[#e2e6ec]" role="tablist" aria-label="프로필 화면 보기">
        <button type="button" role="tab" aria-selected={view === 'PROFILE'} onClick={() => setSearchParams({}, { replace: true })} className={`relative min-h-12 text-[13px] font-semibold transition ${view === 'PROFILE' ? 'text-ink' : 'text-[#9097a1]'}`}>내 프로필{view === 'PROFILE' && <span className="absolute inset-x-5 -bottom-px h-0.5 rounded-full bg-[#172033]"/>}</button>
        <button type="button" role="tab" aria-selected={view === 'HISTORY'} onClick={() => setSearchParams({ view: 'history' }, { replace: true })} className={`relative min-h-12 text-[13px] font-semibold transition ${view === 'HISTORY' ? 'text-ink' : 'text-[#9097a1]'}`}>경험 기록 {recordItems.length ? recordItems.length : ''}{view === 'HISTORY' && <span className="absolute inset-x-5 -bottom-px h-0.5 rounded-full bg-[#172033]"/>}</button>
      </div>

      {view === 'PROFILE' ? <>
        {profile.data ? <PersonalContextCard profile={profile.data} onEdit={() => navigate('/profile/edit')} onExplore={() => setProductAddOpen(true)}/> : <Card className="mt-7 border-dashed bg-white"><p className="text-sm font-semibold">내가 입력한 프로필을 찾지 못했어요.</p><p className="mt-1 text-xs leading-5 text-muted">제품과 경험 기록은 그대로 사용할 수 있어요.</p></Card>}
        {secondaryError
          ? <section className="mt-9 rounded-[22px] border border-[#dbe5f3] bg-white p-5" aria-live="polite"><p className="text-sm font-semibold">경험 지도를 불러오지 못했어요.</p><p className="mt-1 text-[11px] leading-5 text-[#758196]">내가 입력한 탐색 기준은 그대로 확인할 수 있어요.</p><button type="button" onClick={() => { records.refetch(); patterns.refetch() }} className="mt-4 min-h-10 rounded-full border border-[#c5d5ec] px-4 text-xs font-semibold text-[#526b93]">다시 불러오기</button></section>
          : <ExperienceMap patterns={patternItems} recordCount={recordItems.length} loading={records.isPending || patterns.isPending}/>}
      </> : <section className="mt-8" aria-labelledby="records-title">
        <p className="text-[10px] font-semibold tracking-[.12em] text-[#77869c]">내가 남긴 원문</p><h2 id="records-title" className="mt-1.5 text-[23px] font-semibold tracking-[-.04em] text-[#171d29]">경험 기록</h2>
        <p className="mt-2 text-[11px] leading-5 text-[#798493]">직접 남긴 기록을 당시 제품과 루틴에 연결해 보관해요.</p>

        {records.isPending ? <div className="mt-5 space-y-3" role="status" aria-label="경험 기록을 불러오는 중"><Skeleton className="h-28 rounded-[22px]"/><Skeleton className="h-28 rounded-[22px]"/><Skeleton className="h-28 rounded-[22px]"/></div>
          : records.isError ? <div className="mt-5 rounded-[22px] border border-[#dce5f1] bg-white px-5 py-7 text-center"><p className="text-sm font-semibold">경험 기록을 불러오지 못했어요.</p><button type="button" onClick={() => records.refetch()} className="mt-4 min-h-10 rounded-full border border-[#c5d5ec] px-4 text-xs font-semibold text-[#526b93]">다시 불러오기</button></div>
            : !recordItems.length ? <div className="mt-5 rounded-[24px] border border-dashed border-[#cfdbeb] bg-[linear-gradient(150deg,#fff,#f1f6ff)] px-6 py-9 text-center"><span className="mx-auto grid size-11 place-items-center rounded-full bg-white text-[#6d83a6] shadow-[0_5px_18px_rgba(47,68,102,.08)]"><BookOpen size={19}/></span><h3 className="mt-4 text-[16px] font-semibold tracking-[-.025em]">첫 기록을 남겨보세요</h3><p className="mx-auto mt-2 max-w-[260px] text-[11px] leading-5 text-[#788497]">좋았던 점도, 아직 모르겠는 점도 그대로 남기면<br/>다음 탐색의 기준이 돼요.</p><Link to="/explore" className="mt-5 inline-flex min-h-11 items-center justify-center rounded-full bg-[#172033] px-5 text-[12px] font-semibold text-white">첫 경험 시작하기</Link></div>
              : <ExperienceCalendar records={recordItems}/>}
      </section>}

      <details className="mt-10 border-t border-[#e2e6ec] pt-5"><summary className="flex min-h-11 cursor-pointer list-none items-center justify-between text-[13px] font-semibold text-[#667080]">계정 및 데이터 <ChevronRight size={16}/></summary><div className="pb-2">{auth.data.demo && <details className="mt-3 rounded-[18px] border border-dashed border-line p-4"><summary className="cursor-pointer text-xs font-semibold text-muted">시연 상태 바꾸기</summary><p className="mt-3 text-xs leading-5 text-muted">빈 상태를 빠르게 확인하는 시연용 도구예요.</p><div className="mt-3 grid grid-cols-3 gap-2">{[['default','기본'],['empty-experience','경험 없음'],['cold-start','첫 사용']].map(([value,label]) => <button type="button" key={value} disabled={reset.isPending} onClick={() => reset.mutate(value as 'default' | 'empty-experience' | 'cold-start')} className="rounded-xl bg-soft px-2 py-2 text-xs font-medium">{label}</button>)}</div></details>}<button type="button" disabled={logout.isPending} onClick={() => logout.mutate()} className="mt-3 flex min-h-12 w-full items-center gap-2 rounded-xl px-2 text-sm text-black/60 hover:bg-soft"><LogOut size={16}/>{logout.isPending ? '로그아웃하는 중…' : '로그아웃'}</button>{!auth.data.demo && <button type="button" onClick={() => setDeleteOpen(true)} className="flex min-h-12 w-full items-center rounded-xl px-2 text-left text-sm text-danger hover:bg-[#fff7f7]">계정 탈퇴</button>}</div></details>
    </div>

    <BottomSheet open={deleteOpen} onClose={() => setDeleteOpen(false)} title="계정을 삭제할까요?">
      <p className="-mt-2 text-sm leading-6 text-muted">내 화장품, 루틴, 경험, 패턴과 AI 대화가 모두 삭제되며 되돌릴 수 없어요.</p>
      {deleteAccount.error && <p role="alert" className="mt-3 text-xs text-danger">{deleteAccount.error.message}</p>}
      <Button variant="danger" disabled={deleteAccount.isPending} onClick={() => deleteAccount.mutate()} className="mt-5 w-full">{deleteAccount.isPending ? '삭제하는 중…' : '계정과 기록 모두 삭제'}</Button>
      <Button variant="ghost" disabled={deleteAccount.isPending} onClick={() => setDeleteOpen(false)} className="mt-1 w-full">취소</Button>
    </BottomSheet>
    <ProductAddSheet open={productAddOpen} onClose={() => setProductAddOpen(false)} onAi={() => { setProductAddOpen(false); navigate(startChatPath('RECOMMEND', '내가 직접 입력한 고민과 선호 사용감을 기준으로 첫 제품 탐색을 도와줘. 아직 실제 사용 경험이 부족하다는 점은 구분해서 설명해줘.')) }} onSearch={() => { setProductAddOpen(false); navigate('/explore') }}/>
  </Screen>
}

function PersonalContextCard({ profile, onEdit, onExplore }: { profile: SkinProfile; onEdit: () => void; onExplore: () => void }) {
  const avoids = [...profile.avoids, profile.avoidNote.trim()].filter(Boolean)
  return <>
    <section className="mt-7 overflow-hidden rounded-[22px] border border-[#dfe5ed] bg-white shadow-[0_7px_22px_rgba(38,52,76,.045)]" aria-labelledby="personal-context-title">
      <header className="flex min-h-[68px] items-center justify-between gap-4 px-5">
        <h2 id="personal-context-title" className="text-[16px] font-semibold tracking-[-.025em] text-[#1d2430]">내가 입력한 기준</h2>
        <button type="button" onClick={onEdit} className="inline-flex min-h-10 items-center gap-1.5 rounded-full px-2 text-[11px] font-semibold text-[#687588] transition hover:bg-[#f3f6fa] active:scale-95"><Pencil size={14}/>수정</button>
      </header>

      <dl className="border-t border-[#e7ebf0] px-5">
        <ProfileContextRow label="관심" values={profile.concerns}/>
        <ProfileContextRow label="선호" values={profile.textures}/>
        <ProfileContextRow label="피하고 싶은 것" values={avoids.length ? avoids : ['선택 없음']}/>
      </dl>

      <dl className="border-t border-[#e7ebf0] bg-[#f8faff] px-5">
        <ProfileFact label="피부 타입" value={SKIN_TYPE_LABELS[profile.skinType]}/>
        <ProfileFact label="최근 피부 상태" value={SKIN_CONDITION_LABELS[profile.skinCondition] || '입력한 상태 없음'}/>
        <ProfileFact label="새 제품 시도" value={TRIAL_FREQUENCY_LABELS[profile.trialFrequency]}/>
      </dl>

      <button type="button" onClick={onExplore} className="group flex min-h-[58px] w-full items-center gap-3 border-t border-[#e7ebf0] px-5 text-left transition hover:bg-[#fafbfd] active:bg-[#f5f7fa]">
        <Search size={16} className="shrink-0 text-[#68778c]"/>
        <span className="min-w-0 flex-1 text-[13px] font-semibold tracking-[-.018em] text-[#263142]">입력한 기준으로 제품 찾기</span>
        <ChevronRight size={17} className="shrink-0 text-[#8b96a5] transition group-hover:translate-x-0.5"/>
      </button>
    </section>
    <p className="mt-2.5 px-1 text-[10px] leading-4 text-[#858e9a]">입력한 프로필은 제품 탐색에만 참고하며, 사용 경험이나 진단으로 해석하지 않아요.</p>
  </>
}

function ProfileContextRow({ label, values }: { label: string; values: string[] }) {
  const visible = values.slice(0, 4)
  return <div className="grid min-h-[52px] grid-cols-[88px_1fr] items-center gap-3 border-b border-[#edf0f4] last:border-b-0">
    <dt className="text-[11px] font-medium text-[#7b8593]">{label}</dt>
    <dd className="min-w-0 text-[13px] font-medium leading-5 tracking-[-.012em] text-[#313a48]">{visible.join(' · ')}{values.length > 4 && <span className="ml-1 text-[11px] text-[#8490a0]">외 {values.length - 4}개</span>}</dd>
  </div>
}

function ProfileFact({ label, value }: { label: string; value: string }) {
  return <div className="grid min-h-[44px] grid-cols-[88px_1fr] items-center gap-3 border-b border-[#e8edf3] last:border-b-0">
    <dt className="text-[10px] font-medium text-[#8490a0]">{label}</dt>
    <dd className="text-[11px] font-medium leading-5 text-[#596679]">{value}</dd>
  </div>
}

const profileHexPoint = (index: number, radius: number) => {
  const angle = (-90 + index * 60) * Math.PI / 180
  return { x: 120 + Math.cos(angle) * radius, y: 120 + Math.sin(angle) * radius }
}

function ExperienceMap({ patterns, recordCount, loading }: { patterns: Pattern[]; recordCount: number; loading: boolean }) {
  const fields = [...patterns].sort((left, right) => left.id - right.id).slice(0, 6)
  const slots = Array.from({ length: 6 }, (_, index) => fields[index])
  const points = slots.map((pattern, index) => {
    const evidence = pattern ? pattern.supportingCount + pattern.contradictingCount : 0
    const point = profileHexPoint(index, evidence ? 32 + Math.min(evidence, 6) / 6 * 74 : 12)
    return `${point.x},${point.y}`
  }).join(' ')
  const emptyStatus = recordCount === 0 ? '첫 기록을 기다리는 중' : recordCount === 1 ? '기록 1건 · 비교 전' : `기록 ${recordCount}건 비교 중`
  const emptyTitle = recordCount === 0 ? '기록이 쌓이면 모양이 생겨요.' : recordCount === 1 ? '첫 기록을 비교할 준비가 됐어요.' : '서로 연결할 경험을 찾는 중이에요.'
  const emptyCopy = recordCount === 0 ? '내 경험에 맞춰 여섯 축이 달라집니다.' : recordCount === 1 ? '비슷한 조건의 경험이 하나 더 생기면 비교를 시작해요.' : '기록은 있지만 조건과 사용 결과가 비슷한 경험이 아직 없어요.'
  return <section className="mt-9" aria-labelledby="experience-map-title">
    <div className="flex items-end justify-between gap-4"><div><p className="text-[10px] font-semibold tracking-[.1em] text-[#77869c]">경험에서 발견한 흐름</p><h2 id="experience-map-title" className="mt-1 text-[22px] font-semibold tracking-[-.04em]">나의 경험 지도</h2></div>{fields.length > 0 && <span className="pb-0.5 text-[11px] font-semibold text-[#748095]">필드 {fields.length}개</span>}</div>
    <div className="mt-4 overflow-hidden rounded-[26px] border border-[#d8e4f4] bg-[linear-gradient(155deg,#fbfdff,#eef4ff)] p-5 shadow-[0_8px_25px_rgba(55,79,120,.055)]">
      {loading ? <div className="min-h-[280px] py-2" role="status" aria-label="경험 지도를 만드는 중"><Skeleton className="mx-auto aspect-square w-full max-w-[242px] rounded-[32%]"/></div> : <>
        {!fields.length && <span className="inline-flex rounded-full bg-white/85 px-3 py-2 text-[11px] font-medium text-[#52678c] shadow-[inset_0_0_0_1px_rgba(201,218,248,.75)]">{emptyStatus}</span>}
        <div className={`mx-auto aspect-square w-full max-w-[242px] ${fields.length ? '' : 'mt-1'}`}>
          <svg viewBox="0 0 240 240" className="size-full overflow-visible" role="img" aria-label={fields.length ? `${fields.length}개 경험 필드의 근거량 지도` : `인사이트 형성 진행 상태, 경험 ${recordCount}건`}>
            {[106, 81, 50].map(radius => <polygon key={radius} points={Array.from({ length: 6 }, (_, index) => { const point = profileHexPoint(index, radius); return `${point.x},${point.y}` }).join(' ')} fill="#f6f9ff" stroke="#d9e6ff" strokeWidth="1"/>) }
            <polygon points={Array.from({ length: 6 }, (_, index) => { const point = profileHexPoint(index, 50); return `${point.x},${point.y}` }).join(' ')} fill="#b2ccff" fillOpacity=".34"/>
            {Array.from({ length: 6 }, (_, index) => { const point = profileHexPoint(index, 106); return <line key={index} x1="120" y1="120" x2={point.x} y2={point.y} stroke="#c4d5f1" strokeWidth="1" strokeDasharray="2 6"/> })}
            {fields.length ? <>
              {fields.length > 1 && <polygon points={points} fill="rgba(178,204,255,.5)" stroke="#6d8fce" strokeWidth="2"/>}
              {slots.map((pattern, index) => {
                if (!pattern) return null
                const evidence = pattern.supportingCount + pattern.contradictingCount
                const point = profileHexPoint(index, 32 + Math.min(evidence, 6) / 6 * 74)
                return <circle key={pattern.id} cx={point.x} cy={point.y} r="5" fill="#6d8fce" stroke="#fff" strokeWidth="2"/>
              })}
              {Array.from({ length: 6 }, (_, index) => {
                const point = profileHexPoint(index, 106)
                return slots[index] ? <g key={index}><circle cx={point.x} cy={point.y} r="11" fill="#fff" stroke="#d9e6ff"/><text x={point.x} y={point.y + 3.5} textAnchor="middle" fontSize="9" fontWeight="700" fill="#526f9f">{index + 1}</text></g> : null
              })}
            </> : <text x="120" y="137" textAnchor="middle" fontSize="46" fontWeight="700" fill="#ffffff">?</text>}
          </svg>
        </div>
        {fields.length ? <><p className="-mt-1 text-center text-[10px] leading-4 text-[#748197]">도형의 길이는 좋고 나쁨이 아니라 연결된 근거량을 나타내요.</p><div className="mt-4 space-y-2">{fields.map((pattern, index) => <Link key={pattern.id} to={`/patterns/${pattern.id}`} className="flex min-h-[62px] items-center gap-3 rounded-[18px] border border-white bg-white/72 px-3.5 shadow-[inset_0_0_0_1px_rgba(211,224,244,.9)] transition active:scale-[.99]"><span className="grid size-7 shrink-0 place-items-center rounded-full bg-[#e8f0ff] text-[10px] font-semibold text-[#526f9f]">{index + 1}</span><span className="min-w-0 flex-1"><strong className="line-clamp-2 block text-[12px] font-semibold leading-5 tracking-[-.015em]">{pattern.title}</strong><span className="mt-0.5 block text-[10px] text-[#748093]">같은 방향 {pattern.supportingCount} · 다른 기록 {pattern.contradictingCount}</span></span><ChevronRight size={16} className="shrink-0 text-[#8290a5]"/></Link>)}</div></> : <><div className="mt-1 text-center"><h3 className="text-[14px] font-semibold tracking-[-.02em]">{emptyTitle}</h3><p className="mt-1 text-[11px] leading-5 text-[#68778f]">{emptyCopy}</p></div><div className="mt-4 flex items-center justify-between gap-3 border-t border-[#d9e4f5] pt-3"><p className="text-[10px] leading-4 text-[#6d788a]">비슷한 경험 2개부터 축을 만들어요.</p><Link to={recordCount ? '/records?view=history' : '/explore'} className="inline-flex h-8 shrink-0 items-center gap-0.5 rounded-full bg-[#121318] px-3.5 text-[10px] font-semibold text-white">{recordCount ? '기록 보기' : '시작하기'}<ChevronRight size={12}/></Link></div></>}
      </>}
    </div>
  </section>
}

export function ProfileEditPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const profile = useQuery({ queryKey: ['skin-profile'], queryFn: api.skinProfile, retry: false })
  const [draft, setDraft] = useState<SkinProfile | null>(null)
  useEffect(() => { if (profile.data && !draft) setDraft(profile.data) }, [draft, profile.data])
  const save = useMutation({ mutationFn: () => api.saveSkinProfile(draft!), onSuccess: value => { queryClient.setQueryData(['skin-profile'], value); navigate('/records') } })
  if (profile.isError) return <Screen nav={false}><AppHeader back backTo="/records" sticky profile={false} notifications={false}/><ErrorState message={profile.error.message} onRetry={() => profile.refetch()}/></Screen>
  if (profile.isPending || !draft) return <Screen nav={false}><AppHeader back backTo="/records" sticky profile={false} notifications={false}/><Loading variant="form" label="프로필을 준비하는 중"/></Screen>
  const toggle = (field: 'concerns' | 'textures' | 'avoids', value: string) => setDraft(current => current ? { ...current, [field]: current[field].includes(value) ? current[field].filter(item => item !== value) : [...current[field], value] } : current)
  const valid = draft.concerns.length > 0 && draft.textures.length > 0
  return <Screen nav={false} className="bg-[#fbfcff] pb-32">
    <AppHeader back backTo="/records" sticky profile={false} notifications={false}/>
    <form id="profile-edit-form" onSubmit={event => { event.preventDefault(); if (valid) save.mutate() }} className="px-5 pb-10 pt-4">
      <PageHeading title={<>내 탐색 기준을<br/>다시 알려주세요.</>} description="직접 고른 현재 맥락이며 언제든 바꿀 수 있어요."/>
      <fieldset className="mt-8"><legend className="text-[15px] font-semibold">피부 타입</legend><div className="mt-3 flex flex-wrap gap-2">{typedEntries(SKIN_TYPE_LABELS).map(([value, label]) => <ChoiceChip key={value} selected={draft.skinType === value} onClick={() => setDraft({ ...draft, skinType: value })}>{label}</ChoiceChip>)}</div></fieldset>
      <fieldset className="mt-8"><legend className="text-[15px] font-semibold">최근 피부 상태</legend><div className="mt-3 grid grid-cols-5 gap-2" role="radiogroup" aria-label="최근 피부 상태">{[1,2,3,4,5].map(value => <button type="button" role="radio" aria-checked={draft.skinCondition === value} key={value} onClick={() => setDraft({ ...draft, skinCondition: value })} className={`grid aspect-square place-items-center rounded-full border text-sm font-semibold transition ${draft.skinCondition === value ? 'border-[#172033] bg-[#172033] text-white' : 'border-[#d9e1ec] bg-white text-[#697587]'}`}>{value}</button>)}</div><div className="mt-2 flex justify-between text-[10px] text-[#8d95a0]"><span>불안정</span><span>안정적</span></div></fieldset>
      <ProfileEditChoices title="요즘 신경 쓰이는 부분" required options={PROFILE_CONCERNS} selected={draft.concerns} onToggle={value => toggle('concerns', value)}/>
      <ProfileEditChoices title="선호하는 사용감" required options={PROFILE_TEXTURES} selected={draft.textures} onToggle={value => toggle('textures', value)}/>
      <ProfileEditChoices title="피하고 싶은 것" options={PROFILE_AVOIDS} selected={draft.avoids} onToggle={value => toggle('avoids', value)}/>
      <label className="mt-4 block"><span className="text-xs font-semibold text-[#667286]">직접 입력 <span className="font-normal text-[#9aa1ab]">선택</span></span><textarea value={draft.avoidNote} maxLength={300} rows={3} onChange={event => setDraft({ ...draft, avoidNote: event.target.value })} placeholder="목록에 없는 성분이나 사용감" className="mt-2 w-full resize-none rounded-[18px] border border-[#dce5f2] bg-[#f8faff] p-4 text-base leading-6 outline-none transition focus:border-[#91a9cf] focus:bg-white focus:shadow-[0_0_0_4px_rgba(226,235,250,.9)]"/></label>
      <fieldset className="mt-8"><legend className="text-[15px] font-semibold">새 제품을 시도하는 빈도</legend><div className="mt-3 space-y-2">{typedEntries(TRIAL_FREQUENCY_LABELS).map(([value, label]) => <button type="button" key={value} onClick={() => setDraft({ ...draft, trialFrequency: value })} className={`flex min-h-[54px] w-full items-center gap-3 rounded-[18px] border px-4 text-left text-[13px] font-semibold transition ${draft.trialFrequency === value ? 'border-[#aac0e2] bg-[#f1f6ff]' : 'border-[#e1e5eb] bg-white'}`}><span className={`grid size-5 place-items-center rounded-full border ${draft.trialFrequency === value ? 'border-[#6c88b5]' : 'border-[#cfd5dd]'}`}>{draft.trialFrequency === value && <span className="size-2 rounded-full bg-[#627ead]"/>}</span>{label}</button>)}</div></fieldset>
      <details className="mt-8 rounded-[20px] border border-[#e0e6ef] bg-white p-4"><summary className="cursor-pointer text-[13px] font-semibold text-[#657286]">기본 정보 확인</summary><fieldset className="mt-5"><legend className="text-xs font-semibold text-[#7a8493]">연령대</legend><div className="mt-2 flex flex-wrap gap-2">{typedEntries(AGE_RANGE_LABELS).map(([value, label]) => <ChoiceChip key={value} selected={draft.ageRange === value} onClick={() => setDraft({ ...draft, ageRange: value })}>{label}</ChoiceChip>)}</div></fieldset><fieldset className="mt-5"><legend className="text-xs font-semibold text-[#7a8493]">성별</legend><div className="mt-2 flex gap-2">{typedEntries(GENDER_LABELS).map(([value, label]) => <ChoiceChip key={value} selected={draft.gender === value} onClick={() => setDraft({ ...draft, gender: value })}>{label}</ChoiceChip>)}</div></fieldset></details>
      {!valid && <p className="mt-5 text-xs leading-5 text-danger">고민과 선호 사용감을 하나 이상 선택해주세요.</p>}
      {save.error && <p role="alert" className="mt-5 text-xs leading-5 text-danger">{save.error.message}</p>}
    </form>
    <StickyActionBar><Button type="submit" form="profile-edit-form" disabled={!valid || save.isPending} className="w-full">{save.isPending ? '저장하는 중…' : '내 탐색 기준 저장'}</Button></StickyActionBar>
  </Screen>
}

function ProfileEditChoices({ title, required = false, options, selected, onToggle }: { title: string; required?: boolean; options: string[]; selected: string[]; onToggle: (value: string) => void }) {
  return <fieldset className="mt-8"><legend className="text-[15px] font-semibold">{title} <span className={`text-xs font-normal ${required ? 'text-[#627ead]' : 'text-[#969da7]'}`}>{required ? '필수' : '선택'}</span></legend><div className="mt-3 flex flex-wrap gap-2">{options.map(value => <ChoiceChip key={value} selected={selected.includes(value)} onClick={() => onToggle(value)}>{value}</ChoiceChip>)}</div></fieldset>
}

function ChoiceChip({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: string }) {
  return <button type="button" aria-pressed={selected} onClick={onClick} className={`inline-flex min-h-11 items-center gap-1.5 rounded-full border px-4 text-[13px] font-semibold transition active:scale-[.98] ${selected ? 'border-[#172033] bg-[#172033] text-white' : 'border-[#dce2ea] bg-white text-[#66717f]'}`}>{selected && <Check size={13}/>} {children}</button>
}

function typedEntries<T extends string>(value: Record<T, string>) {
  return Object.entries(value) as [T, string][]
}

function ExperienceCalendar({ records }: { records: ExperienceRecord[] }) {
  const initialDate = parseRecordDate(records[0].createdAt)
  const [month, setMonth] = useState(() => new Date(initialDate.getFullYear(), initialDate.getMonth(), 1))
  const [selectedDay, setSelectedDay] = useState(() => recordDayKey(initialDate))
  const selectedRecords = records.filter(record => recordDayKey(parseRecordDate(record.createdAt)) === selectedDay)
  const recordDates = records.map(record => parseRecordDate(record.createdAt))
  const availableMonths = [...new Set(recordDates.map(date => `${date.getFullYear()}-${date.getMonth()}`))]
    .map(key => { const [year, monthIndex] = key.split('-').map(Number); return new Date(year, monthIndex, 1) })
    .sort((left, right) => left.getTime() - right.getTime())
  const currentMonthIndex = availableMonths.findIndex(value => value.getTime() === month.getTime())
  const canGoPrevious = currentMonthIndex > 0
  const canGoNext = currentMonthIndex < availableMonths.length - 1
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()
  const offset = new Date(month.getFullYear(), month.getMonth(), 1).getDay()
  const cells = Array.from({ length: Math.ceil((offset + daysInMonth) / 7) * 7 }, (_, index) => {
    const day = index - offset + 1
    return day > 0 && day <= daysInMonth ? day : null
  })
  const recordsByDay = new Map<number, ExperienceRecord[]>()
  records.forEach(record => {
    const date = parseRecordDate(record.createdAt)
    if (date.getFullYear() !== month.getFullYear() || date.getMonth() !== month.getMonth()) return
    const items = recordsByDay.get(date.getDate()) || []
    items.push(record)
    recordsByDay.set(date.getDate(), items)
  })
  const moveMonth = (direction: -1 | 1) => {
    const next = availableMonths[currentMonthIndex + direction]
    if (!next) return
    setMonth(next)
    const nextRecord = records.find(record => {
      const date = parseRecordDate(record.createdAt)
      return date.getFullYear() === next.getFullYear() && date.getMonth() === next.getMonth()
    })
    if (nextRecord) setSelectedDay(recordDayKey(parseRecordDate(nextRecord.createdAt)))
  }
  return <div className="mt-5 overflow-hidden rounded-[22px] border border-[#dfe5ed] bg-white shadow-[0_5px_18px_rgba(35,45,62,.04)]">
    <div className="flex items-center justify-between px-3 py-3"><button type="button" aria-label="이전 달" disabled={!canGoPrevious} onClick={() => moveMonth(-1)} className="grid size-10 place-items-center rounded-full text-[#667284] disabled:opacity-20"><ChevronLeft size={18}/></button><strong className="text-[14px] font-semibold tracking-[-.02em] text-[#273142]">{month.getFullYear()}년 {month.getMonth() + 1}월</strong><button type="button" aria-label="다음 달" disabled={!canGoNext} onClick={() => moveMonth(1)} className="grid size-10 place-items-center rounded-full text-[#667284] disabled:opacity-20"><ChevronRight size={18}/></button></div>
    <div className="grid grid-cols-7 px-3 text-center text-[9px] font-medium text-[#9aa1ab]">{['일','월','화','수','목','금','토'].map(day => <span key={day} className="py-1">{day}</span>)}</div>
    <div className="grid grid-cols-7 gap-y-0.5 px-3 pb-3">{cells.map((day, index) => {
      if (!day) return <span key={`empty-${index}`} className="aspect-square"/>
      const dayRecords = recordsByDay.get(day) || []
      const dayKey = recordDayKey(new Date(month.getFullYear(), month.getMonth(), day))
      const isSelected = selectedDay === dayKey
      return <button type="button" key={day} disabled={!dayRecords.length} onClick={() => setSelectedDay(dayKey)} aria-label={dayRecords.length ? `${month.getMonth() + 1}월 ${day}일, 경험 ${dayRecords.length}개` : `${month.getMonth() + 1}월 ${day}일, 기록 없음`} className={`relative grid aspect-square place-items-center rounded-[12px] text-[11px] font-medium ${isSelected ? 'bg-[#172033] text-white' : dayRecords.length ? 'bg-[#f4f7fb] text-[#273142]' : 'text-[#b0b6bf]'}`}><span>{day}</span>{dayRecords.length > 0 && <span aria-hidden className={`absolute bottom-1.5 h-0.5 w-3 rounded-full ${isSelected ? 'bg-white/75' : 'bg-[#8396b3]'}`}/>}</button>
    })}</div>
    <SelectedDayRecords records={selectedRecords}/>
  </div>
}

function SelectedDayRecords({ records }: { records: ExperienceRecord[] }) {
  if (!records.length) return null
  return <section className="border-t border-[#e9edf2] bg-[#fafbfd]" aria-label={`${formatDate(records[0].createdAt)} 경험 기록`}><div className="flex items-center justify-between px-4 py-3"><h3 className="text-[12px] font-semibold text-[#3e4959]">{formatDate(records[0].createdAt)}</h3><span className="text-[10px] font-medium text-[#8b939e]">{records.length}개 기록</span></div><div className="divide-y divide-[#e9edf2]">{records.map(record => <CalendarRecordDetail key={record.id} record={record}/>)}</div></section>
}

function CalendarRecordDetail({ record }: { record: ExperienceRecord }) {
  const target = experienceRecordHref(record)
  const targetLabel = record.sessionId ? '이때의 루틴 보기' : '제품 정보 보기'
  return <ExperienceRecordItem record={record} href={target} actionLabel={target ? targetLabel : undefined} className="px-4"/>
}

function parseRecordDate(value: string) {
  const normalized = /Z$|[+-]\d\d:\d\d$/.test(value) ? value : `${value.replace(' ', 'T')}Z`
  const date = new Date(normalized)
  return Number.isNaN(date.getTime()) ? new Date() : date
}

function recordDayKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
}

export function PatternPage() {
  const { id } = useParams()
  const patternId = Number(id)
  const navigate = useNavigate()
  const pattern = useQuery({ queryKey: ['pattern', patternId], queryFn: () => api.pattern(patternId), enabled: Number.isSafeInteger(patternId) && patternId > 0 })

  if (!Number.isSafeInteger(patternId) || patternId < 1) return <Screen nav={false}><TopBar title="내 패턴" back/><ErrorState message="패턴 주소를 확인해주세요."/></Screen>
  if (pattern.isPending) return <Screen nav={false}><TopBar title="내 패턴" back/><Loading variant="detail" label="패턴을 정리하는 중"/></Screen>
  if (pattern.isError) return <Screen nav={false}><TopBar title="내 패턴" back/><ErrorState message={pattern.error.message} onRetry={() => pattern.refetch()}/></Screen>

  const data = pattern.data
  const openPatternChat = () => navigate(startChatPath('PATTERN', `“${data.title}” 패턴을 지지하는 기록과 반대하는 기록을 함께 설명해줘.`))
  return <Screen nav={false} className="pb-28">
    <TopBar title="내 패턴" back/>
    <div className="px-5 py-7"><AiBadge/><PageHeading className="mt-4" title={data.title} description={data.summary}/><div className="mt-5 flex gap-2"><span className="rounded-full bg-[#ecf5d5] px-3 py-1.5 text-xs font-medium">지지 {data.supportingCount}</span><span className="rounded-full bg-[#f6eaea] px-3 py-1.5 text-xs font-medium">반대 {data.contradictingCount}</span></div><p className="mt-3 text-xs leading-5 text-muted">{data.confidenceNote}</p>
      <section className="mt-9"><h2 className="text-lg font-semibold">연결된 경험</h2><div className="mt-3 divide-y divide-[#e3e7ed] border-y border-[#e3e7ed]">{data.evidence.map(item => <Link key={item.recordId} to="/records?view=history" className="block px-1 py-4 transition active:bg-[#f5f7fa]"><div className="flex items-start justify-between gap-3"><span className="flex min-w-0 flex-wrap items-center gap-1">{isExperienceSentiment(item.sentiment) && <ExperienceStatusBadge status={item.sentiment}/>}<span className={`inline-flex h-6 items-center rounded-[6px] px-2 text-[10px] font-semibold ${item.polarity === 'SUPPORTS' ? 'bg-[#edf2e8] text-[#536548]' : 'bg-[#f2eeea] text-[#736156]'}`}>{item.polarity === 'SUPPORTS' ? '같은 흐름' : '다른 흐름'}</span></span><span className="shrink-0 pt-1 text-[10px] font-medium text-muted">{formatDate(item.createdAt)}</span></div><div className="mt-2.5 flex items-center gap-2"><h3 className="min-w-0 flex-1 truncate text-[14px] font-semibold">{item.productName}</h3><ChevronRight size={15} className="shrink-0 text-[#8994a3]"/></div><p className="mt-1.5 whitespace-pre-wrap text-[12px] font-medium leading-5 text-muted">{item.note || '선택한 내용만 기록했어요.'}</p></Link>)}</div></section>
      <div className="mt-7 rounded-2xl bg-soft p-4 text-xs leading-5 text-muted">이 패턴은 피부 타입이나 성분 효과 판정이 아니에요. 내가 남긴 경험 사이의 반복과 차이를 보여줍니다.</div>
    </div>
    <StickyActionBar><Button onClick={openPatternChat} className="w-full">이 패턴을 AI와 살펴보기</Button></StickyActionBar>
  </Screen>
}

function formatDate(value: string) {
  const normalized = /Z$|[+-]\d\d:\d\d$/.test(value) ? value : `${value.replace(' ', 'T')}Z`
  const date = new Date(normalized)
  return Number.isNaN(date.getTime()) ? value.slice(0, 10) : new Intl.DateTimeFormat('ko-KR', { month: 'long', day: 'numeric' }).format(date)
}
