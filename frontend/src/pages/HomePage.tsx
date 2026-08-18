import { useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight, ChevronRight } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { startChatPath } from '../lib/chat'
import { getHomeGreeting, type HomeGreetingTone } from '../lib/homeGreeting'
import type { Home, Pattern } from '../lib/types'
import { ActionIcon } from '../components/ActionIcon'
import { ExperienceActionIcon } from '../components/ExperienceActionIcon'
import { AppHeader, AssetMotion, BottomSheet, ErrorState, Loading, Screen } from '../components/ui'
import { ProductAddSheet } from '../components/ProductAddSheet'
import heroWave from '../assets/figma/hero-wave.webp'
import aiSparkIcon from '../assets/figma/home-ai-spark.svg'
import productSearchIcon from '../assets/figma/home-product-search.svg'
const insightGraphPresets = [
  'M112 136 L148 108 L184 110 L220 91 L255 89 L292 56 L350 34',
  'M110 136 L146 117 L182 92 L218 98 L253 71 L292 77 L350 47',
  'M115 136 L151 102 L187 106 L223 79 L258 85 L296 51 L350 58',
  'M109 136 L146 116 L182 87 L219 93 L255 62 L294 68 L350 38',
  'M111 136 L148 97 L185 102 L222 81 L258 87 L297 53 L350 27',
  'M108 136 L145 113 L181 90 L218 96 L254 67 L293 73 L350 43',
]

export function HomePage() {
  const navigate = useNavigate()
  const [productAddOpen, setProductAddOpen] = useState(false)
  const [selectedInsight, setSelectedInsight] = useState<Pattern | null>(null)
  const home = useQuery({ queryKey: ['home'], queryFn: api.home })

  if (home.isPending) return <Screen><AppHeader/><Loading variant="home" label="홈을 준비하는 중"/></Screen>
  if (home.error) return <Screen><AppHeader/><ErrorState message={home.error.message} onRetry={() => home.refetch()}/></Screen>
  const data = home.data
  const experience = data.currentExperience
  const greeting = getHomeGreeting(data)

  return <Screen className="bg-white">
    <AppHeader/>
    <div className="px-5 pb-6">
      <div className="mt-3"><h1 className="break-words text-[30px] font-semibold leading-[1.14] tracking-[-.045em] text-[#111722]">{data.displayName} 님</h1><p className={`mt-2.5 text-[12px] font-medium leading-5 tracking-[-.012em] ${homeGreetingTone(greeting.tone)}`}>{greeting.message}</p></div>

      <div className="mt-7">
        {experience ? <ActiveExperienceCard experience={experience} onOpen={() => navigate(`/experiences/${experience.id}`)} onRecord={() => navigate(`/experiences/${experience.id}/record`)}/>
          : <EmptyExperienceCard productCount={data.productCount}/>}
      </div>

      <section className="mt-5" aria-label="AI와 화장품 탐색">
        <button type="button" onClick={() => navigate('/ai')} className="group flex min-h-[74px] w-full items-center gap-3.5 overflow-hidden rounded-[20px] bg-[#050505] px-4 py-3.5 text-left text-white shadow-[0_8px_22px_rgba(0,0,0,.14)] transition hover:bg-black active:scale-[.99]">
          <span className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-[15px]"><img src={aiSparkIcon} alt="" aria-hidden className="size-full object-contain"/></span>
          <span className="min-w-0 flex-1"><strong className="block text-[14px] font-semibold leading-5 tracking-[-.025em]">피부에 대해 궁금한 게 있나요?</strong><span className="mt-1 block text-[11px] leading-4 text-[#cdd0d6]">SKN AI에게 편하게 물어보세요.</span></span>
          <ChevronRight size={18} strokeWidth={1.8} className="shrink-0 text-white/70 transition group-hover:translate-x-0.5"/>
        </button>
        <button type="button" onClick={() => setProductAddOpen(true)} className="group mt-3 flex min-h-[74px] w-full items-center gap-3.5 rounded-[20px] border border-[#dfe6f2] bg-[#f8faff] px-4 py-3.5 text-left shadow-[0_5px_18px_rgba(49,73,115,.05)] transition hover:border-[#ccd8e9] hover:bg-white active:scale-[.99]">
          <span className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-[15px]"><img src={productSearchIcon} alt="" aria-hidden className="size-full object-contain"/></span>
          <span className="min-w-0 flex-1"><strong className="block text-[14px] font-semibold leading-5 tracking-[-.025em] text-[#1a2230]">궁금한 제품이 있나요?</strong><span className="mt-1 block text-[11px] leading-4 text-[#7b8290]">추천받거나 직접 검색해보세요.</span></span>
          <ChevronRight size={18} strokeWidth={1.8} className="shrink-0 text-[#8290a5] transition group-hover:translate-x-0.5 group-hover:text-[#5f7396]"/>
        </button>
      </section>

      <section className="mt-10" aria-labelledby="home-insight-title">
        <div className="flex items-end justify-between gap-4"><div><h2 id="home-insight-title" className="text-lg font-semibold tracking-[-.025em]">INSIGHT</h2><p className="mt-1 text-[11px] leading-5 text-[#747b86]">최근 기록을 비교해, 반복된 경험만 연결해요.</p></div>{data.patterns.length > 0 && <Link to="/records" className="inline-flex shrink-0 items-center gap-0.5 pb-0.5 text-[11px] font-semibold text-[#667085]">전체 보기<ChevronRight size={13}/></Link>}</div>
        {data.patterns.length
          ? <InsightRail patterns={data.patterns.slice(0, 3)} onOpen={setSelectedInsight}/>
          : <EmptyInsightCard recordCount={data.recordCount} href={experience ? `/experiences/${experience.id}/record` : data.productCount ? '/routine/new' : '/explore'}/>}
      </section>

      <ProfilePreview recordCount={data.recordCount} patterns={data.patterns}/>
    </div>

    <ProductAddSheet
      open={productAddOpen}
      onClose={() => setProductAddOpen(false)}
      onAi={() => {
        setProductAddOpen(false)
        navigate(startChatPath('RECOMMEND', '내가 좋아했던 사용감과 아쉬웠던 경험을 바탕으로 다음에 탐색할 제품 후보를 찾아줘.'))
      }}
      onSearch={() => {
        setProductAddOpen(false)
        navigate('/explore')
      }}
    />
    <InsightEvidenceSheet pattern={selectedInsight} onClose={() => setSelectedInsight(null)}/>
  </Screen>
}

function homeGreetingTone(tone: HomeGreetingTone) {
  if (tone === 'welcome') return 'text-[#62789a]'
  if (tone === 'action') return 'text-[#68778e]'
  if (tone === 'saved') return 'text-[#667661]'
  if (tone === 'review') return 'text-[#826b61]'
  return 'text-[#7a808a]'
}

function InsightRail({ patterns, onOpen }: { patterns: Pattern[]; onOpen: (pattern: Pattern) => void }) {
  const railRef = useRef<HTMLDivElement>(null)
  const drag = useRef({ pointerId: -1, startX: 0, scrollLeft: 0, moved: false })
  const [dragging, setDragging] = useState(false)

  return <div
    ref={railRef}
    aria-label="최근 인사이트"
    className={`hide-scrollbar -mx-5 mt-4 flex select-none gap-2.5 overflow-x-auto px-5 pb-1 ${dragging ? 'cursor-grabbing snap-none' : 'cursor-grab snap-x snap-mandatory'}`}
    onPointerDown={event => {
      if (event.pointerType !== 'mouse' || event.button !== 0) return
      drag.current = { pointerId: event.pointerId, startX: event.clientX, scrollLeft: event.currentTarget.scrollLeft, moved: false }
      event.currentTarget.setPointerCapture(event.pointerId)
      setDragging(true)
    }}
    onPointerMove={event => {
      if (drag.current.pointerId !== event.pointerId) return
      const distance = event.clientX - drag.current.startX
      if (Math.abs(distance) > 4) drag.current.moved = true
      event.currentTarget.scrollLeft = drag.current.scrollLeft - distance
    }}
    onPointerUp={event => {
      if (drag.current.pointerId !== event.pointerId) return
      if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
      drag.current.pointerId = -1
      setDragging(false)
    }}
    onPointerCancel={() => {
      drag.current.pointerId = -1
      drag.current.moved = false
      setDragging(false)
    }}
    onClickCapture={event => {
      if (!drag.current.moved) return
      event.preventDefault()
      event.stopPropagation()
      drag.current.moved = false
    }}
  >
    {patterns.map(pattern => <InsightCard key={pattern.id} pattern={pattern} peek={patterns.length > 1} onOpen={() => onOpen(pattern)}/>)}
  </div>
}

function ActiveExperienceCard({ experience, onOpen, onRecord }: { experience: NonNullable<Home['currentExperience']>; onOpen: () => void; onRecord: () => void }) {
  const day = Math.max(1, Math.min(7, experience.day))
  const subjectLabel = experience.subjectType === 'ROUTINE' ? '지금 연구 중인 루틴' : '지금 연구 중인 제품'
  const routineKeywords = (experience.routine?.insight?.keywords || []).slice(0, 3)
  return <section className="relative left-1/2 aspect-[378/244] w-[104.42%] -translate-x-1/2" aria-label={`${subjectLabel}, 7일 중 ${day}일`}>
    <img src="/skn-assets/routine-research-card.svg" alt="" aria-hidden className="absolute inset-0 size-full"/>
    <div className="absolute inset-[8px] flex flex-col px-[clamp(16px,5vw,22px)] pb-[clamp(18px,5vw,22px)] pt-[clamp(14px,4.4vw,19px)]">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[clamp(11px,3vw,12px)] font-semibold leading-none tracking-[-.01em] text-[#4e6387]">{subjectLabel}</p>
        <p role="progressbar" aria-label={`7일 중 ${day}일`} aria-valuemin={1} aria-valuemax={7} aria-valuenow={day} className="shrink-0 rounded-full border border-white/85 bg-white/72 px-2.5 py-1 text-[10px] font-semibold leading-none tracking-[.035em] text-[#4b5f80] shadow-[0_2px_8px_rgba(56,83,129,.08)] backdrop-blur-sm tabular-nums">DAY {day} / 7</p>
      </div>
      <div className="shrink-0 pt-[clamp(8px,2.8vw,12px)]">
        <h2 className="line-clamp-1 max-w-[290px] text-[clamp(18px,5.1vw,21px)] font-semibold leading-[1.2] tracking-[-.035em] text-[#101725]">{experience.title}</h2>
        {experience.subjectType === 'ROUTINE'
          ? routineKeywords.length > 0 && <div className="mt-2 flex max-h-6 flex-wrap gap-1.5 overflow-hidden">{routineKeywords.map(keyword => <span key={keyword} className="max-w-[108px] truncate rounded-full border border-white/80 bg-white/56 px-2.5 py-1 text-[9px] font-semibold leading-none tracking-[-.01em] text-[#566b8c] backdrop-blur-sm">{keyword}</span>)}</div>
          : <p className="mt-1 line-clamp-1 text-xs font-medium leading-5 tracking-[-.015em] text-[#52647f]">{experience.subtitle}</p>}
      </div>
      <div className="mt-auto grid shrink-0 grid-cols-2 gap-2.5 px-0.5 pt-2">
        <button type="button" onClick={onOpen} className="flex h-[clamp(43px,11.8vw,46px)] min-w-0 items-center justify-center gap-1.5 rounded-[15px] border border-[#cad5e5]/80 bg-white/90 px-2 text-[9px] font-bold leading-none tracking-[-.01em] text-[#27354b] shadow-[0_4px_13px_rgba(43,65,102,.10)] backdrop-blur-md transition hover:border-[#b9c7dc] hover:bg-white active:scale-[.98]"><ActionIcon name="progress" className="size-4 shrink-0"/><span className="whitespace-nowrap">진행 상황 보기</span></button>
        <button type="button" onClick={onRecord} className="flex h-[clamp(43px,11.8vw,46px)] min-w-0 items-center justify-center gap-1.5 rounded-[15px] border border-[#111722] bg-[#111722] px-2 text-[9px] font-bold leading-none tracking-[-.01em] text-white shadow-[0_5px_15px_rgba(17,23,34,.18)] transition hover:bg-black active:scale-[.98]"><ExperienceActionIcon name="feeling" className="size-4 shrink-0"/><span className="whitespace-nowrap">기록 남기기</span></button>
      </div>
    </div>
  </section>
}

function EmptyExperienceCard({ productCount }: { productCount: number }) {
  const title = productCount ? <>내 제품으로<br/>첫 루틴을 시작해보세요</> : <>사용할수록<br/>나만의 기준이 선명해져요</>
  const description = productCount
    ? '가지고 있는 제품을 순서대로 엮고 사용감을 남기면, 다음 선택에 쓸 나만의 근거가 쌓여요'
    : <>첫 화장품을 담고 느낌을 남기면,<br/>흩어진 경험이 다음 제품과 루틴을 고르는 근거로 이어져요</>
  return <section className="relative min-h-[306px] overflow-hidden rounded-[28px] border border-[#dce5f3] shadow-[0_12px_34px_rgba(44,71,122,.11)]">
    <img src={heroWave} alt="" aria-hidden className="absolute inset-0 size-full scale-110 object-cover object-bottom"/>
    <div aria-hidden className="absolute inset-0 bg-[linear-gradient(145deg,rgba(255,255,255,.97)_0%,rgba(244,249,255,.8)_48%,rgba(204,224,255,.2)_100%)]"/>
    <div aria-hidden className="absolute -right-16 -top-20 size-56 rounded-full bg-white/70 blur-3xl"/>
    <div className="relative z-10 flex min-h-[306px] flex-col p-5">
      <div className="flex items-start justify-between gap-4">
        <span className="inline-flex h-7 items-center rounded-full border border-white/80 bg-white/72 px-3 text-[10px] font-semibold tracking-[.075em] text-[#52678c] shadow-[0_3px_12px_rgba(69,96,143,.06)] backdrop-blur">START HERE</span>
        <span aria-hidden className="grid size-14 shrink-0 place-items-center rounded-full border border-white/85 bg-white/52 shadow-[inset_0_0_20px_rgba(255,255,255,.9),0_8px_20px_rgba(94,126,179,.10)]">
          <AssetMotion name="ai-drop-motion" poster="/skn-assets/onboarding-orb.png" loop className="size-12 rounded-full mix-blend-multiply opacity-80"/>
        </span>
      </div>
      <div className="mt-4 max-w-[300px]"><h2 className="text-[25px] font-semibold leading-[1.16] tracking-[-.047em] [text-wrap:balance]">{title}</h2><p className="mt-2.5 max-w-[285px] text-[12px] font-medium leading-[1.65] tracking-[-.018em] text-[#687386]">{description}</p></div>
      <Link to="/routine/new" className="mt-auto flex h-[49px] w-full items-center justify-center gap-1.5 rounded-full bg-cta text-[14px] font-semibold leading-none tracking-[-.012em] text-white shadow-[0_9px_24px_rgba(17,23,34,.18)] transition hover:bg-black active:scale-[.98]">첫 루틴 만들기<ArrowRight size={16}/></Link>
    </div>
  </section>
}

function InsightCard({ pattern, peek, onOpen }: { pattern: Pattern; peek: boolean; onOpen: () => void }) {
  const graph = insightGraph(pattern)
  return <button type="button" onClick={onOpen} aria-label={`${pattern.title}, 근거와 함께 보기`} className={`relative min-h-[136px] snap-center overflow-hidden rounded-[24px] border border-[#dce5f3] bg-[#f5f8ff] px-5 py-4 text-left shadow-[0_8px_26px_rgba(49,73,115,.07)] transition hover:border-[#cfdbea] active:scale-[.99] ${peek ? 'w-[94%] shrink-0' : 'w-full'}`}>
    <svg viewBox="0 0 350 136" preserveAspectRatio="none" aria-hidden="true" className="pointer-events-none absolute inset-0 size-full">
      <path d={`${graph} L350 136 L108 136 Z`} fill="rgba(217,230,255,.5)"/>
      <path d={graph} fill="none" stroke="#b2ccff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke"/>
    </svg>
    <span className="relative inline-flex h-7 items-center gap-0.5 rounded-full bg-white/80 px-3 text-[10px] font-semibold tracking-[-.01em] text-[#637594] shadow-[inset_0_0_0_1px_rgba(204,218,240,.82)]">근거와 함께 보기<ChevronRight size={12}/></span>
    <span className="relative mt-8 block max-w-[285px] text-[17px] font-semibold leading-[1.38] tracking-[-.025em] [text-wrap:balance]">{pattern.title}</span>
  </button>
}

function EmptyInsightCard({ recordCount, href }: { recordCount: number; href: string }) {
  const actionTitle = recordCount === 0
    ? <>오늘 사용해봤다면<br/>첫 기록을 남겨보세요</>
    : <>오늘도 사용해봤다면<br/>새 기록을 남겨보세요</>
  const reason = recordCount === 0
    ? '아직 비교할 경험이 없어요. 첫 경험을 남기면 다음 기록부터 서로 살펴봐요.'
    : recordCount === 1
      ? '아직 비교할 비슷한 경험이 1개뿐이에요. 하나 더 쌓이면 반복된 흐름을 보여드려요.'
      : '아직 서로 비슷한 경험이 충분하지 않아요. 같은 제품이나 루틴의 사용 기록을 조금 더 남겨보세요.'
  return <div className="mt-4">
    <Link to={href} className="relative block min-h-[136px] overflow-hidden rounded-[24px] border border-[#dce5f3] bg-[#f5f8ff] p-4 shadow-[0_8px_26px_rgba(49,73,115,.07)] transition hover:border-[#cfdbea] active:scale-[.99]">
      <svg viewBox="0 0 350 136" preserveAspectRatio="none" aria-hidden="true" className="pointer-events-none absolute inset-0 size-full">
        <defs>
          <linearGradient id="insightAreaFill" x1="0" y1="0" x2="0" y2="1">
            <stop stopColor="#d9e6ff" stopOpacity=".5"/>
            <stop offset="1" stopColor="#d9e6ff" stopOpacity="0"/>
          </linearGradient>
        </defs>
        <path d="M112 136 L158 109 L202 110 L248 84 L294 78 L350 46 L350 136 Z" fill="url(#insightAreaFill)" stroke="none"/>
        <path d="M112 136 L158 109 L202 110" fill="none" stroke="#b2ccff" strokeWidth="1.5" strokeLinecap="round" vectorEffect="non-scaling-stroke"/>
        <path d="M202 110 L248 84 L294 78 L350 46" fill="none" stroke="#d9e6ff" strokeWidth="1" strokeLinecap="round" vectorEffect="non-scaling-stroke"/>
        <circle cx="202" cy="110" r="3.5" fill="#b2ccff" vectorEffect="non-scaling-stroke"/>
      </svg>
      <span className="relative inline-flex h-7 items-center gap-0.5 rounded-full bg-white/80 px-3 text-[10px] font-semibold tracking-[-.01em] text-[#637594] shadow-[inset_0_0_0_1px_rgba(204,218,240,.82)]">새 경험 남기기<ChevronRight size={12}/></span>
      <span className="relative mt-8 block max-w-[250px] text-[17px] font-semibold leading-[1.38] tracking-[-.025em]">{actionTitle}</span>
    </Link>
    <p className="mt-2.5 px-1 text-[10px] leading-[1.55] text-[#7c8491]">{reason}</p>
  </div>
}

function InsightEvidenceSheet({ pattern, onClose }: { pattern: Pattern | null; onClose: () => void }) {
  if (!pattern) return null
  const visibleEvidence = [
    ...pattern.evidence.filter(item => item.polarity === 'SUPPORTS').slice(0, 1),
    ...pattern.evidence.filter(item => item.polarity === 'CONTRADICTS').slice(0, 1),
  ]
  return <BottomSheet open onClose={onClose} title="인사이트 근거">
    <h3 className="max-w-[315px] text-[20px] font-semibold leading-[1.38] tracking-[-.035em] [text-wrap:balance]">{pattern.title}</h3>
    <p className="mt-2.5 text-[12px] leading-5 text-[#697382]">{pattern.summary}</p>
    <p className="mt-4 text-[10px] font-semibold text-[#697382]">같은 방향의 기록 {pattern.supportingCount} · 다른 기록 {pattern.contradictingCount}</p>
    <section className="mt-5 border-t border-[#dfe4eb]" aria-labelledby="home-insight-evidence-title">
      <h4 id="home-insight-evidence-title" className="pb-1 pt-4 text-[10px] font-semibold text-[#747d8a]">연결된 기록</h4>
      {visibleEvidence.length ? visibleEvidence.map(item => <article key={item.recordId} className="border-b border-[#e4e8ee] py-3.5">
        <div className="flex items-center justify-between gap-3"><p className="text-[9px] font-semibold text-[#7b8799]">{item.polarity === 'SUPPORTS' ? '같은 방향의 기록' : '다른 방향의 기록'}</p><time className="text-[9px] text-[#939aa5]">{formatInsightDate(item.createdAt)}</time></div>
        <p className="mt-1.5 text-[12px] font-medium leading-[1.55] tracking-[-.015em]">“{item.note}”</p>
        <p className="mt-1 text-[9px] text-[#858d99]">{item.productName}</p>
      </article>) : <p className="border-b border-[#e4e8ee] py-4 text-[11px] leading-5 text-[#7c8491]">원본 기록은 상세 화면에서 확인할 수 있어요.</p>}
    </section>
    <Link to={`/patterns/${pattern.id}`} onClick={onClose} className="mt-1 flex min-h-12 items-center justify-between border-b border-[#e1e5eb] text-[12px] font-semibold">연결된 기록 모두 보기<ChevronRight size={17} className="text-[#747d8b]"/></Link>
    <p className="mt-3 text-[9px] leading-4 text-[#8a919b]">현재 기록에서 보인 흐름이며 피부 타입이나 원인 판정이 아니에요.</p>
  </BottomSheet>
}

function insightGraph(pattern: Pattern) {
  const titleHash = Array.from(pattern.title).reduce((sum, character) => sum + (character.codePointAt(0) || 0), 0)
  return insightGraphPresets[Math.abs(pattern.id * 31 + titleHash) % insightGraphPresets.length]
}

function formatInsightDate(value: string) {
  const normalized = /Z$|[+-]\d\d:\d\d$/.test(value) ? value : `${value.replace(' ', 'T')}Z`
  const date = new Date(normalized)
  return Number.isNaN(date.getTime()) ? value.slice(0, 10) : new Intl.DateTimeFormat('ko-KR', { month: 'short', day: 'numeric' }).format(date)
}

const hexPoint = (index: number, radius: number) => {
  const angle = (-90 + index * 60) * Math.PI / 180
  return { x: 120 + Math.cos(angle) * radius, y: 120 + Math.sin(angle) * radius }
}

function ProfilePreview({ recordCount, patterns }: { recordCount: number; patterns: Pattern[] }) {
  const fields = [...patterns]
    .sort((left, right) => (right.supportingCount + right.contradictingCount) - (left.supportingCount + left.contradictingCount))
    .slice(0, 6)
  const slots = Array.from({ length: 6 }, (_, index) => fields[index])
  const hasProfile = fields.length > 0
  const areaPoints = slots.map((pattern, index) => {
    const evidenceCount = pattern ? pattern.supportingCount + pattern.contradictingCount : 0
    const point = hexPoint(index, evidenceCount ? 28 + Math.min(evidenceCount, 5) / 5 * 82 : 10)
    return `${point.x},${point.y}`
  }).join(' ')

  return <section className="mt-10 pb-8" aria-labelledby="profile-preview-title">
    <Link to="/records" className="flex items-end justify-between gap-4"><span><h2 id="profile-preview-title" className="text-lg font-semibold tracking-[-.025em]">PROFILE</h2><p className="mt-1 text-[11px] leading-5 text-[#747b86]">나의 경험 지도</p></span><span className="inline-flex shrink-0 items-center gap-0.5 pb-0.5 text-[11px] font-semibold text-[#667085]">전체 보기<ChevronRight size={13}/></span></Link>
    <div className="mt-4 overflow-hidden rounded-[24px] border border-[#dce5f3] bg-[linear-gradient(155deg,#fbfdff,#eef4ff)] p-4 shadow-[0_8px_26px_rgba(49,73,115,.07)]">
      <span className="inline-flex h-7 items-center rounded-full bg-white/80 px-3 text-[10px] font-semibold tracking-[-.01em] text-[#637594] shadow-[inset_0_0_0_1px_rgba(204,218,240,.82)]">{hasProfile ? `발견한 흐름 ${fields.length}개` : recordCount ? `기록 ${recordCount}건 비교 중` : '첫 기록을 기다리는 중'}</span>

      <div className="mx-auto mt-1 aspect-square w-full max-w-[236px]">
        <svg viewBox="0 0 240 240" className="size-full overflow-visible" role="img" aria-label={hasProfile ? `사용자 기록에서 동적으로 선정된 ${fields.length}개 필드의 육각형 근거 지도` : '기록이 쌓이면 필드가 동적으로 만들어지는 빈 육각형 근거 지도'}>
          <g fill="none" stroke="#c3d1e6" strokeWidth="1">
            {[110, 76, 42].map(radius => <polygon key={radius} points={Array.from({ length: 6 }, (_, index) => { const point = hexPoint(index, radius); return `${point.x},${point.y}` }).join(' ')}/>)}
            {Array.from({ length: 6 }, (_, index) => { const point = hexPoint(index, 110); return <line key={index} x1="120" y1="120" x2={point.x} y2={point.y}/> })}
          </g>
          {hasProfile && fields.length > 1 && <polygon points={areaPoints} fill="rgba(95,115,150,.3)" stroke="#5f7396" strokeWidth="2"/>}
          {slots.map((pattern, index) => {
            if (!pattern) return null
            const evidenceCount = pattern.supportingCount + pattern.contradictingCount
            const point = hexPoint(index, 28 + Math.min(evidenceCount, 5) / 5 * 82)
            return <circle key={pattern.id} cx={point.x} cy={point.y} r="5" fill="#5f7396" stroke="#fff" strokeWidth="2"/>
          })}
          {Array.from({ length: 6 }, (_, index) => {
            const point = hexPoint(index, 110)
            return slots[index] ? <g key={index}><circle cx={point.x} cy={point.y} r="10" fill="#fff" stroke="#c3d1e6"/><text x={point.x} y={point.y + 3.5} textAnchor="middle" fontSize="9" fontWeight="700" fill="#526f9f">{index + 1}</text></g> : <circle key={index} cx={point.x} cy={point.y} r="3" fill="#c3d1e6"/>
          })}
          {!hasProfile && <g><circle cx="120" cy="120" r="16" fill="#fff" stroke="#b8c8de"/><text x="120" y="126" textAnchor="middle" fontSize="18" fontWeight="700" fill="#7897ce">?</text></g>}
        </svg>
      </div>

      {hasProfile ? <div className="-mx-1 mt-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {fields.map((pattern, index) => <Link key={pattern.id} to={`/patterns/${pattern.id}`} aria-label={`${index + 1}번 필드 ${pattern.title}, 근거 기록 보기`} className="inline-flex h-10 max-w-[190px] shrink-0 items-center gap-2 rounded-full bg-white/85 px-3 shadow-[inset_0_0_0_1px_rgba(211,224,245,.9)] transition active:scale-[.98]">
          <span className="grid size-5 shrink-0 place-items-center rounded-full bg-[#e2ecff] text-[9px] font-semibold text-[#526f9f]">{index + 1}</span>
          <span className="truncate text-[11px] font-medium text-[#303641]">{pattern.title}</span>
        </Link>)}
      </div> : <div className="mt-1 text-center"><p className="text-sm font-medium">기록이 쌓이면 모양이 생겨요.</p><p className="mt-1 text-[11px] text-[#68778f]">내 경험에 맞춰 여섯 축이 달라집니다.</p></div>}

      <div className="mt-3 flex items-center justify-between gap-3 border-t border-[#d9e4f5] pt-3">
        <p className="text-[10px] text-[#6d788a]">{hasProfile ? '기록이 쌓일수록 모양도 달라져요.' : '관련 경험 2개부터 연결해요.'}</p>
        <Link to={recordCount ? '/records' : '/explore'} className="inline-flex h-8 shrink-0 items-center gap-0.5 rounded-full bg-[#121318] px-3.5 text-[10px] font-medium text-white">{hasProfile ? '자세히' : recordCount ? '기록 보기' : '시작하기'}<ChevronRight size={12}/></Link>
      </div>
    </div>
  </section>
}
