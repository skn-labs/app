import { useEffect, useRef } from 'react'

const ITEM_HEIGHT = 56

/**
 * iOS 피커 느낌의 연령대 휠.
 * 스크롤 스냅 + 가운데 항목 강조. 클릭으로도 선택됩니다.
 */
export default function AgeWheel({
  options,
  value,
  onChange,
}: {
  options: readonly string[]
  value: string | null
  onChange: (v: string) => void
}) {
  const listRef = useRef<HTMLDivElement>(null)
  const scrollTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // 이미 고른 값이 있으면 그 위치로 이동시켜 둔다
  useEffect(() => {
    const el = listRef.current
    if (!el || !value) return
    const idx = options.indexOf(value)
    if (idx < 0) return
    if (Math.abs(el.scrollTop - idx * ITEM_HEIGHT) > 2) {
      el.scrollTo({ top: idx * ITEM_HEIGHT })
    }
    // options/value 변화에만 반응 (스크롤 중 재실행 방지)
  }, [value, options])

  const handleScroll = () => {
    if (scrollTimer.current) clearTimeout(scrollTimer.current)
    scrollTimer.current = setTimeout(() => {
      const el = listRef.current
      if (!el) return
      const idx = Math.max(0, Math.min(options.length - 1, Math.round(el.scrollTop / ITEM_HEIGHT)))
      if (options[idx] !== value) onChange(options[idx])
    }, 90)
  }

  return (
    <div className="relative h-[280px] w-full">
      {/* 가운데 선택 영역 표시 */}
      <div className="pointer-events-none absolute inset-x-8 top-1/2 h-[52px] -translate-y-1/2 rounded-[12px] bg-field" />

      <div
        ref={listRef}
        onScroll={handleScroll}
        className="no-scrollbar snap-y-mandatory relative h-full overflow-y-auto"
        style={{ paddingBlock: (280 - ITEM_HEIGHT) / 2 }}
      >
        {options.map((option) => {
          const selected = option === value
          return (
            <button
              key={option}
              type="button"
              onClick={() => {
                onChange(option)
                listRef.current?.scrollTo({
                  top: options.indexOf(option) * ITEM_HEIGHT,
                  behavior: 'smooth',
                })
              }}
              className={`flex w-full snap-center items-center justify-center transition-all ${
                selected
                  ? 'text-[26px] font-bold text-ink'
                  : 'text-[22px] font-medium text-ink-faint'
              }`}
              style={{ height: ITEM_HEIGHT }}
            >
              {option}
            </button>
          )
        })}
      </div>

      {/* 위아래 페이드 */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-white to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-white to-transparent" />
    </div>
  )
}
