import { useEffect, useRef, useState } from 'react'
import type { PropsWithChildren } from 'react'
import { domToPng } from 'modern-screenshot'
import { Camera, Check } from 'lucide-react'
import { formatKstTime } from '../lib/kstTime'
import { SknMark } from './ui'

function KstClock() {
  const [time, setTime] = useState(() => formatKstTime(new Date()))

  useEffect(() => {
    let timeoutId: number
    const updateAtMinuteBoundary = () => {
      const now = new Date()
      setTime(formatKstTime(now))
      timeoutId = window.setTimeout(updateAtMinuteBoundary, 60_000 - (now.getTime() % 60_000) + 25)
    }
    updateAtMinuteBoundary()
    return () => window.clearTimeout(timeoutId)
  }, [])

  return <span>{time}</span>
}

/** 데스크톱에서는 실제 앱을 iPhone 프레임 안에, 모바일에서는 화면 전체에 표시한다. */
export function AppViewport({ children }: PropsWithChildren) {
  const frameRef = useRef<HTMLDivElement>(null)
  const [captureState, setCaptureState] = useState<'idle' | 'capturing' | 'done'>('idle')
  const doneTimer = useRef<number>(0)

  useEffect(() => () => window.clearTimeout(doneTimer.current), [])

  const captureFrame = async () => {
    const node = frameRef.current
    if (!node || captureState === 'capturing') return
    setCaptureState('capturing')
    const root = document.documentElement
    // 캡처 동안 프레임 뒤 배경을 투명하게(둥근 모서리 투명 PNG)
    root.classList.add('skn-capture')
    // backdrop-filter는 foreignObject 렌더 시 하드한 사각형으로 찍히므로, 캡처 직전
    // 프레임 안 모든 요소에서 인라인으로 제거했다가 끝나면 원복한다(CSS 캐스케이드에 의존 X).
    const blurred: { el: HTMLElement; bf: string; wbf: string }[] = []
    node.querySelectorAll<HTMLElement>('*').forEach(el => {
      const cs = getComputedStyle(el)
      const wbfComputed = cs.getPropertyValue('-webkit-backdrop-filter')
      if ((cs.backdropFilter && cs.backdropFilter !== 'none') || (wbfComputed && wbfComputed !== 'none')) {
        blurred.push({ el, bf: el.style.getPropertyValue('backdrop-filter'), wbf: el.style.getPropertyValue('-webkit-backdrop-filter') })
        el.style.setProperty('backdrop-filter', 'none')
        el.style.setProperty('-webkit-backdrop-filter', 'none')
      }
    })
    try {
      const dataUrl = await domToPng(node, {
        scale: 3,
        backgroundColor: 'transparent',
        // 프레임의 배치용 transform(translateY(-50%))를 리셋해야 클론이 잘리지 않는다.
        style: { transform: 'none', top: '0', left: '0', margin: '0' },
      })
      const link = document.createElement('a')
      const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')
      link.download = `skn-${stamp}.png`
      link.href = dataUrl
      link.click()
      setCaptureState('done')
      doneTimer.current = window.setTimeout(() => setCaptureState('idle'), 1600)
    } catch (error) {
      console.error('디바이스 프레임 캡처 실패', error)
      setCaptureState('idle')
    } finally {
      blurred.forEach(({ el, bf, wbf }) => {
        if (bf) el.style.setProperty('backdrop-filter', bf); else el.style.removeProperty('backdrop-filter')
        if (wbf) el.style.setProperty('-webkit-backdrop-filter', wbf); else el.style.removeProperty('-webkit-backdrop-filter')
      })
      root.classList.remove('skn-capture')
    }
  }

  return <div className="skn-app-stage">
    <img src="/skn-assets/desktop-editorial.webp" alt="" aria-hidden="true" className="skn-desktop-editorial"/>
    <div aria-hidden="true" className="skn-desktop-wash"/>
    <aside className="skn-desktop-visit" aria-label="휴대폰에서 SKN 열기">
      <img src="/skn-assets/skn-wordmark.png" alt="SKN" className="skn-desktop-wordmark"/>
      <div className="skn-desktop-visit-copy"><strong>휴대폰에서 이어보기</strong><a href="https://skn.today/">skn.today</a></div>
      <a href="https://skn.today/" aria-label="skn.today 열기" className="skn-desktop-qr"><img src="/skn-assets/skn-today-qr.svg" alt="skn.today QR 코드"/></a>
    </aside>
    <button
      type="button"
      onClick={captureFrame}
      disabled={captureState === 'capturing'}
      aria-label="휴대폰 화면 이미지로 저장"
      className={`skn-capture-btn ${captureState === 'done' ? 'is-done' : ''}`}
    >
      {captureState === 'done'
        ? <><Check size={17} strokeWidth={2.4}/><span>저장됨</span></>
        : <><Camera size={17} strokeWidth={2}/><span>{captureState === 'capturing' ? '캡처 중…' : '화면 캡처'}</span></>}
    </button>
    <div className="skn-device-frame" ref={frameRef}>
      <div className="skn-device-screen">
        <div aria-hidden="true" className="skn-device-status">
          <KstClock/>
          <span className="skn-device-status-icons">
            <svg viewBox="0 0 18 12"><rect x="1" y="8.5" width="3" height="3.5" rx="1"/><rect x="5.5" y="6" width="3" height="6" rx="1"/><rect x="10" y="3" width="3" height="9" rx="1"/><rect x="14.5" width="3" height="12" rx="1"/></svg>
            <svg viewBox="0 0 18 13"><path d="M1.2 4.6a11.2 11.2 0 0 1 15.6 0M4.1 7.6a7 7 0 0 1 9.8 0M7.2 10.7a2.6 2.6 0 0 1 3.6 0" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round"/></svg>
            <svg viewBox="0 0 28 13"><rect x=".75" y=".75" width="23" height="11.5" rx="3.5" fill="none" stroke="currentColor" strokeWidth="1.5" opacity=".36"/><rect x="3" y="3" width="18.5" height="7" rx="2"/><path d="M25.2 4.25v4.5a2.35 2.35 0 0 0 0-4.5Z" opacity=".42"/></svg>
          </span>
        </div>
        <div className="skn-device-content">{children}</div>
      </div>
      <span aria-hidden="true" className="skn-device-island"/>
      <span aria-hidden="true" className="skn-device-home"/>
    </div>
  </div>
}

/** sktn-prototype_2의 390×844 프레임. 모바일에서는 실제 화면을 가득 채운다. */
export function PrototypePhone({ children }: PropsWithChildren) {
  return <div className="absolute inset-0 z-0 flex bg-white">
    <main className="relative flex h-full w-full flex-col overflow-hidden bg-white text-[#0a0a0a]">
      {children}
    </main>
  </div>
}

export function PrototypeStatusBar() {
  return <div aria-hidden="true" className="skn-legacy-status hidden shrink-0 items-center justify-between px-7 pb-1 pt-3 text-sm font-medium sm:flex">
    <KstClock/>
    <div className="flex items-center gap-1.5">
      <svg width="17" height="11" viewBox="0 0 17 11"><rect y="7" width="3" height="4" rx="1"/><rect x="4.5" y="5" width="3" height="6" rx="1"/><rect x="9" y="2.5" width="3" height="8.5" rx="1"/><rect x="13.5" width="3" height="11" rx="1"/></svg>
      <svg width="25" height="12" viewBox="0 0 25 12"><rect x=".5" y=".5" width="21" height="11" rx="3.5" fill="none" stroke="currentColor" opacity=".4"/><rect x="2" y="2" width="16" height="8" rx="2"/></svg>
    </div>
  </div>
}

export function PrototypeTopMark() {
  return <div className="safe-top flex shrink-0 justify-center pb-1 sm:pt-2"><SknMark className="h-[26px] w-auto"/></div>
}

export function PrototypeHomeIndicator() {
  return <div aria-hidden="true" className="skn-legacy-home hidden shrink-0 justify-center pb-2 pt-1 sm:flex"><i className="block h-[5px] w-[134px] rounded-full bg-[#0a0a0a]"/></div>
}
