import type { HTMLAttributes } from 'react'
import type { ExperienceRecord, ExperienceRecordSummary } from '../lib/types'

export type ExperienceSentiment = 'LIKED' | 'DISAPPOINTED' | 'UNSURE'
export type ExperienceDiscomfort = 'NOT_REPORTED' | 'REPORTED' | 'UNKNOWN'
export type ExperienceStatus = ExperienceSentiment | 'DISCOMFORT'

const STATUS_STYLE: Record<ExperienceStatus, { label: string; className: string }> = {
  LIKED: { label: '좋았어요', className: 'bg-[#e8f1e9] text-[#3f6648]' },
  DISAPPOINTED: { label: '아쉬웠어요', className: 'bg-[#f4e9e8] text-[#85504f]' },
  UNSURE: { label: '아직 모르겠어요', className: 'bg-[#eceff3] text-[#5d6877]' },
  DISCOMFORT: { label: '불편함', className: 'bg-[#f7e7e7] text-[#964f52]' },
}

export function ExperienceStatusBadge({ status, size = 'sm', count, className = '', ...props }: {
  status: ExperienceStatus
  size?: 'sm' | 'md'
  count?: number
} & HTMLAttributes<HTMLSpanElement>) {
  const style = STATUS_STYLE[status]
  return <span aria-label={count ? `${style.label} ${count}번` : undefined} {...props} data-experience-status={status} className={`inline-flex shrink-0 items-center rounded-[6px] font-semibold leading-none tracking-[-.01em] ${size === 'md' ? 'h-7 gap-1.5 px-2.5 text-[11px]' : 'h-6 gap-1 px-2 text-[10px]'} ${style.className} ${className}`}><StatusGlyph status={status} size={size === 'md' ? 13 : 12}/><span>{style.label}</span>{count !== undefined && <span aria-hidden="true" className="tabular-nums opacity-70">{count}</span>}</span>
}

export function ExperienceStatusSummary({ summary, size = 'sm', emptyLabel = '아직 남긴 기록 없음', className = '' }: {
  summary: ExperienceRecordSummary
  size?: 'sm' | 'md'
  emptyLabel?: string
  className?: string
}) {
  const items = ([
    { status: 'LIKED', count: summary.likedCount },
    { status: 'UNSURE', count: summary.unsureCount },
    { status: 'DISAPPOINTED', count: summary.disappointedCount },
    { status: 'DISCOMFORT', count: summary.discomfortCount },
  ] satisfies { status: ExperienceStatus; count: number }[]).filter(item => item.count > 0)
  if (!items.length) return <span data-experience-status="EMPTY" className={`inline-flex h-6 shrink-0 items-center text-[10px] font-medium text-[#858e9b] ${className}`}>{emptyLabel}</span>
  return <span role="group" aria-label={`남긴 기록 ${summary.totalCount}개`} className={`hide-scrollbar flex min-w-0 flex-nowrap items-center gap-1 overflow-x-auto ${className}`}>
    {items.map(item => <ExperienceStatusBadge key={item.status} status={item.status} count={item.count} size={size}/>)}
  </span>
}

export function ExperienceStatusGroup({ sentiment, discomfort = 'NOT_REPORTED', size = 'sm', className = '' }: {
  sentiment: ExperienceSentiment
  discomfort?: 'NOT_REPORTED' | 'REPORTED' | 'UNKNOWN'
  size?: 'sm' | 'md'
  className?: string
}) {
  return <span className={`flex min-w-0 flex-wrap items-center gap-1 ${className}`}>
    <ExperienceStatusBadge status={sentiment} size={size}/>
    {discomfort === 'REPORTED' && <ExperienceStatusBadge status="DISCOMFORT" size={size}/>}
  </span>
}

export function ExperienceRecordStatus({ record, emptyLabel = '아직 남긴 기록 없음', size = 'sm', className = '' }: {
  record?: Pick<ExperienceRecord, 'sentiment' | 'discomfort'> | null
  emptyLabel?: string
  size?: 'sm' | 'md'
  className?: string
}) {
  if (record) return <ExperienceStatusGroup sentiment={record.sentiment} discomfort={record.discomfort} size={size} className={className}/>
  return <span data-experience-status="EMPTY" className={`inline-flex h-6 shrink-0 items-center text-[10px] font-medium text-[#858e9b] ${className}`}>{emptyLabel}</span>
}

const SENTIMENT_OPTIONS: { value: ExperienceSentiment; label: string; hint: string }[] = [
  { value: 'LIKED', label: '좋았어요', hint: '다시 찾고 싶은 사용감' },
  { value: 'UNSURE', label: '모르겠어요', hint: '조금 더 지켜보고 싶어요' },
  { value: 'DISAPPOINTED', label: '아쉬웠어요', hint: '기대와 달랐던 사용감' },
]

export function ExperienceSentimentPicker({ value, onChange, disabled = false, compact = false, className = '' }: {
  value?: ExperienceSentiment | ''
  onChange: (value: ExperienceSentiment) => void
  disabled?: boolean
  compact?: boolean
  className?: string
}) {
  return <div role="radiogroup" aria-label="전반적인 인상" className={`grid grid-cols-3 gap-1 rounded-[17px] border border-[#dfe4eb] bg-[#eef2f7] p-1 ${className}`}>
    {SENTIMENT_OPTIONS.map(option => {
      const selected = value === option.value
      return <button
        type="button"
        role="radio"
        aria-checked={selected}
        disabled={disabled}
        key={option.value}
        onClick={() => onChange(option.value)}
        className={`flex min-w-0 flex-col items-center justify-center rounded-[13px] px-1.5 text-center transition disabled:opacity-45 ${compact ? 'min-h-[54px]' : 'min-h-[68px]'} ${selected ? 'bg-white text-[#1b2432] shadow-[0_2px_8px_rgba(38,52,73,.11),inset_0_0_0_1px_rgba(199,208,220,.72)]' : 'text-[#737d8a] active:bg-white/60'}`}
      >
        <span className="text-[12px] font-[600] leading-4 tracking-[-.02em]">{option.label}</span>
        {!compact && <span className="mt-1 text-[9px] font-medium leading-3 text-[#8a929d]">{option.hint}</span>}
      </button>
    })}
  </div>
}

export function ExperienceDiscomfortPicker({ value, onChange, disabled = false, className = '' }: {
  value?: ExperienceDiscomfort | ''
  onChange: (value: ExperienceDiscomfort) => void
  disabled?: boolean
  className?: string
}) {
  const options: { value: ExperienceDiscomfort; label: string; selectedClassName: string }[] = [
    { value: 'NOT_REPORTED', label: '없었어요', selectedClassName: 'border-[#bed0e9] bg-[#edf4ff] text-[#466184]' },
    { value: 'REPORTED', label: '있었어요', selectedClassName: 'border-[#dfb9ba] bg-[#fff0f0] text-[#8b4d50]' },
    { value: 'UNKNOWN', label: '모르겠어요', selectedClassName: 'border-[#d6dae1] bg-[#f1f3f6] text-[#5d6877]' },
  ]
  return <div role="radiogroup" aria-label="피부 불편함 여부" className={`grid grid-cols-3 gap-1.5 rounded-[18px] border border-[#dfe5ee] bg-white p-1.5 ${className}`}>
    {options.map(option => {
      const selected = value === option.value
      return <button type="button" role="radio" aria-checked={selected} disabled={disabled} key={option.value} onClick={() => onChange(option.value)} className={`flex min-h-12 items-center justify-center rounded-[13px] border text-[12px] font-semibold tracking-[-.015em] transition disabled:opacity-45 ${selected ? option.selectedClassName : 'border-transparent text-[#7f8792] active:bg-[#f5f7fa]'}`}><span>{option.label}</span>{selected && <span aria-hidden="true" className="ml-1 size-1.5 rounded-full bg-current"/>}</button>
    })}
  </div>
}

function StatusGlyph({ status, size }: { status: ExperienceStatus; size: number }) {
  if (status === 'LIKED') return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 14 14" fill="none"><path d="M2.75 7.2 5.7 10l5.55-6" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round"/></svg>
  if (status === 'DISAPPOINTED') return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 14 14" fill="none"><path d="M3 7h8" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round"/></svg>
  if (status === 'UNSURE') return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 14 14" fill="none"><path d="M4.8 5.15a2.35 2.35 0 0 1 4.55.8c0 1.55-1.42 1.85-2.05 2.55-.23.25-.3.49-.3.85" stroke="currentColor" strokeWidth="1.45" strokeLinecap="round"/><path d="M7 11.25h.01" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 14 14" fill="none"><path d="m7 1.85 5.15 9.05a.85.85 0 0 1-.74 1.27H2.59a.85.85 0 0 1-.74-1.27L7 1.85Z" stroke="currentColor" strokeWidth="1.35" strokeLinejoin="round"/><path d="M7 5v3.15M7 10.15h.01" stroke="currentColor" strokeWidth="1.45" strokeLinecap="round"/></svg>
}
