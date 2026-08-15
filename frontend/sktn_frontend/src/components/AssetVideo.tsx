import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'

/**
 * 디자인 소스 영상 재생용 공통 컴포넌트.
 *
 * - WebM(VP9) + MP4(H.264) 두 벌을 넣어 브라우저를 가리지 않게 했습니다.
 * - 코덱이 없거나 자동재생이 막히면 poster 이미지로 조용히 대체하고,
 *   그때도 onEnded 를 한 번 불러줘서 화면 전환이 멈추지 않게 합니다.
 * - `playing` 을 주면 재생을 바깥에서 제어합니다.
 *   false → 첫 프레임에서 멈춤(= 정지 이미지), true → 처음부터 다시 재생.
 */
export default function AssetVideo({
  name,
  poster,
  loop,
  playing,
  onEnded,
  className = '',
  style,
  alt = '',
}: {
  /** public/media 안의 파일 이름 (확장자 제외) */
  name: string
  poster: string
  loop?: boolean
  /** 생략하면 마운트되자마자 자동 재생 */
  playing?: boolean
  onEnded?: () => void
  className?: string
  style?: CSSProperties
  alt?: string
}) {
  const ref = useRef<HTMLVideoElement>(null)
  const [failed, setFailed] = useState(false)

  const controlled = playing !== undefined

  // 콜백이 매 렌더마다 새로 와도 재생을 다시 시작하지 않도록 ref 로 잡아둔다
  const onEndedRef = useRef(onEnded)
  onEndedRef.current = onEnded

  useEffect(() => {
    const el = ref.current
    if (!el) return
    let cancelled = false

    if (controlled && !playing) {
      el.pause()
      // 첫 프레임으로 되감아 두면 다음에 고를 때 처음부터 시작합니다.
      try {
        el.currentTime = 0
      } catch {
        /* 아직 메타데이터가 없으면 무시 */
      }
      return
    }

    try {
      el.currentTime = 0
    } catch {
      /* 무시 */
    }

    el.play().catch(() => {
      if (cancelled) return
      setFailed(true)
      onEndedRef.current?.()
    })

    return () => {
      cancelled = true
    }
  }, [name, controlled, playing])

  if (failed) {
    return <img src={poster} alt={alt} aria-hidden={!alt} className={className} style={style} />
  }

  return (
    <video
      ref={ref}
      poster={poster}
      autoPlay={!controlled}
      loop={loop}
      muted
      playsInline
      preload="auto"
      onEnded={() => onEndedRef.current?.()}
      className={className}
      style={style}
    >
      <source src={`/media/${name}.webm`} type="video/webm" />
      <source src={`/media/${name}.mp4`} type="video/mp4" />
    </video>
  )
}
