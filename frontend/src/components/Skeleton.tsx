import type { ReactElement } from 'react'
import { twMerge } from 'tailwind-merge'

export type SkeletonVariant = 'generic' | 'home' | 'catalog' | 'collection' | 'routine' | 'detail' | 'records' | 'notifications' | 'chat' | 'form'

export function Skeleton({ className = '' }: { className?: string }) {
  return <span aria-hidden="true" className={twMerge('skn-skeleton block', className)}/>
}

function Lines({ widths = ['w-full', 'w-4/5'], className = '' }: { widths?: string[]; className?: string }) {
  return <div className={twMerge('space-y-2.5', className)}>{widths.map((width, index) => <Skeleton key={`${width}-${index}`} className={twMerge('h-3 rounded-full', width)}/>)}</div>
}

function ProductTiles({ count = 4 }: { count?: number }) {
  return <div className="grid grid-cols-2 gap-x-3 gap-y-5">{Array.from({ length: count }, (_, index) => <div key={index}>
    <Skeleton className="h-[184px] rounded-[26px]"/>
    <div className="space-y-2 px-1 pt-3.5">
      <Skeleton className="h-2.5 w-16 rounded-full"/>
      <Skeleton className={twMerge('h-4 rounded-full', index % 2 ? 'w-4/5' : 'w-full')}/>
      <Skeleton className="h-2.5 w-3/5 rounded-full"/>
    </div>
  </div>)}</div>
}

function GenericSkeleton() {
  return <>
    <Skeleton className="h-3 w-20 rounded-full"/>
    <Skeleton className="mt-3 h-8 w-3/5 rounded-xl"/>
    <Lines className="mt-4" widths={['w-full', 'w-3/4']}/>
    <div className="mt-8 space-y-3">
      <Skeleton className="h-32 rounded-[24px]"/>
      <Skeleton className="h-24 rounded-[22px]"/>
      <Skeleton className="h-24 rounded-[22px]"/>
    </div>
  </>
}

function HomeSkeleton() {
  return <>
    <Skeleton className="mt-2 h-9 w-36 rounded-xl"/>
    <Skeleton className="mt-3 h-3 w-52 rounded-full"/>
    <Skeleton className="mt-7 aspect-[378/244] w-full rounded-[28px]"/>
    <div className="mt-4 space-y-3">
      <Skeleton className="h-[74px] rounded-[20px]"/>
      <Skeleton className="h-[74px] rounded-[20px]"/>
    </div>
    <div className="mt-9 flex items-end justify-between">
      <div className="space-y-2"><Skeleton className="h-5 w-20 rounded-full"/><Skeleton className="h-2.5 w-48 rounded-full"/></div>
      <Skeleton className="h-3 w-12 rounded-full"/>
    </div>
    <Skeleton className="mt-4 h-28 rounded-[22px]"/>
  </>
}

function CatalogSkeleton() {
  return <>
    <Skeleton className="h-8 w-40 rounded-xl"/>
    <Skeleton className="mt-3 h-3 w-64 max-w-full rounded-full"/>
    <div className="mt-6 flex gap-2.5"><Skeleton className="h-14 flex-1 rounded-full"/><Skeleton className="size-14 rounded-full"/></div>
    <div className="mt-5"><ProductTiles count={6}/></div>
  </>
}

function CollectionSkeleton() {
  return <>
    <Skeleton className="h-3 w-24 rounded-full"/>
    <Skeleton className="mt-3 h-9 w-44 rounded-xl"/>
    <div className="mt-7 grid grid-cols-3 gap-2.5">{[0, 1, 2].map(item => <Skeleton key={item} className="h-20 rounded-[19px]"/>)}</div>
    <div className="mt-5 flex gap-2 overflow-hidden">{['w-20', 'w-24', 'w-16', 'w-20'].map((width, index) => <Skeleton key={index} className={twMerge('h-10 shrink-0 rounded-full', width)}/>)}</div>
    <div className="mt-6"><ProductTiles count={4}/></div>
  </>
}

function RoutineSkeleton() {
  return <>
    <Skeleton className="h-3 w-24 rounded-full"/>
    <Skeleton className="mt-3 h-9 w-32 rounded-xl"/>
    <Skeleton className="mt-3 h-3 w-60 max-w-full rounded-full"/>
    <div className="-mx-5 mt-7 overflow-hidden px-5 py-2">
      <div className="flex items-center justify-center gap-3">
        <Skeleton className="h-[330px] w-6 shrink-0 rounded-r-[22px] opacity-60"/>
        <Skeleton className="h-[382px] w-[min(78vw,292px)] shrink-0 rounded-[30px]"/>
        <Skeleton className="h-[330px] w-6 shrink-0 rounded-l-[22px] opacity-60"/>
      </div>
    </div>
    <div className="mt-4 flex justify-center gap-2"><Skeleton className="size-2 rounded-full"/><Skeleton className="h-2 w-5 rounded-full"/><Skeleton className="size-2 rounded-full"/></div>
  </>
}

function DetailSkeleton() {
  return <>
    <Skeleton className="h-3 w-24 rounded-full"/>
    <Skeleton className="mt-3 h-8 w-4/5 rounded-xl"/>
    <Skeleton className="mt-2 h-8 w-2/5 rounded-xl"/>
    <Lines className="mt-4" widths={['w-3/4', 'w-1/2']}/>
    <Skeleton className="mt-7 h-56 rounded-[28px]"/>
    <div className="mt-7 space-y-3">{[0, 1, 2].map(index => <div key={index} className="flex items-center gap-4 rounded-[20px] border border-[#edf0f4] p-3.5"><Skeleton className="size-12 shrink-0 rounded-[16px]"/><div className="min-w-0 flex-1"><Lines widths={index % 2 ? ['w-3/5', 'w-full'] : ['w-2/5', 'w-4/5']}/></div></div>)}</div>
  </>
}

function RecordsSkeleton() {
  return <>
    <div className="flex items-center gap-4"><Skeleton className="size-16 shrink-0 rounded-[22px]"/><div className="flex-1"><Skeleton className="h-7 w-36 rounded-lg"/><Skeleton className="mt-2 h-3 w-48 max-w-full rounded-full"/></div></div>
    <div className="mt-7 grid grid-cols-3 gap-2"><Skeleton className="h-11 rounded-full"/><Skeleton className="h-11 rounded-full"/><Skeleton className="h-11 rounded-full"/></div>
    <Skeleton className="mt-6 h-[280px] rounded-[26px]"/>
    <div className="mt-6 space-y-3"><Skeleton className="h-24 rounded-[20px]"/><Skeleton className="h-24 rounded-[20px]"/></div>
  </>
}

function NotificationsSkeleton() {
  return <div className="space-y-2">{Array.from({ length: 5 }, (_, index) => <div key={index} className="flex items-start gap-3.5 px-2.5 py-3">
    <Skeleton className="size-11 shrink-0 rounded-[14px]"/>
    <div className="min-w-0 flex-1 pt-0.5"><div className="flex justify-between gap-4"><Skeleton className={twMerge('h-4 rounded-full', index % 2 ? 'w-32' : 'w-40')}/><Skeleton className="h-2.5 w-10 rounded-full"/></div><Lines className="mt-2" widths={['w-full', 'w-2/3']}/></div>
  </div>)}</div>
}

function ChatSkeleton() {
  return <div className="flex min-h-[calc(100svh-170px)] flex-col">
    <div className="ml-auto max-w-[76%] rounded-[22px] rounded-br-md bg-[#f1f3f7] p-4"><Skeleton className="h-3 w-44 max-w-full rounded-full"/><Skeleton className="mt-2 h-3 w-28 rounded-full"/></div>
    <div className="mt-6 max-w-[88%] space-y-3"><div className="flex items-center gap-2"><Skeleton className="size-8 rounded-full"/><Skeleton className="h-3 w-16 rounded-full"/></div><Skeleton className="h-3 w-full rounded-full"/><Skeleton className="h-3 w-11/12 rounded-full"/><Skeleton className="h-3 w-3/4 rounded-full"/><Skeleton className="mt-2 h-24 rounded-[20px]"/></div>
    <Skeleton className="mt-auto h-[58px] w-full rounded-[24px]"/>
  </div>
}

function FormSkeleton() {
  return <>
    <Skeleton className="h-3 w-24 rounded-full"/>
    <Skeleton className="mt-3 h-8 w-3/4 rounded-xl"/>
    <Skeleton className="mt-3 h-3 w-full rounded-full"/>
    <Skeleton className="mt-2 h-3 w-4/5 rounded-full"/>
    <div className="mt-8 space-y-6">{[0, 1, 2].map(index => <div key={index}><Skeleton className="mb-2 h-3 w-20 rounded-full"/><Skeleton className={twMerge('w-full rounded-[18px]', index === 1 ? 'h-28' : 'h-[54px]')}/></div>)}</div>
    <div className="mt-7 flex flex-wrap gap-2">{['w-20', 'w-24', 'w-16', 'w-28'].map((width, index) => <Skeleton key={index} className={twMerge('h-10 rounded-full', width)}/>)}</div>
  </>
}

const variantContent: Record<SkeletonVariant, () => ReactElement> = {
  generic: GenericSkeleton,
  home: HomeSkeleton,
  catalog: CatalogSkeleton,
  collection: CollectionSkeleton,
  routine: RoutineSkeleton,
  detail: DetailSkeleton,
  records: RecordsSkeleton,
  notifications: NotificationsSkeleton,
  chat: ChatSkeleton,
  form: FormSkeleton,
}

export function PageSkeleton({ variant = 'generic', label = '화면을 준비하는 중', className = '' }: { variant?: SkeletonVariant; label?: string; className?: string }) {
  const Content = variantContent[variant]
  return <div role="status" aria-live="polite" aria-busy="true" className={twMerge('skn-skeleton-frame w-full px-5 pb-12 pt-5', className)}>
    <span className="sr-only">{label}</span>
    <Content/>
  </div>
}
