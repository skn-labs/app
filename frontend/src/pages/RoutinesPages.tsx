import { useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChevronRight, FlaskConical, MessageCircle, Plus, Sparkles } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { api, ApiError } from '../lib/api'
import { startChatPath } from '../lib/chat'
import type { Routine } from '../lib/types'
import { AppHeader, ErrorState, Loading, Screen } from '../components/ui'
import routineCard1 from '../assets/figma/routine-card-1.webp'
import routineCard2 from '../assets/figma/routine-card-2.webp'
import routineCard3 from '../assets/figma/routine-card-3.webp'

const routineCards = [routineCard1, routineCard2, routineCard3]

function dayPartLabel(dayPart: Routine['dayPart']) { return dayPart === 'MORNING' ? '아침' : dayPart === 'EVENING' ? '저녁' : '아무때나' }
function formatDate(value: string) { const normalized = /Z$|[+-]\d\d:\d\d$/.test(value) ? value : `${value.replace(' ', 'T')}Z`; const date = new Date(normalized); return Number.isNaN(date.getTime()) ? value.slice(0, 10) : new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' }).format(date) }
function isNotFound(error: unknown) { return error instanceof ApiError && error.status === 404 }
function statusLabel(routine: Routine, current?: Routine) { return routine.id === current?.id ? '현재 사용 중' : '비교 기준 루틴' }

export function RoutineListPage() {
  const auth = useQuery({ queryKey: ['auth'], queryFn: api.me })
  const current = useQuery({ queryKey: ['current-routine'], queryFn: api.currentRoutine, retry: false })
  const baseline = useQuery({ queryKey: ['baseline-routine'], queryFn: api.baselineRoutine, retry: false })
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const carousel = useRef<HTMLDivElement>(null)

  if (current.isPending || baseline.isPending || auth.isPending) return <Screen><AppHeader/><Loading/></Screen>
  const loadError = auth.error || (current.error && !isNotFound(current.error) ? current.error : null) || (baseline.error && !isNotFound(baseline.error) ? baseline.error : null)
  if (loadError) return <Screen><AppHeader/><ErrorState message={loadError.message} onRetry={() => { auth.refetch(); current.refetch(); baseline.refetch() }}/></Screen>

  const loaded = [current.data, baseline.data].filter((value): value is Routine => Boolean(value))
  const routines = loaded.filter((routine, index) => loaded.findIndex(item => item.id === routine.id) === index)
  const handleScroll = (element: HTMLDivElement) => {
    const cards = Array.from(element.querySelectorAll<HTMLElement>('[data-routine-card]'))
    if (!cards.length) return
    const center = element.scrollLeft + element.clientWidth / 2
    const closest = cards.reduce((best, card, index) => Math.abs(card.offsetLeft + card.offsetWidth / 2 - center) < best.distance ? { index, distance: Math.abs(card.offsetLeft + card.offsetWidth / 2 - center) } : best, { index: 0, distance: Number.POSITIVE_INFINITY })
    setActiveIndex(closest.index)
  }
  const showCard = (index: number) => {
    const element = carousel.current
    const card = element?.querySelectorAll<HTMLElement>('[data-routine-card]')[index]
    if (!element || !card) return
    element.scrollTo({ left: card.offsetLeft - (element.clientWidth - card.offsetWidth) / 2, behavior: 'smooth' })
    setActiveIndex(index)
  }

  return <Screen className="bg-white">
    <AppHeader/>
    <div className="px-5 pt-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0"><h1 className="break-words text-[clamp(30px,9vw,36px)] font-medium leading-[1.08] tracking-[-.045em]">{auth.data?.displayName} 님의 루틴</h1><p className="mt-3 text-[14px] text-[#8e8e93]">현재·비교 기준 루틴 {routines.length}개</p></div>
        <Link to="/routine/edit" aria-label="새 루틴 만들기" className="mt-1 grid size-12 shrink-0 place-items-center rounded-full bg-white shadow-[0_5px_18px_rgba(0,0,0,.12)] transition active:scale-95"><Plus size={23} strokeWidth={1.8}/></Link>
      </div>
    </div>

    {routines.length === 0 ? <EmptyRoutineList/>
      : <section className="mt-10" aria-label="나의 루틴 카드">
        <div ref={carousel} onScroll={event => handleScroll(event.currentTarget)} className="hide-scrollbar flex snap-x snap-mandatory gap-4 overflow-x-auto px-[calc((100%_-_260px)/2)] pb-5">
          {routines.map((routine, index) => <RoutineCarouselCard key={routine.id} routine={routine} current={current.data} image={routineCards[index % routineCards.length]} expanded={expandedId === routine.id} onExpand={() => setExpandedId(routine.id)} onCollapse={() => setExpandedId(null)}/>) }
        </div>
        <div className="mt-2 flex justify-center gap-1" aria-label={`${routines.length}개 카드 중 ${activeIndex + 1}번째`}>{routines.map((routine, index) => <button type="button" key={routine.id} onClick={() => showCard(index)} aria-label={`${index + 1}번째 루틴 보기`} aria-current={index === activeIndex ? 'true' : undefined} className="grid size-7 place-items-center rounded-full"><span className={`block rounded-full transition-all ${index === activeIndex ? 'h-2 w-5 bg-[#0a0a0a]' : 'size-2 bg-[#d1d1d6]'}`}/></button>)}</div>
        <p aria-live="polite" className="mt-3 px-5 text-center text-[11px] text-[#8e8e93]">{expandedId ? '제품 구성과 상태를 확인했어요. 세부 화면에서 전체 순서를 볼 수 있어요.' : '카드를 누르면 루틴 요약을 먼저 보여드려요.'}</p>
      </section>}
  </Screen>
}

function EmptyRoutineList() {
  return <div className="mx-5 mt-10 overflow-hidden rounded-[24px] border border-[#e5e5ea] bg-[#fafafa] px-6 py-10 text-center"><span className="mx-auto grid size-14 place-items-center rounded-full bg-white shadow-sm"><FlaskConical size={24}/></span><h2 className="mt-5 text-[19px] font-medium">아직 등록된 루틴이 없어요</h2><p className="mt-2 text-[13px] leading-5 text-[#8e8e93]">실제로 사용할 제품과 순서를 정하면<br/>새 버전의 루틴이 이곳에 쌓여요.</p><Link to="/routine/edit" className="mx-auto mt-6 flex h-12 w-fit items-center justify-center rounded-full bg-[#0a0a0a] px-7 text-[14px] font-semibold text-white transition active:scale-[.98]">첫 루틴 만들기</Link></div>
}

function RoutineCarouselCard({ routine, current, image, expanded, onExpand, onCollapse }: { routine: Routine; current?: Routine; image: string; expanded: boolean; onExpand: () => void; onCollapse: () => void }) {
  if (expanded) return <article data-routine-card className="relative h-[360px] w-[260px] shrink-0 snap-center overflow-hidden rounded-[22px] bg-[#f7fff2] p-5 text-center shadow-[0_8px_26px_rgba(0,0,0,.12)]">
    <button type="button" onClick={onCollapse} className="absolute right-3 top-3 rounded-full px-2.5 py-1 text-[10px] font-medium text-[#8e8e93] transition active:bg-white" aria-label="카드 이미지로 돌아가기">접기</button>
    <h2 className="mt-8 text-[25px] font-medium leading-tight tracking-[-.035em]">{routine.name}</h2>
    <dl className="mt-8 space-y-3 text-[13px] leading-5"><div><dt className="inline text-[#8e8e93]">사용 시점&nbsp; | &nbsp;</dt><dd className="inline font-medium">{dayPartLabel(routine.dayPart)}</dd></div><div><dt className="inline text-[#8e8e93]">제품 구성&nbsp; | &nbsp;</dt><dd className="inline font-medium">{routine.items.length}개 제품 조합</dd></div><div><dt className="inline text-[#8e8e93]">현재 상태&nbsp; | &nbsp;</dt><dd className="inline font-medium">{statusLabel(routine, current)}</dd></div></dl>
    <p className="mt-5 line-clamp-2 text-[11px] leading-5 text-[#a1a1a6]">{routine.items.map(item => item.productName).join(' · ')}</p>
    <Link to={`/routines/${routine.id}`} className="absolute inset-x-5 bottom-5 flex h-[52px] items-center justify-center rounded-full bg-[#0a0a0a] text-[15px] font-medium text-white transition active:scale-[.98]">세부 내용 보기</Link>
  </article>

  return <button data-routine-card type="button" onClick={onExpand} aria-expanded="false" aria-label={`${routine.name} 요약 보기`} className="relative h-[360px] w-[260px] shrink-0 snap-center overflow-hidden rounded-[22px] text-left shadow-[0_8px_26px_rgba(0,0,0,.12)] transition active:scale-[.99]">
    <img src={image} alt="" aria-hidden className="absolute inset-0 size-full object-cover"/>
    <div aria-hidden className="absolute inset-0 bg-gradient-to-b from-white/75 via-white/5 to-white/10"/>
    <div className="absolute left-4 top-5 flex max-w-[calc(100%-32px)] gap-1.5"><span className="rounded-full bg-white/55 px-3 py-2 text-[11px] font-medium backdrop-blur">{dayPartLabel(routine.dayPart)}</span><span className="rounded-full bg-white/55 px-3 py-2 text-[11px] font-medium backdrop-blur">{routine.items.length}개 제품</span></div>
    <div className="absolute inset-x-4 bottom-6"><p className="text-[13px] font-medium text-black/60">{statusLabel(routine, current)}</p><p className="mt-1 text-[27px] font-medium leading-[1.1] tracking-[-.04em]">{routine.name}</p><p className="mt-3 text-[14px] font-light">{formatDate(routine.startedAt)}</p></div>
  </button>
}

export function RoutineDetailPage() {
  const { id } = useParams(); const routineId = Number(id)
  const current = useQuery({ queryKey: ['current-routine'], queryFn: api.currentRoutine, retry: false })
  const baseline = useQuery({ queryKey: ['baseline-routine'], queryFn: api.baselineRoutine, retry: false })
  if (current.isPending || baseline.isPending) return <Screen><AppHeader/><Loading/></Screen>
  const loadError = (current.error && !isNotFound(current.error) ? current.error : null) || (baseline.error && !isNotFound(baseline.error) ? baseline.error : null)
  if (loadError) return <Screen><AppHeader/><ErrorState message={loadError.message} onRetry={() => { current.refetch(); baseline.refetch() }}/></Screen>
  const routine = [current.data, baseline.data].find(value => value?.id === routineId)
  const isCurrent = routine?.id === current.data?.id
  if (!routine) return <Screen><AppHeader/><ErrorState message="루틴을 찾을 수 없어요."/></Screen>

  const analysis = isCurrent
    ? `현재 실제로 사용하는 ${routine.items.length}개 제품 조합이에요. 경험 기록이 더 쌓이면 이 조합에서 반복된 만족과 아쉬움, 반대 기록을 함께 보여드려요.`
    : '불편함이 없었다고 남긴 마지막 비교 기준 루틴이에요. 이후 루틴의 변경점과 경험을 비교할 때만 참고해요.'

  return <Screen className="bg-white">
    <AppHeader back backTo="/routines"/>
    <div className="px-5 pb-12 pt-4">
      <div className="flex items-start justify-between gap-4"><div><h1 className="text-[38px] font-medium leading-tight tracking-[-.045em]">{routine.name}</h1><p className="mt-3 text-[15px] text-[#8e8e93]">{formatDate(routine.startedAt)}</p></div>{isCurrent && <Link to="/routine/edit" className="mt-2 shrink-0 border-b border-[#8e8e93] pb-0.5 text-[14px] text-[#636366]">편집</Link>}</div>

      <section className="mt-8 rounded-[24px] bg-[#f5fbed] px-5 py-6" aria-labelledby="routine-analysis-title">
        <h2 id="routine-analysis-title" className="flex items-center gap-2 text-[20px] font-medium"><Sparkles size={22} strokeWidth={1.7}/>경험 연결</h2>
        <p className="mt-7 text-[21px] font-medium leading-[1.4] tracking-[-.03em]">{isCurrent ? '현재 루틴의 경험을 연결하고 있어요' : '변화를 비교하는 기준 루틴이에요'}</p>
        <p className="mt-4 text-[13px] leading-6 text-[#4f534d]">{analysis}</p>

        <h3 className="mt-10 text-[16px] font-medium tracking-[.02em]">ROUTINE</h3>
        <div className="relative mt-4 space-y-4">
          <div aria-hidden className="absolute bottom-10 left-3 top-10 w-px bg-[#98a18f]"/>
          {routine.items.map((item, index) => <div key={item.userProductId} className="relative flex items-center gap-4">
            <span className="z-10 grid size-6 shrink-0 place-items-center rounded-full bg-[#0a0a0a] text-[11px] font-medium text-white">{index + 1}</span>
            <Link to="/my-products" className="flex min-h-[84px] flex-1 items-center justify-between rounded-[14px] bg-white/90 px-4 py-3 shadow-[0_4px_16px_rgba(40,55,35,.06)] transition active:scale-[.99]"><div className="min-w-0"><p className="truncate text-[15px] font-medium">{item.productName}</p><p className="mt-1.5 truncate text-[11px] text-[#636366]">{item.brand} · {item.category} · {item.frequency}</p></div><ChevronRight size={18} className="ml-2 shrink-0 text-[#636366]"/></Link>
          </div>)}
        </div>
      </section>

      <img src="/skn-assets/skn-wordmark.png" alt="SKN" className="mx-auto mt-12 h-12 w-auto object-contain"/>
    </div>

    <div className="pointer-events-none fixed inset-x-0 bottom-28 z-20 mx-auto flex max-w-[430px] justify-end px-5"><Link to={startChatPath('GENERAL', `${routine.name} 루틴의 제품 순서와 지금까지 남긴 경험을 함께 살펴봐줘.`)} aria-label="이 루틴에 대해 AI에게 질문하기" className="pointer-events-auto grid size-14 place-items-center rounded-full bg-[#0a0a0a] text-white shadow-[0_8px_24px_rgba(0,0,0,.22)] transition hover:bg-black active:scale-95"><MessageCircle size={25}/></Link></div>
  </Screen>
}
