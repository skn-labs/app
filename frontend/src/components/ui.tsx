import type { ButtonHTMLAttributes, PropsWithChildren, ReactNode } from 'react'
import { useEffect, useRef, useState } from 'react'
import { Bell, Bot, ChevronLeft, CircleUserRound, FlaskConical, Home, MessageCircle, NotebookText, Sparkles } from 'lucide-react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { twMerge } from 'tailwind-merge'

export function Screen({ children, className = '', nav = true }: PropsWithChildren<{ className?: string; nav?: boolean }>) {
  return <main className={twMerge('mobile-shell h-full min-h-0 overflow-y-auto overscroll-contain bg-paper text-ink', nav && 'pb-28', className)}>{children}{nav && <BottomNav />}</main>
}

export function TopBar({ title, back = false, backTo, right }: { title: string; back?: boolean; backTo?: string; right?: ReactNode }) {
  const navigate = useNavigate()
  return <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-line/70 bg-paper/95 px-5 backdrop-blur">
    <div className="w-10">{back && <button aria-label="뒤로" onClick={() => backTo ? navigate(backTo) : navigate(-1)} className="-ml-2 grid size-10 place-items-center rounded-full hover:bg-soft"><ChevronLeft size={24}/></button>}</div>
    <h1 className="text-[16px] font-semibold tracking-[-.02em]">{title}</h1>
    <div className="flex w-10 justify-end">{right}</div>
  </header>
}

/** Figma "홈+루틴" 헤더: 탭 루트 화면은 로고+알림+마이페이지, 하위 화면은 뒤로가기+로고. */
export function AppHeader({ back = false, backTo }: { back?: boolean; backTo?: string }) {
  const navigate = useNavigate()
  return <header className="relative z-20 flex h-[60px] shrink-0 items-center justify-between px-5">
    <div className="flex w-20 items-center">{back && <button aria-label="뒤로" onClick={() => backTo ? navigate(backTo) : navigate(-1)} className="-ml-2 grid size-10 place-items-center rounded-full hover:bg-soft"><ChevronLeft size={24}/></button>}</div>
    <BrandMark compact/>
    <div className="flex w-20 items-center justify-end gap-2">
      {!back && <>
        <button aria-label="알림" className="grid size-10 place-items-center rounded-full bg-soft text-ink"><Bell size={19}/></button>
        <Link to="/records" aria-label="마이페이지" className="grid size-10 place-items-center rounded-full bg-soft text-ink"><CircleUserRound size={19}/></Link>
      </>}
    </div>
  </header>
}

function BottomNav() {
  const items = [
    { to: '/', label: '홈', icon: Home, end: true },
    { to: '/experience', label: 'My Lab', icon: FlaskConical },
    { to: '/routines', label: '루틴', icon: NotebookText },
    { to: '/ai', label: 'AI', icon: MessageCircle },
  ]
  return <div className="safe-bottom fixed inset-x-0 bottom-0 z-30 mx-auto flex max-w-[430px] justify-center px-8">
    <nav className="flex h-[66px] w-full max-w-[334px] items-center justify-around rounded-[40px] bg-white shadow-[0_2px_8px_rgba(0,0,0,.1)]">
      {items.map(({ to, label, icon: Icon, end }) => <NavLink key={to} to={to} end={end} aria-label={label} className={({ isActive }) => twMerge('grid place-items-center rounded-full p-2 text-ink/70 transition', isActive && 'text-ink')}>
        <Icon size={22} strokeWidth={1.9}/>
      </NavLink>)}
    </nav>
  </div>
}

export function BrandMark({ compact = false }: { compact?: boolean }) {
  return <img src="/skn-assets/skn-wordmark.png" alt="SKN" className={compact ? 'h-7 w-auto' : 'h-12 w-auto'}/>
}

export function SknMark({ className = '' }: { className?: string }) {
  return <img src="/skn-assets/skn-mark.png" alt="SKN" className={twMerge('h-8 w-[30px] object-contain', className)}/>
}

export function Button({ className, variant = 'primary', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' | 'danger' }) {
  const variants = {
    primary: 'bg-ink text-white shadow-sm hover:bg-black disabled:bg-[#a9aba6]',
    secondary: 'border border-line bg-white text-ink hover:bg-soft',
    ghost: 'bg-transparent text-ink hover:bg-soft',
    danger: 'bg-[#fff0f0] text-danger hover:bg-[#ffe8e8]',
  }
  return <button className={twMerge('flex min-h-12 items-center justify-center gap-2 rounded-2xl px-4 text-[15px] font-semibold transition active:scale-[.99] disabled:cursor-not-allowed disabled:opacity-60', variants[variant], className)} {...props}/>
}

export function Card({ children, className = '' }: PropsWithChildren<{ className?: string }>) {
  return <section className={twMerge('rounded-[22px] border border-line bg-white p-5', className)}>{children}</section>
}

export function Eyebrow({ children, className = '' }: PropsWithChildren<{ className?: string }>) {
  return <p className={twMerge('text-[12px] font-bold uppercase tracking-[.08em] text-muted', className)}>{children}</p>
}

export function ProductGlyph({ category = '제품', size = 'md', src }: { category?: string; size?: 'sm' | 'md' | 'lg'; src?: string }) {
  const [failed, setFailed] = useState(false)
  const isDropper = /세럼|앰플/.test(category)
  const isTube = /선|클렌/.test(category)
  const dims = size === 'lg' ? 'h-48 w-36' : size === 'sm' ? 'h-14 w-12' : 'h-24 w-18'
  if (src && !failed) {
    return <div className={twMerge('shrink-0 overflow-hidden rounded-2xl border border-line bg-white', dims)}>
      <img src={src} alt={category} loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(true)} className="h-full w-full object-contain p-1.5"/>
    </div>
  }
  return <div className={twMerge('relative grid shrink-0 place-items-end', dims)} aria-hidden="true">
    <div className={twMerge('relative w-3/5 border border-[#cdd2cb] bg-gradient-to-b from-white to-[#e8eee8] shadow-[0_10px_25px_rgba(31,42,31,.10)]', isDropper ? 'h-3/4 rounded-b-2xl rounded-t-lg' : isTube ? 'h-5/6 rounded-[45%_45%_16px_16px]' : 'h-2/3 rounded-2xl')}>
      {isDropper && <><div className="absolute -top-7 left-1/2 h-8 w-1/2 -translate-x-1/2 rounded-t-xl bg-[#22251f]"/><div className="absolute -top-1 left-1/2 h-2 w-2/3 -translate-x-1/2 bg-[#dfe4dd]"/></>}
      <div className="absolute inset-x-1.5 top-1/3 rounded-sm border border-black/5 bg-white/75 py-1 text-center text-[6px] font-bold tracking-widest text-[#555a53]">SKN</div>
    </div>
  </div>
}

export function Loading({ label = '불러오는 중' }: { label?: string }) {
  return <div className="grid min-h-[55svh] place-items-center"><div className="flex flex-col items-center gap-3 text-sm text-muted"><span className="size-6 animate-spin rounded-full border-2 border-line border-t-accent"/><span>{label}</span></div></div>
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return <div className="mx-5 mt-24 text-center"><div className="mx-auto mb-4 grid size-12 place-items-center rounded-full bg-soft text-muted"><Bot size={22}/></div><h2 className="font-semibold">잠시 연결하지 못했어요</h2><p className="mx-auto mt-2 max-w-64 text-sm leading-6 text-muted">{message}</p>{onRetry && <Button className="mx-auto mt-5" variant="secondary" onClick={onRetry}>다시 시도</Button>}</div>
}

export function EmptyState({ icon, title, body, action }: { icon?: ReactNode; title: string; body: string; action?: ReactNode }) {
  return <div className="px-7 py-16 text-center"><div className="mx-auto mb-5 grid size-14 place-items-center rounded-2xl bg-soft text-muted">{icon || <CircleUserRound/>}</div><h2 className="text-xl font-bold tracking-[-.03em]">{title}</h2><p className="mx-auto mt-2 max-w-72 text-sm leading-6 text-muted">{body}</p>{action && <div className="mt-6">{action}</div>}</div>
}

export function BottomSheet({ open, onClose, title, children }: PropsWithChildren<{ open: boolean; onClose: () => void; title: string }>) {
  if (!open) return null
  return <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30" onMouseDown={onClose}>
    <section className="safe-bottom w-full max-w-[430px] animate-rise rounded-t-[28px] bg-white px-5 pb-4 pt-3 shadow-2xl" onMouseDown={event => event.stopPropagation()}>
      <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-[#d9dcd6]"/><div className="mb-5 flex items-start justify-between"><h2 className="text-xl font-bold tracking-[-.03em]">{title}</h2><button onClick={onClose} className="text-sm text-muted">닫기</button></div>{children}
    </section>
  </div>
}

export function AiBadge() {
  return <span className="inline-flex items-center gap-1 rounded-full bg-accent-soft px-2.5 py-1 text-[11px] font-bold text-accent"><Sparkles size={12}/> SKN AI</span>
}

/**
 * 앱의 모든 브랜드 영상을 같은 품질과 재생 규칙으로 보여준다.
 *
 * poster를 먼저 그리고 영상이 준비된 뒤에만 덮어 첫 프레임 번쩍임을 막는다.
 * webm → mp4 → poster 순으로 대체하며, 동작 줄이기 설정이나 재생 실패 시에도
 * 완료 콜백을 한 번 호출해 화면 전환이 멈추지 않게 한다.
 */
export function AssetMotion({ name, poster, alt = '', loop = false, playing = true, className = '', mediaClassName = '', onEnded }: {
  name: string
  poster: string
  alt?: string
  loop?: boolean
  playing?: boolean
  className?: string
  mediaClassName?: string
  onEnded?: () => void
}) {
  const video = useRef<HTMLVideoElement>(null)
  const [fallbackOnly, setFallbackOnly] = useState(() => typeof window !== 'undefined'
    && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)
  const [ready, setReady] = useState(false)
  const previousPlaying = useRef(playing)
  const endedOnce = useRef(false)
  const ended = useRef(onEnded)
  ended.current = onEnded

  const finish = () => {
    if (endedOnce.current) return
    endedOnce.current = true
    ended.current?.()
  }

  useEffect(() => {
    endedOnce.current = false
    setReady(false)
  }, [name])

  useEffect(() => {
    if (fallbackOnly) { finish(); return }
    const element = video.current
    if (!element) return
    if (!playing) {
      element.pause()
      element.currentTime = 0
    } else {
      if (!previousPlaying.current) element.currentTime = 0
      element.play().catch(() => setFallbackOnly(true))
    }
    previousPlaying.current = playing
  }, [fallbackOnly, name, playing])

  const mediaClasses = twMerge('absolute inset-0 block h-full w-full object-contain', mediaClassName)

  return <span role={alt ? 'img' : undefined} aria-label={alt || undefined} aria-hidden={!alt}
    className={twMerge('relative block shrink-0 overflow-hidden bg-transparent', className)}>
    <img src={poster} alt="" draggable={false} className={mediaClasses}/>
    {!fallbackOnly && <video ref={video} poster={poster} autoPlay={playing} muted playsInline loop={loop}
      preload={playing ? 'auto' : 'metadata'} disablePictureInPicture controlsList="nodownload noplaybackrate nofullscreen"
      onLoadedData={() => setReady(true)} onError={() => setFallbackOnly(true)} onEnded={finish}
      className={twMerge(mediaClasses, 'transition-opacity duration-150 motion-reduce:transition-none', ready ? 'opacity-100' : 'opacity-0')}>
      <source src={`/skn-assets/${name}.webm`} type="video/webm"/>
      <source src={`/skn-assets/${name}.mp4`} type="video/mp4"/>
    </video>}
  </span>
}
