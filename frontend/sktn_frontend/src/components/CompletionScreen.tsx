import { useCallback, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import PhoneFrame from './PhoneFrame'
import StatusBar from './StatusBar'
import HomeIndicator from './HomeIndicator'
import TopMark from './TopMark'
import CheckAnimation from './CheckAnimation'

/** 체크 애니메이션이 끝나고 화면이 사라지기 시작할 때까지의 여유 */
export const HOLD_AFTER_ANIM_MS = 700
/** 화면이 불투명도 100 → 0 으로 사라지는 시간 */
export const FADE_MS = 600
/** 영상이 안 떠서 onEnded 가 바로 불려도 문구는 읽히도록 하는 최소 노출 시간 */
export const MIN_VISIBLE_MS = 2600
/** 어떤 이유로든 애니메이션이 안 끝날 때의 안전장치 */
const GUARD_MS = 6000

/**
 * "완료" 화면 공통 틀.
 *
 * 체크표시 애니메이션 재생 → 잠깐 멈춤 → 화면 전체가 사라짐 → onDone().
 * 화면 아무 곳이나 누르면 기다리지 않고 바로 넘어갑니다.
 *
 * 회원가입 완료와 피부 프로필 완성이 같은 동작을 써야 해서 한 곳으로 뺐습니다.
 * 영상이 재생되지 않는 환경에서도 멈추지 않도록 타이머가 세 겹으로 받칩니다.
 */
export default function CompletionScreen({
  title,
  subtitle,
  hint,
  onDone,
}: {
  title: ReactNode
  subtitle?: ReactNode
  /** 화면 아래에 흐리게 뜨는 안내 문구 */
  hint?: string
  onDone: () => void
}) {
  const [exiting, setExiting] = useState(false)
  const mountedAt = useRef(Date.now())
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  const done = useRef(false)

  const finish = useCallback(() => {
    if (done.current) return
    done.current = true
    onDone()
  }, [onDone])

  const startExit = useCallback(
    (delay = 0) => {
      if (exiting || done.current) return
      timers.current.push(
        setTimeout(() => {
          setExiting(true)
          // transitionend 를 놓치는 경우를 대비한 백업 타이머
          timers.current.push(setTimeout(finish, FADE_MS + 120))
        }, delay),
      )
    },
    [exiting, finish],
  )

  /** 애니메이션이 끝났을 때 (또는 영상을 못 틀어 바로 불렸을 때) */
  const handleAnimationEnd = useCallback(() => {
    const elapsed = Date.now() - mountedAt.current
    startExit(Math.max(HOLD_AFTER_ANIM_MS, MIN_VISIBLE_MS - elapsed))
  }, [startExit])

  useEffect(() => {
    timers.current.push(setTimeout(() => startExit(0), GUARD_MS))
    const list = timers.current
    return () => list.forEach(clearTimeout)
  }, [startExit])

  return (
    <PhoneFrame>
      <div
        onClick={() => startExit(0)}
        onTransitionEnd={(e) => {
          if (e.propertyName === 'opacity' && exiting) finish()
        }}
        className={`flex flex-1 flex-col transition-opacity ease-out ${
          exiting ? 'opacity-0' : 'opacity-100'
        }`}
        style={{ transitionDuration: `${FADE_MS}ms` }}
      >
        <StatusBar />
        <TopMark />

        <div className="flex flex-1 flex-col px-7">
          <div className="pt-12 text-center">
            <h1 className="text-[22px] leading-[1.4] font-bold tracking-tight text-ink">{title}</h1>
            {subtitle && <p className="mt-3 text-[13px] text-ink-muted">{subtitle}</p>}
          </div>

          <div className="flex flex-1 items-center justify-center">
            <CheckAnimation size={240} onEnded={handleAnimationEnd} />
          </div>

          {hint && <p className="pb-10 text-center text-[12px] text-ink-faint">{hint}</p>}
        </div>

        <HomeIndicator />
      </div>
    </PhoneFrame>
  )
}
