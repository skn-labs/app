import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import PhoneFrame from '@/components/PhoneFrame'
import StatusBar from '@/components/StatusBar'
import HomeIndicator from '@/components/HomeIndicator'
import LoadingOverlay from '@/components/LoadingOverlay'
import { Button, Field, RuleList } from '@/components/ui'
import { useAuth } from '@/store/AuthContext'
import { ApiError } from '@/api/client'
import {
  PASSWORD_ERROR,
  PASSWORD_PLACEHOLDER,
  isPasswordValid,
  passwordChecks,
} from '@/lib/passwordRules'
import { PASSWORD_MAX, USERNAME_PATTERN } from '@/types'

const MIN_LOADING_MS = 1600

/**
 * 회원가입 화면.
 * 와이어프레임에는 없던 화면이라 로그인 화면과 같은 문법으로 새로 만들었습니다.
 *
 * 아이디·비밀번호 규칙을 에러로만 알려주면 여러 번 틀리게 되므로,
 * 입력하는 동안 체크리스트로 보여줍니다.
 */
export default function SignUp() {
  const { signUp, logout } = useAuth()
  const navigate = useNavigate()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [touched, setTouched] = useState(false)
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const usernameRules = useMemo(
    () => [
      { label: '영문 소문자·숫자·밑줄(_)만', ok: /^[a-z0-9_]*$/.test(username) && username !== '' },
      { label: '4~24자', ok: username.length >= 4 && username.length <= 24 },
    ],
    [username],
  )

  const passwordRules = useMemo(() => passwordChecks(password), [password])

  const usernameOk = USERNAME_PATTERN.test(username)
  const passwordOk = isPasswordValid(password)
  const confirmOk = confirm.length > 0 && confirm === password
  const canSubmit = usernameOk && passwordOk && confirmOk

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setTouched(true)
    if (!canSubmit) return

    setSubmitting(true)
    setFormError('')
    try {
      await Promise.all([
        signUp(username, password),
        new Promise((r) => setTimeout(r, MIN_LOADING_MS)),
      ])

      // 서버는 가입과 동시에 세션을 열어줍니다(201 + Set-Cookie).
      // 여기서는 완료 화면을 거쳐 다시 로그인하게 할 거라 그 세션은 닫아둡니다.
      // 안 닫으면 로그인한 채로 로그인 화면에 서 있는 어정쩡한 상태가 됩니다.
      await logout()

      navigate('/signup/complete', { replace: true, state: { username } })
    } catch (err) {
      // 409 = 아이디 중복
      if (err instanceof ApiError && err.status === 409) {
        setFormError('이미 사용 중인 아이디예요. 다른 아이디를 써주세요.')
      } else {
        setFormError(err instanceof Error ? err.message : '회원가입에 실패했어요.')
      }
      setSubmitting(false)
    }
  }

  return (
    <PhoneFrame>
      <StatusBar />

      <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-hidden px-7 pt-10">
        <img
          src="/media/logo-mark.png"
          alt="sktn"
          className="h-[34px] w-auto self-start object-contain"
        />
        <p className="mt-4 text-[13px] leading-[1.6] text-ink-muted">
          아이디와 비밀번호만 있으면 돼요.
          <br />
          피부 기록은 이 계정에 쌓입니다.
        </p>

        <div className="mt-8 flex flex-1 flex-col gap-4 overflow-y-auto pb-2">
          <div>
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
              error={touched && !usernameOk ? '아이디 형식을 확인해주세요.' : undefined}
            />
            <RuleList items={usernameRules} />
          </div>

          <div>
            <Field
              label="비밀번호"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder={PASSWORD_PLACEHOLDER}
              maxLength={PASSWORD_MAX}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={touched && !passwordOk ? PASSWORD_ERROR : undefined}
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
            <RuleList items={passwordRules} />
          </div>

          <Field
            label="비밀번호 확인"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            placeholder="한 번 더 입력해주세요"
            maxLength={PASSWORD_MAX}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            error={confirm.length > 0 && !confirmOk ? '비밀번호가 서로 달라요.' : undefined}
          />

          {formError && <p className="text-[12px] text-danger">{formError}</p>}
        </div>

        <Button type="submit" full disabled={submitting}>
          회원가입
        </Button>

        <p className="pt-4 pb-2 text-center text-[12px] text-ink-muted">
          이미 계정이 있으신가요?{' '}
          <Link to="/login" className="font-medium text-ink underline underline-offset-2">
            로그인
          </Link>
        </p>
      </form>

      <HomeIndicator />

      {submitting && <LoadingOverlay label="계정을 만드는 중이에요" />}
    </PhoneFrame>
  )
}
