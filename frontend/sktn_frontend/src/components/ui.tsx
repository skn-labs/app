import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from 'react'

/* ── 버튼 ───────────────────────────────────────────────── */

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'kakao' | 'apple' | 'ghost'
  full?: boolean
}

const buttonStyles: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary: 'bg-ink text-white disabled:bg-line disabled:text-ink-faint',
  secondary: 'bg-field text-ink disabled:text-ink-faint',
  kakao: 'bg-kakao text-[#191600]',
  apple: 'bg-white text-ink border border-line',
  ghost: 'bg-transparent text-ink-muted',
}

export function Button({
  variant = 'primary',
  full,
  className = '',
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`inline-flex h-[52px] items-center justify-center gap-2 rounded-full px-6 text-[15px] font-semibold transition-[opacity,background-color] active:opacity-80 disabled:cursor-not-allowed ${
        buttonStyles[variant]
      } ${full ? 'w-full' : ''} ${className}`}
      {...rest}
    />
  )
}

/* ── 입력창 ─────────────────────────────────────────────── */

type FieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string
  error?: string
  trailing?: ReactNode
}

export function Field({ label, error, trailing, className = '', id, ...rest }: FieldProps) {
  const inputId = id ?? `field-${label}`
  return (
    <div className="w-full">
      <label htmlFor={inputId} className="mb-1.5 block text-[13px] font-medium text-ink-muted">
        {label}
      </label>
      <div className="relative">
        <input
          id={inputId}
          className={`h-[50px] w-full rounded-[12px] border bg-field px-4 text-[15px] outline-none transition-colors placeholder:text-ink-faint focus:border-ink ${
            error ? 'border-danger' : 'border-transparent'
          } ${trailing ? 'pr-12' : ''} ${className}`}
          {...rest}
        />
        {trailing && (
          <div className="absolute inset-y-0 right-3 flex items-center">{trailing}</div>
        )}
      </div>
      {error && <p className="mt-1.5 text-[12px] text-danger">{error}</p>}
    </div>
  )
}

/* ── 칩 (복수 선택) ─────────────────────────────────────── */

export function Chip({
  selected,
  children,
  onClick,
}: {
  selected: boolean
  children: ReactNode
  onClick: () => void
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`h-[38px] rounded-chip border px-4 text-[14px] transition-colors ${
        selected
          ? 'border-ink bg-ink font-semibold text-white'
          : 'border-line bg-white text-ink hover:border-ink-faint'
      }`}
    >
      {children}
    </button>
  )
}

/* ── 리스트형 단일 선택 ─────────────────────────────────── */

export function OptionRow({
  selected,
  children,
  onClick,
}: {
  selected: boolean
  children: ReactNode
  onClick: () => void
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`flex h-[54px] w-full items-center justify-center rounded-card border text-[15px] transition-colors ${
        selected
          ? 'border-ink bg-ink font-semibold text-white'
          : 'border-line bg-field text-ink hover:border-ink-faint'
      }`}
    >
      {children}
    </button>
  )
}

/* ── 체크박스 ───────────────────────────────────────────── */

export function Checkbox({
  checked,
  onChange,
  children,
}: {
  checked: boolean
  onChange: (next: boolean) => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="inline-flex items-center gap-2 text-[13px] text-ink-muted outline-none focus-visible:ring-2 focus-visible:ring-ink/20 rounded-[6px]"
    >
      <span
        className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[5px] border transition-colors ${
          checked ? 'border-ink bg-ink' : 'border-line bg-white'
        }`}
      >
        {checked && (
          <svg width="11" height="11" viewBox="0 0 12 12" aria-hidden>
            <path
              d="M2.5 6.2l2.4 2.4L9.6 3.9"
              fill="none"
              stroke="#fff"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </span>
      <span className={checked ? 'text-ink' : undefined}>{children}</span>
    </button>
  )
}

/* ── 규칙 체크리스트 ────────────────────────────────────── */

export function RuleList({ items }: { items: { label: string; ok: boolean }[] }) {
  return (
    <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
      {items.map((c) => (
        <li
          key={c.label}
          className={`flex items-center gap-1.5 text-[12px] transition-colors ${
            c.ok ? 'text-ink' : 'text-ink-faint'
          }`}
        >
          <svg width="13" height="13" viewBox="0 0 14 14" aria-hidden>
            <circle
              cx="7"
              cy="7"
              r="6.25"
              fill="none"
              stroke="currentColor"
              strokeWidth="1"
              opacity={c.ok ? 1 : 0.45}
            />
            {c.ok && (
              <path
                d="M4.2 7.2l1.9 1.9 3.7-3.9"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}
          </svg>
          {c.label}
        </li>
      ))}
    </ul>
  )
}

/* ── 그룹 제목 ──────────────────────────────────────────── */

export function GroupTitle({ children }: { children: ReactNode }) {
  return <h3 className="mb-2.5 text-[13px] font-semibold text-ink-muted">{children}</h3>
}
