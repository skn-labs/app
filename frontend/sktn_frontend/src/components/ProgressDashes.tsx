/** 와이어프레임 상단의 진행 표시 (— —— ——— …) */
export default function ProgressDashes({
  current,
  total,
}: {
  /** 0부터 시작하는 현재 단계 */
  current: number
  total: number
}) {
  return (
    <div
      className="flex items-center gap-1.5"
      role="progressbar"
      aria-valuemin={1}
      aria-valuemax={total}
      aria-valuenow={current + 1}
      aria-label={`${total}단계 중 ${current + 1}단계`}
    >
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={`h-[3px] w-5 rounded-full transition-colors ${
            i <= current ? 'bg-ink' : 'bg-line'
          }`}
        />
      ))}
    </div>
  )
}
