import { PASSWORD_MAX, PASSWORD_MIN } from '@/types'

/* ════════════════════════════════════════════════════════════
   ★ 비밀번호 조합 규칙 스위치

   서버(openapi.json)는 **길이 8~72자만** 요구합니다.
   영문+숫자+특수문자 조합은 이 앱에서 추가로 거는 규칙이라,
   서버와 어긋나 회원가입이 막히면 아래 한 줄만 false 로 바꾸세요.
   그러면 화면·검증·안내문구가 전부 길이 규칙만 남습니다.

   언제 꺼야 하나 — 회원가입(POST /auth/signup)에서 이런 일이 생길 때:
     · 서버가 특정 특수문자를 거부해서 422 가 돌아온다
     · 서버 쪽 비밀번호 정책이 따로 있어 규칙이 서로 부딪힌다
     · 시연 계정 비밀번호가 이 조건을 못 맞춘다

   ⚠️ 로그인은 이 규칙을 쓰지 않습니다.
      기존 계정(조합 규칙 없이 만든 것)의 로그인은 이 값과 무관하게 항상 됩니다.
   ════════════════════════════════════════════════════════════ */
export const ENFORCE_COMPOSITION = true

/** 특수문자 = 아스키 문장부호 (!"#$%&'()*+,-./:;<=>?@[\]^_`{|}~) */
export const SPECIAL_CHARS = /[!-/:-@[-`{-~]/

export interface PasswordCheck {
  label: string
  ok: boolean
}

const lengthCheck = (password: string): PasswordCheck => ({
  label: `${PASSWORD_MIN}~${PASSWORD_MAX}자`,
  ok: password.length >= PASSWORD_MIN && password.length <= PASSWORD_MAX,
})

export function passwordChecks(password: string): PasswordCheck[] {
  if (!ENFORCE_COMPOSITION) return [lengthCheck(password)]

  return [
    lengthCheck(password),
    { label: '영문 포함', ok: /[A-Za-z]/.test(password) },
    { label: '숫자 포함', ok: /[0-9]/.test(password) },
    { label: '특수문자 포함', ok: SPECIAL_CHARS.test(password) },
  ]
}

export const isPasswordValid = (password: string) => passwordChecks(password).every((c) => c.ok)

/** 입력창 placeholder / 에러 문구도 스위치를 따라갑니다 */
export const PASSWORD_PLACEHOLDER = ENFORCE_COMPOSITION
  ? '영문·숫자·특수문자 조합'
  : `${PASSWORD_MIN}자 이상`

export const PASSWORD_ERROR = ENFORCE_COMPOSITION
  ? '비밀번호 조건을 모두 채워주세요.'
  : `비밀번호는 ${PASSWORD_MIN}~${PASSWORD_MAX}자로 입력해주세요.`
