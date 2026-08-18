import { Fragment, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Bell, CalendarClock, Clock3, Compass, Hexagon, NotebookPen, Sparkles, TrendingUp, type LucideIcon } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { AppHeader, BottomSheet, Button, EmptyState, ErrorState, Loading, Screen } from '../components/ui'
import { api } from '../lib/api'
import type { AppNotification } from '../lib/types'

type NotificationMeta = { Icon: LucideIcon; tint: string; glow: string }
const TYPE_META: Record<AppNotification['type'], NotificationMeta> = {
  EXPERIENCE_CHECK_IN: { Icon: NotebookPen, tint: '#3d6fd6', glow: 'rgba(61,111,214,.24)' },
  EXPERIENCE_REVIEW_DUE: { Icon: CalendarClock, tint: '#3d6fd6', glow: 'rgba(61,111,214,.24)' },
  PATTERN_READY: { Icon: Sparkles, tint: '#7b5bd6', glow: 'rgba(123,91,214,.24)' },
  PROFILE_READY: { Icon: Hexagon, tint: '#3f9d6b', glow: 'rgba(63,157,107,.24)' },
  PROFILE_UPDATED: { Icon: TrendingUp, tint: '#3f9d6b', glow: 'rgba(63,157,107,.24)' },
  PRODUCT_DISCOVERY: { Icon: Compass, tint: '#d1873a', glow: 'rgba(209,135,58,.24)' },
}
const FALLBACK_META: NotificationMeta = { Icon: Bell, tint: '#3d6fd6', glow: 'rgba(61,111,214,.24)' }

export function NotificationsPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [snoozeTarget, setSnoozeTarget] = useState<AppNotification | null>(null)
  const inbox = useQuery({ queryKey: ['notifications'], queryFn: api.notifications })
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['notifications'] })
  const read = useMutation({ mutationFn: api.readNotification, onSuccess: refresh })
  const readAll = useMutation({ mutationFn: api.readAllNotifications, onSuccess: refresh })
  const snooze = useMutation({
    mutationFn: ({ id, hours }: { id: number; hours: number }) => api.snoozeNotification(id, hours),
    onSuccess: () => { setSnoozeTarget(null); refresh() },
  })

  const open = (item: AppNotification) => {
    if (!item.read) read.mutate(item.id)
    navigate(item.action.href)
  }

  const items = inbox.data?.items ?? []
  const unread = inbox.data?.unreadCount ?? 0

  return <Screen nav={false} className="relative z-30 bg-white">
    <AppHeader back backTo="/" profile={false} notifications={false} sticky/>
    <div className="px-5 pb-12 pt-8">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium tracking-[.08em] text-muted">NOTIFICATIONS</p>
          <div className="mt-2 flex items-center gap-2.5">
            <h1 className="text-4xl font-medium leading-none tracking-[-.06em]">알림창</h1>
            {unread > 0 && <span className="grid h-6 min-w-6 place-items-center rounded-full bg-accent px-1.5 text-xs font-semibold tabular-nums text-white">{unread}</span>}
          </div>
        </div>
        {unread > 0 && <button type="button" disabled={readAll.isPending} onClick={() => readAll.mutate()} className="min-h-11 shrink-0 rounded-full px-3 text-xs font-medium text-muted transition hover:bg-soft disabled:opacity-50">모두 읽음</button>}
      </div>

      {inbox.isPending ? <Loading variant="notifications" label="알림을 불러오는 중" className="px-0 pt-7"/>
        : inbox.isError ? <ErrorState message={inbox.error.message} onRetry={() => inbox.refetch()}/>
          : items.length ? <div className="mt-8">{items.map((item, index) => {
            const showHeader = index === 0 || bucketOf(items[index - 1].availableAt) !== bucketOf(item.availableAt)
            return <Fragment key={item.id}>
              {showHeader && <p className={`px-1 pb-2.5 text-[11px] font-semibold uppercase tracking-[.07em] text-[#adb0aa] ${index === 0 ? '' : 'pt-7'}`}>{bucketOf(item.availableAt)}</p>}
              <NotificationRow item={item} index={index} onOpen={() => open(item)} onSnooze={() => setSnoozeTarget(item)}/>
            </Fragment>
          })}</div>
            : <EmptyState icon={<Bell size={24}/>} title="도착한 알림이 없어요" body="경험을 돌아볼 시점이나 새 패턴이 생기면 이곳에서 알려드려요."/>}
    </div>

    <BottomSheet open={Boolean(snoozeTarget)} onClose={() => setSnoozeTarget(null)} title="언제 다시 알려드릴까요?">
      <p className="-mt-2 mb-5 text-sm leading-5 text-muted">회고 시점은 그대로 두고 이 알림만 잠시 숨겨요.</p>
      <div className="space-y-2">
        {[[1, '1시간 뒤'], [24, '내일 이 시간'], [72, '3일 뒤']].map(([hours, label]) => <Button key={hours} variant="secondary" disabled={snooze.isPending} onClick={() => snoozeTarget && snooze.mutate({ id: snoozeTarget.id, hours: Number(hours) })} className="w-full">{label}</Button>)}
      </div>
      {snooze.error && <p role="alert" className="mt-4 text-center text-xs text-danger">{snooze.error.message}</p>}
    </BottomSheet>
  </Screen>
}

function NotificationRow({ item, index, onOpen, onSnooze }: { item: AppNotification; index: number; onOpen: () => void; onSnooze: () => void }) {
  const quiet = item.read || item.completed
  const canSnooze = item.type.startsWith('EXPERIENCE_') && !item.completed
  const meta = TYPE_META[item.type] ?? FALLBACK_META
  const Icon = meta.Icon
  return <article className="animate-onboard-rise flex items-center gap-1" style={{ animationDelay: `${Math.min(index, 10) * 35}ms` }}>
    <button type="button" onClick={onOpen} className="interactive-card flex min-w-0 flex-1 items-start gap-3.5 rounded-[18px] p-2.5 text-left">
      <span aria-hidden="true" className="grid size-11 shrink-0 place-items-center rounded-[14px]" style={quiet ? { background: '#f2f4ef', color: '#9a9d97' } : { background: meta.tint, color: '#fff', boxShadow: `0 5px 14px ${meta.glow}` }}><Icon size={19} strokeWidth={1.9}/></span>
      <span className="min-w-0 flex-1 pt-0.5">
        <span className="flex items-start justify-between gap-2.5">
          <span className={`min-w-0 truncate text-[15px] leading-5 tracking-[-.02em] ${quiet ? 'font-medium text-[#6f736c]' : 'font-semibold text-ink'}`}>{item.title}</span>
          <span className="shrink-0 whitespace-nowrap pt-px text-[11px] tabular-nums text-[#adb0aa]">{relativeTime(item.availableAt)}</span>
        </span>
        <span className={`mt-1 line-clamp-2 text-[13px] leading-[1.5] ${quiet ? 'text-[#9a9d97]' : 'text-muted'}`}>{item.body}</span>
      </span>
    </button>
    {canSnooze && <button type="button" onClick={onSnooze} aria-label={`${item.title} 알림 미루기`} className="grid size-10 shrink-0 place-items-center rounded-full text-[#a5a8a2] transition hover:bg-soft hover:text-muted"><Clock3 size={16}/></button>}
  </article>
}

function bucketOf(value: string) {
  const date = parseTime(value)
  if (Number.isNaN(date.getTime())) return '이전'
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const time = date.getTime()
  if (time >= startOfToday) return '오늘'
  if (time >= startOfToday - 6 * 86400000) return '지난 7일'
  return '이전'
}

function parseTime(value: string) {
  const normalized = /Z$|[+-]\d\d:\d\d$/.test(value) ? value : `${value.replace(' ', 'T')}Z`
  return new Date(normalized)
}

function relativeTime(value: string) {
  const date = parseTime(value)
  if (Number.isNaN(date.getTime())) return value.slice(0, 10)
  const seconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000))
  if (seconds < 60) return '방금 전'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}분 전`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}시간 전`
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}일 전`
  return new Intl.DateTimeFormat('ko-KR', { month: 'short', day: 'numeric' }).format(date)
}
