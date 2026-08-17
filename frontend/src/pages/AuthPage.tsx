import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Check, Eye, EyeOff } from 'lucide-react'
import { api, ApiError } from '../lib/api'
import { markOnboardingWelcome } from '../lib/onboardingWelcome'
import { AssetMotion } from '../components/ui'
import { PrototypeHomeIndicator, PrototypePhone, PrototypeStatusBar, PrototypeTopMark } from '../components/PrototypeChrome'

const REMEMBERED_USERNAME = 'skn:remembered-username'
const readRemembered = () => { try { return localStorage.getItem(REMEMBERED_USERNAME) } catch { return null } }

export function AuthPage() {
  const queryClient = useQueryClient()
  const [screen, setScreen] = useState<'welcome' | 'login' | 'signup'>('welcome')
  const remembered = readRemembered()
  const [username, setUsername] = useState(remembered || '')
  const [remember, setRemember] = useState(remembered !== null)
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const auth = useMutation({
    mutationFn: () => screen === 'login' ? api.login(username, password) : api.signup(username, password),
    onSuccess: data => {
      try {
        if (remember) localStorage.setItem(REMEMBERED_USERNAME, data.username)
        else localStorage.removeItem(REMEMBERED_USERNAME)
      } catch { /* 브라우저 저장소가 막혀도 인증은 유지한다 */ }
      if (screen === 'signup') markOnboardingWelcome(data.userId)
      queryClient.setQueryData(['auth'], data)
      queryClient.invalidateQueries({ queryKey: ['quick-accounts'] })
    },
  })
  const quickSignup = useMutation({
    mutationFn: api.quickSignup,
    onSuccess: data => {
      markOnboardingWelcome(data.userId)
      queryClient.setQueryData(['auth'], data)
      queryClient.invalidateQueries({ queryKey: ['quick-accounts'] })
    },
  })
  const error = auth.error instanceof ApiError ? auth.error.message : auth.isError ? '잠시 후 다시 시도해주세요.' : ''

  const moveTo = (next: 'welcome' | 'login' | 'signup') => {
    setScreen(next)
    setPassword('')
    setShowPassword(false)
    auth.reset()
  }

  if (screen === 'welcome') return <PrototypePhone>
    <PrototypeStatusBar/>
    <PrototypeTopMark/>
    <div className="safe-bottom flex min-h-0 flex-1 flex-col px-7">
      <div className="pt-10"><h1 className="text-2xl font-medium leading-[1.35] tracking-[-.035em]">당신의 피부를 연구할<br/>준비가 되었어요.</h1><p className="mt-3 text-sm leading-[1.65] text-[#73766f]">몇 가지 질문으로 당신에게 맞는<br/>케어를 시작할게요.</p></div>
      <div className="relative flex flex-1 items-center justify-center"><div aria-hidden="true" className="absolute size-[210px] rounded-full bg-[radial-gradient(circle,rgba(234,235,255,.65),rgba(255,255,255,0)_70%)] blur-xl"/><AssetMotion name="ai-drop-motion" poster="/skn-assets/onboarding-orb.png" loop alt="투명한 세럼 구체" className="onboard-float relative size-[230px] rounded-full"/></div>
      <button type="button" onClick={() => moveTo('login')} className="h-[52px] w-full rounded-full bg-[#0a0a0a] text-base font-[600] text-white shadow-[0_8px_22px_rgba(0,0,0,.14)] transition active:scale-[.98]">로그인</button>
      <button type="button" disabled={quickSignup.isPending} onClick={() => quickSignup.mutate()} className="mt-3 h-[52px] w-full rounded-full border border-[#e5e5ea] bg-white text-sm font-[600] text-[#3a3a3c] transition hover:bg-[#f7f7f8] active:scale-[.98] disabled:cursor-wait disabled:text-[#b0b0b5] disabled:active:scale-100">{quickSignup.isPending ? '새 계정 만드는 중…' : '빠르게 새 계정 만들기'}</button>
      {quickSignup.isError && <p role="alert" className="pt-2 text-center text-xs text-danger">계정을 만들지 못했어요. 다시 시도해주세요.</p>}
      <p className={`pb-2 text-center text-xs text-[#8e8e93] ${quickSignup.isError ? 'pt-3' : 'pt-5'}`}>처음이신가요? <button type="button" onClick={() => moveTo('signup')} className="font-medium text-[#3a3a3c] underline underline-offset-2">회원가입</button></p>
    </div>
    <PrototypeHomeIndicator/>
  </PrototypePhone>

  const signup = screen === 'signup'
  const usernameValid = /^[a-z0-9_]{4,24}$/.test(username)
  const passwordValid = password.length >= 8 && password.length <= 72
  return <PrototypePhone>
    <PrototypeStatusBar/>
    <form onSubmit={event => { event.preventDefault(); auth.mutate() }} className="safe-bottom flex min-h-0 flex-1 flex-col px-7 pt-8">
      <img src="/skn-assets/skn-wordmark.png" alt="SKN" className="h-[31px] w-auto self-start object-contain"/>
      <h1 className="mt-7 text-[27px] font-medium leading-[1.25] tracking-[-.04em]">{signup ? '나만의 기록을 시작하세요.' : '내 기록을 이어가세요.'}</h1>
      <p className="mt-2 text-sm leading-[1.6] text-[#747b86]">아이디로 {signup ? '간단히 가입할 수 있어요.' : '로그인해 다시 시작할 수 있어요.'}</p>

      <div className="mt-8 flex flex-col gap-4">
        <label><span className="mb-2 block text-sm font-medium text-[#4f5763]">아이디</span><input autoComplete="username" autoCapitalize="none" autoCorrect="off" spellCheck={false} value={username} onChange={event => { setUsername(event.target.value.toLowerCase().trim()); auth.reset() }} placeholder="skn_user" className="auth-field h-[54px] w-full px-4 text-base placeholder:text-[#a9b2c0]"/></label>
        <label><span className="mb-2 block text-sm font-medium text-[#4f5763]">비밀번호</span><div className="auth-field relative"><input autoComplete={signup ? 'new-password' : 'current-password'} type={showPassword ? 'text' : 'password'} value={password} maxLength={72} onChange={event => { setPassword(event.target.value); auth.reset() }} placeholder="8자 이상" className="h-[54px] w-full bg-transparent px-4 pr-12 text-base outline-none placeholder:text-[#a9b2c0]"/><button type="button" aria-label={showPassword ? '비밀번호 숨기기' : '비밀번호 보기'} onClick={() => setShowPassword(value => !value)} className="absolute right-1 top-1 grid size-[46px] place-items-center rounded-full text-[#6d7683] transition hover:bg-[#edf3ff]">{showPassword ? <EyeOff size={18}/> : <Eye size={18}/>}</button></div></label>
        {signup && <ul className="flex flex-wrap gap-x-3 gap-y-1">{[
          { label: '영문 소문자·숫자·_ 4~24자', ok: usernameValid },
          { label: '비밀번호 8~72자', ok: passwordValid },
        ].map(rule => <li key={rule.label} className={`flex items-center gap-1.5 text-xs ${rule.ok ? 'text-[#0a0a0a]' : 'text-[#c7c7cc]'}`}><Check size={12}/>{rule.label}</li>)}</ul>}
        <label className="flex w-fit cursor-pointer items-center gap-2.5 text-xs text-[#6f7782]"><input type="checkbox" checked={remember} onChange={event => setRemember(event.target.checked)} className="peer sr-only"/><span className="grid size-5 place-items-center rounded-md border border-[#cfd8e6] bg-[#f7f9fd] transition peer-focus-visible:ring-4 peer-focus-visible:ring-[#edf3ff] peer-checked:border-black peer-checked:bg-black peer-checked:[&>svg]:opacity-100"><Check size={13} className="text-white opacity-0 transition"/></span>아이디 저장</label>
        {error && <p role="alert" className="text-xs text-danger">{error}</p>}
        <div className="mt-1 text-center"><button type="button" onClick={() => moveTo(signup ? 'login' : 'signup')} className="text-xs text-[#757d89] transition hover:text-black">{signup ? '이미 계정이 있으신가요? ' : '계정이 없으신가요? '}<span className="font-medium text-[#24282f] underline decoration-[#b6c6df] underline-offset-4">{signup ? '로그인' : '회원가입하기'}</span></button></div>
      </div>

      <div className="flex-1"/>
      <button type="submit" disabled={auth.isPending || !username || !password || (signup && (!usernameValid || !passwordValid))} className="h-[52px] w-full rounded-full bg-[#0a0a0a] text-base font-[600] text-white shadow-[0_8px_22px_rgba(0,0,0,.14)] transition active:scale-[.98] disabled:bg-[#e5e5ea] disabled:text-[#c7c7cc] disabled:shadow-none disabled:active:scale-100">{signup ? '회원가입' : '로그인'}</button>
      <p className="pb-2 pt-4 text-center"><button type="button" onClick={() => moveTo('welcome')} className="inline-flex items-center gap-1 text-xs text-[#7f8792] transition hover:text-black"><span aria-hidden="true">←</span> 처음 화면으로</button></p>
    </form>
    <PrototypeHomeIndicator/>
    {auth.isPending && <div className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-7 bg-white"><AssetMotion name="ai-drop-motion" poster="/skn-assets/ai-drop-motion-poster.png" alt="피부 데이터 불러오는 중" loop className="size-[200px]"/><p className="text-sm text-[#8e8e93]">피부 데이터를 불러오는 중이에요</p></div>}
  </PrototypePhone>
}
