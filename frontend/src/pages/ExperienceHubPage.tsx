import { useQuery } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { ArrowRight, Clock3, History } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { api, ApiError } from '../lib/api'
import type { Experience, Routine } from '../lib/types'
import { AppHeader, Card, ErrorState, Loading, Screen } from '../components/ui'

function isNotFound(error: unknown) {
  return error instanceof ApiError && error.status === 404
}

export function ExperienceHubPage() {
  const navigate = useNavigate()
  const home = useQuery({ queryKey: ['home'], queryFn: api.home })
  const current = useQuery({ queryKey: ['current-routine'], queryFn: api.currentRoutine, retry: false })
  const baseline = useQuery({ queryKey: ['baseline-routine'], queryFn: api.baselineRoutine, retry: false })
  const records = useQuery({ queryKey: ['records'], queryFn: api.records })

  const pending = home.isPending || current.isPending || baseline.isPending || records.isPending
  if (pending) return <Screen><AppHeader/><Loading label="My Lab을 정리하는 중"/></Screen>

  const loadError = home.error
    || records.error
    || (current.error && !isNotFound(current.error) ? current.error : null)
    || (baseline.error && !isNotFound(baseline.error) ? baseline.error : null)
  if (loadError) return <Screen><AppHeader/><ErrorState message={loadError.message} onRetry={() => {
    home.refetch()
    current.refetch()
    baseline.refetch()
    records.refetch()
  }}/></Screen>

  const experience = home.data.currentExperience
  return <Screen className="bg-white">
    <AppHeader/>
    <div className="px-5 pb-8 pt-3">
      <p className="text-[12px] font-medium uppercase tracking-[.1em] text-[#8e8e93]">My Lab</p>
      <h1 className="mt-2 text-[31px] font-semibold leading-[1.18] tracking-[-.05em]">써본 조건과 느낌을<br/>한 흐름으로 봐요.</h1>
      <p className="mt-3 text-[13px] leading-5 text-[#777d88]">확인 중인 경험과 실제 사용 루틴을 구분하고,<br/>내가 남긴 기록을 시간순으로 연결합니다.</p>

      <section className="mt-9" aria-labelledby="active-experience-title">
        <p className="text-[11px] font-semibold text-[#5f7396]">7일 동안 사용감을 남기는 조합</p>
        <h2 id="active-experience-title" className="mt-1.5 text-[20px] font-semibold tracking-[-.035em]">확인 중인 경험</h2>
        {experience
          ? <ActiveExperienceCard experience={experience} onRecord={() => navigate(`/experiences/${experience.id}/record`)} onDiscomfort={() => navigate(`/experiences/${experience.id}/record?discomfort=1`)}/>
          : <Card className="mt-3 border-[#d9e6ff] bg-[#fbfdff] px-5 py-8 text-center">
            <h3 className="text-[17px] font-semibold">지금 확인 중인 경험이 없어요</h3>
            <p className="mx-auto mt-3 max-w-[290px] text-[12px] leading-5 text-[#777d88]">{current.data ? '현재 루틴은 그대로 사용 중이에요. 조합을 바꾸면 새 경험 기록이 시작됩니다.' : '실제로 사용할 제품과 순서를 정하면 그 조건으로 경험 기록이 시작됩니다.'}</p>
            <Link to="/routine/edit" className="mt-6 flex min-h-12 w-full items-center justify-center rounded-full bg-[#0a0a0a] px-5 text-sm font-semibold text-white">새 연구 시작하기</Link>
          </Card>}
      </section>

      <section className="mt-10" aria-labelledby="current-routine-title">
        <SectionHeading eyebrow="ROUTINE" title="현재 사용 루틴" id="current-routine-title" action={<Link to="/routine/edit" className="rounded-full px-3 py-2 text-xs font-semibold text-[#5365f5]">편집</Link>}/>
        {current.data
          ? <RoutineSummary routine={current.data}/>
          : <Card className="mt-3 border-dashed"><p className="text-sm font-semibold">등록된 루틴이 없어요</p><p className="mt-1 text-xs leading-5 text-[#73766f]">아침·저녁, 순서와 실제 빈도를 함께 저장할 수 있어요.</p><Link to="/routine/edit" className="mt-4 inline-flex min-h-11 items-center gap-1 text-xs font-semibold text-[#5365f5]">루틴 만들기 <ArrowRight size={14}/></Link></Card>}
      </section>

      <section className="mt-10" aria-labelledby="baseline-routine-title">
        <SectionHeading eyebrow="COMPARISON" title="비교 기준 루틴" id="baseline-routine-title"/>
        {baseline.data
          ? <RoutineSummary routine={baseline.data} baseline/>
          : <Card className="mt-3 border-dashed"><p className="text-sm font-semibold">아직 비교 기준이 없어요</p><p className="mt-1 text-xs leading-5 text-[#73766f]">사용 경험에서 불편함이 없었다고 직접 남긴 루틴만 이후 변경 비교의 기준이 됩니다.</p></Card>}
      </section>

      <section className="mt-10 pb-4" aria-labelledby="recent-records-title">
        <SectionHeading eyebrow="HISTORY" title="최근 경험" id="recent-records-title" action={<Link to="/records" className="rounded-full px-3 py-2 text-xs font-semibold text-[#73766f]">전체보기</Link>}/>
        {records.data.length
          ? <div className="mt-4 border-l border-[#e7e9e3] pl-5">{records.data.slice(0, 4).map(record => <article key={record.id} className="relative pb-6 last:pb-0"><span aria-hidden="true" className="absolute -left-[25px] top-1 size-2 rounded-full bg-[#5365f5] ring-4 ring-white"/><p className="text-[10px] font-semibold text-[#73766f]">{record.createdAt.slice(0, 10)}</p><h3 className="mt-1 text-sm font-semibold">{record.productName}</h3><p className="mt-1 line-clamp-2 text-xs leading-5 text-[#73766f]">{record.note || (record.sentiment === 'LIKED' ? '마음에 들었던 경험' : record.sentiment === 'DISAPPOINTED' ? '아쉬웠던 경험' : '아직 판단하기 어려운 경험')}</p></article>)}</div>
          : <Card className="mt-3 border-dashed"><div className="flex items-center gap-3"><History className="text-[#73766f]" size={19}/><p className="text-sm font-semibold">아직 남긴 경험이 없어요</p></div></Card>}
      </section>
    </div>
  </Screen>
}

function ActiveExperienceCard({ experience, onRecord, onDiscomfort }: { experience: Experience; onRecord: () => void; onDiscomfort: () => void }) {
  const day = Math.max(1, Math.min(7, experience.day))
  return <Card className="mt-3 overflow-hidden border-[#cfe0ff] bg-white p-0 text-black shadow-[0_8px_28px_rgba(37,63,112,.07)]">
    <Link to={`/experiences/${experience.id}`} className="block p-5">
      <div className="flex items-center justify-between gap-3"><span className="rounded-full bg-black px-3 py-1 text-[11px] font-medium text-white">확인 중 · DAY {day}</span><span className="text-[11px] text-[#73766f]">{experience.reviewDue ? '오늘 돌아보기' : `${experience.daysUntilReview}일 뒤 돌아보기`}</span></div>
      <h3 className="mt-5 text-xl font-semibold tracking-[-.03em]">{experience.title}</h3>
      <p className="mt-2 line-clamp-1 text-xs text-[#73766f]">{experience.subtitle}</p>
      <div role="progressbar" aria-label={`7일 중 ${day}일`} aria-valuemin={1} aria-valuemax={7} aria-valuenow={day} className="mt-5 h-1.5 overflow-hidden rounded-full bg-[#edf3ff]"><div className="h-full rounded-full bg-black" style={{ width: `${day / 7 * 100}%` }}/></div>
    </Link>
    <div className="grid grid-cols-[1fr_auto] gap-2 border-t border-[#dce8ff] p-3">
      <button type="button" onClick={onRecord} className="min-h-12 rounded-full bg-black px-4 text-sm font-semibold text-white">지금 느낌 남기기</button>
      <button type="button" onClick={onDiscomfort} aria-label="피부 불편함 기록" className="min-h-12 rounded-full border border-[#efcaca] bg-white px-4 text-xs font-semibold text-[#b44d4d]">불편함</button>
    </div>
  </Card>
}

function SectionHeading({ eyebrow, title, id, action }: { eyebrow: string; title: string; id: string; action?: ReactNode }) {
  return <div className="flex items-end justify-between gap-3"><div><p className="text-[11px] font-semibold tracking-[.08em] text-[#73766f]">{eyebrow}</p><h2 id={id} className="mt-1 text-xl font-semibold tracking-[-.035em]">{title}</h2></div>{action}</div>
}

function RoutineSummary({ routine, baseline = false }: { routine: Routine; baseline?: boolean }) {
  const groups = [
    { label: '아침', items: routine.items.filter(item => item.timeSlot === 'MORNING' || item.timeSlot === 'BOTH') },
    { label: '저녁', items: routine.items.filter(item => item.timeSlot === 'EVENING' || item.timeSlot === 'BOTH') },
  ].filter(group => group.items.length)

  return <Card className={`mt-3 overflow-hidden p-0 ${baseline ? 'bg-[#f7f8f5]' : ''}`}>
    <Link to={`/routines/${routine.id}`} className="flex min-h-[68px] items-center justify-between px-4 py-4"><div><span className="text-[10px] font-semibold text-[#73766f]">{baseline ? '불편함이 없었다고 남긴 조합' : '실제 사용 중인 조합'}</span><h3 className="mt-1 text-sm font-semibold">{routine.name}</h3></div><Clock3 size={17} className="text-[#73766f]"/></Link>
    {groups.map(group => <div key={group.label} className="border-t border-[#e7e9e3]"><div className="bg-white/60 px-4 py-2 text-[10px] font-semibold text-[#73766f]">{group.label} · {group.items.length}개</div>{group.items.map((item, index) => <div key={`${group.label}-${item.userProductId}`} className="flex items-center gap-3 border-t border-[#e7e9e3]/70 px-4 py-3"><span className="grid size-6 place-items-center rounded-full bg-white text-[10px] font-semibold">{index + 1}</span><div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold">{item.productName}</p><p className="mt-0.5 text-[10px] text-[#73766f]">{item.category} · {item.frequency}</p></div></div>)}</div>)}
    {baseline && <p className="border-t border-[#e7e9e3] px-4 py-3 text-[10px] leading-5 text-[#73766f]">적합성이나 안전 판정이 아니라, 이후 변경을 비교하기 위한 내 기록입니다.</p>}
  </Card>
}
