import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight, ChevronRight, NotebookText, Search, Sparkles } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { startChatPath } from '../lib/chat'
import type { Home, Pattern } from '../lib/types'
import { AppHeader, BottomSheet, ErrorState, Loading, Screen } from '../components/ui'
import { ProductAddSheet } from '../components/ProductAddSheet'
import heroWave from '../assets/figma/hero-wave.webp'
const insightGraphPresets = [
  'M112 122 L148 108 L184 110 L220 91 L255 89 L292 56 L350 34',
  'M110 116 L146 117 L182 92 L218 98 L253 71 L292 77 L350 47',
  'M115 124 L151 102 L187 106 L223 79 L258 85 L296 51 L350 58',
  'M109 112 L146 116 L182 87 L219 93 L255 62 L294 68 L350 38',
  'M111 121 L148 97 L185 102 L222 81 L258 87 L297 53 L350 27',
  'M108 115 L145 113 L181 90 L218 96 L254 67 L293 73 L350 43',
]

export function HomePage() {
  const navigate = useNavigate()
  const [productAddOpen, setProductAddOpen] = useState(false)
  const [selectedInsight, setSelectedInsight] = useState<Pattern | null>(null)
  const home = useQuery({ queryKey: ['home'], queryFn: api.home })

  if (home.isPending) return <Screen><AppHeader/><Loading/></Screen>
  if (home.error) return <Screen><AppHeader/><ErrorState message={home.error.message} onRetry={() => home.refetch()}/></Screen>
  const data = home.data
  const experience = data.currentExperience

  return <Screen className="bg-white">
    <AppHeader/>
    <div className="px-5 pb-6">
      <div className="mt-3"><h1 className="display-title break-words">{data.displayName} 님</h1><p className="mt-2 text-sm leading-6 text-black/50">오늘의 사용 경험을 가볍게 이어가요.</p></div>

      <div className="mt-7">
        {experience ? <ActiveExperienceCard experience={experience} onOpen={() => navigate(`/experiences/${experience.id}`)} onRecord={() => navigate(`/experiences/${experience.id}/record`)}/>
          : <EmptyExperienceCard productCount={data.productCount}/>}
      </div>

      <section className="mt-5" aria-label="AI와 화장품 탐색">
        <button type="button" onClick={() => navigate('/ai')} className="group flex min-h-[104px] w-full items-center gap-4 overflow-hidden rounded-[24px] bg-[#050505] px-5 py-4 text-left text-white shadow-[0_10px_26px_rgba(0,0,0,.14)] transition hover:bg-black active:scale-[.99]">
          <span className="grid size-11 shrink-0 place-items-center text-[#dce6ff]"><Sparkles size={30} strokeWidth={1.45}/></span>
          <span className="min-w-0 flex-1"><span className="block text-xs font-medium leading-5 text-[#cdd0d6]">SKN AI에게 편하게 물어보세요.</span><strong className="mt-0.5 block text-base font-semibold leading-[1.35] tracking-[-.02em]">피부에 대해 궁금한 게 있나요?</strong></span>
          <ChevronRight size={24} className="shrink-0 text-white/75 transition group-hover:translate-x-0.5"/>
        </button>
        <button type="button" onClick={() => setProductAddOpen(true)} className="group mt-3 flex min-h-[72px] w-full items-center gap-3 rounded-[20px] border border-[#dfe6f2] bg-[#f8faff] px-4 py-3 text-left shadow-[0_6px_20px_rgba(49,73,115,.055)] transition hover:border-[#cfdbea] hover:bg-white active:scale-[.99]">
          <span className="min-w-0 flex-1"><span className="block text-[10px] font-semibold tracking-[.1em] text-[#7892bb]">MY LAB</span><strong className="mt-1 block text-[14px] font-semibold leading-5 tracking-[-.025em] text-[#1a2230]">궁금한 제품이 있나요?</strong><span className="mt-0.5 block text-[11px] leading-4 text-[#7b8290]">추천받거나 검색해 담아보세요.</span></span>
          <span className="flex h-11 shrink-0 items-center gap-1.5 rounded-full bg-white px-4 text-[12px] font-semibold text-[#5f7396] shadow-[inset_0_0_0_1px_rgba(207,219,238,.9)] transition group-hover:bg-[#edf3ff]"><Search size={15} strokeWidth={1.9}/>제품 찾기</span>
        </button>
      </section>

      <section className="mt-10" aria-labelledby="home-insight-title">
        <div className="flex items-end justify-between gap-4"><div><h2 id="home-insight-title" className="text-lg font-semibold tracking-[-.025em]">MY INSIGHT</h2><p className="mt-1 text-[11px] leading-5 text-[#747b86]">최근 기록을 비교해, 반복된 경험만 연결해요.</p></div>{data.patterns.length > 0 && <Link to="/records" className="shrink-0 pb-0.5 text-[11px] font-semibold text-[#667085]">전체 보기</Link>}</div>
        {data.patterns.length
          ? <div className="hide-scrollbar -mx-5 mt-4 flex snap-x snap-mandatory gap-2.5 overflow-x-auto px-5 pb-1" aria-label="최근 인사이트">{data.patterns.slice(0, 3).map(pattern => <InsightCard key={pattern.id} pattern={pattern} peek={data.patterns.length > 1} onOpen={() => setSelectedInsight(pattern)}/>)}</div>
          : <EmptyInsightCard recordCount={data.recordCount} href={experience ? `/experiences/${experience.id}/record` : data.productCount ? '/routine/edit' : '/explore'}/>}
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

function ActiveExperienceCard({ experience, onOpen, onRecord }: { experience: NonNullable<Home['currentExperience']>; onOpen: () => void; onRecord: () => void }) {
  const day = Math.max(1, Math.min(7, experience.day))
  const subjectLabel = experience.subjectType === 'ROUTINE' ? '지금 연구 중인 루틴' : '지금 연구 중인 제품'
  return <section className="relative left-1/2 aspect-[378/216] w-[104.42%] -translate-x-1/2" aria-label={`${subjectLabel}, 7일 중 ${day}일`}>
    <img src="/skn-assets/routine-research-card.svg" alt="" aria-hidden className="absolute inset-0 size-full"/>
    <div className="absolute inset-[8px] flex flex-col px-[clamp(16px,5vw,22px)] py-[clamp(14px,4.4vw,19px)]">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[clamp(11px,3vw,12px)] font-semibold leading-none tracking-[-.01em] text-[#4e6387]">{subjectLabel}</p>
        <p role="progressbar" aria-label={`7일 중 ${day}일`} aria-valuemin={1} aria-valuemax={7} aria-valuenow={day} className="shrink-0 rounded-full border border-white/85 bg-white/72 px-2.5 py-1 text-[10px] font-semibold leading-none tracking-[.035em] text-[#4b5f80] shadow-[0_2px_8px_rgba(56,83,129,.08)] backdrop-blur-sm tabular-nums">DAY {day} / 7</p>
      </div>
      <div className="min-h-0 flex-1 pt-[clamp(8px,2.8vw,12px)]">
        <h2 className="line-clamp-1 max-w-[290px] text-[clamp(20px,5.6vw,24px)] font-semibold leading-[1.16] tracking-[-.04em] text-[#101725]">{experience.title}</h2>
        <p className="mt-1 line-clamp-1 text-xs font-medium leading-5 tracking-[-.015em] text-[#52647f]">{experience.subtitle}</p>
      </div>
      <div className="grid h-[clamp(48px,12.8vw,51px)] grid-cols-[minmax(0,.94fr)_minmax(0,1.06fr)] gap-1.5 rounded-[18px] border border-white/90 bg-white/82 p-1.5 shadow-[0_7px_22px_rgba(47,74,119,.12)] backdrop-blur-md">
        <button type="button" onClick={onOpen} className="flex min-w-0 items-center justify-center gap-1.5 rounded-[13px] text-[12px] font-bold leading-none tracking-[-.02em] text-[#40516c] transition hover:bg-[#edf3fc] active:scale-[.975] active:bg-[#e5edf9]"><NotebookText size={15} strokeWidth={2}/><span>연구 노트 보기</span></button>
        <button type="button" onClick={onRecord} className="flex min-w-0 items-center justify-center gap-1.5 rounded-[13px] bg-[#111722] text-[13px] font-bold leading-none tracking-[-.02em] text-white shadow-[0_5px_14px_rgba(17,23,34,.20)] transition hover:bg-black active:scale-[.975] active:bg-[#202838]"><span>느낌 남기기</span><ArrowRight size={15} strokeWidth={2}/></button>
      </div>
    </div>
  </section>
}

function EmptyExperienceCard({ productCount }: { productCount: number }) {
  return <section className="relative min-h-[300px] overflow-hidden rounded-[28px] border border-[#dce5f3] shadow-[0_12px_34px_rgba(44,71,122,.11)]">
    <img src={heroWave} alt="" aria-hidden className="absolute inset-0 size-full scale-110 object-cover object-bottom"/>
    <div aria-hidden className="absolute inset-0 bg-[linear-gradient(145deg,rgba(255,255,255,.97)_0%,rgba(244,249,255,.8)_48%,rgba(204,224,255,.2)_100%)]"/>
    <div aria-hidden className="absolute -right-7 top-12 size-44 rounded-full border border-white/70 bg-white/22 shadow-[inset_0_0_34px_rgba(255,255,255,.8),0_14px_34px_rgba(106,143,202,.12)] backdrop-blur-[3px]"/>
    <img src="/skn-assets/onboarding-orb.png" alt="" aria-hidden className="absolute right-2 top-16 size-28 object-contain opacity-80"/>
    <div className="relative flex min-h-[300px] flex-col p-5">
      <span className="w-fit rounded-full bg-white/72 px-3 py-2 text-xs font-medium text-[#52678c] backdrop-blur">START YOUR SKN</span>
      <div className="my-auto max-w-[285px]"><h2 className="text-[28px] font-medium leading-[1.16] tracking-[-.045em]">첫 기록부터<br/>나만의 기준이 생겨요.</h2><p className="mt-3 max-w-[265px] text-sm leading-6 text-black/52">{productCount ? '가지고 있는 화장품으로 실제 사용 조합을 만들고, 느낀 순간을 이어보세요.' : '화장품 하나를 담으면 제품·루틴·경험이 연결되는 나만의 아카이브가 시작돼요.'}</p></div>
      <Link to={productCount ? '/routine/edit' : '/explore'} className="flex h-[54px] w-full items-center justify-center gap-1 rounded-full bg-black text-[13px] font-semibold leading-none tracking-[-.015em] text-white shadow-[0_9px_24px_rgba(0,0,0,.18)] transition active:scale-[.98]">{productCount ? '새 경험 시작하기' : '첫 화장품 담기'}<ArrowRight size={17}/></Link>
    </div>
  </section>
}

function InsightCard({ pattern, peek, onOpen }: { pattern: Pattern; peek: boolean; onOpen: () => void }) {
  const graph = insightGraph(pattern)
  return <button type="button" onClick={onOpen} aria-label={`${pattern.title}, 근거와 함께 보기`} className={`relative min-h-[136px] snap-center overflow-hidden rounded-[24px] border border-[#dce5f3] bg-[#f5f8ff] px-5 py-4 text-left shadow-[0_8px_26px_rgba(49,73,115,.07)] transition hover:border-[#cfdbea] active:scale-[.99] ${peek ? 'w-[94%] shrink-0' : 'w-full'}`}>
    <svg viewBox="0 0 350 136" preserveAspectRatio="none" aria-hidden="true" className="pointer-events-none absolute inset-0 size-full">
      <path d={`${graph} L350 136 L108 136 Z`} fill="rgba(216,231,255,.56)"/>
      <path d={graph} fill="none" stroke="#c9dcff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke"/>
    </svg>
    <span className="relative inline-flex h-7 items-center gap-0.5 rounded-full bg-white/80 px-3 text-[10px] font-semibold tracking-[-.01em] text-[#637594] shadow-[inset_0_0_0_1px_rgba(204,218,240,.82)]">근거와 함께 보기<ChevronRight size={12}/></span>
    <span className="relative mt-8 block max-w-[285px] text-[17px] font-semibold leading-[1.38] tracking-[-.025em] [text-wrap:balance]">{pattern.title}</span>
  </button>
}

function EmptyInsightCard({ recordCount, href }: { recordCount: number; href: string }) {
  const reason = recordCount === 0
    ? '아직 비교할 경험이 없어요. 첫 경험을 남기면 다음 기록부터 서로 살펴봐요.'
    : recordCount === 1
      ? '아직 비교할 비슷한 경험이 1개뿐이에요. 하나 더 쌓이면 반복된 흐름을 보여드려요.'
      : '아직 서로 비슷한 경험이 충분하지 않아요. 같은 제품이나 루틴의 느낌을 이어서 남겨보세요.'
  return <div className="mt-4">
    <Link to={href} className="relative block min-h-[136px] overflow-hidden rounded-[24px] border border-[#dce5f3] bg-[#f5f8ff] px-5 py-4 shadow-[0_8px_26px_rgba(49,73,115,.07)] transition hover:border-[#cfdbea] active:scale-[.99]">
      <svg viewBox="0 0 350 136" preserveAspectRatio="none" aria-hidden="true" className="pointer-events-none absolute inset-0 size-full">
        <path d="M112 122 L158 109 L202 110" fill="none" stroke="#b9d0f6" strokeWidth="3" strokeLinecap="round" vectorEffect="non-scaling-stroke"/>
        <path d="M202 110 L248 84 L294 78 L350 46" fill="none" stroke="#cddbf1" strokeWidth="2" strokeDasharray="6 7" strokeLinecap="round" vectorEffect="non-scaling-stroke"/>
        <circle cx="202" cy="110" r="4" fill="#fff" stroke="#87a6d9" strokeWidth="2" vectorEffect="non-scaling-stroke"/>
      </svg>
      <span className="relative inline-flex h-7 items-center gap-0.5 rounded-full bg-white/80 px-3 text-[10px] font-semibold tracking-[-.01em] text-[#637594] shadow-[inset_0_0_0_1px_rgba(204,218,240,.82)]">새 경험 남기기<ChevronRight size={12}/></span>
      <span className="relative mt-8 block max-w-[250px] text-[17px] font-semibold leading-[1.38] tracking-[-.025em]">두 번째 경험부터<br/>서로 비교해요</span>
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
        <div className="flex items-center justify-between gap-3"><p className="text-[9px] font-semibold text-[#7b8799]">{item.polarity === 'SUPPORTS' ? '같은 방향의 기록' : '다르게 느낀 기록'}</p><time className="text-[9px] text-[#939aa5]">{formatInsightDate(item.createdAt)}</time></div>
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
    <Link to="/records" className="flex items-end justify-between gap-4"><span><h2 id="profile-preview-title" className="text-lg font-semibold tracking-[-.025em]">MY PROFILE</h2><p className="mt-1 text-[11px] leading-5 text-[#747b86]">나의 경험 지도</p></span><span className="inline-flex shrink-0 items-center gap-0.5 pb-0.5 text-[11px] font-semibold text-[#667085]">전체 보기<ChevronRight size={13}/></span></Link>
    <div className="mt-4 overflow-hidden rounded-[24px] border border-[#dce5f3] bg-[linear-gradient(155deg,#fbfdff,#eef4ff)] p-4 shadow-[0_8px_26px_rgba(49,73,115,.07)]">
      <span className="inline-flex rounded-full bg-white/85 px-3 py-2 text-[11px] font-medium text-[#52678c] shadow-[inset_0_0_0_1px_rgba(201,218,248,.75)]">{hasProfile ? `발견한 흐름 ${fields.length}개` : recordCount ? `기록 ${recordCount}건 비교 중` : '첫 기록을 기다리는 중'}</span>

      <div className="mx-auto mt-1 aspect-square w-full max-w-[236px]">
        <svg viewBox="0 0 240 240" className="size-full overflow-visible" role="img" aria-label={hasProfile ? `사용자 기록에서 동적으로 선정된 ${fields.length}개 필드의 육각형 근거 지도` : '기록이 쌓이면 필드가 동적으로 만들어지는 빈 육각형 근거 지도'}>
          <g fill="none" stroke="#bfd0ed" strokeWidth="1">
            {[110, 76, 42].map(radius => <polygon key={radius} points={Array.from({ length: 6 }, (_, index) => { const point = hexPoint(index, radius); return `${point.x},${point.y}` }).join(' ')}/>)}
            {Array.from({ length: 6 }, (_, index) => { const point = hexPoint(index, 110); return <line key={index} x1="120" y1="120" x2={point.x} y2={point.y}/> })}
          </g>
          {hasProfile && fields.length > 1 && <polygon points={areaPoints} fill="rgba(127,159,215,.34)" stroke="#6f90ca" strokeWidth="2"/>}
          {slots.map((pattern, index) => {
            if (!pattern) return null
            const evidenceCount = pattern.supportingCount + pattern.contradictingCount
            const point = hexPoint(index, 28 + Math.min(evidenceCount, 5) / 5 * 82)
            return <circle key={pattern.id} cx={point.x} cy={point.y} r="5" fill="#6f90ca" stroke="#fff" strokeWidth="2"/>
          })}
          {Array.from({ length: 6 }, (_, index) => {
            const point = hexPoint(index, 110)
            return slots[index] ? <g key={index}><circle cx={point.x} cy={point.y} r="10" fill="#fff" stroke="#b7c9e8"/><text x={point.x} y={point.y + 3.5} textAnchor="middle" fontSize="9" fontWeight="700" fill="#526f9f">{index + 1}</text></g> : <circle key={index} cx={point.x} cy={point.y} r="3" fill="#b7c9e8"/>
          })}
          {!hasProfile && <g><circle cx="120" cy="120" r="16" fill="#fff" stroke="#a9bee3"/><text x="120" y="126" textAnchor="middle" fontSize="18" fontWeight="700" fill="#7897ce">?</text></g>}
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
