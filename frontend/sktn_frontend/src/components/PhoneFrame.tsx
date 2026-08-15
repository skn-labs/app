import type { ReactNode } from 'react'

/**
 * 데스크톱에서 볼 때 목업처럼 보이게 하는 프레임.
 * 실제 모바일 폭에서는 그냥 전체 화면이 됩니다.
 */
export default function PhoneFrame({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh items-center justify-center sm:p-6">
      <div className="relative flex h-dvh w-full flex-col overflow-hidden bg-surface sm:h-[844px] sm:w-[390px] sm:rounded-[44px] sm:shadow-2xl">
        {children}
      </div>
    </div>
  )
}
