import { useQuery } from '@tanstack/react-query'
import { Bell } from 'lucide-react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'

export function NotificationBell() {
  const inbox = useQuery({
    queryKey: ['notifications'],
    queryFn: api.notifications,
    staleTime: 30_000,
  })
  const unread = inbox.data?.unreadCount || 0

  return <Link to="/notifications" aria-label={unread ? `알림 ${unread}개` : '알림'} className="relative grid size-11 place-items-center rounded-full text-ink transition hover:bg-soft active:scale-95">
    <Bell size={21} strokeWidth={1.8}/>
    {unread > 0 && <span aria-hidden="true" className="absolute right-[7px] top-[7px] size-2.5 rounded-full border-2 border-white bg-black"/>}
  </Link>
}
