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
  if (home.isError) return <Screen><AppHeader/><ErrorState message={home.error.message} onRetry={() => home.refetch()}/></Screen>
  const data = home.data
  const experience = data.currentExperience

  return <Screen className="bg-white">
    <AppHeader/>
    <div className="px-5 pb-6">
      <h1 className="mt-4 break-words text-[clamp(30px,9vw,36px)] font-medium leading-[1.08] tracking-[-.045em]">{data.displayName} 님</h1>

      <div className="mt-8">
        {experience ? <ActiveRoutineCard experience={experience} onOpen={() => navigate(`/experiences/${experience.id}`)} onEnd={() => setEndOpen(true)}/>
          : <EmptyRoutineCard productCount={data.productCount}/>}
      </div>

      <button type="button" onClick={() => navigate('/ai')} className="mt-4 flex min-h-[108px] w-full items-center gap-4 rounded-[22px] bg-[#050505] px-5 py-4 text-left text-white shadow-[0_8px_24px_rgba(0,0,0,.12)] transition active:scale-[.99]">
        <div className="grid size-11 shrink-0 place-items-center text-[#dce6ff]"><Sparkles size={30} strokeWidth={1.45}/></div>
        <div className="min-w-0 flex-1"><p className="text-[12px] font-medium text-[#cdd0d6]">SKN AI에게 편하게 물어보세요.</p><p className="mt-1 text-[17px] font-medium leading-snug tracking-[-.02em]">피부에 대해 궁금한 게 있나요?</p></div>
        <ChevronRight size={24} className="shrink-0 text-white/75"/>
      </button>

      <section className="mt-10" aria-labelledby="home-insight-title">
        <h2 id="home-insight-title" className="text-[17px] font-medium tracking-[-.02em]">MY INSIGHT</h2>
        <p className="mt-1 text-[12px] leading-5 text-[#636366]">최근 기록을 비교해, 반복된 경험만 연결해요.</p>
        {data.patterns.length ? <div className="mt-4 space-y-3">{data.patterns.slice(0, 2).map((pattern, index) => <InsightCard key={pattern.id} pattern={pattern} wave={insightWaves[index % insightWaves.length]}/>)}</div>
          : <Card className="mt-4 border-0 bg-[#f5f8ff] px-5 py-6 text-left"><span className="inline-flex items-center gap-1 rounded-full bg-[#e4edff] px-3 py-1 text-[11px] font-medium text-[#566482]"><Check size={12}/>기록을 기다리는 중</span><p className="mt-4 text-[16px] font-medium">두 번째 경험부터 서로 비교해요</p><p className="mt-1.5 text-xs leading-5 text-[#777d88]">좋았던 점과 아쉬웠던 점이 쌓이면<br/>근거가 있는 반복만 이곳에 나타나요.</p></Card>}
        {data.patterns.length > 0 && <Link to="/records" className="mt-3 flex items-center justify-end gap-1 text-xs font-medium text-[#3a3a3c]">더보기<ChevronRight size={13}/></Link>}
      </section>

      <button type="button" onClick={() => navigate('/explore')} className="mt-7 flex min-h-[96px] w-full items-center gap-4 rounded-[22px] border border-[#d9e6ff] bg-[#fbfdff] px-5 py-4 text-left transition active:scale-[.99]">
        <Search size={31} strokeWidth={1.6} className="shrink-0 text-[#7892bb]"/>
        <div className="min-w-0 flex-1"><p className="text-[12px] text-[#5f7396]">검색해서 내 LAB에 등록해보세요.</p><p className="mt-1 text-[17px] font-medium tracking-[-.02em]">궁금한 제품이 있나요?</p></div>
        <ChevronRight size={23} className="shrink-0 text-[#7892bb]"/>
      </button>

      <ProfilePreview recordCount={data.recordCount} patternCount={data.patterns.length}/>
    </div>

    {experience && endOpen && (
      <EndRoutineDialog
        onClose={() => setEndOpen(false)}
        onConfirm={() => {
          setEndOpen(false)
          navigate(`/experiences/${experience.id}/record?end=1`)
        }}
      />
    )}
  </Screen>
}

function ActiveRoutineCard({ experience, onOpen, onEnd }: { experience: NonNullable<Home['currentExperience']>; onOpen: () => void; onEnd: () => void }) {
  const day = Math.max(1, Math.min(7, experience.day))
  return <section className="relative min-h-[270px] overflow-hidden rounded-[22px] shadow-[0_4px_18px_rgba(24,36,65,.12)]" aria-label={`현재 확인 중인 루틴, 7일 중 ${day}일`}>
    <img src={heroWave} alt="" aria-hidden className="absolute inset-0 size-full object-cover object-bottom"/>
    <div aria-hidden className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,.88)_0%,rgba(245,249,255,.58)_48%,rgba(224,235,255,.22)_100%)]"/>
    <div className="relative flex min-h-[270px] flex-col p-5">
      <div className="flex items-center justify-between"><h2 className="text-[16px] font-medium">현재 연구 중인 루틴</h2><p className="text-[16px] font-medium tabular-nums">DAY {day} / 7</p></div>
      <div role="progressbar" aria-label={`7일 중 ${day}일`} aria-valuemin={1} aria-valuemax={7} aria-valuenow={day} className="mt-4 flex gap-2">{Array.from({ length: 7 }, (_, index) => <span key={index} className={`h-1 flex-1 rounded-full ${index < day ? 'bg-[#0a0a0a]' : 'bg-[#0a0a0a]/20'}`}/>)}</div>
      <div className="flex-1"/>
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={onEnd} className="h-[52px] rounded-full border border-white/70 bg-white/72 text-[14px] font-medium backdrop-blur transition hover:bg-white active:scale-[.98]">연구 마치기</button>
        <button type="button" onClick={onOpen} className="h-[52px] rounded-full bg-[#0a0a0a] text-[14px] font-semibold text-white shadow-sm transition hover:bg-black active:scale-[.98]">자세히 보기</button>
      </div>
    </div>
  </section>
}

function EmptyRoutineCard({ productCount }: { productCount: number }) {
  return <section className="relative min-h-[220px] overflow-hidden rounded-[22px] shadow-[0_4px_18px_rgba(24,36,65,.12)]">
    <img src={heroWave} alt="" aria-hidden className="absolute inset-0 size-full object-cover object-bottom"/>
    <div aria-hidden className="absolute inset-0 bg-white/38"/>
    <div className="relative flex min-h-[220px] flex-col items-center justify-end px-5 pb-5 text-center">
      <p className="mb-8 text-[15px] font-medium">현재 연구 중인 루틴이 없습니다.</p>
      <Link to={productCount ? '/routine/edit' : '/explore'} className="flex h-[52px] w-full items-center justify-center gap-1 rounded-full border border-[#d4e2ff] bg-white/80 text-[16px] font-medium backdrop-blur transition active:scale-[.98]">새 연구 시작하기<ArrowRight size={17}/></Link>
    </div>
  </section>
}

function InsightCard({ pattern, wave }: { pattern: Pattern; wave: string }) {
  const records = pattern.supportingCount + pattern.contradictingCount
  return <Link to={`/patterns/${pattern.id}`} className="relative block min-h-[128px] overflow-hidden rounded-[22px] bg-[#f5f8ff] px-5 py-4 transition active:scale-[.99]">
    <img src={wave} alt="" aria-hidden className="absolute inset-0 size-full object-cover"/>
    <div className="relative flex min-h-[96px] flex-col items-start"><span className="rounded-full bg-[#dce8ff]/75 px-3 py-1 text-[11px] font-medium">기록 {records}건</span><p className="mt-auto max-w-[86%] text-[17px] font-medium leading-[1.35] tracking-[-.02em]">{pattern.title}</p></div>
  </Link>
}

function ProfilePreview({ recordCount, patternCount }: { recordCount: number; patternCount: number }) {
  return <section className="mt-11 pb-8" aria-labelledby="profile-preview-title">
    <Link to="/records" className="flex items-center justify-between"><span><h2 id="profile-preview-title" className="text-[17px] font-medium tracking-[-.02em]">MY PROFILE</h2><p className="mt-1 text-[12px] text-[#636366]">기록을 통해 발견한 나의 스킨케어 성향</p></span><ChevronRight size={24}/></Link>
    <Link to="/records" className="mt-5 grid grid-cols-[minmax(0,1fr)_minmax(0,.78fr)] items-end gap-4">
      <div className="grid aspect-square place-items-center rounded-[22px] border border-[#d9e6ff] bg-[#fbfdff] p-4"><svg viewBox="0 0 160 160" className="size-full" role="img" aria-label="기록이 쌓이면 스킨케어 성향을 연결하는 빈 육각형 차트"><g fill="none" stroke="#d8e5ff" strokeWidth="1"><path d="M80 8 142 44v72l-62 36-62-36V44Z"/><path d="m80 32 41 24v48l-41 24-41-24V56Z"/><path d="m80 56 21 12v24l-21 12-21-12V68Z"/><path d="M80 8v144M18 44l124 72M142 44 18 116"/></g><circle cx="80" cy="80" r="13" fill="#fff" stroke="#c9dafb"/><text x="80" y="85" textAnchor="middle" fontSize="17" fill="#9ab8e8" fontWeight="600">?</text></svg></div>
      <div className="pb-4"><p className="text-[18px] font-medium leading-snug">내 피부 취향은?</p><p className="mt-1.5 text-[12px] leading-5 text-[#5f7396]">{patternCount ? `근거가 있는 인사이트 ${patternCount}개` : recordCount ? `${recordCount}개 기록을 서로 비교하는 중` : '첫 경험부터 차곡차곡 연결해요'}</p></div>
    </Link>
  </section>
}

function EndRoutineDialog({ onClose, onConfirm }: { onClose: () => void; onConfirm: () => void }) {
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
    <section ref={dialog} role="dialog" aria-modal="true" aria-labelledby="end-routine-title" aria-describedby="end-routine-description" tabIndex={-1} className="relative w-full max-w-[342px] rounded-[26px] bg-white px-6 pb-6 pt-8 text-center shadow-[0_24px_80px_rgba(0,0,0,.24)] outline-none" onPointerDown={event => event.stopPropagation()}>
      <button type="button" onClick={onClose} aria-label="닫기" className="absolute right-3 top-3 grid size-9 place-items-center rounded-full text-[#8e8e93] transition active:bg-[#f2f2f7]"><X size={18}/></button>
      <img src="/skn-assets/onboarding-orb.png" alt="" className="mx-auto size-16 object-contain"/>
      <h2 id="end-routine-title" className="mt-4 text-[24px] font-semibold tracking-[-.035em]">이번 연구를 마칠까요?</h2>
      <p id="end-routine-description" className="mx-auto mt-3 max-w-[270px] text-[13px] leading-5 text-[#636366]">연구를 마치기 전에 지금까지의 느낌을 남겨요. 현재 사용 루틴은 그대로 유지됩니다.</p>
      <div className="mt-7 grid grid-cols-2 gap-2"><button type="button" onClick={onClose} className="h-[52px] rounded-full bg-[#eef3ff] text-[15px] font-semibold transition active:scale-[.98]">취소</button><button type="button" onClick={onConfirm} className="h-[52px] rounded-full bg-[#0a0a0a] text-[15px] font-semibold text-white transition active:scale-[.98]">느낌 남기기</button></div>
    </section>
  </div>
}
