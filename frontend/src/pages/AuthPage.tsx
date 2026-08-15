import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowRight, Check, Eye, EyeOff } from 'lucide-react'
import { api, ApiError } from '../lib/api'
import { BrandMark, Button } from '../components/ui'

// 아이디만 기억한다. 비밀번호는 저장하지 않으며 로그인 상태는 서버 세션 쿠키가 들고 있다.
const REMEMBERED_USERNAME = 'skn:remembered-username'
const readRemembered = () => { try { return localStorage.getItem(REMEMBERED_USERNAME) } catch { return null } }

export function AuthPage() {
  const queryClient = useQueryClient()
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const remembered = readRemembered()
  const [username, setUsername] = useState(remembered || '')
  const [remember, setRemember] = useState(remembered !== null)
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const auth = useMutation({
    mutationFn: () => mode === 'login' ? api.login(username, password) : api.signup(username, password),
    onSuccess: data => {
      // 성공했을 때만 저장한다. 틀린 아이디를 남겨두면 다음에도 계속 실패한다.
      try {
        if (remember) localStorage.setItem(REMEMBERED_USERNAME, data.username)
        else localStorage.removeItem(REMEMBERED_USERNAME)
      } catch { /* 시크릿 모드 등에서 막혀도 로그인은 계속된다 */ }
      queryClient.setQueryData(['auth'], data)
      queryClient.invalidateQueries({ queryKey: ['quick-accounts'] })
    },
  })
  const demo = useMutation({ mutationFn: api.demo, onSuccess: data => queryClient.setQueryData(['auth'], data) })
  const error = auth.error instanceof ApiError ? auth.error.message : auth.isError ? '잠시 후 다시 시도해주세요.' : ''

  return <main className="mobile-shell flex h-full min-h-0 flex-col overflow-y-auto bg-paper px-6 pb-8 pt-12">
    <div className="animate-rise"><BrandMark/><p className="mt-5 max-w-[310px] text-[26px] font-bold leading-[1.28] tracking-[-.045em]">써본 화장품이 쌓일수록<br/>나를 더 잘 알게 됩니다.</p><p className="mt-3 text-sm leading-6 text-muted">사용감·조합·피부 반응을 연결하는<br/>나만의 스킨케어 기록.</p></div>

    <section className="mt-10 min-w-0 rounded-[26px] border border-line bg-white p-5 shadow-[0_16px_45px_rgba(22,28,21,.07)]">
      <div className="mb-5 grid grid-cols-2 rounded-xl bg-soft p-1">
        {(['login','signup'] as const).map(item => <button key={item} onClick={() => { setMode(item); auth.reset() }} className={`rounded-[10px] py-2 text-sm font-semibold transition ${mode === item ? 'bg-white text-ink shadow-sm' : 'text-muted'}`}>{item === 'login' ? '로그인' : '회원가입'}</button>)}
      </div>
      <form onSubmit={event => { event.preventDefault(); auth.mutate() }} className="space-y-3">
        <label className="block"><span className="mb-1.5 block text-xs font-semibold text-muted">아이디</span><input autoCapitalize="none" value={username} onChange={e => setUsername(e.target.value)} placeholder="영문 소문자·숫자 4자 이상" className="h-12 w-full rounded-xl border border-line bg-white px-4 text-sm outline-none focus:border-accent"/></label>
        <label className="block"><span className="mb-1.5 block text-xs font-semibold text-muted">비밀번호</span><div className="relative"><input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="8자 이상" className="h-12 w-full rounded-xl border border-line bg-white px-4 pr-12 text-sm outline-none focus:border-accent"/><button type="button" aria-label="비밀번호 보기" onClick={() => setShowPassword(v => !v)} className="absolute right-1 top-1 grid size-10 place-items-center text-muted">{showPassword ? <EyeOff size={18}/> : <Eye size={18}/>}</button></div></label>
        {mode === 'signup' && <ul className="space-y-1 pt-0.5">
          {[
            { label: '아이디 · 영문 소문자·숫자·_ 4~24자', ok: /^[a-z0-9_]{4,24}$/.test(username) },
            { label: '비밀번호 · 8자 이상', ok: password.length >= 8 && password.length <= 72 },
          ].map(rule => <li key={rule.label} className={`flex items-center gap-1.5 text-[11px] ${rule.ok ? 'text-ink' : 'text-muted'}`}>
            <Check size={12} className={rule.ok ? 'text-accent' : 'text-line'}/>{rule.label}
          </li>)}
        </ul>}
        <label className="flex w-fit items-center gap-2 pt-0.5 text-xs text-muted">
          <input type="checkbox" checked={remember} onChange={event => setRemember(event.target.checked)} className="size-4 accent-[#5365f5]"/>
          아이디 저장
        </label>
        {error && <p role="alert" className="text-xs leading-5 text-danger">{error}</p>}
        <Button type="submit" disabled={auth.isPending || !username || !password} className="w-full">{auth.isPending ? '확인하는 중' : mode === 'login' ? '로그인' : '시작하기'}<ArrowRight size={17}/></Button>
      </form>
    </section>

    <button disabled={demo.isPending} onClick={() => demo.mutate()} className="mt-5 text-center text-sm font-semibold text-muted underline decoration-line underline-offset-4">{demo.isPending ? '데모 준비 중…' : '기록이 있는 데모로 둘러보기'}</button>
    <div className="mt-auto flex items-center justify-center gap-2 pt-8 text-[11px] text-muted"><Check size={13}/><span>비밀번호는 일방향 해시로 저장됩니다.</span></div>
  </main>
}
