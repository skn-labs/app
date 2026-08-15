/**
 * SKN API 클라이언트.
 *
 * 서버 스펙(openapi.json)의 전제 두 가지를 그대로 따릅니다.
 *  1) 인증은 **HttpOnly 세션 쿠키(JSESSIONID)** 입니다.
 *     → 프론트가 토큰을 저장하지 않습니다. 대신 모든 요청에 credentials:'include' 가 필요합니다.
 *  2) 에러는 **RFC 9457 Problem** 형식입니다. ({ type, title, status, detail, code, retryable })
 */

const RAW_BASE = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/+$/, '')

/** 스펙의 servers[0].url 이 /api/v1 이라 여기서 한 번만 붙입니다. */
export const API_BASE = `${RAW_BASE}/api/v1`

/** 서버 없이 화면만 볼 때 (.env 에서 VITE_USE_MOCK=true) */
export const isMock = import.meta.env.VITE_USE_MOCK === 'true'

export class ApiError extends Error {
  status: number
  code?: string
  retryable?: boolean

  constructor(status: number, message: string, code?: string, retryable?: boolean) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.retryable = retryable
  }
}

/**
 * 401 이 오면 앱 전체를 로그아웃 상태로 되돌리기 위한 훅.
 * AuthContext 가 마운트될 때 등록합니다.
 */
let onUnauthorized: (() => void) | null = null
export function setUnauthorizedHandler(fn: (() => void) | null) {
  onUnauthorized = fn
}

/** 로그인·회원가입처럼 401 이 "정상 응답"인 요청은 이 훅을 건너뜁니다. */
interface RequestOptions extends RequestInit {
  skipUnauthorizedHandler?: boolean
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { skipUnauthorizedHandler, headers, ...init } = options

  const res = await fetch(`${API_BASE}${path}`, {
    // ★ 이게 없으면 세션 쿠키가 오가지 않아 로그인해도 곧바로 401 이 납니다.
    credentials: 'include',
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json, application/problem+json',
      ...headers,
    },
  })

  if (!res.ok) {
    if (res.status === 401 && !skipUnauthorizedHandler) onUnauthorized?.()
    throw await toApiError(res)
  }

  return (await readBody(res)) as T
}

/** 204 이거나 본문이 비어 있으면 undefined */
async function readBody(res: Response): Promise<unknown> {
  if (res.status === 204) return undefined
  const text = await res.text()
  if (!text) return undefined
  try {
    return JSON.parse(text)
  } catch {
    return undefined
  }
}

async function toApiError(res: Response): Promise<ApiError> {
  const fallback = `요청에 실패했어요. (${res.status})`
  const body = (await readBody(res)) as
    | { detail?: string; title?: string; code?: string; retryable?: boolean }
    | undefined

  // Problem 의 detail 이 사용자에게 보여줄 문장, title 은 그보다 짧은 요약입니다.
  const message = body?.detail || body?.title || fallback
  return new ApiError(res.status, message, body?.code, body?.retryable)
}

export const delay = (ms = 600) => new Promise((r) => setTimeout(r, ms))
