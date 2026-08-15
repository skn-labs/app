import type { PropsWithChildren } from 'react'
import { SknMark } from './ui'

/** sktn-prototype_2의 390×844 프레임. 모바일에서는 실제 화면을 가득 채운다. */
export function PrototypePhone({ children }: PropsWithChildren) {
  return <div className="fixed inset-0 z-0 flex items-center justify-center bg-[#fff] sm:p-6">
    <main className="relative flex h-dvh w-full flex-col overflow-hidden bg-white text-[#0a0a0a] sm:h-[min(844px,calc(100dvh-48px))] sm:w-[390px] sm:rounded-[44px] sm:border sm:border-black/[.04] sm:shadow-[0_30px_70px_rgba(25,31,22,.16)]">
      {children}
    </main>
  </div>
}

export function PrototypeStatusBar() {
  return <div aria-hidden="true" className="hidden shrink-0 items-center justify-between px-7 pb-1 pt-3 text-[13px] font-semibold sm:flex">
    <span>12:06</span>
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
  return <div aria-hidden="true" className="hidden shrink-0 justify-center pb-2 pt-1 sm:flex"><i className="block h-[5px] w-[134px] rounded-full bg-[#0a0a0a]"/></div>
}
