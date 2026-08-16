import type { HTMLAttributes } from 'react'
import type { ExperienceRecord } from '../lib/types'

export type ExperienceSentiment = 'LIKED' | 'DISAPPOINTED' | 'UNSURE'
export type ExperienceStatus = ExperienceSentiment | 'DISCOMFORT'

const STATUS_STYLE: Record<ExperienceStatus, { label: string; className: string }> = {
  LIKED: { label: '좋았어요', className: 'bg-[#e8f1e9] text-[#3f6648]' },
  DISAPPOINTED: { label: '아쉬웠어요', className: 'bg-[#f4e9e8] text-[#85504f]' },
  UNSURE: { label: '아직 모르겠어요', className: 'bg-[#eceff3] text-[#5d6877]' },
  DISCOMFORT: { label: '불편함', className: 'bg-[#f7e7e7] text-[#964f52]' },
}

export function ExperienceStatusBadge({ status, size = 'sm', className = '', ...props }: {
  status: ExperienceStatus
  size?: 'sm' | 'md'
} & HTMLAttributes<HTMLSpanElement>) {
  const style = STATUS_STYLE[status]
  return <span {...props} data-experience-status={status} className={`inline-flex shrink-0 items-center rounded-[6px] font-semibold leading-none tracking-[-.01em] ${size === 'md' ? 'h-7 gap-1.5 px-2.5 text-[11px]' : 'h-6 gap-1 px-2 text-[10px]'} ${style.className} ${className}`}><StatusGlyph status={status} size={size === 'md' ? 13 : 12}/><span>{style.label}</span></span>
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

const SENTIMENT_OPTIONS: { value: ExperienceSentiment; hint: string }[] = [
  { value: 'LIKED', hint: '다시 찾고 싶은 사용감' },
  { value: 'UNSURE', hint: '조금 더 지켜보고 싶어요' },
  { value: 'DISAPPOINTED', hint: '기대와 달랐던 사용감' },
]

export function ExperienceSentimentPicker({ value, onChange, disabled = false, compact = false, className = '' }: {
  value?: ExperienceSentiment | ''
  onChange: (value: ExperienceSentiment) => void
  disabled?: boolean
  compact?: boolean
  className?: string
}) {
  return <div role="radiogroup" aria-label="전반적인 인상" className={`overflow-hidden rounded-[18px] border border-[#dde3eb] bg-white ${className}`}>
    {SENTIMENT_OPTIONS.map((option, index) => {
      const selected = value === option.value
      return <button
        type="button"
        role="radio"
        aria-checked={selected}
        disabled={disabled}
        key={option.value}
        onClick={() => onChange(option.value)}
        className={`flex w-full items-center gap-3 px-4 text-left transition disabled:opacity-45 ${compact ? 'min-h-[54px]' : 'min-h-[62px]'} ${index ? 'border-t border-[#e7eaf0]' : ''} ${selected ? 'bg-[#f4f7fc]' : 'bg-white active:bg-[#f7f9fc]'}`}
      >
        <ExperienceStatusBadge status={option.value} size={compact ? 'sm' : 'md'}/>
        {!compact && <span className="min-w-0 flex-1 text-[11px] font-medium leading-4 text-[#778291]">{option.hint}</span>}
        <span aria-hidden="true" className={`ml-auto grid size-5 shrink-0 place-items-center rounded-full border ${selected ? 'border-[#657ea6] bg-[#657ea6] text-white' : 'border-[#ccd3dd] bg-white'}`}>
          {selected && <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="m2.4 6.2 2.15 2.05L9.7 3.8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>}
        </span>
      </button>
    })}
  </div>
}

export function ExperienceDiscomfortToggle({ checked, onChange, disabled = false, className = '' }: {
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
  className?: string
}) {
  return <button
    type="button"
    aria-pressed={checked}
    disabled={disabled}
    onClick={() => onChange(!checked)}
    className={`flex min-h-[72px] w-full items-center gap-3 rounded-[18px] border px-4 py-3 text-left transition disabled:opacity-45 ${checked ? 'border-[#dfb9ba] bg-[#fff7f7]' : 'border-[#dde3eb] bg-white active:bg-[#f7f9fc]'} ${className}`}
  >
    <span className="min-w-0 flex-1">
      <ExperienceStatusBadge status="DISCOMFORT"/>
      <span className="mt-1.5 block text-[11px] font-medium leading-[1.55] text-[#727b88]">따가움·붉어짐처럼 피부가 불편했다면 별도로 남겨요.</span>
    </span>
    <span aria-hidden="true" className={`grid size-6 shrink-0 place-items-center rounded-[7px] border ${checked ? 'border-[#a95b5e] bg-[#a95b5e] text-white' : 'border-[#cbd2dc] bg-white'}`}>
      {checked && <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="m2.8 7.2 2.45 2.3 5.9-6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/></svg>}
    </span>
  </button>
}

function StatusGlyph({ status, size }: { status: ExperienceStatus; size: number }) {
  if (status === 'LIKED') return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 14 14" fill="none"><path d="M2.75 7.2 5.7 10l5.55-6" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round"/></svg>
  if (status === 'DISAPPOINTED') return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 14 14" fill="none"><path d="M3 7h8" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round"/></svg>
  if (status === 'UNSURE') return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 14 14" fill="none"><path d="M4.8 5.15a2.35 2.35 0 0 1 4.55.8c0 1.55-1.42 1.85-2.05 2.55-.23.25-.3.49-.3.85" stroke="currentColor" strokeWidth="1.45" strokeLinecap="round"/><path d="M7 11.25h.01" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 14 14" fill="none"><path d="m7 1.85 5.15 9.05a.85.85 0 0 1-.74 1.27H2.59a.85.85 0 0 1-.74-1.27L7 1.85Z" stroke="currentColor" strokeWidth="1.35" strokeLinejoin="round"/><path d="M7 5v3.15M7 10.15h.01" stroke="currentColor" strokeWidth="1.45" strokeLinecap="round"/></svg>
}
