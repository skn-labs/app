import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Check, Eye, EyeOff } from 'lucide-react'
import { api, ApiError } from '../lib/api'
import { AssetMotion } from '../components/ui'
import { PrototypeHomeIndicator, PrototypePhone, PrototypeStatusBar, PrototypeTopMark } from '../components/PrototypeChrome'

const REMEMBERED_USERNAME = 'skn:remembered-username'
const readRemembered = () => { try { return localStorage.getItem(REMEMBERED_USERNAME) } catch { return null } }
const wait = (milliseconds: number) => new Promise(resolve => setTimeout(resolve, milliseconds))

export function AuthPage() {
  const queryClient = useQueryClient()
  const [screen, setScreen] = useState<'welcome' | 'login' | 'signup'>('welcome')
  const remembered = readRemembered()
  const [username, setUsername] = useState(remembered || '')
  const [remember, setRemember] = useState(remembered !== null)
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const auth = useMutation({
    mutationFn: async () => {
      const [result] = await Promise.all([
        screen === 'login' ? api.login(username, password) : api.signup(username, password),
        wait(1200),
      ])
      return result
    },
    onSuccess: data => {
      try {
        if (remember) localStorage.setItem(REMEMBERED_USERNAME, data.username)
        else localStorage.removeItem(REMEMBERED_USERNAME)
      } catch { /* 브라우저 저장소가 막혀도 인증은 유지한다 */ }
      queryClient.setQueryData(['auth'], data)
      queryClient.invalidateQueries({ queryKey: ['quick-accounts'] })
    },
  })
  const demo = useMutation({ mutationFn: api.demo, onSuccess: data => queryClient.setQueryData(['auth'], data) })
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
    <div className="flex min-h-0 flex-1 flex-col px-7">
      <div className="pt-10"><h1 className="text-[22px] font-bold leading-[1.4] tracking-[-.02em]">당신의 피부를 연구할<br/>준비가 되었어요.</h1><p className="mt-3 text-[13px] leading-[1.6] text-[#8e8e93]">몇 가지 질문으로 당신에게 맞는<br/>케어를 시작할게요.</p></div>
      <div className="relative flex flex-1 items-center justify-center"><div aria-hidden="true" className="absolute size-[210px] rounded-full bg-[radial-gradient(circle,rgba(234,235,255,.65),rgba(255,255,255,0)_70%)] blur-xl"/><img src="/skn-assets/onboarding-orb.png" alt="투명한 세럼 구체" className="onboard-float relative size-[230px] object-contain"/></div>
      <button type="button" onClick={() => moveTo('login')} className="h-[52px] w-full rounded-full bg-[#0a0a0a] text-[15px] font-semibold text-white shadow-[0_8px_22px_rgba(0,0,0,.14)] transition active:scale-[.98]">로그인</button>
      <p className="pb-2 pt-4 text-center text-xs text-[#8e8e93]"><button type="button" onClick={() => moveTo('signup')} className="underline underline-offset-2">회원가입</button><span className="mx-2 text-[#e5e5ea]">|</span><button type="button" onClick={() => moveTo('login')} className="underline underline-offset-2">다른 방법으로 로그인</button></p>
    </div>
    <PrototypeHomeIndicator/>
  </PrototypePhone>

  const signup = screen === 'signup'
  const usernameValid = /^[a-z0-9_]{4,24}$/.test(username)
  const passwordValid = password.length >= 8 && password.length <= 72
  return <PrototypePhone>
    <PrototypeStatusBar/>
    <form onSubmit={event => { event.preventDefault(); auth.mutate() }} className="flex min-h-0 flex-1 flex-col px-7 pt-10">
      <img src="/skn-assets/skn-wordmark.png" alt="SKN" className="h-[34px] w-auto self-start object-contain"/>
      <p className="mt-4 text-[13px] leading-[1.6] text-[#8e8e93]">아이디로 {signup ? '가입하고' : '로그인하고'}<br/>내 피부 기록을 이어가세요.</p>

      <div className="mt-9 flex flex-col gap-4">
        <label><span className="mb-1.5 block text-[13px] font-medium text-[#8e8e93]">아이디</span><input autoComplete="username" autoCapitalize="none" autoCorrect="off" spellCheck={false} value={username} onChange={event => { setUsername(event.target.value.toLowerCase().trim()); auth.reset() }} placeholder="skn_user" className="h-[50px] w-full rounded-xl border border-transparent bg-[#f2f2f7] px-4 text-[15px] outline-none transition placeholder:text-[#c7c7cc] focus:border-[#0a0a0a] focus:bg-white"/></label>
        <label><span className="mb-1.5 block text-[13px] font-medium text-[#8e8e93]">비밀번호</span><div className="relative"><input autoComplete={signup ? 'new-password' : 'current-password'} type={showPassword ? 'text' : 'password'} value={password} maxLength={72} onChange={event => { setPassword(event.target.value); auth.reset() }} placeholder="8자 이상" className="h-[50px] w-full rounded-xl border border-transparent bg-[#f2f2f7] px-4 pr-12 text-[15px] outline-none transition placeholder:text-[#c7c7cc] focus:border-[#0a0a0a] focus:bg-white"/><button type="button" aria-label={showPassword ? '비밀번호 숨기기' : '비밀번호 보기'} onClick={() => setShowPassword(value => !value)} className="absolute right-1 top-1 grid size-[42px] place-items-center text-[#8e8e93]">{showPassword ? <EyeOff size={18}/> : <Eye size={18}/>}</button></div></label>
        {signup && <ul className="flex flex-wrap gap-x-3 gap-y-1">{[
          { label: '영문 소문자·숫자·_ 4~24자', ok: usernameValid },
          { label: '비밀번호 8~72자', ok: passwordValid },
        ].map(rule => <li key={rule.label} className={`flex items-center gap-1.5 text-[11px] ${rule.ok ? 'text-[#0a0a0a]' : 'text-[#c7c7cc]'}`}><Check size={12}/>{rule.label}</li>)}</ul>}
        <label className="flex w-fit items-center gap-2 text-xs text-[#8e8e93]"><input type="checkbox" checked={remember} onChange={event => setRemember(event.target.checked)} className="size-[18px] accent-black"/>아이디 저장</label>
        {error && <p role="alert" className="text-xs text-danger">{error}</p>}
        <div className="mt-3 text-center"><button type="button" onClick={() => moveTo(signup ? 'login' : 'signup')} className="text-xs text-[#8e8e93] underline underline-offset-2">{signup ? '이미 계정이 있으신가요? 로그인' : '계정이 없으신가요? 회원가입하기'}</button></div>
      </div>

      <div className="flex-1"/>
      <button type="button" disabled={demo.isPending} onClick={() => demo.mutate()} className="mb-3 rounded-[10px] bg-[#f2f2f7] px-3 py-2 text-center text-[11px] leading-relaxed text-[#8e8e93]">{demo.isPending ? '데모 준비 중…' : '기록이 있는 데모로 둘러보기'}</button>
      <button type="submit" disabled={auth.isPending || !username || !password || (signup && (!usernameValid || !passwordValid))} className="h-[52px] w-full rounded-full bg-[#0a0a0a] text-[15px] font-semibold text-white shadow-[0_8px_22px_rgba(0,0,0,.14)] transition active:scale-[.98] disabled:bg-[#e5e5ea] disabled:text-[#c7c7cc] disabled:shadow-none disabled:active:scale-100">{signup ? '회원가입' : '로그인'}</button>
      <p className="pb-2 pt-4 text-center"><button type="button" onClick={() => moveTo('welcome')} className="text-xs text-[#8e8e93] underline underline-offset-2">다른 방법으로 로그인</button></p>
    </form>
    <PrototypeHomeIndicator/>
    {auth.isPending && <div className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-7 bg-white"><AssetMotion name="ai-drop-motion" poster="/skn-assets/ai-drop-motion-poster.png" alt="피부 데이터 불러오는 중" loop className="size-[200px]"/><p className="text-[13px] text-[#8e8e93]">피부 데이터를 불러오는 중이에요</p></div>}
  </PrototypePhone>
}
