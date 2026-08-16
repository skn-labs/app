import { useLayoutEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight, BookOpen, ChevronRight, MessageCircle, PencilLine } from 'lucide-react'
import { Link, useLocation, useParams } from 'react-router-dom'
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
function routineGlance(routine: Routine) {
  const first = routine.items[0]?.category
  const last = routine.items[routine.items.length - 1]?.category
  const flow = !first ? '' : first === last ? `${first} ${routine.items.length}개` : `${first}부터 ${last}까지`
  return [dayPartLabel(routine.dayPart), flow, `${routine.items.length}개 제품`].filter(Boolean).join(' · ')
}

export function RoutineListPage() {
  const location = useLocation()
  const archive = useQuery({ queryKey: ['routines'], queryFn: api.routines })
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const [dragging, setDragging] = useState(false)
  const carousel = useRef<HTMLDivElement>(null)
  const positionedInitialCard = useRef(false)
  const drag = useRef<{ pointerId: number; startX: number; scrollLeft: number; startIndex: number; moved: boolean } | null>(null)
  const suppressClick = useRef(false)
  const requestedRoutineId = (location.state as { focusRoutineId?: unknown } | null)?.focusRoutineId
  const focusRoutineId = typeof requestedRoutineId === 'number' && Number.isSafeInteger(requestedRoutineId) ? requestedRoutineId : null

  useLayoutEffect(() => {
    const element = carousel.current
    const routines = archive.data
    if (!element || !routines || positionedInitialCard.current) return
    const requestedRoutineIndex = focusRoutineId === null ? -1 : routines.findIndex(routine => routine.id === focusRoutineId)
    if (focusRoutineId !== null && requestedRoutineIndex < 0) return
    const currentRoutineIndex = routines.findIndex(routine => routine.status === 'CURRENT')
    const routineIndex = requestedRoutineIndex >= 0 ? requestedRoutineIndex : currentRoutineIndex >= 0 ? currentRoutineIndex : 0
    const initialIndex = routines.length ? routineIndex + 1 : 0
    const card = element.querySelectorAll<HTMLElement>('[data-routine-card]')[initialIndex]
    if (!card) return
    element.scrollLeft = card.offsetLeft - (element.clientWidth - card.offsetWidth) / 2
    setActiveIndex(initialIndex)
    positionedInitialCard.current = true
  }, [archive.data, focusRoutineId])

  if (archive.isPending) return <Screen><AppHeader/><Loading variant="routine" label="루틴을 정리하는 중"/></Screen>
  if (archive.error) return <Screen><AppHeader/><ErrorState message={archive.error.message} onRetry={() => archive.refetch()}/></Screen>

  const routines = archive.data
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
      <div className="min-w-0"><p className="text-[10px] font-semibold tracking-[.15em] text-[#71809a]">ROUTINES</p><h1 className="mt-1.5 text-[30px] font-semibold leading-[1.14] tracking-[-.045em] text-[#111722]">내 루틴</h1><p className="mt-2.5 max-w-[340px] text-[12px] font-medium leading-5 tracking-[-.012em] text-[#7a808a]">{routines.length ? `저장한 루틴 ${routines.length}개를 넘기며 현재와 이전 조합을 확인하세요.` : '제품과 순서를 정해 첫 루틴을 시작해보세요.'}</p></div>
    </div>

    <section className="relative mt-6" aria-label="나의 루틴 카드">
      <div
        ref={carousel}
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
        className={`hide-scrollbar flex select-none snap-x snap-mandatory gap-3.5 overflow-x-auto overscroll-x-contain px-[calc((100%_-_260px)/2)] pb-12 pt-8 [perspective:1200px] [-webkit-overflow-scrolling:touch] [touch-action:pan-x_pan-y] outline-none ${dragging ? 'cursor-grabbing snap-none' : 'cursor-grab'}`}
      >
        {cards.map((card, index) => {
          const distance = Math.abs(index - activeIndex)
          const depth = distance === 0
            ? 'z-10 opacity-100 [transform:translateZ(34px)_scale(1.035)] [filter:saturate(1)]'
            : distance === 1
              ? 'z-0 opacity-65 [transform:translateZ(-52px)_scale(.91)] [filter:saturate(.72)]'
              : 'z-0 opacity-40 [transform:translateZ(-86px)_scale(.86)] [filter:saturate(.55)]'
          return <div key={card.key} data-routine-card aria-current={index === activeIndex ? 'true' : undefined} className={`relative flex h-[368px] w-[260px] shrink-0 snap-center items-center justify-center [scroll-snap-stop:always] transition-[transform,opacity,filter] duration-500 ease-out will-change-transform motion-reduce:transform-none motion-reduce:opacity-100 motion-reduce:filter-none ${depth}`}>
            {card.kind === 'routine'
              ? <RoutineCarouselCard routine={card.routine} image={card.image} tone={card.tone} expanded={expandedId === card.routine.id} onExpand={() => index === activeIndex ? setExpandedId(card.routine.id) : showCard(index)} onCollapse={() => setExpandedId(null)}/>
              : <CreateRoutineCard image={card.image} description={card.description} active={index === activeIndex} onSelect={() => showCard(index)}/>}
          </div>
        })}
      </div>
      <div className="mt-1 flex justify-center gap-1.5" aria-hidden>{cards.map((card, index) => <span key={card.key} className={`block rounded-full transition-all duration-300 ${index === activeIndex ? 'h-1.5 w-6 bg-[#172033]' : 'size-1.5 bg-[#ccd2dc]'}`}/>)}</div>
      <p aria-live="polite" className="mx-auto mt-3 max-w-[320px] px-5 text-center text-[12px] font-medium leading-5 tracking-[-.01em] text-[#858b96]">{activeCard?.kind === 'create' ? '옆으로 밀어 다른 카드를 보고, 이 카드를 누르면 새 루틴을 만들어요.' : expandedId ? '뒷면에서 이번 루틴의 도움을 확인했어요. 상세 보기에서 전체 순서를 볼 수 있어요.' : '옆으로 밀어 탐색하고, 카드를 누르면 AI가 정리한 한 문장이 펼쳐져요.'}</p>
    </section>
    <FloatingAddButton kind="routine" label="새 루틴 만들기" to="/routine/new"/>
  </Screen>
}

function CreateRoutineCard({ image, description, active, onSelect }: { image: string; description: string; active: boolean; onSelect: () => void }) {
  return <Link to="/routine/new" aria-label={active ? '새 루틴 만들기' : '이 카드를 가운데로 이동'} onClick={event => {
    if (active) return
    event.preventDefault()
    onSelect()
  }} className="group relative h-[344px] w-full shrink-0 overflow-hidden rounded-[26px] text-left shadow-[0_12px_34px_rgba(28,38,56,.14)] transition active:scale-[.99]">
    <img src={image} alt="" aria-hidden className="absolute inset-0 size-full scale-105 object-cover opacity-[.55] saturate-50"/>
    <div aria-hidden className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,.88)_0%,rgba(255,255,255,.62)_45%,rgba(241,247,239,.96)_100%)]"/>
    <div className="relative flex h-full flex-col p-6">
      <span className="w-fit rounded-full border border-black/5 bg-white/78 px-3 py-1.5 text-[11px] font-semibold tracking-[.02em] text-black/50 backdrop-blur">EMPTY ROUTINE</span>
      <div className="my-auto"><span className="grid size-11 place-items-center rounded-[15px] bg-white text-[#172033] shadow-[0_6px_18px_rgba(0,0,0,.10)]"><ActionIcon name="routine-add" className="size-6"/></span><h2 className="mt-5 text-[27px] font-semibold leading-[1.08] tracking-[-.05em] text-[#121823]">새 루틴을<br/>만들어보세요</h2><p className="mt-4 max-w-[205px] text-[13px] font-medium leading-5 tracking-[-.015em] text-black/52">{description}</p></div>
      <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#172033]">새 조합 시작하기<ArrowRight size={15}/></span>
    </div>
  </Link>
}

function RoutineCarouselCard({ routine, image, tone, expanded, onExpand, onCollapse }: { routine: Routine; image: string; tone: string; expanded: boolean; onExpand: () => void; onCollapse: () => void }) {
  const faceStyle = { backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' } as const
  const frontFaceStyle = { ...faceStyle, transform: 'rotateY(0deg) translateZ(1px)', WebkitTransform: 'rotateY(0deg) translateZ(1px)' } as const
  const generatedInsight = useQuery({
    queryKey: ['routine-insight-v4', routine.id],
    queryFn: () => api.generateRoutineInsight(routine.id),
    enabled: expanded,
    retry: false,
    staleTime: Number.POSITIVE_INFINITY,
  })
  const insight = generatedInsight.data || routine.insight
  return <div className="relative h-[344px] w-full [perspective:1200px]">
    <div className={`relative size-full transition-transform duration-500 [transform-style:preserve-3d] motion-reduce:transition-none ${expanded ? '[transform:rotateY(180deg)]' : ''}`}>
      <button type="button" onClick={onExpand} tabIndex={expanded ? -1 : 0} aria-expanded={expanded} aria-label={`${routine.name} 루틴이 도와주는 것 보기`} className={`absolute inset-0 overflow-hidden rounded-[26px] text-left shadow-[0_14px_38px_rgba(26,36,55,.18)] transition active:scale-[.99] ${expanded ? 'pointer-events-none' : ''}`} style={frontFaceStyle}>
        <img src={image} alt="" aria-hidden className="absolute inset-0 size-full object-cover"/>
        <div aria-hidden className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,.82)_0%,rgba(255,255,255,.12)_46%,rgba(16,25,40,.18)_100%)]"/>
        <div className="absolute inset-x-5 top-5 flex items-center justify-between gap-2">{routine.status === 'CURRENT' ? <span className="rounded-full border border-white/55 bg-white/62 px-3 py-1.5 text-[11px] font-semibold tracking-[.015em] text-[#283346] backdrop-blur-md">현재 사용 중</span> : <span aria-hidden/>}<span className="text-[10px] font-semibold tracking-[-.01em] text-black/45">눌러 루틴 읽기</span></div>
        <div className="absolute inset-x-5 bottom-6"><p className="text-[12px] font-semibold tracking-[.02em] text-black/55">{dayPartLabel(routine.dayPart)} · {routine.items.length}개 제품</p><h2 className="mt-2 text-[29px] font-semibold leading-[1.06] tracking-[-.052em] text-[#111722]">{routine.name}</h2><p className="mt-3 text-[12px] font-medium tracking-[-.01em] text-black/58">{formatDate(routine.startedAt)} 시작</p></div>
      </button>

      <article aria-hidden={!expanded} onClick={onCollapse} className={`absolute inset-0 overflow-hidden rounded-[26px] text-left shadow-[0_14px_38px_rgba(26,36,55,.18)] [transform:rotateY(180deg)] ${expanded ? 'pointer-events-auto' : 'pointer-events-none'}`} style={{ ...faceStyle, background: tone }}>
        <RoutineLabPattern/>
        <div aria-hidden className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(255,255,255,.72),transparent_37%),linear-gradient(180deg,rgba(255,255,255,.06),rgba(255,255,255,.22))]"/>
        <div className="relative flex h-full flex-col px-5 pb-5 pt-[18px]">
          <div className="flex items-center border-b border-[#6c7e99]/15 pb-3.5">
            <span className="text-[10px] font-semibold tracking-[-.01em] text-[#65758d]">{dayPartLabel(routine.dayPart)} 루틴 · {routine.items.length}개 제품</span>
          </div>

          <div className="mt-7">
            {insight && <div className="flex flex-wrap gap-1.5">{(insight.keywords || []).map(keyword => <span key={keyword} className="rounded-[9px] bg-white/58 px-2.5 py-1.5 text-[9px] font-semibold tracking-[-.015em] text-[#5b6d87] shadow-[inset_0_0_0_1px_rgba(255,255,255,.72),0_3px_10px_rgba(53,70,98,.035)] backdrop-blur">{keyword}</span>)}</div>}
            <p className={`tracking-[-.034em] text-[#202b3d] ${insight ? 'mt-4 line-clamp-4 text-[18px] font-semibold leading-[1.52]' : 'line-clamp-4 text-[19px] font-semibold leading-[1.48]'}`}>{insight?.text || routineGlance(routine)}</p>
          </div>

          <Link to={`/routines/${routine.id}`} tabIndex={expanded ? 0 : -1} onClick={event => event.stopPropagation()} className="group mt-auto flex min-h-[58px] items-center gap-3 rounded-[18px] border border-white/75 bg-white/58 px-3.5 py-2.5 shadow-[0_8px_24px_rgba(51,68,94,.065)] backdrop-blur-md transition hover:-translate-y-0.5 hover:bg-white/72 active:translate-y-0 active:scale-[.985]">
            <span className="min-w-0 flex-1"><strong className="block text-[12px] font-semibold tracking-[-.018em] text-[#263348]">루틴 상세</strong><span className="mt-0.5 block text-[9px] font-medium tracking-[-.01em] text-[#78869a]">제품 순서와 기록 보기</span></span>
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[#1d293b] text-white shadow-[0_5px_14px_rgba(29,41,59,.18)] transition group-hover:translate-x-0.5"><ChevronRight size={14} strokeWidth={2}/></span>
          </Link>
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
  if (routineQuery.isPending || current.isPending) return <Screen nav={false}><AppHeader back backTo="/routines"/><Loading variant="detail" label="루틴 상세를 준비하는 중"/></Screen>
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
        <h1 id="routine-detail-title" className="mt-4 max-w-[360px] text-[clamp(28px,7.8vw,34px)] font-semibold leading-[1.16] tracking-[-.045em] text-[#111722]">{routine.name}</h1>
        <p className="mt-4 text-[13px] font-medium tracking-[-.018em] text-[#778294]">{dayPartLabel(routine.dayPart)} · {orderedItems.length}개 제품</p>
      </header>

      <section className="mt-9" aria-labelledby="routine-order-title">
        <div className="flex items-end justify-between gap-4"><div><h2 id="routine-order-title" className="text-[24px] font-semibold tracking-[-.042em] text-[#141a25]">루틴 구성</h2><p className="mt-1.5 text-[11px] font-medium tracking-[-.015em] text-[#8a93a1]">위에서 아래 순서로 사용해요.</p></div><span className="pb-0.5 text-[11px] font-semibold tabular-nums text-[#68778d]">{orderedItems.length}단계</span></div>
        {orderedItems.length ? <ol className="relative mt-6 space-y-5 before:absolute before:bottom-[45px] before:left-[14px] before:top-[44px] before:w-[2px] before:rounded-full before:bg-[#a6b4c6]">
          {orderedItems.map((item, index) => {
            const product = productsById.get(item.userProductId)?.product
            return <li key={item.userProductId} className="relative pl-12">
              <span aria-hidden className="absolute left-0 top-[29px] z-10 grid h-[30px] w-[30px] place-items-center rounded-[10px] border border-[#91a2b8] bg-[#fbfcff] text-[9px] font-semibold tracking-[-.02em] tabular-nums text-[#40516a] shadow-[0_2px_7px_rgba(53,69,94,.08)]">{String(index + 1).padStart(2, '0')}</span>
              <Link to={`/my-products/${item.userProductId}`} aria-label={`${index + 1}번째 제품 ${item.productName} 상세 보기`} className={`interactive-card grid min-h-[92px] grid-cols-[64px_minmax(0,1fr)_18px] items-center gap-3.5 pb-5 pr-1 transition active:opacity-70 ${index < orderedItems.length - 1 ? 'border-b border-[#e2e7ee] hover:border-[#cbd5e2]' : ''}`}>
                <RoutineProductVisual imageUrl={product?.imageUrl} category={item.category} name={item.productName} size="lg"/>
                <span className="min-w-0"><span className="mb-1.5 block text-[10px] font-semibold tracking-[-.01em] text-[#71819a]">{timeSlotLabel(item.timeSlot)} · {item.frequency}</span><strong className="block truncate text-[15px] font-semibold tracking-[-.025em] text-[#171d29]">{item.productName}</strong><span className="mt-1.5 flex min-w-0 items-center gap-1.5"><BrandIdentity name={item.brand} logoUrl={item.brandLogoUrl} size="xs" className="min-w-0"/><span className="shrink-0 text-[11px] text-[#858d99]">· {item.category}</span></span></span>
                <ChevronRight size={17} className="text-[#8c96a5]"/>
              </Link>
            </li>
          })}
        </ol> : <div className="mt-4 rounded-[20px] border border-dashed border-[#d9dfe8] bg-white px-5 py-7 text-center text-[12px] font-medium text-[#7c8490]">이 루틴에 담긴 제품이 없어요.</div>}
      </section>

      {insight && <section aria-labelledby="routine-insight-title" className="mt-9 border-y border-[#e1e6ed] py-5">
        <h2 id="routine-insight-title" className="text-[11px] font-semibold tracking-[-.015em] text-[#718097]">이번 루틴에서 살펴볼 점</h2>
        <p className="mt-3 max-w-[360px] text-[17px] font-semibold leading-[1.58] tracking-[-.032em] text-[#273347] [text-wrap:pretty]">{insight.text}</p>
        {(insight.keywords || []).length > 0 && <ul className="mt-4 flex flex-wrap gap-x-3 gap-y-1.5" aria-label="루틴 키워드">{insight.keywords.map(keyword => <li key={keyword} className="inline-flex items-center gap-1.5 text-[10px] font-medium tracking-[-.01em] text-[#66758a]"><i aria-hidden className="size-1 rounded-full bg-[#91a2ba]"/>{keyword}</li>)}</ul>}
      </section>}

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

function RoutineProductVisual({ imageUrl, category, name, size = 'md', className = '' }: { imageUrl?: string; category: string; name: string; size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const [failed, setFailed] = useState(false)
  const [portraitDetail, setPortraitDetail] = useState(false)
  const frameClass = size === 'sm' ? 'size-11 rounded-[15px]' : size === 'lg' ? 'size-16 rounded-[19px]' : 'size-14 rounded-[18px]'
  const imageClass = size === 'sm' ? 'size-10' : size === 'lg' ? 'size-[58px]' : 'size-[50px]'
  return <span className={`relative grid shrink-0 place-items-center overflow-hidden border border-black/[.035] bg-[linear-gradient(145deg,#f7f7f4_0%,#efefec_100%)] ${frameClass} ${className}`}>
    {imageUrl && !failed
      ? <StaticProductImage src={imageUrl} alt={`${name} 제품`} loading="lazy" decoding="async" referrerPolicy="no-referrer" onLoad={event => setPortraitDetail(event.currentTarget.naturalHeight / event.currentTarget.naturalWidth > 2.2)} onError={() => setFailed(true)} className={`${imageClass} ${portraitDetail ? 'rounded-[12px] object-cover object-[center_17%]' : 'object-contain mix-blend-multiply'}`}/>
      : <ProductGlyph category={category} size="xs"/>}
  </span>
}
