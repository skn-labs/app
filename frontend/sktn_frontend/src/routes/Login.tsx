import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import PhoneFrame from '@/components/PhoneFrame'
import StatusBar from '@/components/StatusBar'
import HomeIndicator from '@/components/HomeIndicator'
import LoadingOverlay from '@/components/LoadingOverlay'
import { Button, Checkbox, Field } from '@/components/ui'
import { useAuth } from '@/store/AuthContext'
import { isMock } from '@/api/client'
import { rememberedUsername } from '@/lib/rememberedUsername'
import { PASSWORD_MAX } from '@/types'

/** 로딩 애니메이션이 한 바퀴는 보이도록 하는 최소 노출 시간 */
const MIN_LOADING_MS = 1600

/** 와이어프레임 3번째 화면 — 아이디·비밀번호 로그인 */
export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()

  // 회원가입을 막 마치고 넘어왔다면 그 아이디를, 아니면 저장해둔 아이디를 채웁니다.
  const justSignedUp = (useLocation().state as { username?: string } | null)?.username
  const saved = rememberedUsername.get()
  const [username, setUsername] = useState(justSignedUp ?? saved ?? '')
  const [remember, setRemember] = useState(saved !== null)

  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState<{ username?: string; password?: string; form?: string }>({})
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

    // 로그인은 형식을 깐깐하게 막지 않습니다. 비어 있는 것만 걸러내고 판단은 서버에 맡겨요.
    const next: typeof errors = {}
    if (!username) next.username = '아이디를 입력해주세요.'
    if (!password) next.password = '비밀번호를 입력해주세요.'
    if (Object.keys(next).length > 0) {
      setErrors(next)
      return
    }

    setSubmitting(true)
    setErrors({})
    try {
      await Promise.all([
        login(username, password),
        new Promise((r) => setTimeout(r, MIN_LOADING_MS)),
      ])

      // 로그인에 성공했을 때만 저장합니다. (틀린 아이디를 남겨두지 않도록)
      if (remember) rememberedUsername.set(username)
      else rememberedUsername.clear()

      // 어디로 갈지는 ProtectedRoute 한 곳에서만 판단합니다.
      navigate('/onboarding', { replace: true })
    } catch (err) {
      setErrors({ form: err instanceof Error ? err.message : '로그인에 실패했어요.' })
      setSubmitting(false)
    }
  }

  return (
    <PhoneFrame>
      <StatusBar />

      <form onSubmit={handleSubmit} className="flex flex-1 flex-col px-7 pt-10">
        <img
          src="/media/logo-mark.png"
          alt="sktn"
          className="h-[34px] w-auto self-start object-contain"
        />
        <p className="mt-4 text-[13px] leading-[1.6] text-ink-muted">
          아이디로 로그인하고
          <br />내 피부 기록을 이어가세요.
        </p>

        <div className="mt-9 flex flex-col gap-4">
          <Field
            label="아이디"
            type="text"
            autoComplete="username"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            placeholder="sktn_user"
            value={username}
            onChange={(e) => setUsername(e.target.value.toLowerCase().trim())}
            error={errors.username}
          />

          <Field
            label="비밀번호"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            placeholder="비밀번호"
            maxLength={PASSWORD_MAX}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={errors.password}
            trailing={
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="px-1 text-[12px] text-ink-muted"
              >
                {showPassword ? '숨기기' : '보기'}
              </button>
            }
          />
        </div>

        <div className="mt-4">
          <Checkbox checked={remember} onChange={setRemember}>
            아이디 저장
          </Checkbox>
        </div>

        {errors.form && <p className="mt-4 text-[12px] text-danger">{errors.form}</p>}

        <div className="flex-1" />

        {isMock && (
          <p className="mb-3 rounded-[10px] bg-field px-3 py-2 text-center text-[11px] leading-relaxed text-ink-muted">
            목 모드 — sktn_test / password123
          </p>
        )}

        <Button type="submit" full disabled={submitting}>
          로그인
        </Button>

        <p className="pt-4 pb-2 text-center text-[12px] text-ink-muted">
          아직 계정이 없으신가요?{' '}
          <Link to="/signup" className="font-medium text-ink underline underline-offset-2">
            회원가입
          </Link>
        </p>
      </form>

      <HomeIndicator />

      {/* 로그인 버튼을 누르면 로딩창 애니메이션이 화면을 덮습니다 */}
      {submitting && <LoadingOverlay />}
    </PhoneFrame>
  )
}
