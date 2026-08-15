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
      <p className="mt-3 text-sm font-medium text-[#7892bb]">TODAY IN SKN</p>
      <h1 className="display-title mt-2 break-words">{data.displayName} 님의<br/>오늘을 볼게요</h1>

      <div className="mt-6">
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

      <ProfilePreview recordCount={data.recordCount} patternCount={data.patterns.length}/>
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
  return <div className="relative px-1 pb-3"><div aria-hidden className="absolute inset-x-4 bottom-0 top-5 rounded-[24px] bg-[#e8effc]"/><div aria-hidden className="absolute inset-x-2 bottom-1 top-2 rounded-[24px] border border-[#dbe6f8] bg-[#f5f8ff]"/><section className="relative min-h-[220px] overflow-hidden rounded-[24px] border border-white/80 shadow-[0_10px_30px_rgba(24,36,65,.13)]" aria-label={`현재 확인 중인 경험, 7일 중 ${day}일`}>
    <img src={heroWave} alt="" aria-hidden className="absolute inset-0 size-full object-cover object-bottom"/>
    <div aria-hidden className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,.9)_0%,rgba(245,249,255,.58)_48%,rgba(224,235,255,.22)_100%)]"/>
    <div className="relative flex min-h-[220px] flex-col p-5">
      <div className="flex items-center justify-between"><p className="text-xs font-medium text-black/65">확인 중인 경험</p><p className="text-sm font-medium tabular-nums">DAY {day} / 7</p></div>
      <div role="progressbar" aria-label={`7일 중 ${day}일`} aria-valuemin={1} aria-valuemax={7} aria-valuenow={day} className="mt-3 flex gap-1.5">{Array.from({ length: 7 }, (_, index) => <span key={index} className={`h-1 flex-1 rounded-full ${index < day ? 'bg-[#0a0a0a]' : 'bg-[#0a0a0a]/20'}`}/>)}</div>
      <div className="min-h-0 flex-1 py-4"><h2 className="line-clamp-1 text-lg font-medium tracking-[-.03em]">{experience.title}</h2><p className="mt-1.5 line-clamp-1 text-xs text-black/55">{experience.subtitle}</p></div>
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={onEnd} className="h-12 rounded-full border border-white/70 bg-white/72 text-sm font-medium backdrop-blur transition hover:bg-white active:scale-[.98]">경험 마치기</button>
        <button type="button" onClick={onOpen} className="h-12 rounded-full bg-[#0a0a0a] text-sm font-medium text-white shadow-sm transition hover:bg-black active:scale-[.98]">자세히 보기</button>
      </div>
    </div>
  </section></div>
}

function EmptyExperienceCard({ productCount }: { productCount: number }) {
  return <div className="relative px-1 pb-4"><div aria-hidden className="absolute inset-x-5 bottom-0 top-7 rounded-[26px] bg-[#dfe9fb]"/><div aria-hidden className="absolute inset-x-3 bottom-2 top-3 rounded-[26px] border border-[#d5e2f6] bg-[#f1f6ff]"/><section className="relative min-h-[252px] overflow-hidden rounded-[26px] border border-white/85 shadow-[0_12px_34px_rgba(24,36,65,.14)]">
    <img src={heroWave} alt="" aria-hidden className="absolute inset-0 size-full scale-105 object-cover object-bottom"/>
    <div aria-hidden className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,.94)_0%,rgba(246,250,255,.74)_50%,rgba(222,234,255,.28)_100%)]"/>
    <div className="relative flex min-h-[252px] flex-col p-5">
      <span className="w-fit rounded-full bg-white/75 px-3 py-2 text-xs font-medium text-[#5f7396] backdrop-blur">첫 번째 경험 카드</span>
      <div className="my-auto"><h2 className="text-2xl font-medium leading-[1.2] tracking-[-.04em]">아직 비어 있어도,<br/>오늘부터 채울 수 있어요.</h2><p className="mt-3 max-w-[285px] text-sm leading-5 text-black/55">{productCount ? '가지고 있는 화장품으로 실제 사용 조합을 만들고, 기억이 선명할 때 느낌을 남겨보세요.' : '화장품 하나를 추가하면 제품·루틴·경험이 이어지는 나만의 기록이 시작돼요.'}</p></div>
      <Link to={productCount ? '/routine/edit' : '/explore'} className="flex h-13 w-full items-center justify-center gap-1 rounded-full bg-black text-base font-medium text-white shadow-[0_7px_20px_rgba(0,0,0,.14)] transition active:scale-[.98]">{productCount ? '새 경험 시작하기' : '첫 화장품 추가하기'}<ArrowRight size={17}/></Link>
    </div>
  </section></div>
}

function InsightCard({ pattern, wave }: { pattern: Pattern; wave: string }) {
  const records = pattern.supportingCount + pattern.contradictingCount
  return <Link to={`/patterns/${pattern.id}`} className="relative block min-h-[128px] overflow-hidden rounded-[22px] bg-[#f5f8ff] px-5 py-4 transition active:scale-[.99]">
    <img src={wave} alt="" aria-hidden className="absolute inset-0 size-full object-cover"/>
    <div className="relative flex min-h-[96px] flex-col items-start"><span className="rounded-full bg-[#dce8ff]/75 px-3 py-1 text-xs font-medium">기록 {records}건</span><p className="mt-auto max-w-[86%] text-lg font-medium leading-[1.35] tracking-[-.02em]">{pattern.title}</p></div>
  </Link>
}

function ProfilePreview({ recordCount, patternCount }: { recordCount: number; patternCount: number }) {
  return <section className="mt-11 pb-8" aria-labelledby="profile-preview-title">
    <Link to="/records" className="flex items-center justify-between"><span><h2 id="profile-preview-title" className="text-lg font-medium tracking-[-.02em]">MY PROFILE</h2><p className="mt-1 text-xs text-[#636366]">기록을 통해 발견한 나의 스킨케어 성향</p></span><ChevronRight size={24}/></Link>
    <Link to="/records" className="mt-5 grid grid-cols-[minmax(0,1fr)_minmax(0,.78fr)] items-end gap-4">
      <div className="grid aspect-square place-items-center rounded-[22px] border border-[#d9e6ff] bg-[#fbfdff] p-4"><svg viewBox="0 0 160 160" className="size-full" role="img" aria-label="기록이 쌓이면 스킨케어 성향을 연결하는 빈 육각형 차트"><g fill="none" stroke="#d8e5ff" strokeWidth="1"><path d="M80 8 142 44v72l-62 36-62-36V44Z"/><path d="m80 32 41 24v48l-41 24-41-24V56Z"/><path d="m80 56 21 12v24l-21 12-21-12V68Z"/><path d="M80 8v144M18 44l124 72M142 44 18 116"/></g><circle cx="80" cy="80" r="13" fill="#fff" stroke="#c9dafb"/><text x="80" y="85" textAnchor="middle" fontSize="17" fill="#9ab8e8" fontWeight="600">?</text></svg></div>
      <div className="pb-4"><p className="text-lg font-medium leading-snug">내 피부 취향은?</p><p className="mt-1.5 text-xs leading-5 text-[#5f7396]">{patternCount ? `근거가 있는 인사이트 ${patternCount}개` : recordCount ? `${recordCount}개 기록을 서로 비교하는 중` : '첫 경험부터 차곡차곡 연결해요'}</p></div>
    </Link>
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
