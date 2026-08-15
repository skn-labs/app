/** 와이어프레임 상단의 12:06 상태바 목업 */
export default function StatusBar() {
  return (
    <div className="flex shrink-0 items-center justify-between px-7 pt-3 pb-1 text-[13px] font-semibold text-ink">
      <span>12:06</span>
      <div className="flex items-center gap-1.5">
        <svg width="17" height="11" viewBox="0 0 17 11" aria-hidden>
          <rect x="0" y="7" width="3" height="4" rx="1" fill="currentColor" />
          <rect x="4.5" y="5" width="3" height="6" rx="1" fill="currentColor" />
          <rect x="9" y="2.5" width="3" height="8.5" rx="1" fill="currentColor" />
          <rect x="13.5" y="0" width="3" height="11" rx="1" fill="currentColor" />
        </svg>
        <svg width="16" height="11" viewBox="0 0 16 11" aria-hidden>
          <path
            d="M8 9.6 5.6 7.2a3.4 3.4 0 0 1 4.8 0L8 9.6ZM8 5.4a6.2 6.2 0 0 0-4.4 1.8L2.2 5.8a8.2 8.2 0 0 1 11.6 0l-1.4 1.4A6.2 6.2 0 0 0 8 5.4Z"
            fill="currentColor"
          />
        </svg>
        <svg width="25" height="12" viewBox="0 0 25 12" aria-hidden>
          <rect x="0.5" y="0.5" width="21" height="11" rx="3.5" stroke="currentColor" opacity=".4" fill="none" />
          <rect x="2" y="2" width="16" height="8" rx="2" fill="currentColor" />
          <path d="M23 4v4a2 2 0 0 0 0-4Z" fill="currentColor" opacity=".4" />
        </svg>
      </div>
    </div>
  )
}
