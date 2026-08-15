/** 1~5 점 척도 (지금 피부 상태) */
export default function ScaleSelector({
  min,
  max,
  value,
  labels,
  onChange,
}: {
  min: number
  max: number
  value: number | null
  labels: { min: string; mid: string; max: string }
  onChange: (v: number) => void
}) {
  const points = Array.from({ length: max - min + 1 }, (_, i) => min + i)

  return (
    <div className="w-full">
      <div className="mb-3 flex justify-between text-[12px] text-ink-muted">
        <span>{labels.min}</span>
        <span>{labels.mid}</span>
        <span>{labels.max}</span>
      </div>
      <div className="flex items-center justify-between">
        {points.map((p) => {
          const selected = p === value
          return (
            <button
              key={p}
              type="button"
              aria-pressed={selected}
              aria-label={`${p}점`}
              onClick={() => onChange(p)}
              className={`flex h-11 w-11 items-center justify-center rounded-full border text-[15px] transition-colors ${
                selected
                  ? 'border-ink bg-ink font-semibold text-white'
                  : 'border-line bg-white text-ink-muted hover:border-ink-faint'
              }`}
            >
              {p}
            </button>
          )
        })}
      </div>
    </div>
  )
}
