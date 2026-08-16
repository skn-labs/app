import { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight, Check, ChevronRight, Search, Sparkles, X } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import type { Home, Pattern } from '../lib/types'
import { AppHeader, Card, ErrorState, Loading, Screen } from '../components/ui'
import heroWave from '../assets/figma/hero-wave.webp'
import insightWave1 from '../assets/figma/insight-wave-1.svg'
import insightWave2 from '../assets/figma/insight-wave-2.svg'

const insightWaves = [insightWave1, insightWave2]

export function HomePage() {
  const navigate = useNavigate()
  const [endOpen, setEndOpen] = useState(false)
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
        {experience ? <ActiveExperienceCard experience={experience} onOpen={() => navigate(`/experiences/${experience.id}`)} onEnd={() => setEndOpen(true)}/>
          : <EmptyExperienceCard productCount={data.productCount}/>}
      </div>

      <button type="button" onClick={() => navigate('/ai')} className="interactive-card mt-5 flex min-h-[100px] w-full items-center gap-4 rounded-[22px] bg-[#050505] px-5 py-4 text-left text-white shadow-[0_8px_24px_rgba(0,0,0,.12)]">
        <div className="grid size-11 shrink-0 place-items-center text-[#dce6ff]"><Sparkles size={30} strokeWidth={1.45}/></div>
        <div className="min-w-0 flex-1"><p className="text-xs font-medium text-[#cdd0d6]">SKN AI에게 편하게 물어보세요.</p><p className="mt-1 text-lg font-medium leading-snug tracking-[-.02em]">피부에 대해 궁금한 게 있나요?</p></div>
        <ChevronRight size={24} className="shrink-0 text-white/75"/>
      </button>

      <section className="mt-10" aria-labelledby="home-insight-title">
        <h2 id="home-insight-title" className="text-lg font-medium tracking-[-.02em]">MY INSIGHT</h2>
        <p className="mt-1 text-xs leading-5 text-[#636366]">최근 기록을 비교해, 반복된 경험만 연결해요.</p>
        {data.patterns.length ? <div className="mt-4 space-y-3">{data.patterns.slice(0, 2).map((pattern, index) => <InsightCard key={pattern.id} pattern={pattern} wave={insightWaves[index % insightWaves.length]}/>)}</div>
          : <Card className="mt-4 border-0 bg-[#f5f8ff] px-5 py-6 text-left"><span className="inline-flex items-center gap-1 rounded-full bg-[#e4edff] px-3 py-1 text-xs font-medium text-[#566482]"><Check size={12}/>기록을 기다리는 중</span><p className="mt-4 text-base font-medium">두 번째 경험부터 서로 비교해요</p><p className="mt-1.5 text-xs leading-5 text-[#777d88]">좋았던 점과 아쉬웠던 점이 쌓이면<br/>근거가 있는 반복만 이곳에 나타나요.</p></Card>}
        {data.patterns.length > 0 && <Link to="/records" className="mt-3 flex items-center justify-end gap-1 text-xs font-medium text-[#3a3a3c]">더보기<ChevronRight size={13}/></Link>}
      </section>

      <button type="button" onClick={() => navigate('/explore')} className="interactive-card mt-7 flex min-h-[92px] w-full items-center gap-4 rounded-[22px] border border-[#d9e6ff] bg-[#fbfdff] px-5 py-4 text-left">
        <Search size={31} strokeWidth={1.6} className="shrink-0 text-[#7892bb]"/>
        <div className="min-w-0 flex-1"><p className="text-xs text-[#5f7396]">검색해서 내 LAB에 등록해보세요.</p><p className="mt-1 text-lg font-medium tracking-[-.02em]">궁금한 제품이 있나요?</p></div>
        <ChevronRight size={23} className="shrink-0 text-[#7892bb]"/>
      </button>

      <ProfilePreview recordCount={data.recordCount} patterns={data.patterns}/>
    </div>

    {experience && endOpen && (
      <EndExperienceDialog
        onClose={() => setEndOpen(false)}
        onConfirm={() => {
          setEndOpen(false)
          navigate(`/experiences/${experience.id}/record?end=1`)
        }}
      />
    )}
  </Screen>
}

function ActiveExperienceCard({ experience, onOpen, onEnd }: { experience: NonNullable<Home['currentExperience']>; onOpen: () => void; onEnd: () => void }) {
  const day = Math.max(1, Math.min(7, experience.day))
  const subjectLabel = experience.subjectType === 'ROUTINE' ? '지금 연구 중인 루틴' : '지금 연구 중인 제품'
  return <section className="relative mx-auto aspect-[378/216] w-full max-w-[378px]" aria-label={`${subjectLabel}, 7일 중 ${day}일`}>
    <img src="/skn-assets/routine-research-card.svg" alt="" aria-hidden className="absolute inset-0 size-full"/>
    <div className="absolute inset-[8px] flex flex-col px-[clamp(16px,5vw,22px)] py-[clamp(14px,4.4vw,19px)]">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[clamp(11px,3vw,12px)] font-semibold leading-none tracking-[-.01em] text-[#4e6387]">{subjectLabel}</p>
        <p role="progressbar" aria-label={`7일 중 ${day}일`} aria-valuemin={1} aria-valuemax={7} aria-valuenow={day} className="shrink-0 rounded-full border border-white/85 bg-white/72 px-2.5 py-1 text-[10px] font-semibold leading-none tracking-[.04em] text-[#4b5f80] shadow-[0_2px_8px_rgba(56,83,129,.08)] backdrop-blur-sm tabular-nums">DAY {day} / 7</p>
      </div>
      <div className="min-h-0 flex-1 pt-[clamp(8px,2.8vw,12px)]">
        <h2 className="line-clamp-1 max-w-[290px] text-[clamp(21px,6.3vw,27px)] font-semibold leading-[1.12] tracking-[-.048em] text-[#101725]">{experience.title}</h2>
        <p className="mt-1 line-clamp-1 text-[clamp(11px,3.3vw,13px)] font-medium leading-5 tracking-[-.02em] text-[#52647f]">{experience.subtitle}</p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={onEnd} className="h-[clamp(36px,10.5vw,42px)] rounded-full border border-white/90 bg-white/72 text-[clamp(11px,3.3vw,13px)] font-semibold text-[#1c2a3d] shadow-[0_4px_14px_rgba(47,74,119,.08)] backdrop-blur-md transition hover:bg-white active:scale-[.98]">느낌 남기기</button>
        <button type="button" onClick={onOpen} className="h-[clamp(36px,10.5vw,42px)] rounded-full bg-[#111722] text-[clamp(11px,3.3vw,13px)] font-semibold text-white shadow-[0_7px_18px_rgba(17,23,34,.18)] transition hover:bg-black active:scale-[.98]">연구 노트 보기</button>
      </div>
    </div>
  </section>
}

function EmptyExperienceCard({ productCount }: { productCount: number }) {
  return <section className="relative min-h-[300px] overflow-hidden rounded-[30px] border border-[#d8e5fb] shadow-[0_18px_48px_rgba(44,71,122,.16)]">
    <img src={heroWave} alt="" aria-hidden className="absolute inset-0 size-full scale-110 object-cover object-bottom"/>
    <div aria-hidden className="absolute inset-0 bg-[linear-gradient(145deg,rgba(255,255,255,.97)_0%,rgba(244,249,255,.8)_48%,rgba(204,224,255,.2)_100%)]"/>
    <div aria-hidden className="absolute -right-7 top-12 size-44 rounded-full border border-white/70 bg-white/22 shadow-[inset_0_0_34px_rgba(255,255,255,.8),0_14px_34px_rgba(106,143,202,.12)] backdrop-blur-[3px]"/>
    <img src="/skn-assets/onboarding-orb.png" alt="" aria-hidden className="absolute right-2 top-16 size-28 object-contain opacity-80"/>
    <div className="relative flex min-h-[300px] flex-col p-5">
      <span className="w-fit rounded-full bg-white/72 px-3 py-2 text-xs font-medium text-[#52678c] backdrop-blur">START YOUR SKN</span>
      <div className="my-auto max-w-[285px]"><h2 className="text-[28px] font-medium leading-[1.16] tracking-[-.045em]">첫 기록부터<br/>나만의 기준이 생겨요.</h2><p className="mt-3 max-w-[265px] text-sm leading-6 text-black/52">{productCount ? '가지고 있는 화장품으로 실제 사용 조합을 만들고, 느낀 순간을 이어보세요.' : '화장품 하나를 담으면 제품·루틴·경험이 연결되는 나만의 아카이브가 시작돼요.'}</p></div>
      <Link to={productCount ? '/routine/edit' : '/explore'} className="flex h-[54px] w-full items-center justify-center gap-1 rounded-full bg-black text-base font-medium text-white shadow-[0_9px_24px_rgba(0,0,0,.18)] transition active:scale-[.98]">{productCount ? '새 경험 시작하기' : '첫 화장품 담기'}<ArrowRight size={17}/></Link>
    </div>
  </section>
}

function InsightCard({ pattern, wave }: { pattern: Pattern; wave: string }) {
  const records = pattern.supportingCount + pattern.contradictingCount
  return <Link to={`/patterns/${pattern.id}`} className="relative block min-h-[128px] overflow-hidden rounded-[22px] bg-[#f5f8ff] px-5 py-4 transition active:scale-[.99]">
    <img src={wave} alt="" aria-hidden className="absolute inset-0 size-full object-cover"/>
    <div className="relative flex min-h-[96px] flex-col items-start"><span className="rounded-full bg-[#dce8ff]/75 px-3 py-1 text-xs font-medium">기록 {records}건</span><p className="mt-auto max-w-[86%] text-lg font-medium leading-[1.35] tracking-[-.02em]">{pattern.title}</p></div>
  </Link>
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

  return <section className="mt-11 pb-8" aria-labelledby="profile-preview-title">
    <Link to="/records" className="flex items-center justify-between"><span><h2 id="profile-preview-title" className="text-lg font-medium tracking-[-.02em]">MY PROFILE</h2><p className="mt-1 text-xs text-[#636366]">나의 경험 지도</p></span><ChevronRight size={24}/></Link>
    <div className="mt-5 overflow-hidden rounded-[28px] border border-[#d8e5fb] bg-[linear-gradient(155deg,#fbfdff,#eef4ff)] p-4 shadow-[0_14px_38px_rgba(68,98,151,.08)]">
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

function EndExperienceDialog({ onClose, onConfirm }: { onClose: () => void; onConfirm: () => void }) {
  const dialog = useRef<HTMLElement>(null)
  const close = useRef(onClose)
  close.current = onClose
  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null
    dialog.current?.focus({ preventScroll: true })
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') close.current() }
    window.addEventListener('keydown', closeOnEscape)
    return () => {
      window.removeEventListener('keydown', closeOnEscape)
      previousFocus?.focus({ preventScroll: true })
    }
  }, [])

  return <div className="fixed inset-0 z-50 grid place-items-center bg-black/35 px-7 backdrop-blur-[2px]" onPointerDown={onClose}>
    <section ref={dialog} role="dialog" aria-modal="true" aria-labelledby="end-experience-title" aria-describedby="end-experience-description" tabIndex={-1} className="relative w-full max-w-[342px] rounded-[26px] bg-white px-6 pb-6 pt-8 text-center shadow-[0_24px_80px_rgba(0,0,0,.24)] outline-none" onPointerDown={event => event.stopPropagation()}>
      <button type="button" onClick={onClose} aria-label="닫기" className="absolute right-3 top-3 grid size-9 place-items-center rounded-full text-[#8e8e93] transition active:bg-[#f2f2f7]"><X size={18}/></button>
      <img src="/skn-assets/onboarding-orb.png" alt="" className="mx-auto size-16 object-contain"/>
      <h2 id="end-experience-title" className="mt-4 text-2xl font-medium tracking-[-.035em]">이번 경험 확인을 마칠까요?</h2>
      <p id="end-experience-description" className="mx-auto mt-3 max-w-[270px] text-sm leading-5 text-[#636366]">마치기 전에 지금까지의 느낌을 남겨요. 현재 사용 루틴은 그대로 유지됩니다.</p>
      <div className="mt-7 grid grid-cols-2 gap-2"><button type="button" onClick={onClose} className="h-[52px] rounded-full bg-[#eef3ff] text-base font-medium transition active:scale-[.98]">취소</button><button type="button" onClick={onConfirm} className="h-[52px] rounded-full bg-[#0a0a0a] text-base font-medium text-white transition active:scale-[.98]">느낌 남기기</button></div>
    </section>
  </div>
}
