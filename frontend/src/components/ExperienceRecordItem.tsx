import { ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { formatExperienceRecordDate } from '../lib/experience'
import type { ExperienceRecord } from '../lib/types'
import { ExperienceStatusGroup } from './ExperienceStatusBadge'

export function ExperienceRecordItem({ record, href, actionLabel, showTitle = true, className = '' }: {
  record: ExperienceRecord
  href?: string
  actionLabel?: string
  showTitle?: boolean
  className?: string
}) {
  const content = <article className={`px-1 py-4 ${className}`}>
    <div className="flex items-start justify-between gap-3">
      <ExperienceStatusGroup sentiment={record.sentiment} discomfort={record.discomfort}/>
      <time dateTime={record.createdAt} className="shrink-0 pt-1 text-[10px] font-medium tabular-nums text-[#858e9b]">{formatExperienceRecordDate(record.createdAt)}</time>
    </div>
    {showTitle && <div className="mt-2.5 flex items-center gap-2">
      <h3 className="min-w-0 flex-1 truncate text-[14px] font-semibold tracking-[-.02em] text-[#242d3b]">{record.productName}</h3>
      {href && !actionLabel && <ChevronRight aria-hidden="true" size={15} className="shrink-0 text-[#8994a3]"/>}
    </div>}
    <p className={`mt-1.5 line-clamp-3 text-[12px] font-medium leading-[1.65] ${record.note ? 'text-[#626c7a]' : 'text-[#9199a4]'}`}>{record.note || '선택한 느낌으로 남긴 기록'}</p>
    {record.tags.length > 0 && <p className="mt-2 truncate text-[10px] font-medium text-[#7d8795]">{record.tags.slice(0, 4).join(' · ')}{record.tags.length > 4 ? ` 외 ${record.tags.length - 4}` : ''}</p>}
    {href && actionLabel && <span className="mt-2.5 inline-flex items-center gap-0.5 text-[10px] font-semibold text-[#607493]">{actionLabel}<ChevronRight size={12}/></span>}
  </article>

  if (!href) return content
  return <Link to={href} aria-label={`${record.productName} 기록, ${actionLabel || '관련 정보 보기'}`} className="block transition active:bg-[#f5f7fa]">{content}</Link>
}
