import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Bell, Clock3 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { AppHeader, BottomSheet, Button, EmptyState, ErrorState, Loading, Screen } from '../components/ui'
import { api } from '../lib/api'
import type { AppNotification } from '../lib/types'

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

  return <Screen nav={false} className="bg-white">
    <AppHeader back backTo="/" profile={false} notifications={false} sticky/>
    <div className="px-5 pb-12 pt-8">
      <div className="flex items-end justify-between gap-4">
        <div><p className="text-xs font-medium tracking-[.08em] text-muted">NOTIFICATIONS</p><h1 className="mt-2 text-4xl font-medium leading-none tracking-[-.06em]">알림창</h1></div>
        {!!inbox.data?.unreadCount && <button type="button" disabled={readAll.isPending} onClick={() => readAll.mutate()} className="min-h-11 rounded-full px-3 text-xs font-medium text-muted transition hover:bg-soft disabled:opacity-50">모두 읽음</button>}
      </div>

      {inbox.isPending ? <Loading label="알림을 불러오는 중"/>
        : inbox.isError ? <ErrorState message={inbox.error.message} onRetry={() => inbox.refetch()}/>
          : inbox.data.items.length ? <div className="mt-12 divide-y divide-line/55">{inbox.data.items.map(item => <NotificationRow key={item.id} item={item} onOpen={() => open(item)} onSnooze={() => setSnoozeTarget(item)}/>)}</div>
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

function NotificationRow({ item, onOpen, onSnooze }: { item: AppNotification; onOpen: () => void; onSnooze: () => void }) {
  const quiet = item.read || item.completed
  const canSnooze = item.type.startsWith('EXPERIENCE_') && !item.completed
  return <article className="flex min-h-[92px] items-stretch gap-1 py-2">
    <button type="button" onClick={onOpen} className="interactive-card flex min-w-0 flex-1 items-center gap-4 rounded-[18px] px-1 text-left">
      <span aria-hidden="true" className={`size-3 shrink-0 rounded-full ${quiet ? 'bg-[#d9e6ff]' : 'bg-black'}`}/>
      <span className="min-w-0 flex-1">
        <span className={`block truncate text-base font-medium tracking-[-.025em] ${quiet ? 'text-[#656565]' : 'text-black'}`}>{item.title}</span>
        <span className="mt-2 block truncate text-xs text-[#9abfff]">{item.body}</span>
      </span>
      <span className="shrink-0 self-start pt-5 text-xs tabular-nums text-[#8c8c8c]">{relativeTime(item.availableAt)}</span>
    </button>
    {canSnooze && <button type="button" onClick={onSnooze} aria-label={`${item.title} 알림 미루기`} className="grid w-10 shrink-0 place-items-center rounded-full text-[#9a9a9a] transition hover:bg-soft"><Clock3 size={16}/></button>}
  </article>
}

function relativeTime(value: string) {
  const normalized = /Z$|[+-]\d\d:\d\d$/.test(value) ? value : `${value.replace(' ', 'T')}Z`
  const date = new Date(normalized)
  if (Number.isNaN(date.getTime())) return value.slice(0, 10)
  const seconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000))
  if (seconds < 60) return '방금 전'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}분 전`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}시간 전`
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}일 전`
  return new Intl.DateTimeFormat('ko-KR', { month: 'short', day: 'numeric' }).format(date)
}
