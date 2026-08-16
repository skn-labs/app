import { useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight, ChevronRight, MessageCircle, Plus, Sparkles } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { api, ApiError } from '../lib/api'
import { startChatPath } from '../lib/chat'
import type { Routine } from '../lib/types'
import { BrandIdentity } from '../components/BrandIdentity'
import { AppHeader, ErrorState, FloatingAddButton, Loading, Screen } from '../components/ui'
import routineCard1 from '../assets/figma/routine-card-1.webp'
import routineCard2 from '../assets/figma/routine-card-2.webp'
import routineCard3 from '../assets/figma/routine-card-3.webp'

const routineCards = [routineCard1, routineCard2, routineCard3]
const routineCardTones = [
  'linear-gradient(145deg, #edf5ff 0%, #f9fbff 54%, #e5efff 100%)',
  'linear-gradient(145deg, #f0efff 0%, #fbfaff 54%, #e8e6ff 100%)',
  'linear-gradient(145deg, #fff0f3 0%, #fffafa 54%, #f8e7ec 100%)',
]

type RoutineCarouselEntry =
  | { kind: 'routine'; key: string; routine: Routine; image: string; tone: string }
  | { kind: 'create'; key: string; image: string; description: string }

function dayPartLabel(dayPart: Routine['dayPart']) { return dayPart === 'MORNING' ? '아침' : dayPart === 'EVENING' ? '저녁' : '아무때나' }
function timeSlotLabel(timeSlot: Routine['items'][number]['timeSlot']) { return timeSlot === 'MORNING' ? '아침' : timeSlot === 'EVENING' ? '저녁' : '아침·저녁' }
function formatDate(value: string) { const normalized = /Z$|[+-]\d\d:\d\d$/.test(value) ? value : `${value.replace(' ', 'T')}Z`; const date = new Date(normalized); return Number.isNaN(date.getTime()) ? value.slice(0, 10) : new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' }).format(date) }
function isNotFound(error: unknown) { return error instanceof ApiError && error.status === 404 }
function statusLabel(routine: Routine, current?: Routine) { return routine.id === current?.id ? '현재 사용 중' : '비교 기준 루틴' }

export function RoutineListPage() {
  const auth = useQuery({ queryKey: ['auth'], queryFn: api.me })
  const current = useQuery({ queryKey: ['current-routine'], queryFn: api.currentRoutine, retry: false })
  const baseline = useQuery({ queryKey: ['baseline-routine'], queryFn: api.baselineRoutine, retry: false })
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const [dragging, setDragging] = useState(false)
  const carousel = useRef<HTMLDivElement>(null)
  const drag = useRef<{ pointerId: number; startX: number; scrollLeft: number; startIndex: number; moved: boolean } | null>(null)
  const suppressClick = useRef(false)

  if (current.isPending || baseline.isPending || auth.isPending) return <Screen><AppHeader/><Loading/></Screen>
  const loadError = auth.error || (current.error && !isNotFound(current.error) ? current.error : null) || (baseline.error && !isNotFound(baseline.error) ? baseline.error : null)
  if (loadError) return <Screen><AppHeader/><ErrorState message={loadError.message} onRetry={() => { auth.refetch(); current.refetch(); baseline.refetch() }}/></Screen>

  const loaded = [current.data, baseline.data].filter((value): value is Routine => Boolean(value))
  const routines = loaded.filter((routine, index) => loaded.findIndex(item => item.id === routine.id) === index)
  const createDescriptions = [
    '제품과 순서, 사용하는 시간을 정해 새 조합을 시작해보세요.',
    '아침과 저녁처럼 다른 사용 맥락도 별도의 루틴으로 남길 수 있어요.',
    '첫 루틴을 만들면 사용 경험과 다음 회고가 이곳에서 이어져요.',
  ]
  const createCard = (index: number, position: 'before' | 'after' | 'empty'): RoutineCarouselEntry => ({
    kind: 'create',
    key: `create-${position}-${index}`,
    image: routineCards[(routines.length + index) % routineCards.length],
    description: createDescriptions[(routines.length + index) % createDescriptions.length],
  })
  const cards: RoutineCarouselEntry[] = routines.length
    ? [createCard(0, 'before'), ...routines.map((routine, index) => ({ kind: 'routine' as const, key: `routine-${routine.id}`, routine, image: routineCards[index % routineCards.length], tone: routineCardTones[index % routineCardTones.length] })), createCard(1, 'after')]
    : [createCard(0, 'empty'), createCard(1, 'empty'), createCard(2, 'empty')]
  const activeCard = cards[activeIndex]
  const closestCardIndex = (element: HTMLDivElement) => {
    const cards = Array.from(element.querySelectorAll<HTMLElement>('[data-routine-card]'))
    if (!cards.length) return 0
    const center = element.scrollLeft + element.clientWidth / 2
    return cards.reduce((best, card, index) => Math.abs(card.offsetLeft + card.offsetWidth / 2 - center) < best.distance ? { index, distance: Math.abs(card.offsetLeft + card.offsetWidth / 2 - center) } : best, { index: 0, distance: Number.POSITIVE_INFINITY }).index
  }
  const handleScroll = (element: HTMLDivElement) => {
    if (drag.current?.moved) return
    const nextIndex = closestCardIndex(element)
    if (nextIndex === activeIndex) return
    setActiveIndex(nextIndex)
    setExpandedId(null)
  }
  const showCard = (index: number) => {
    const element = carousel.current
    const nextIndex = Math.max(0, Math.min(cards.length - 1, index))
    const card = element?.querySelectorAll<HTMLElement>('[data-routine-card]')[nextIndex]
    if (!element || !card) return
    element.scrollTo({ left: card.offsetLeft - (element.clientWidth - card.offsetWidth) / 2, behavior: 'smooth' })
    setActiveIndex(nextIndex)
    setExpandedId(null)
  }

  return <Screen className="bg-white">
    <AppHeader/>
    <div className="px-5 pt-5">
      <div className="min-w-0"><p className="text-[11px] font-semibold tracking-[.14em] text-[#71809a]">MY ROUTINE ARCHIVE</p><h1 className="mt-2 text-[clamp(34px,9vw,40px)] font-semibold leading-[1.08] tracking-[-.052em] text-[#111722]">{auth.data?.displayName} 님의<br/>루틴</h1><p className="mt-3 text-[13px] font-medium leading-5 tracking-[-.018em] text-[#7a808a]">{routines.length ? `저장된 사용 맥락 ${routines.length}개를 옆으로 넘겨보세요.` : '카드를 넘겨 첫 루틴을 만들어보세요.'}</p></div>
    </div>

    <section className="relative mt-6" aria-label="나의 루틴 카드">
      <div
        ref={element => {
          carousel.current = element
          if (element && element.dataset.initialized !== 'true') {
            element.dataset.initialized = 'true'
            requestAnimationFrame(() => {
              const initialIndex = routines.length ? 1 : 0
              const card = element.querySelectorAll<HTMLElement>('[data-routine-card]')[initialIndex]
              if (!card) return
              element.scrollLeft = card.offsetLeft - (element.clientWidth - card.offsetWidth) / 2
              setActiveIndex(initialIndex)
            })
          }
        }}
        onDragStart={event => event.preventDefault()}
        tabIndex={0}
        role="region"
        aria-roledescription="캐러셀"
        aria-label="루틴 카드. 좌우로 스와이프하거나 방향키로 이동할 수 있어요."
        onScroll={event => handleScroll(event.currentTarget)}
        onKeyDown={event => {
          if (event.key === 'ArrowLeft') { event.preventDefault(); showCard(activeIndex - 1) }
          if (event.key === 'ArrowRight') { event.preventDefault(); showCard(activeIndex + 1) }
          if (event.key === 'Escape') setExpandedId(null)
        }}
        onPointerDown={event => {
          if (event.pointerType !== 'mouse' || event.button !== 0) return
          drag.current = { pointerId: event.pointerId, startX: event.clientX, scrollLeft: event.currentTarget.scrollLeft, startIndex: closestCardIndex(event.currentTarget), moved: false }
          suppressClick.current = false
        }}
        onPointerMove={event => {
          if (!drag.current || drag.current.pointerId !== event.pointerId) return
          const delta = event.clientX - drag.current.startX
          if (!drag.current.moved && Math.abs(delta) < 7) return
          if (!drag.current.moved) {
            drag.current.moved = true
            suppressClick.current = true
            event.currentTarget.setPointerCapture(event.pointerId)
            setDragging(true)
          }
          event.preventDefault()
          event.currentTarget.scrollLeft = drag.current.scrollLeft - delta * 1.08
        }}
        onPointerUp={event => {
          if (!drag.current || drag.current.pointerId !== event.pointerId) return
          const state = drag.current
          if (!state.moved) {
            drag.current = null
            return
          }
          const delta = event.clientX - state.startX
          let nextIndex = closestCardIndex(event.currentTarget)
          if (Math.abs(delta) >= 36 && nextIndex === state.startIndex) nextIndex = state.startIndex + (delta < 0 ? 1 : -1)
          drag.current = null
          setDragging(false)
          if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
          showCard(nextIndex)
          if (suppressClick.current) window.setTimeout(() => { suppressClick.current = false }, 0)
        }}
        onPointerLeave={() => {
          if (drag.current && !drag.current.moved) drag.current = null
        }}
        onPointerCancel={event => {
          drag.current = null
          suppressClick.current = false
          setDragging(false)
          if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
        }}
        onLostPointerCapture={() => { if (drag.current) { drag.current = null; setDragging(false) } }}
        onClickCapture={event => {
          if (!suppressClick.current) return
          event.preventDefault()
          event.stopPropagation()
          suppressClick.current = false
        }}
        className={`hide-scrollbar flex select-none snap-x snap-mandatory gap-4 overflow-x-auto overscroll-x-contain px-[calc((100%_-_272px)/2)] py-5 [perspective:1200px] [-webkit-overflow-scrolling:touch] [touch-action:pan-x_pan-y] outline-none ${dragging ? 'cursor-grabbing snap-none' : 'cursor-grab'}`}
      >
        {cards.map((card, index) => {
          return <div key={card.key} data-routine-card aria-current={index === activeIndex ? 'true' : undefined} className="relative flex h-[378px] w-[272px] shrink-0 snap-center items-center justify-center [scroll-snap-stop:always]">
            {card.kind === 'routine'
              ? <RoutineCarouselCard routine={card.routine} current={current.data} image={card.image} tone={card.tone} expanded={expandedId === card.routine.id} onExpand={() => setExpandedId(card.routine.id)} onCollapse={() => setExpandedId(null)}/>
              : <CreateRoutineCard image={card.image} description={card.description}/>}
          </div>
        })}
      </div>
      <div className="mt-1 flex justify-center gap-1.5" aria-hidden>{cards.map((card, index) => <span key={card.key} className={`block rounded-full transition-all duration-300 ${index === activeIndex ? 'h-1.5 w-6 bg-[#172033]' : 'size-1.5 bg-[#ccd2dc]'}`}/>)}</div>
      <p aria-live="polite" className="mx-auto mt-3 max-w-[320px] px-5 text-center text-[12px] font-medium leading-5 tracking-[-.01em] text-[#858b96]">{activeCard?.kind === 'create' ? '옆으로 밀어 다른 카드를 보고, 이 카드를 누르면 새 루틴을 만들어요.' : expandedId ? '뒷면에서 사용 맥락을 확인했어요. 상세 보기로 전체 순서를 이어보세요.' : '옆으로 밀어 탐색하고, 카드를 누르면 사용 맥락이 펼쳐져요.'}</p>
    </section>
    <FloatingAddButton label="새 루틴 만들기" to="/routine/edit"/>
  </Screen>
}

function CreateRoutineCard({ image, description }: { image: string; description: string }) {
  return <Link to="/routine/edit" aria-label="새 루틴 만들기" className="group relative h-[354px] w-full shrink-0 overflow-hidden rounded-[26px] text-left shadow-[0_12px_34px_rgba(28,38,56,.14)] transition active:scale-[.99]">
    <img src={image} alt="" aria-hidden className="absolute inset-0 size-full scale-105 object-cover opacity-45 saturate-50 transition duration-500 group-hover:scale-100"/>
    <div aria-hidden className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,.88)_0%,rgba(255,255,255,.62)_45%,rgba(241,247,239,.96)_100%)]"/>
    <div className="relative flex h-full flex-col p-6">
      <span className="w-fit rounded-full border border-black/5 bg-white/78 px-3 py-1.5 text-[11px] font-semibold tracking-[.02em] text-black/50 backdrop-blur">EMPTY ROUTINE</span>
      <div className="my-auto"><span className="grid size-11 place-items-center rounded-full bg-white text-[#172033] shadow-[0_6px_18px_rgba(0,0,0,.10)]"><Plus size={20}/></span><h2 className="mt-5 text-[27px] font-semibold leading-[1.08] tracking-[-.05em] text-[#121823]">새 루틴을<br/>만들어보세요</h2><p className="mt-4 max-w-[205px] text-[13px] font-medium leading-5 tracking-[-.015em] text-black/52">{description}</p></div>
      <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#172033]">새 조합 시작하기 <ArrowRight size={15}/></span>
    </div>
  </Link>
}

function RoutineCarouselCard({ routine, current, image, tone, expanded, onExpand, onCollapse }: { routine: Routine; current?: Routine; image: string; tone: string; expanded: boolean; onExpand: () => void; onCollapse: () => void }) {
  const faceStyle = { backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' } as const
  return <div className="relative h-[354px] w-full [perspective:1200px]">
    <div className={`relative size-full transition-transform duration-500 [transform-style:preserve-3d] motion-reduce:transition-none ${expanded ? '[transform:rotateY(180deg)]' : ''}`}>
      <button type="button" onClick={onExpand} tabIndex={expanded ? -1 : 0} aria-expanded={expanded} aria-label={`${routine.name} 사용 맥락 펼치기`} className={`absolute inset-0 overflow-hidden rounded-[26px] text-left shadow-[0_14px_38px_rgba(26,36,55,.18)] transition active:scale-[.99] ${expanded ? 'pointer-events-none' : ''}`} style={faceStyle}>
        <img src={image} alt="" aria-hidden className="absolute inset-0 size-full object-cover"/>
        <div aria-hidden className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,.82)_0%,rgba(255,255,255,.12)_46%,rgba(16,25,40,.18)_100%)]"/>
        <div className="absolute inset-x-5 top-5 flex items-center justify-between gap-2"><span className="rounded-full border border-white/55 bg-white/62 px-3 py-1.5 text-[11px] font-semibold tracking-[.015em] text-[#283346] backdrop-blur-md">{statusLabel(routine, current)}</span><span className="text-[10px] font-semibold tracking-[.08em] text-black/45">TAP TO OPEN</span></div>
        <div className="absolute inset-x-5 bottom-6"><p className="text-[12px] font-semibold tracking-[.02em] text-black/55">{dayPartLabel(routine.dayPart)} · {routine.items.length}개 제품</p><h2 className="mt-2 text-[29px] font-semibold leading-[1.06] tracking-[-.052em] text-[#111722]">{routine.name}</h2><p className="mt-3 text-[12px] font-medium tracking-[-.01em] text-black/58">{formatDate(routine.startedAt)} 시작</p></div>
      </button>

      <article aria-hidden={!expanded} onClick={onCollapse} className={`absolute inset-0 overflow-hidden rounded-[26px] p-6 text-center shadow-[0_14px_38px_rgba(26,36,55,.18)] [transform:rotateY(180deg)] ${expanded ? 'pointer-events-auto' : 'pointer-events-none'}`} style={{ ...faceStyle, background: tone }}>
        <p className="text-[10px] font-semibold tracking-[.13em] text-[#778296]">ROUTINE RESEARCH NOTE</p>
        <h2 className="mx-auto mt-4 line-clamp-2 max-w-[220px] text-[24px] font-semibold leading-[1.12] tracking-[-.045em] text-[#111722]">{routine.name}</h2>
        <dl className="mt-7 space-y-2 text-left text-[12px] font-medium leading-5 tracking-[-.012em] text-[#4e596b]"><div className="grid grid-cols-[70px_1fr] gap-2"><dt className="text-[#8a93a2]">사용 맥락</dt><dd>{dayPartLabel(routine.dayPart)} 루틴</dd></div><div className="grid grid-cols-[70px_1fr] gap-2"><dt className="text-[#8a93a2]">제품 구성</dt><dd>{routine.items.length}개 제품</dd></div><div className="grid grid-cols-[70px_1fr] gap-2"><dt className="text-[#8a93a2]">사용 시작</dt><dd>{formatDate(routine.startedAt)}</dd></div></dl>
        <p className="mt-4 line-clamp-2 text-left text-[11px] font-medium leading-[1.6] tracking-[-.01em] text-[#7f8999]">{routine.items.map(item => item.productName).join(' · ')}</p>
        <Link to={`/routines/${routine.id}`} tabIndex={expanded ? 0 : -1} onClick={event => event.stopPropagation()} className="absolute inset-x-6 bottom-6 flex h-11 items-center justify-center rounded-full bg-[#111722] text-[13px] font-semibold text-white shadow-[0_8px_20px_rgba(17,23,34,.18)] transition active:scale-[.98]">상세 보기</Link>
      </article>
    </div>
  </div>
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
    <div className="px-5 pb-16 pt-5">
      <section className="relative overflow-hidden rounded-[30px] bg-[linear-gradient(145deg,#eef4ff_0%,#fbfcff_54%,#edf4e8_100%)] px-6 pb-6 pt-5 shadow-[0_16px_42px_rgba(44,61,92,.12)]" aria-labelledby="routine-detail-title">
        <div aria-hidden className="absolute -right-16 -top-20 size-52 rounded-full border border-white/70 bg-white/34 shadow-[inset_0_0_38px_rgba(255,255,255,.72)]"/>
        <div className="relative flex items-center justify-between gap-3"><span className="rounded-full border border-white/80 bg-white/62 px-3 py-1.5 text-[11px] font-semibold tracking-[.02em] text-[#52627d] backdrop-blur">{statusLabel(routine, current.data)}</span>{isCurrent && <Link to="/routine/edit" className="rounded-full px-3 py-2 text-[12px] font-semibold text-[#53627a] transition active:bg-white/70">루틴 편집</Link>}</div>
        <div className="relative mt-8"><p className="text-[10px] font-semibold tracking-[.14em] text-[#77859c]">ROUTINE PROFILE</p><h1 id="routine-detail-title" className="mt-2 text-[clamp(32px,8.8vw,38px)] font-semibold leading-[1.08] tracking-[-.052em] text-[#111722]">{routine.name}</h1><p className="mt-3 text-[13px] font-medium tracking-[-.012em] text-[#6f7a8c]">{formatDate(routine.startedAt)}부터 사용</p></div>
        <dl className="relative mt-8 grid grid-cols-3 divide-x divide-[#cfd9e8]/75 rounded-[18px] border border-white/75 bg-white/48 py-3.5 text-center backdrop-blur-sm"><div><dt className="text-[10px] font-medium text-[#8993a2]">사용 시점</dt><dd className="mt-1 text-[13px] font-semibold text-[#253047]">{dayPartLabel(routine.dayPart)}</dd></div><div><dt className="text-[10px] font-medium text-[#8993a2]">제품 구성</dt><dd className="mt-1 text-[13px] font-semibold text-[#253047]">{routine.items.length}개</dd></div><div><dt className="text-[10px] font-medium text-[#8993a2]">기록 상태</dt><dd className="mt-1 text-[13px] font-semibold text-[#253047]">{isCurrent ? '연결 중' : '비교 기준'}</dd></div></dl>
      </section>

      <section className="mt-8 rounded-[24px] border border-[#e7ebf1] bg-[#fbfcfe] px-5 py-6" aria-labelledby="routine-analysis-title">
        <p className="flex items-center gap-1.5 text-[10px] font-semibold tracking-[.13em] text-[#78869d]"><Sparkles size={14} strokeWidth={1.8}/>RESEARCH CONTEXT</p>
        <h2 id="routine-analysis-title" className="mt-4 text-[23px] font-semibold leading-[1.28] tracking-[-.04em] text-[#171d29]">{isCurrent ? '현재 루틴의 경험을 연결하고 있어요' : '변화를 비교하는 기준 루틴이에요'}</h2>
        <p className="mt-3 text-[13px] font-medium leading-6 tracking-[-.015em] text-[#626b78]">{analysis}</p>
      </section>

      <section className="mt-9" aria-labelledby="routine-order-title">
        <p className="text-[10px] font-semibold tracking-[.14em] text-[#7b8799]">ROUTINE ORDER</p>
        <div className="mt-2 flex items-end justify-between gap-4"><h2 id="routine-order-title" className="text-[26px] font-semibold tracking-[-.045em] text-[#141a25]">바르는 순서</h2><p className="pb-1 text-[11px] font-medium text-[#9299a4]">제품을 눌러 상세 확인</p></div>
        <div className="relative mt-5 space-y-3">
          <div aria-hidden className="absolute bottom-9 left-[15px] top-9 w-px bg-[#d8dee8]"/>
          {routine.items.map((item, index) => <div key={item.userProductId} className="relative flex items-center gap-3">
            <span className="z-10 grid size-[31px] shrink-0 place-items-center rounded-full border-[3px] border-white bg-[#172033] text-[11px] font-semibold text-white shadow-[0_3px_10px_rgba(23,32,51,.16)]">{index + 1}</span>
            <Link to={`/my-products/${item.userProductId}`} aria-label={`${index + 1}번째 제품 ${item.productName} 상세 보기`} className="interactive-card flex min-h-[92px] flex-1 items-center justify-between rounded-[20px] border border-[#e9ecf1] bg-white px-4 py-3.5 shadow-[0_7px_22px_rgba(32,43,64,.06)]"><div className="min-w-0"><p className="truncate text-[15px] font-semibold tracking-[-.025em] text-[#171d29]">{item.productName}</p><span className="mt-1 flex min-w-0 items-center gap-1.5"><BrandIdentity name={item.brand} logoUrl={item.brandLogoUrl} size="xs" className="min-w-0"/><span className="shrink-0 text-[11px] text-[#858d99]">· {item.category}</span></span><div className="mt-2 flex flex-wrap gap-1.5"><span className="rounded-full bg-[#eef3fb] px-2 py-1 text-[10px] font-semibold text-[#61708a]">{timeSlotLabel(item.timeSlot)}</span><span className="rounded-full bg-[#f1f5ed] px-2 py-1 text-[10px] font-semibold text-[#68735b]">{item.frequency}</span></div></div><ChevronRight size={18} className="ml-2 shrink-0 text-[#8b94a2]"/></Link>
          </div>)}
        </div>
      </section>
    </div>

    <div className="pointer-events-none fixed inset-x-0 bottom-28 z-20 mx-auto flex max-w-[430px] justify-end px-5"><Link to={startChatPath('GENERAL', `${routine.name} 루틴의 제품 순서와 지금까지 남긴 경험을 함께 살펴봐줘.`)} aria-label="이 루틴에 대해 AI에게 질문하기" className="pointer-events-auto grid size-14 place-items-center rounded-full bg-[#0a0a0a] text-white shadow-[0_8px_24px_rgba(0,0,0,.22)] transition hover:bg-black active:scale-95"><MessageCircle size={25}/></Link></div>
  </Screen>
}
