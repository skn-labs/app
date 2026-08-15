import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowRight, Check, Eye, EyeOff } from 'lucide-react'
import { api, ApiError } from '../lib/api'
import { BrandMark, Button, SknMark } from '../components/ui'

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

  const switchMode = (next: 'login' | 'signup') => {
    setMode(next)
    setPassword('')
    setShowPassword(false)
    auth.reset()
  }

  return <main className="mobile-shell flex h-full min-h-0 flex-col overflow-y-auto bg-white px-7 pb-6 pt-[max(24px,env(safe-area-inset-top))]">
    <header className="flex shrink-0 justify-center py-2"><SknMark className="h-[26px] w-auto"/></header>

    <form onSubmit={event => { event.preventDefault(); auth.mutate() }} className="flex min-h-0 flex-1 flex-col animate-rise">
      <div className="pt-10">
        <BrandMark/>
        <h1 className="mt-6 text-[22px] font-bold leading-[1.4] tracking-[-.035em]">{mode === 'login' ? <>내 피부 기록을<br/>계속 이어가세요.</> : <>아이디와 비밀번호만으로<br/>기록을 시작해요.</>}</h1>
        <p className="mt-3 text-[13px] leading-[1.65] text-muted">{mode === 'login' ? <>기억해 둔 사용 경험은<br/>이 계정에서 안전하게 이어집니다.</> : <>가입 뒤 지금 쓰는 제품부터<br/>선택적으로 정리할 수 있어요.</>}</p>
      </div>

      <div className="mt-9 space-y-4">
        <label className="block"><span className="mb-1.5 block text-[13px] font-medium text-muted">아이디</span><input autoComplete="username" autoCapitalize="none" autoCorrect="off" spellCheck={false} value={username} onChange={event => setUsername(event.target.value.toLowerCase().trim())} placeholder="skn_user" className="h-[50px] w-full rounded-xl border border-transparent bg-[#f2f2f7] px-4 text-[15px] outline-none transition focus:border-ink"/></label>
        <label className="block"><span className="mb-1.5 block text-[13px] font-medium text-muted">비밀번호</span><div className="relative"><input autoComplete={mode === 'login' ? 'current-password' : 'new-password'} type={showPassword ? 'text' : 'password'} value={password} maxLength={72} onChange={event => setPassword(event.target.value)} placeholder="8자 이상" className="h-[50px] w-full rounded-xl border border-transparent bg-[#f2f2f7] px-4 pr-12 text-[15px] outline-none transition focus:border-ink"/><button type="button" aria-label={showPassword ? '비밀번호 숨기기' : '비밀번호 보기'} onClick={() => setShowPassword(value => !value)} className="absolute right-1 top-1 grid size-[42px] place-items-center text-muted">{showPassword ? <EyeOff size={18}/> : <Eye size={18}/>}</button></div></label>
        {mode === 'signup' && <ul className="flex flex-wrap gap-x-3 gap-y-1 pt-0.5">
          {[
            { label: '영문 소문자·숫자·_ 4~24자', ok: /^[a-z0-9_]{4,24}$/.test(username) },
            { label: '비밀번호 8~72자', ok: password.length >= 8 && password.length <= 72 },
          ].map(rule => <li key={rule.label} className={`flex items-center gap-1.5 text-[11px] ${rule.ok ? 'text-ink' : 'text-[#b5b7b2]'}`}><Check size={12}/>{rule.label}</li>)}
        </ul>}
        <label className="flex w-fit items-center gap-2 text-xs text-muted"><input type="checkbox" checked={remember} onChange={event => setRemember(event.target.checked)} className="size-[18px] rounded accent-black"/>아이디 저장</label>
        {error && <p role="alert" className="text-xs leading-5 text-danger">{error}</p>}
      </div>

      <div className="mt-auto pt-8">
        <Button type="submit" disabled={auth.isPending || !username || !password} className="h-[52px] w-full rounded-full">{auth.isPending ? '확인하는 중…' : mode === 'login' ? '로그인' : '회원가입'}<ArrowRight size={17}/></Button>
        <p className="pt-4 text-center text-xs text-muted">{mode === 'login' ? '아직 계정이 없으신가요?' : '이미 계정이 있으신가요?'} <button type="button" onClick={() => switchMode(mode === 'login' ? 'signup' : 'login')} className="font-semibold text-ink underline underline-offset-2">{mode === 'login' ? '회원가입' : '로그인'}</button></p>
        <button type="button" disabled={demo.isPending} onClick={() => demo.mutate()} className="mx-auto mt-4 block text-center text-xs font-medium text-muted underline decoration-line underline-offset-4">{demo.isPending ? '데모 준비 중…' : '기록이 있는 데모로 둘러보기'}</button>
        <div className="flex items-center justify-center gap-2 pt-5 text-[11px] text-[#a0a39c]"><Check size={13}/><span>비밀번호는 일방향 해시로 저장됩니다.</span></div>
      </div>
    </form>
  </main>
}
