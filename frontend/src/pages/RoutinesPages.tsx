import { useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight, BookOpen, ChevronRight, MessageCircle, PencilLine } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { api, ApiError } from '../lib/api'
import { startChatPath } from '../lib/chat'
import type { Routine } from '../lib/types'
import { ActionIcon } from '../components/ActionIcon'
import { BrandIdentity } from '../components/BrandIdentity'
import { AppHeader, ErrorState, FloatingAddButton, Loading, ProductGlyph, Screen, StaticProductImage } from '../components/ui'
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

function dayPartLabel(dayPart: Routine['dayPart']) { return dayPart === 'MORNING' ? '아침' : dayPart === 'EVENING' ? '저녁' : '아침·저녁' }
function timeSlotLabel(timeSlot: Routine['items'][number]['timeSlot']) { return timeSlot === 'MORNING' ? '아침' : timeSlot === 'EVENING' ? '저녁' : '아침·저녁' }
function formatDate(value: string) { const normalized = /Z$|[+-]\d\d:\d\d$/.test(value) ? value : `${value.replace(' ', 'T')}Z`; const date = new Date(normalized); return Number.isNaN(date.getTime()) ? value.slice(0, 10) : new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' }).format(date) }
function isNotFound(error: unknown) { return error instanceof ApiError && error.status === 404 }
function statusLabel(routine: Routine, current?: Routine) { return routine.id === current?.id ? '현재 사용 중' : '이전 루틴' }
function routineGlance(routine: Routine) {
  const first = routine.items[0]?.category
  const last = routine.items[routine.items.length - 1]?.category
  const flow = !first ? '' : first === last ? `${first} ${routine.items.length}개` : `${first}부터 ${last}까지`
  return [dayPartLabel(routine.dayPart), flow, `${routine.items.length}개 제품`].filter(Boolean).join(' · ')
}

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
    '아침과 저녁처럼 사용하는 시간이 다르면 별도 루틴으로 남길 수 있어요.',
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
      <div className="min-w-0"><p className="text-[11px] font-semibold tracking-[.14em] text-[#71809a]">MY ROUTINE ARCHIVE</p><h1 className="mt-2 text-[clamp(34px,9vw,40px)] font-semibold leading-[1.08] tracking-[-.052em] text-[#111722]">{auth.data?.displayName} 님의<br/>루틴</h1><p className="mt-3 text-[13px] font-medium leading-5 tracking-[-.018em] text-[#7a808a]">{routines.length ? `저장된 루틴 ${routines.length}개를 옆으로 넘겨보세요.` : '카드를 넘겨 첫 루틴을 만들어보세요.'}</p></div>
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
        className={`hide-scrollbar flex select-none snap-x snap-mandatory gap-4 overflow-x-auto overscroll-x-contain px-[calc((100%_-_272px)/2)] pb-12 pt-8 [perspective:1200px] [-webkit-overflow-scrolling:touch] [touch-action:pan-x_pan-y] outline-none ${dragging ? 'cursor-grabbing snap-none' : 'cursor-grab'}`}
      >
        {cards.map((card, index) => {
          const distance = Math.abs(index - activeIndex)
          const depth = distance === 0
            ? 'z-10 opacity-100 [transform:translateZ(34px)_scale(1.035)] [filter:saturate(1)]'
            : distance === 1
              ? 'z-0 opacity-65 [transform:translateZ(-52px)_scale(.91)] [filter:saturate(.72)]'
              : 'z-0 opacity-40 [transform:translateZ(-86px)_scale(.86)] [filter:saturate(.55)]'
          return <div key={card.key} data-routine-card aria-current={index === activeIndex ? 'true' : undefined} className={`relative flex h-[378px] w-[272px] shrink-0 snap-center items-center justify-center [scroll-snap-stop:always] transition-[transform,opacity,filter] duration-500 ease-out will-change-transform motion-reduce:transform-none motion-reduce:opacity-100 motion-reduce:filter-none ${depth}`}>
            {card.kind === 'routine'
              ? <RoutineCarouselCard routine={card.routine} current={current.data} image={card.image} tone={card.tone} expanded={expandedId === card.routine.id} onExpand={() => index === activeIndex ? setExpandedId(card.routine.id) : showCard(index)} onCollapse={() => setExpandedId(null)}/>
              : <CreateRoutineCard image={card.image} description={card.description}/>}
          </div>
        })}
      </div>
      <div className="mt-1 flex justify-center gap-1.5" aria-hidden>{cards.map((card, index) => <span key={card.key} className={`block rounded-full transition-all duration-300 ${index === activeIndex ? 'h-1.5 w-6 bg-[#172033]' : 'size-1.5 bg-[#ccd2dc]'}`}/>)}</div>
      <p aria-live="polite" className="mx-auto mt-3 max-w-[320px] px-5 text-center text-[12px] font-medium leading-5 tracking-[-.01em] text-[#858b96]">{activeCard?.kind === 'create' ? '옆으로 밀어 다른 카드를 보고, 이 카드를 누르면 새 루틴을 만들어요.' : expandedId ? '뒷면에서 이번 루틴의 도움을 확인했어요. 상세 보기에서 전체 순서를 볼 수 있어요.' : '옆으로 밀어 탐색하고, 카드를 누르면 AI가 정리한 한 문장이 펼쳐져요.'}</p>
    </section>
    <FloatingAddButton kind="routine" label="새 루틴 만들기" to="/routine/new"/>
  </Screen>
}

function CreateRoutineCard({ image, description }: { image: string; description: string }) {
  return <Link to="/routine/new" aria-label="새 루틴 만들기" className="group relative h-[354px] w-full shrink-0 overflow-hidden rounded-[26px] text-left shadow-[0_12px_34px_rgba(28,38,56,.14)] transition active:scale-[.99]">
    <img src={image} alt="" aria-hidden className="absolute inset-0 size-full scale-105 object-cover opacity-45 saturate-50 transition duration-500 group-hover:scale-100"/>
    <div aria-hidden className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,.88)_0%,rgba(255,255,255,.62)_45%,rgba(241,247,239,.96)_100%)]"/>
    <div className="relative flex h-full flex-col p-6">
      <span className="w-fit rounded-full border border-black/5 bg-white/78 px-3 py-1.5 text-[11px] font-semibold tracking-[.02em] text-black/50 backdrop-blur">EMPTY ROUTINE</span>
      <div className="my-auto"><span className="grid size-11 place-items-center rounded-[15px] bg-white text-[#172033] shadow-[0_6px_18px_rgba(0,0,0,.10)]"><ActionIcon name="routine-add" className="size-6"/></span><h2 className="mt-5 text-[27px] font-semibold leading-[1.08] tracking-[-.05em] text-[#121823]">새 루틴을<br/>만들어보세요</h2><p className="mt-4 max-w-[205px] text-[13px] font-medium leading-5 tracking-[-.015em] text-black/52">{description}</p></div>
      <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#172033]">새 조합 시작하기<ArrowRight size={15}/></span>
    </div>
  </Link>
}

function RoutineCarouselCard({ routine, current, image, tone, expanded, onExpand, onCollapse }: { routine: Routine; current?: Routine; image: string; tone: string; expanded: boolean; onExpand: () => void; onCollapse: () => void }) {
  const faceStyle = { backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' } as const
  const generatedInsight = useQuery({
    queryKey: ['routine-insight-v4', routine.id],
    queryFn: () => api.generateRoutineInsight(routine.id),
    retry: false,
    staleTime: Number.POSITIVE_INFINITY,
  })
  const insight = generatedInsight.data || routine.insight
  return <div className="relative h-[354px] w-full [perspective:1200px]">
    <div className={`relative size-full transition-transform duration-500 [transform-style:preserve-3d] motion-reduce:transition-none ${expanded ? '[transform:rotateY(180deg)]' : ''}`}>
      <button type="button" onClick={onExpand} tabIndex={expanded ? -1 : 0} aria-expanded={expanded} aria-label={`${routine.name} 루틴이 도와주는 것 보기`} className={`absolute inset-0 overflow-hidden rounded-[26px] text-left shadow-[0_14px_38px_rgba(26,36,55,.18)] transition active:scale-[.99] ${expanded ? 'pointer-events-none' : ''}`} style={faceStyle}>
        <img src={image} alt="" aria-hidden className="absolute inset-0 size-full object-cover"/>
        <div aria-hidden className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,.82)_0%,rgba(255,255,255,.12)_46%,rgba(16,25,40,.18)_100%)]"/>
        <div className="absolute inset-x-5 top-5 flex items-center justify-between gap-2"><span className="rounded-full border border-white/55 bg-white/62 px-3 py-1.5 text-[11px] font-semibold tracking-[.015em] text-[#283346] backdrop-blur-md">{statusLabel(routine, current)}</span><span className="text-[10px] font-semibold tracking-[-.01em] text-black/45">눌러 루틴 읽기</span></div>
        <div className="absolute inset-x-5 bottom-6"><p className="text-[12px] font-semibold tracking-[.02em] text-black/55">{dayPartLabel(routine.dayPart)} · {routine.items.length}개 제품</p><h2 className="mt-2 text-[29px] font-semibold leading-[1.06] tracking-[-.052em] text-[#111722]">{routine.name}</h2><p className="mt-3 text-[12px] font-medium tracking-[-.01em] text-black/58">{formatDate(routine.startedAt)} 시작</p></div>
      </button>

      <article aria-hidden={!expanded} onClick={onCollapse} className={`absolute inset-0 overflow-hidden rounded-[26px] p-5 text-left shadow-[0_14px_38px_rgba(26,36,55,.18)] [transform:rotateY(180deg)] ${expanded ? 'pointer-events-auto' : 'pointer-events-none'}`} style={{ ...faceStyle, background: tone }}>
        <RoutineLabPattern/>
        <div className="relative flex h-full flex-col">
          <div className="flex items-center justify-between gap-3"><span className="rounded-full border border-white/65 bg-white/62 px-3 py-1.5 text-[10px] font-semibold text-[#56647a] shadow-[0_3px_10px_rgba(43,57,81,.05)] backdrop-blur-md">{statusLabel(routine, current)}</span><span className="text-[10px] font-medium text-[#7e8a9c]">눌러 앞면 보기</span></div>
          {insight && <div className="mt-7 flex flex-wrap gap-1.5">{(insight.keywords || []).map(keyword => <span key={keyword} className="rounded-full border border-white/80 bg-white/58 px-2.5 py-1 text-[9px] font-semibold tracking-[-.01em] text-[#5d6f88] shadow-[0_2px_8px_rgba(53,70,98,.04)] backdrop-blur">{keyword}</span>)}</div>}
          <p className={`tracking-[-.03em] text-[#1b2536] ${insight ? 'mt-4 line-clamp-3 text-[16px] font-medium leading-[1.58]' : 'mt-8 line-clamp-3 text-[18px] font-semibold leading-[1.42]'}`}>{insight?.text || routineGlance(routine)}</p>
          <Link to={`/routines/${routine.id}`} tabIndex={expanded ? 0 : -1} onClick={event => event.stopPropagation()} className="mt-auto flex h-11 items-center justify-center rounded-[15px] bg-[#111722] px-4 text-[12px] font-semibold text-white shadow-[0_8px_20px_rgba(17,23,34,.18)] transition hover:bg-black active:scale-[.98]">루틴 상세 보기</Link>
        </div>
      </article>
    </div>
  </div>
}

function RoutineLabPattern() {
  return <svg aria-hidden="true" viewBox="0 0 272 354" className="pointer-events-none absolute inset-0 size-full text-[#7d94b7] opacity-[.28]">
    <circle cx="239" cy="58" r="52" fill="none" stroke="currentColor" strokeWidth="1"/>
    <circle cx="239" cy="58" r="35" fill="none" stroke="currentColor" strokeWidth=".7" strokeDasharray="3 7"/>
    <path d="M-18 285C35 240 78 304 127 266s93-79 164-38" fill="none" stroke="currentColor" strokeWidth="1.2"/>
    <path d="M-22 302c63-42 102 18 157-18 43-28 77-61 148-42" fill="none" stroke="currentColor" strokeWidth=".7" strokeDasharray="4 8"/>
    <g fill="currentColor">
      <circle cx="27" cy="83" r="3.5" opacity=".32"/><circle cx="44" cy="67" r="1.8" opacity=".4"/><circle cx="55" cy="91" r="6" opacity=".18"/>
      <circle cx="224" cy="177" r="4.5" opacity=".2"/><circle cx="244" cy="193" r="2.2" opacity=".34"/><circle cx="211" cy="201" r="1.6" opacity=".42"/>
    </g>
    <path d="M33 185c0-12 13-23 13-23s13 11 13 23a13 13 0 0 1-26 0Z" fill="none" stroke="currentColor" strokeWidth=".9" opacity=".48"/>
  </svg>
}

export function RoutineDetailPage() {
  const { id } = useParams(); const routineId = Number(id)
  const validRoutineId = Number.isSafeInteger(routineId) && routineId > 0
  const routineQuery = useQuery({ queryKey: ['routine', routineId], queryFn: () => api.routine(routineId), enabled: validRoutineId, retry: false })
  const current = useQuery({ queryKey: ['current-routine'], queryFn: api.currentRoutine, retry: false })
  const products = useQuery({ queryKey: ['user-products'], queryFn: api.userProducts })
  const generatedInsight = useQuery({
    queryKey: ['routine-insight-v4', routineId],
    queryFn: () => api.generateRoutineInsight(routineId),
    enabled: validRoutineId && Boolean(routineQuery.data),
    retry: false,
    staleTime: Number.POSITIVE_INFINITY,
  })
  if (!validRoutineId) return <Screen nav={false}><AppHeader back backTo="/routines"/><ErrorState message="루틴 주소를 확인해주세요."/></Screen>
  if (routineQuery.isPending || current.isPending) return <Screen nav={false}><AppHeader back backTo="/routines"/><Loading/></Screen>
  const loadError = routineQuery.error || (current.error && !isNotFound(current.error) ? current.error : null)
  if (loadError) return <Screen nav={false}><AppHeader back backTo="/routines"/><ErrorState message={loadError.message} onRetry={() => { routineQuery.refetch(); current.refetch() }}/></Screen>
  const routine = routineQuery.data
  const insight = generatedInsight.data || routine.insight
  const isCurrent = routine.id === current.data?.id
  const orderedItems = [...routine.items].sort((left, right) => left.position - right.position)
  const productsById = new Map((products.data || []).map(item => [item.id, item]))

  return <Screen nav={false} className="bg-[#fbfcff] pb-24">
    <AppHeader back backTo="/routines"/>
    <div className="px-5 pt-5">
      <header aria-labelledby="routine-detail-title">
        <div className="flex min-h-10 items-center justify-between gap-4"><p className="text-[10px] font-semibold tracking-[.16em] text-[#7686a0]">ROUTINE</p>{isCurrent && <Link to="/routine/edit" className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-[#dce4ef] bg-white px-4 text-[12px] font-semibold text-[#53647e] shadow-[0_3px_12px_rgba(47,64,94,.04)] transition active:scale-[.98]"><PencilLine size={15}/>구성 편집</Link>}</div>
        <h1 id="routine-detail-title" className="mt-4 max-w-[360px] text-[clamp(34px,9.5vw,41px)] font-semibold leading-[1.1] tracking-[-.055em] text-[#111722]">{routine.name}</h1>
        <p className="mt-4 text-[13px] font-medium tracking-[-.018em] text-[#778294]">{dayPartLabel(routine.dayPart)} · {orderedItems.length}개 제품</p>
      </header>

      {insight && <section aria-labelledby="routine-insight-title" className="relative mt-7 overflow-hidden rounded-[24px] border border-[#dfe7f2] bg-[linear-gradient(145deg,#f4f7fc_0%,#eef3fa_52%,#f7f4f7_100%)] px-5 py-5 shadow-[0_12px_34px_rgba(43,57,82,.07)]">
        <RoutineLabPattern/>
        <div className="relative"><p id="routine-insight-title" className="text-[10px] font-semibold tracking-[.13em] text-[#697d9b]">SKN AI · 이 루틴이 도와주는 것</p><div className="mt-3 flex flex-wrap gap-2">{(insight.keywords || []).map(keyword => <span key={keyword} className="rounded-full border border-white/90 bg-white/62 px-3 py-1.5 text-[10px] font-semibold text-[#5b6f8d] shadow-[0_2px_8px_rgba(45,61,88,.04)] backdrop-blur">{keyword}</span>)}</div><p className="mt-4 text-[16px] font-medium leading-[1.68] tracking-[-.028em] text-[#28364c]">{insight.text}</p><p className="mt-3 text-[10px] font-medium leading-4 text-[#8290a4]">내가 남긴 내용과 이번 구성을 바탕으로 정리한 한 문장이에요.</p></div>
      </section>}

      <section className="mt-9" aria-labelledby="routine-order-title">
        <div className="flex items-end justify-between gap-4"><div><p className="text-[10px] font-semibold tracking-[.14em] text-[#7b8799]">구성</p><h2 id="routine-order-title" className="mt-1.5 text-[24px] font-semibold tracking-[-.042em] text-[#141a25]">사용 순서</h2></div><p className="pb-1 text-[11px] font-medium text-[#9299a4]">위에서부터 사용</p></div>
        {orderedItems.length ? <ol className="mt-4 overflow-hidden rounded-[22px] border border-[#e1e7f0] bg-white shadow-[0_8px_26px_rgba(38,51,74,.045)]">
          {orderedItems.map((item, index) => {
            const product = productsById.get(item.userProductId)?.product
            return <li key={item.userProductId} className={index ? 'border-t border-[#e8ecf2]' : ''}>
              <Link to={`/my-products/${item.userProductId}`} aria-label={`${index + 1}번째 제품 ${item.productName} 상세 보기`} className="interactive-card grid min-h-[96px] grid-cols-[24px_56px_minmax(0,1fr)_18px] items-center gap-3 px-3.5 py-3.5">
                <span className="self-start pt-1 text-[11px] font-semibold tabular-nums text-[#71819a]">{String(index + 1).padStart(2, '0')}</span>
                <RoutineProductVisual imageUrl={product?.imageUrl} category={item.category} name={item.productName}/>
                <span className="min-w-0"><strong className="block truncate text-[15px] font-semibold tracking-[-.025em] text-[#171d29]">{item.productName}</strong><span className="mt-1 flex min-w-0 items-center gap-1.5"><BrandIdentity name={item.brand} logoUrl={item.brandLogoUrl} size="xs" className="min-w-0"/><span className="shrink-0 text-[11px] text-[#858d99]">· {item.category}</span></span><span className="mt-2 block text-[11px] font-medium text-[#61728d]">{timeSlotLabel(item.timeSlot)} · {item.frequency}</span></span>
                <ChevronRight size={17} className="text-[#8c96a5]"/>
              </Link>
            </li>
          })}
        </ol> : <div className="mt-4 rounded-[20px] border border-dashed border-[#d9dfe8] bg-white px-5 py-7 text-center text-[12px] font-medium text-[#7c8490]">이 루틴에 담긴 제품이 없어요.</div>}
      </section>

      <Link to="/records?view=history" className="interactive-card mt-6 flex min-h-[62px] items-center gap-3 border-y border-[#e3e8ef] px-1 text-left">
        <span className="grid size-9 shrink-0 place-items-center text-[#65758e]"><BookOpen size={17} strokeWidth={1.8}/></span>
        <span className="min-w-0 flex-1"><strong className="block text-[13px] font-semibold tracking-[-.02em] text-[#283345]">전체 경험 기록</strong><span className="mt-0.5 block text-[10px] leading-4 text-[#818a97]">지금까지 남긴 사용 결과와 불편함 보기</span></span>
        <ChevronRight size={17} className="shrink-0 text-[#8a94a2]"/>
      </Link>
      <p className="mt-8 text-center text-[10px] font-medium tracking-[-.01em] text-[#a0a7b1]">{formatDate(routine.startedAt)} 생성</p>
    </div>

    <div className="safe-bottom pointer-events-none fixed inset-x-0 bottom-0 z-20 mx-auto flex max-w-[430px] justify-end px-5"><Link to={startChatPath('GENERAL', `${routine.name} 루틴의 제품 조합과 바르는 순서를 함께 살펴봐줘.`)} aria-label="AI와 이 루틴 살펴보기" className="pointer-events-auto flex min-h-[52px] items-center gap-2 rounded-full bg-[#0a0a0a] px-5 text-[13px] font-semibold tracking-[-.02em] text-white shadow-[0_10px_28px_rgba(0,0,0,.24)] transition hover:-translate-y-0.5 hover:bg-black active:translate-y-0 active:scale-[.98]"><MessageCircle size={19} strokeWidth={1.9}/><span>AI와 루틴 살펴보기</span></Link></div>
  </Screen>
}

function RoutineProductVisual({ imageUrl, category, name, size = 'md', className = '' }: { imageUrl?: string; category: string; name: string; size?: 'sm' | 'md'; className?: string }) {
  const [failed, setFailed] = useState(false)
  const [portraitDetail, setPortraitDetail] = useState(false)
  const compact = size === 'sm'
  return <span className={`relative grid shrink-0 place-items-center overflow-hidden border border-black/[.035] bg-[linear-gradient(145deg,#f7f7f4_0%,#efefec_100%)] ${compact ? 'size-11 rounded-[15px]' : 'size-14 rounded-[18px]'} ${className}`}>
    {imageUrl && !failed
      ? <StaticProductImage src={imageUrl} alt={`${name} 제품`} loading="lazy" decoding="async" referrerPolicy="no-referrer" onLoad={event => setPortraitDetail(event.currentTarget.naturalHeight / event.currentTarget.naturalWidth > 2.2)} onError={() => setFailed(true)} className={`${compact ? 'size-10' : 'size-[50px]'} ${portraitDetail ? 'rounded-[12px] object-cover object-[center_17%]' : 'object-contain mix-blend-multiply'}`}/>
      : <ProductGlyph category={category} size="xs"/>}
  </span>
}
