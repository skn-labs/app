import { useMutation, useQuery } from '@tanstack/react-query'
import { LogIn, RefreshCw, UsersRound } from 'lucide-react'
import { api } from '../lib/api'

export function DesktopQuickLogin({ currentUsername }: { currentUsername?: string }) {
  const accounts = useQuery({
    queryKey: ['quick-accounts'],
    queryFn: api.quickAccounts,
    retry: false,
  })
  const login = useMutation({
    mutationFn: api.quickLogin,
    onSuccess: () => window.location.replace('/'),
  })

  if (accounts.isError) return null

  return <aside className="quick-login-panel" aria-label="빠른 로그인">
    <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-5">
      <div>
        <div className="flex items-center gap-2 text-ink"><UsersRound size={18}/><h2 className="text-base font-semibold">빠른 로그인</h2></div>
        <p className="mt-2 text-xs leading-5 text-muted">계정을 누르면 새로고침되고,<br/>홈 화면으로 이동합니다.</p>
      </div>
      <span className="rounded-full bg-soft px-2.5 py-1 text-xs font-semibold text-muted">TEST</span>
    </div>

    <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
      <p className="mb-3 text-xs leading-4 text-muted">기본 계정 20개 · 새로 가입한 계정도 자동으로 추가됩니다.</p>
      {accounts.isPending ? <div className="flex items-center gap-2 rounded-xl bg-soft p-3 text-xs text-muted"><RefreshCw size={14} className="animate-spin"/>계정 불러오는 중</div> : <div className="grid grid-cols-2 gap-2">
        {accounts.data.map(account => {
          const active = account.username === currentUsername
          const pending = login.isPending && login.variables === account.username
          return <button
            key={account.username}
            type="button"
            disabled={login.isPending}
            onClick={() => login.mutate(account.username)}
            className={`group min-w-0 rounded-xl border px-3 py-3 text-left transition hover:-translate-y-px hover:shadow-sm disabled:cursor-wait ${active ? 'border-accent bg-accent-soft' : 'border-line bg-white hover:border-[#cdd1ca]'}`}
          >
            <span className="flex items-center justify-between gap-1"><span className="truncate text-xs font-semibold text-ink">{account.username}</span>{pending ? <RefreshCw size={12} className="shrink-0 animate-spin text-accent"/> : <LogIn size={12} className={active ? 'text-accent' : 'text-muted opacity-0 transition group-hover:opacity-100'}/>}</span>
            <span className="mt-1 block truncate text-xs text-muted">{active ? '현재 계정' : account.displayName}</span>
          </button>
        })}
      </div>}
      {login.isError && <p role="alert" className="mt-3 rounded-xl bg-[#fff0f0] p-3 text-xs leading-5 text-danger">계정을 바꾸지 못했어요. 다시 눌러주세요.</p>}
    </div>
  </aside>
}
