import AssetVideo from './AssetVideo'
import { GENDERS } from '@/config/onboarding'

type Gender = (typeof GENDERS)[number]['value']

/**
 * 성별 선택.
 *
 * 고른 쪽만 애니메이션이 돌고, 나머지는 첫 프레임에서 멈춰 정지 이미지처럼 보입니다.
 * 다시 고르면 처음부터 재생됩니다.
 *
 * 두 영상 모두 계속 붙어 있고 재생/정지만 바꿉니다.
 * (선택할 때마다 새로 붙이면 다시 내려받느라 한 번 깜빡여요)
 */
export default function GenderPicker({
  value,
  onChange,
}: {
  value: Gender | null
  onChange: (value: Gender) => void
}) {
  return (
    <div className="flex items-start justify-center gap-3 pt-4">
      {GENDERS.map((g) => {
        const selected = value === g.value
        const dimmed = value !== null && !selected

        return (
          <button
            key={g.value}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={g.label}
            onClick={() => onChange(g.value)}
            className="group flex flex-1 cursor-pointer flex-col items-center gap-3 rounded-card py-2 outline-none focus-visible:ring-2 focus-visible:ring-ink/20"
          >
            <span
              className={`block transition-all duration-300 ${
                dimmed ? 'scale-95 opacity-35' : 'scale-100 opacity-100'
              }`}
            >
              <AssetVideo
                name={g.value === 'male' ? 'gender-male' : 'gender-female'}
                poster={`/media/gender-${g.value}-poster.png`}
                loop
                playing={selected}
                className="object-contain"
                style={{ width: 138, height: 138 }}
              />
            </span>

            <span
              className={`text-[15px] transition-colors ${
                selected ? 'font-bold text-ink' : 'text-ink-faint'
              }`}
            >
              {g.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}
