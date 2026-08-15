import { useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, MessageCircle, Plus, Sparkles } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { api, ApiError } from '../lib/api'
import { startChatPath } from '../lib/chat'
import type { Routine } from '../lib/types'
import { AppHeader, ErrorState, Loading, PageHeading, Screen } from '../components/ui'
import routineCard1 from '../assets/figma/routine-card-1.webp'
import routineCard2 from '../assets/figma/routine-card-2.webp'
import routineCard3 from '../assets/figma/routine-card-3.webp'

const routineCards = [routineCard1, routineCard2, routineCard3]

type RoutineCarouselEntry =
  | { kind: 'routine'; key: string; routine: Routine; image: string }
  | { kind: 'create'; key: string; image: string; description: string }

function dayPartLabel(dayPart: Routine['dayPart']) { return dayPart === 'MORNING' ? '아침' : dayPart === 'EVENING' ? '저녁' : '아무때나' }
function formatDate(value: string) { const normalized = /Z$|[+-]\d\d:\d\d$/.test(value) ? value : `${value.replace(' ', 'T')}Z`; const date = new Date(normalized); return Number.isNaN(date.getTime()) ? value.slice(0, 10) : new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' }).format(date) }
function isNotFound(error: unknown) { return error instanceof ApiError && error.status === 404 }
function statusLabel(routine: Routine, current?: Routine) { return routine.id === current?.id ? '현재 사용 중' : '비교 기준 루틴' }

export function RoutineListPage() {
  const auth = useQuery({ queryKey: ['auth'], queryFn: api.me })
  const current = useQuery({ queryKey: ['current-routine'], queryFn: api.currentRoutine, retry: false })
  const baseline = useQuery({ queryKey: ['baseline-routine'], queryFn: api.baselineRoutine, retry: false })
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [activeIndex, setActiveIndex] = useState(1)
  const [dragging, setDragging] = useState(false)
  const carousel = useRef<HTMLDivElement>(null)
  const drag = useRef<{ pointerId: number; startX: number; scrollLeft: number } | null>(null)
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
    ? [createCard(0, 'before'), ...routines.map((routine, index) => ({ kind: 'routine' as const, key: `routine-${routine.id}`, routine, image: routineCards[index % routineCards.length] })), createCard(1, 'after')]
    : [createCard(0, 'empty'), createCard(1, 'empty'), createCard(2, 'empty')]
  const activeCard = cards[activeIndex]
  const closestCardIndex = (element: HTMLDivElement) => {
    const cards = Array.from(element.querySelectorAll<HTMLElement>('[data-routine-card]'))
    if (!cards.length) return 0
    const center = element.scrollLeft + element.clientWidth / 2
    return cards.reduce((best, card, index) => Math.abs(card.offsetLeft + card.offsetWidth / 2 - center) < best.distance ? { index, distance: Math.abs(card.offsetLeft + card.offsetWidth / 2 - center) } : best, { index: 0, distance: Number.POSITIVE_INFINITY }).index
  }
  const handleScroll = (element: HTMLDivElement) => setActiveIndex(closestCardIndex(element))
  const showCard = (index: number) => {
    const element = carousel.current
    const nextIndex = Math.max(0, Math.min(cards.length - 1, index))
    const card = element?.querySelectorAll<HTMLElement>('[data-routine-card]')[nextIndex]
    if (!element || !card) return
    element.scrollTo({ left: card.offsetLeft - (element.clientWidth - card.offsetWidth) / 2, behavior: 'smooth' })
    setActiveIndex(nextIndex)
  }

  return <Screen className="bg-white">
    <AppHeader/>
    <div className="px-5 pt-4">
      <PageHeading title={<>{auth.data?.displayName} 님의<br/>루틴</>} description={routines.length ? `저장된 사용 맥락 ${routines.length}개 · 다음 카드에서 추가` : '카드를 넘겨 첫 루틴을 만들어보세요'} action={<Link to="/routine/edit" aria-label="새 루틴 만들기" className="mt-1 grid size-12 shrink-0 place-items-center rounded-full border border-line bg-white shadow-[0_5px_18px_rgba(0,0,0,.08)] transition active:scale-95"><Plus size={23} strokeWidth={1.8}/></Link>}/>
    </div>

    <section className="relative mt-8" aria-label="나의 루틴 카드">
      <div
        ref={element => {
          carousel.current = element
          if (element && element.dataset.initialized !== 'true') {
            element.dataset.initialized = 'true'
            requestAnimationFrame(() => {
              const card = element.querySelectorAll<HTMLElement>('[data-routine-card]')[1]
              if (!card) return
              element.scrollLeft = card.offsetLeft - (element.clientWidth - card.offsetWidth) / 2
              setActiveIndex(1)
            })
          }
        }}
        tabIndex={0}
        role="region"
        aria-roledescription="캐러셀"
        aria-label="루틴 카드. 마우스로 끌거나 좌우 방향키로 이동할 수 있어요."
        onScroll={event => handleScroll(event.currentTarget)}
        onKeyDown={event => {
          if (event.key === 'ArrowLeft') { event.preventDefault(); showCard(activeIndex - 1) }
          if (event.key === 'ArrowRight') { event.preventDefault(); showCard(activeIndex + 1) }
        }}
        onPointerDown={event => {
          if (event.button !== 0) return
          drag.current = { pointerId: event.pointerId, startX: event.clientX, scrollLeft: event.currentTarget.scrollLeft }
          suppressClick.current = false
          event.currentTarget.setPointerCapture(event.pointerId)
          setDragging(true)
        }}
        onPointerMove={event => {
          if (!drag.current || drag.current.pointerId !== event.pointerId) return
          const delta = event.clientX - drag.current.startX
          if (Math.abs(delta) > 5) suppressClick.current = true
          event.currentTarget.scrollLeft = drag.current.scrollLeft - delta
        }}
        onPointerUp={event => {
          if (!drag.current || drag.current.pointerId !== event.pointerId) return
          drag.current = null
          setDragging(false)
          showCard(closestCardIndex(event.currentTarget))
        }}
        onPointerCancel={() => { drag.current = null; setDragging(false) }}
        onClickCapture={event => {
          if (!suppressClick.current) return
          event.preventDefault()
          event.stopPropagation()
          suppressClick.current = false
        }}
        className={`hide-scrollbar flex snap-x snap-mandatory overflow-x-auto px-[calc((100%_-_230px)/2)] py-5 [perspective:1000px] touch-pan-y outline-none ${dragging ? 'cursor-grabbing snap-none select-none' : 'cursor-grab'}`}
      >
        {cards.map((card, index) => {
          const distance = Math.abs(index - activeIndex)
          const direction = index < activeIndex ? -1 : 1
          const transform = distance === 0
            ? 'translateX(0) scale(1) rotateY(0deg)'
            : distance === 1
              ? `translateX(${direction * -12}px) scale(.87) rotateY(${direction * -8}deg)`
              : `translateX(${direction * -18}px) scale(.78) rotateY(${direction * -11}deg)`
          return <div key={card.key} data-routine-card aria-current={distance === 0 ? 'true' : undefined} className="relative flex h-[390px] w-[230px] shrink-0 snap-center items-center justify-center transition-[transform,opacity,filter] duration-300 ease-out [transform-style:preserve-3d]" style={{ transform, opacity: distance === 0 ? 1 : distance === 1 ? .62 : .32, filter: distance === 0 ? 'none' : `saturate(${distance === 1 ? .72 : .45}) blur(${distance === 1 ? 0 : 1}px)`, zIndex: 20 - distance }}>
            {card.kind === 'routine'
              ? <RoutineCarouselCard routine={card.routine} current={current.data} image={card.image} expanded={expandedId === card.routine.id} onExpand={() => setExpandedId(card.routine.id)} onCollapse={() => setExpandedId(null)}/>
              : <CreateRoutineCard image={card.image} description={card.description}/>}
          </div>
        })}
      </div>
      <button type="button" onClick={() => showCard(activeIndex - 1)} disabled={activeIndex === 0} aria-label="이전 루틴 카드" className="absolute left-5 top-[178px] z-30 hidden size-11 place-items-center rounded-full border border-black/5 bg-white/92 shadow-[0_8px_24px_rgba(0,0,0,.15)] backdrop-blur transition hover:scale-105 active:scale-95 disabled:pointer-events-none disabled:opacity-0 md:grid"><ChevronLeft size={21}/></button>
      <button type="button" onClick={() => showCard(activeIndex + 1)} disabled={activeIndex === cards.length - 1} aria-label="다음 루틴 카드" className="absolute right-5 top-[178px] z-30 hidden size-11 place-items-center rounded-full border border-black/5 bg-white/92 shadow-[0_8px_24px_rgba(0,0,0,.15)] backdrop-blur transition hover:scale-105 active:scale-95 disabled:pointer-events-none disabled:opacity-0 md:grid"><ChevronRight size={21}/></button>
      <div className="mt-2 flex justify-center gap-1" aria-label={`${cards.length}개 카드 중 ${activeIndex + 1}번째`}>{cards.map((card, index) => <button type="button" key={card.key} onClick={() => showCard(index)} aria-label={card.kind === 'routine' ? `${card.routine.name} 보기` : '새 루틴 만들기 카드 보기'} aria-current={index === activeIndex ? 'true' : undefined} className="grid size-7 place-items-center rounded-full"><span className={`block rounded-full transition-all ${index === activeIndex ? 'h-2 w-5 bg-[#0a0a0a]' : 'size-2 bg-[#d1d1d6]'}`}/></button>)}</div>
      <p aria-live="polite" className="mt-3 px-5 text-center text-xs text-[#8e8e93]">{activeCard?.kind === 'create' ? '비어 있는 카드를 선택하면 새 루틴 편집을 시작해요.' : expandedId ? '제품 구성과 상태를 확인했어요. 세부 화면에서 전체 순서를 볼 수 있어요.' : '카드를 누르면 루틴 요약을 먼저 보여드려요.'}</p>
    </section>
  </Screen>
}

function CreateRoutineCard({ image, description }: { image: string; description: string }) {
  return <Link to="/routine/edit" aria-label="새 루틴 만들기" className="group relative h-[360px] w-[260px] shrink-0 overflow-hidden rounded-[24px] text-left shadow-[0_10px_30px_rgba(0,0,0,.13)] transition hover:-translate-y-0.5 active:scale-[.99]">
    <img src={image} alt="" aria-hidden className="absolute inset-0 size-full scale-105 object-cover opacity-45 saturate-50 transition duration-500 group-hover:scale-100"/>
    <div aria-hidden className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,.82)_0%,rgba(255,255,255,.58)_45%,rgba(244,248,239,.95)_100%)]"/>
    <div className="relative flex h-full flex-col p-5">
      <span className="w-fit rounded-full border border-black/5 bg-white/75 px-3 py-2 text-xs font-medium text-black/55 backdrop-blur">비어 있는 카드</span>
      <div className="my-auto"><span className="grid size-12 place-items-center rounded-full bg-white text-black shadow-[0_6px_18px_rgba(0,0,0,.10)]"><Plus size={22}/></span><h2 className="mt-5 text-2xl font-medium leading-[1.12] tracking-[-.04em]">새 루틴을<br/>만들어보세요</h2><p className="mt-4 text-sm leading-5 text-black/55">{description}</p></div>
      <span className="flex h-12 items-center justify-center rounded-full bg-black text-sm font-medium text-white">루틴 만들기</span>
    </div>
  </Link>
}

function RoutineCarouselCard({ routine, current, image, expanded, onExpand, onCollapse }: { routine: Routine; current?: Routine; image: string; expanded: boolean; onExpand: () => void; onCollapse: () => void }) {
  if (expanded) return <article className="relative h-[360px] w-[260px] shrink-0 overflow-hidden rounded-[24px] bg-[#f7fff2] p-5 text-center shadow-[0_12px_34px_rgba(0,0,0,.17)]">
    <button type="button" onClick={onCollapse} className="absolute right-3 top-3 rounded-full px-2.5 py-1 text-xs font-medium text-[#8e8e93] transition active:bg-white" aria-label="카드 이미지로 돌아가기">접기</button>
    <h2 className="mt-8 text-2xl font-medium leading-tight tracking-[-.035em]">{routine.name}</h2>
    <dl className="mt-8 space-y-3 text-sm leading-5"><div><dt className="inline text-[#8e8e93]">사용 시점&nbsp; | &nbsp;</dt><dd className="inline font-medium">{dayPartLabel(routine.dayPart)}</dd></div><div><dt className="inline text-[#8e8e93]">제품 구성&nbsp; | &nbsp;</dt><dd className="inline font-medium">{routine.items.length}개 제품 조합</dd></div><div><dt className="inline text-[#8e8e93]">현재 상태&nbsp; | &nbsp;</dt><dd className="inline font-medium">{statusLabel(routine, current)}</dd></div></dl>
    <p className="mt-5 line-clamp-2 text-xs leading-5 text-[#a1a1a6]">{routine.items.map(item => item.productName).join(' · ')}</p>
    <Link to={`/routines/${routine.id}`} className="absolute inset-x-5 bottom-5 flex h-12 items-center justify-center rounded-full bg-[#0a0a0a] text-base font-medium text-white transition active:scale-[.98]">세부 내용 보기</Link>
  </article>

  return <button type="button" onClick={onExpand} aria-expanded="false" aria-label={`${routine.name} 요약 보기`} className="relative h-[360px] w-[260px] shrink-0 overflow-hidden rounded-[24px] text-left shadow-[0_12px_34px_rgba(0,0,0,.17)] transition active:scale-[.99]">
    <img src={image} alt="" aria-hidden className="absolute inset-0 size-full object-cover"/>
    <div aria-hidden className="absolute inset-0 bg-gradient-to-b from-white/75 via-white/5 to-white/10"/>
    <div className="absolute left-4 top-5 flex max-w-[calc(100%-32px)] gap-1.5"><span className="rounded-full bg-white/55 px-3 py-2 text-xs font-medium backdrop-blur">{dayPartLabel(routine.dayPart)}</span><span className="rounded-full bg-white/55 px-3 py-2 text-xs font-medium backdrop-blur">{routine.items.length}개 제품</span></div>
    <div className="absolute inset-x-4 bottom-6"><p className="text-sm font-medium text-black/60">{statusLabel(routine, current)}</p><p className="mt-1 text-2xl font-medium leading-[1.1] tracking-[-.04em]">{routine.name}</p><p className="mt-3 text-sm font-normal">{formatDate(routine.startedAt)}</p></div>
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
      <div className="flex items-start justify-between gap-4"><div><h1 className="text-4xl font-medium leading-tight tracking-[-.045em]">{routine.name}</h1><p className="mt-3 text-base text-[#8e8e93]">{formatDate(routine.startedAt)}</p></div>{isCurrent && <Link to="/routine/edit" className="mt-2 shrink-0 border-b border-[#8e8e93] pb-0.5 text-sm text-[#636366]">편집</Link>}</div>

      <section className="mt-8 rounded-[24px] bg-[#f5fbed] px-5 py-6" aria-labelledby="routine-analysis-title">
        <h2 id="routine-analysis-title" className="flex items-center gap-2 text-xl font-medium"><Sparkles size={22} strokeWidth={1.7}/>경험 연결</h2>
        <p className="mt-7 text-2xl font-medium leading-[1.4] tracking-[-.03em]">{isCurrent ? '현재 루틴의 경험을 연결하고 있어요' : '변화를 비교하는 기준 루틴이에요'}</p>
        <p className="mt-4 text-sm leading-6 text-[#4f534d]">{analysis}</p>

        <h3 className="mt-10 text-base font-medium tracking-[.02em]">ROUTINE</h3>
        <div className="relative mt-4 space-y-4">
          <div aria-hidden className="absolute bottom-10 left-3 top-10 w-px bg-[#98a18f]"/>
          {routine.items.map((item, index) => <div key={item.userProductId} className="relative flex items-center gap-4">
            <span className="z-10 grid size-6 shrink-0 place-items-center rounded-full bg-[#0a0a0a] text-xs font-medium text-white">{index + 1}</span>
            <Link to="/my-products" className="flex min-h-[84px] flex-1 items-center justify-between rounded-[14px] bg-white/90 px-4 py-3 shadow-[0_4px_16px_rgba(40,55,35,.06)] transition active:scale-[.99]"><div className="min-w-0"><p className="truncate text-base font-medium">{item.productName}</p><p className="mt-1.5 truncate text-xs text-[#636366]">{item.brand} · {item.category} · {item.frequency}</p></div><ChevronRight size={18} className="ml-2 shrink-0 text-[#636366]"/></Link>
          </div>)}
        </div>
      </section>

      <img src="/skn-assets/skn-wordmark.png" alt="SKN" className="mx-auto mt-12 h-12 w-auto object-contain"/>
    </div>

    <div className="pointer-events-none fixed inset-x-0 bottom-28 z-20 mx-auto flex max-w-[430px] justify-end px-5"><Link to={startChatPath('GENERAL', `${routine.name} 루틴의 제품 순서와 지금까지 남긴 경험을 함께 살펴봐줘.`)} aria-label="이 루틴에 대해 AI에게 질문하기" className="pointer-events-auto grid size-14 place-items-center rounded-full bg-[#0a0a0a] text-white shadow-[0_8px_24px_rgba(0,0,0,.22)] transition hover:bg-black active:scale-95"><MessageCircle size={25}/></Link></div>
  </Screen>
}
