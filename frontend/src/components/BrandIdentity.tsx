import { useEffect, useState } from 'react'
import { twMerge } from 'tailwind-merge'

type BrandIdentityProps = {
  name?: string | null
  logoUrl?: string | null
  size?: 'xs' | 'sm' | 'md'
  className?: string
  nameClassName?: string
}

const logoSizes = {
  xs: 'h-[18px] w-8 rounded-[6px] px-1 py-[3px]',
  sm: 'h-6 w-10 rounded-lg p-1',
  md: 'h-8 w-12 rounded-[10px] p-1.5',
}

const textSizes = {
  xs: 'text-[11px]',
  sm: 'text-xs',
  md: 'text-sm',
}

const lightLogoUrls = new Set([
  '/manufacturer-logos/acwell.png',
  '/manufacturer-logos/ample-n.png',
  '/manufacturer-logos/atopalm.svg',
  '/manufacturer-logos/hanyul.png',
  '/manufacturer-logos/im-meme.png',
])

/** 브랜드명 옆에 저장소 내 로고를 일관되게 표시하고, 미등록 로고는 문자 마크로 대체한다. */
export function BrandIdentity({ name, logoUrl, size = 'sm', className, nameClassName }: BrandIdentityProps) {
  const [logoFailed, setLogoFailed] = useState(false)
  const label = name?.trim() || '브랜드 미입력'
  const needsDarkBackdrop = Boolean(logoUrl && lightLogoUrls.has(logoUrl))

  useEffect(() => setLogoFailed(false), [logoUrl])

  return <span className={twMerge('inline-flex min-w-0 items-center gap-1.5', className)}>
    <span aria-hidden="true" className={twMerge('grid shrink-0 place-items-center overflow-hidden border border-black/[.06] bg-white shadow-[0_1px_4px_rgba(33,43,61,.06)]', needsDarkBackdrop && 'border-white/10 bg-[#30343a]', logoSizes[size])}>
      {logoUrl && !logoFailed
        ? <img src={logoUrl} alt="" loading="lazy" onError={() => setLogoFailed(true)} className="h-full w-full object-contain"/>
        : <span className="grid h-full w-full place-items-center rounded-[inherit] bg-[#edf3fd] text-[9px] font-bold leading-none text-[#607493]">{label.slice(0, 1)}</span>}
    </span>
    <span className={twMerge('min-w-0 truncate font-medium leading-none text-[#6e7785]', textSizes[size], nameClassName)}>{label}</span>
  </span>
}
