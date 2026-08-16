import type { ButtonHTMLAttributes, PropsWithChildren, ReactNode } from 'react'
import { useEffect, useRef, useState } from 'react'
import { Bot, ChevronLeft, CircleUserRound, FlaskConical, Home, MessageCircle, NotebookText, Sparkles, X } from 'lucide-react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { twMerge } from 'tailwind-merge'
import { NotificationBell } from './NotificationBell'

export function Screen({ children, className = '', nav = true }: PropsWithChildren<{ className?: string; nav?: boolean }>) {
  return <main className={twMerge('mobile-shell h-full min-h-0 overflow-y-auto overscroll-contain bg-paper text-ink', nav && 'pb-28', className)}>{children}{nav && <BottomNav />}</main>
}

export function TopBar({ title, back = false, backTo, right }: { title: string; back?: boolean; backTo?: string; right?: ReactNode }) {
  const navigate = useNavigate()
  return <header className="safe-top sticky top-0 z-20 grid min-h-[68px] shrink-0 grid-cols-[1fr_auto_1fr] items-center border-b border-line/60 bg-paper/95 px-5 backdrop-blur-xl">
    <div className="flex min-w-0 justify-start">{back && <button type="button" aria-label="뒤로" onClick={() => backTo ? navigate(backTo) : navigate(-1)} className="-ml-2 grid size-11 place-items-center rounded-full transition hover:bg-soft active:scale-95"><ChevronLeft size={24}/></button>}</div>
    <h1 className="px-2 text-base font-medium tracking-[-.02em]">{title}</h1>
    <div className="flex min-w-0 justify-end">{right}</div>
  </header>
}

/** Figma "홈+루틴" 헤더: 탭 루트 화면은 로고+알림+마이페이지, 하위 화면은 뒤로가기+로고. */
export function AppHeader({ back = false, backTo, onBack, left, right, profile = true, notifications = true, sticky = false }: { back?: boolean; backTo?: string; onBack?: () => void; left?: ReactNode; right?: ReactNode; profile?: boolean; notifications?: boolean; sticky?: boolean }) {
  const navigate = useNavigate()
  return <header className={twMerge('safe-top z-20 flex min-h-[72px] shrink-0 items-center justify-between bg-white/95 px-5 backdrop-blur-xl', sticky ? 'sticky top-0' : 'relative')}>
    <div className="flex w-24 items-center">{left || (back && <button type="button" aria-label="뒤로" onClick={() => onBack ? onBack() : backTo ? navigate(backTo) : navigate(-1)} className="-ml-2 grid size-11 place-items-center rounded-full transition hover:bg-soft active:scale-95"><ChevronLeft size={24}/></button>)}</div>
    <SknMark className="h-8 w-[30px]"/>
    <div className="flex w-24 items-center justify-end">
      {right || (!back && <>{notifications && <NotificationBell/>}{profile && <Link to="/records" aria-label="마이페이지" className="grid size-11 place-items-center rounded-full text-ink transition hover:bg-soft active:scale-95"><CircleUserRound size={22} strokeWidth={1.8}/></Link>}</>)}
    </div>
  </header>
}

function BottomNav() {
  const items = [
    { to: '/', label: '홈', icon: Home, end: true },
    { to: '/my-products', label: 'My Lab', icon: FlaskConical },
    { to: '/routines', label: '루틴', icon: NotebookText },
    { to: '/ai', label: 'AI', icon: MessageCircle },
  ]
  return <div className="safe-bottom pointer-events-none fixed inset-x-0 bottom-0 z-30 mx-auto flex max-w-[430px] justify-center px-7">
    <nav aria-label="주요 메뉴" className="pointer-events-auto flex h-[66px] w-full max-w-[334px] items-center justify-around rounded-[40px] border border-black/[.035] bg-white/96 px-2 shadow-[0_12px_36px_rgba(0,0,0,.13)] backdrop-blur-xl">
      {items.map(({ to, label, icon: Icon, end }) => <NavLink key={to} to={to} end={end} aria-label={label} className={({ isActive }) => twMerge('grid size-11 place-items-center rounded-full text-[#c7c9c4] transition active:scale-95', isActive && 'text-[#0a0a0a]')}>
        <Icon size={23} strokeWidth={1.9}/><span className="sr-only">{label}</span>
      </NavLink>)}
    </nav>
  </div>
}

export function PageHeading({ title, description, eyebrow, action, className = '' }: { title: ReactNode; description?: ReactNode; eyebrow?: ReactNode; action?: ReactNode; className?: string }) {
  return <header className={twMerge('flex items-start justify-between gap-5', className)}>
    <div className="min-w-0">{eyebrow && <p className="mb-2 text-xs font-medium text-accent">{eyebrow}</p>}<h1 className="page-title">{title}</h1>{description && <p className="supporting-copy mt-2">{description}</p>}</div>
    {action && <div className="shrink-0">{action}</div>}
  </header>
}

export function SectionHeading({ title, description, eyebrow, action, id, className = '' }: { title: ReactNode; description?: ReactNode; eyebrow?: ReactNode; action?: ReactNode; id?: string; className?: string }) {
  return <div className={twMerge('flex items-start justify-between gap-4', className)}><div className="min-w-0">{eyebrow && <p className="mb-1 text-xs font-medium tracking-[.08em] text-muted">{eyebrow}</p>}<h2 id={id} className="section-title">{title}</h2>{description && <p className="mt-1 text-xs leading-5 text-muted">{description}</p>}</div>{action && <div className="shrink-0">{action}</div>}</div>
}

export function StickyActionBar({ children, className = '' }: PropsWithChildren<{ className?: string }>) {
  return <div className={twMerge('safe-bottom sticky-action-bar fixed inset-x-0 bottom-0 z-20 mx-auto max-w-[430px] p-4', className)}>{children}</div>
}

export function BrandMark({ compact = false }: { compact?: boolean }) {
  return <img src="/skn-assets/skn-wordmark.png" alt="SKN" className={compact ? 'h-7 w-auto' : 'h-12 w-auto'}/>
}

export function SknMark({ className = '' }: { className?: string }) {
  return <img src="/skn-assets/skn-mark.png" alt="SKN" className={twMerge('h-8 w-[30px] object-contain', className)}/>
}

export function Button({ className, variant = 'primary', type = 'button', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' | 'danger' }) {
  const variants = {
    primary: 'bg-ink text-white shadow-[0_6px_18px_rgba(23,24,22,.12)] hover:bg-black disabled:bg-[#a9aba6] disabled:shadow-none',
    secondary: 'border border-line bg-white text-ink hover:border-[#d4d8cf] hover:bg-soft',
    ghost: 'bg-transparent text-ink hover:bg-soft',
    danger: 'bg-[#fff0f0] text-danger hover:bg-[#ffe8e8]',
  }
  return <button type={type} className={twMerge('flex min-h-12 items-center justify-center gap-2 rounded-full px-5 text-sm font-medium leading-none tracking-[-.01em] transition active:scale-[.985] disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100', variants[variant], className)} {...props}/>
}

export function Card({ children, className = '' }: PropsWithChildren<{ className?: string }>) {
  return <section className={twMerge('surface-card p-5', className)}>{children}</section>
}

export function Eyebrow({ children, className = '' }: PropsWithChildren<{ className?: string }>) {
  return <p className={twMerge('text-xs font-medium uppercase tracking-[.07em] text-muted', className)}>{children}</p>
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
      <div className="absolute inset-x-1.5 top-1/3 rounded-sm border border-black/5 bg-white/75 py-1 text-center text-[6px] font-semibold tracking-widest text-[#555a53]">SKN</div>
    </div>
  </div>
}

export function Loading({ label = '불러오는 중' }: { label?: string }) {
  return <div className="grid min-h-[55svh] place-items-center" role="status" aria-live="polite"><div className="flex flex-col items-center gap-3 text-sm text-muted"><span aria-hidden="true" className="size-6 animate-spin rounded-full border-2 border-line border-t-accent"/><span>{label}</span></div></div>
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return <div className="mx-5 mt-24 text-center" role="alert"><div className="mx-auto mb-4 grid size-12 place-items-center rounded-full bg-soft text-muted"><Bot size={22}/></div><h2 className="font-medium">잠시 연결하지 못했어요</h2><p className="mx-auto mt-2 max-w-64 text-sm leading-6 text-muted">{message}</p>{onRetry && <Button className="mx-auto mt-5" variant="secondary" onClick={onRetry}>다시 시도</Button>}</div>
}

export function EmptyState({ icon, title, body, action }: { icon?: ReactNode; title: string; body: string; action?: ReactNode }) {
  return <div className="px-7 py-16 text-center"><div className="mx-auto mb-5 grid size-14 place-items-center rounded-[18px] bg-soft text-muted">{icon || <CircleUserRound/>}</div><h2 className="text-2xl font-medium tracking-[-.035em]">{title}</h2><p className="mx-auto mt-2 max-w-72 text-sm leading-6 text-muted">{body}</p>{action && <div className="mt-6">{action}</div>}</div>
}

export function BottomSheet({ open, onClose, title, children }: PropsWithChildren<{ open: boolean; onClose: () => void; title: string }>) {
  const sheet = useRef<HTMLElement>(null)
  const close = useRef(onClose)
  close.current = onClose
  useEffect(() => {
    if (!open) return
    const previousFocus = document.activeElement as HTMLElement | null
    sheet.current?.focus({ preventScroll: true })
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close.current()
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => {
      window.removeEventListener('keydown', closeOnEscape)
      previousFocus?.focus({ preventScroll: true })
    }
  }, [open])

  if (!open) return null
  return <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/35 backdrop-blur-[2px]" onPointerDown={onClose}>
    <section ref={sheet} role="dialog" aria-modal="true" aria-labelledby="bottom-sheet-title" tabIndex={-1} className="safe-bottom w-full max-w-[430px] animate-rise rounded-t-[28px] bg-white px-5 pb-4 pt-3 shadow-2xl outline-none" onPointerDown={event => event.stopPropagation()}>
      <div aria-hidden="true" className="mx-auto mb-5 h-1 w-10 rounded-full bg-[#d9dcd6]"/><div className="mb-5 flex items-start justify-between gap-4"><h2 id="bottom-sheet-title" className="text-2xl font-medium tracking-[-.035em]">{title}</h2><button type="button" onClick={onClose} aria-label="닫기" className="-mr-2 -mt-2 grid size-11 shrink-0 place-items-center rounded-full text-muted transition hover:bg-soft active:scale-95"><X size={19}/></button></div>{children}
    </section>
  </div>
}

export function AiBadge() {
  return <span className="inline-flex items-center gap-1 rounded-full bg-accent-soft px-2.5 py-1 text-xs font-medium text-accent"><Sparkles size={12}/> SKN AI</span>
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

  const mediaClasses = twMerge('pointer-events-none absolute inset-0 block h-full w-full select-none border-0 bg-[#fff] object-contain outline-none shadow-none', mediaClassName)

  return <span role={alt ? 'img' : undefined} aria-label={alt || undefined} aria-hidden={!alt}
    className={twMerge('relative block shrink-0 overflow-hidden bg-[#fff]', className)}>
    <img src={poster} alt="" draggable={false} className={mediaClasses}/>
    {!fallbackOnly && <video ref={video} tabIndex={-1} aria-hidden="true" poster={poster} autoPlay={playing} muted playsInline loop={loop}
      preload={playing ? 'auto' : 'metadata'} disablePictureInPicture controlsList="nodownload noplaybackrate nofullscreen"
      onLoadedData={() => setReady(true)} onError={() => setFallbackOnly(true)} onEnded={finish}
      className={twMerge(mediaClasses, 'transition-opacity duration-150 motion-reduce:transition-none', ready ? 'opacity-100' : 'opacity-0')}>
      <source src={`/skn-assets/${name}.webm`} type="video/webm"/>
      <source src={`/skn-assets/${name}.mp4`} type="video/mp4"/>
    </video>}
  </span>
}
