/**
 * 프론트(src/api)가 보내는 요청을 그대로 재현해서
 * 스펙과 맞는지, 그리고 세션 쿠키 흐름이 실제로 도는지 확인합니다.
 *
 *   node --test mock-server/
 */
import { after, before, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const PORT = 8099
const BASE = `http://127.0.0.1:${PORT}/api/v1`

let child
let cookie = ''

/** 브라우저처럼 쿠키를 물고 다니는 fetch */
async function api(path, init = {}) {
  const res = await fetch(BASE + path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json, application/problem+json',
      ...(cookie ? { Cookie: cookie } : {}),
      ...(init.headers ?? {}),
    },
  })

  const setCookie = res.headers.getSetCookie?.() ?? []
  for (const c of setCookie) {
    const pair = c.split(';')[0]
    if (pair.startsWith('JSESSIONID=')) cookie = pair.endsWith('=') ? '' : pair
  }

  const text = await res.text()
  return {
    status: res.status,
    contentType: res.headers.get('content-type') ?? '',
    body: text ? JSON.parse(text) : undefined,
    setCookie,
  }
}

before(async () => {
  child = spawn(process.execPath, [fileURLToPath(new URL('./index.mjs', import.meta.url))], {
    // MOCK_DATA_FILE=none → 테스트가 실제 계정 파일을 건드리지 않게 (반복 실행해도 같은 결과)
    env: { ...process.env, PORT: String(PORT), MOCK_DATA_FILE: 'none' },
    stdio: 'ignore',
  })
  // 서버가 뜰 때까지 대기
  for (let i = 0; i < 50; i++) {
    try {
      await fetch(BASE + '/auth/me')
      return
    } catch {
      await new Promise((r) => setTimeout(r, 100))
    }
  }
  throw new Error('목 서버가 뜨지 않았어요')
})

after(() => child?.kill())

describe('아이디·비밀번호 로그인', () => {
  it('로그인 전 /auth/me 는 401 + Problem 형식', async () => {
    const { status, contentType, body } = await api('/auth/me')
    assert.equal(status, 401)
    assert.match(contentType, /application\/problem\+json/)
    assert.equal(body.status, 401)
    assert.ok(body.detail, 'detail 이 프론트에 보여줄 문구')
  })

  it('로그인하면 200 Auth + HttpOnly 세션 쿠키', async () => {
    const { status, body, setCookie } = await api('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: 'sktn_test', password: 'password123' }),
    })
    assert.equal(status, 200)
    assert.equal(body.username, 'sktn_test')
    assert.equal(typeof body.userId, 'number')
    assert.equal(typeof body.onboardingCompleted, 'boolean')
    assert.equal(body.password, undefined, '비밀번호가 응답에 새면 안 됨')
    assert.equal(body.accessToken, undefined, '세션 쿠키 방식이라 토큰은 없어야 함')
    assert.ok(setCookie.some((c) => c.includes('JSESSIONID=') && /HttpOnly/i.test(c)))
  })

  it('쿠키를 들고 /auth/me 를 부르면 내 정보가 온다', async () => {
    const { status, body } = await api('/auth/me')
    assert.equal(status, 200)
    assert.equal(body.username, 'sktn_test')
  })

  it('비밀번호가 틀리면 422 + 사용자에게 보여줄 detail', async () => {
    const saved = cookie
    cookie = ''
    const { status, body } = await api('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: 'sktn_test', password: 'wrongpassword' }),
    })
    assert.equal(status, 422)
    assert.equal(body.detail, '아이디 또는 비밀번호가 일치하지 않아요.')
    cookie = saved
  })

  it('없는 아이디도 같은 422 메시지 (존재 여부가 새지 않도록)', async () => {
    const saved = cookie
    cookie = ''
    const { body } = await api('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: 'nobody_here', password: 'password123' }),
    })
    assert.equal(body.detail, '아이디 또는 비밀번호가 일치하지 않아요.')
    cookie = saved
  })

  it('로그아웃하면 204 이고 이후 /auth/me 는 401', async () => {
    const { status } = await api('/auth/logout', { method: 'POST' })
    assert.equal(status, 204)
    const me = await api('/auth/me')
    assert.equal(me.status, 401)
  })
})

describe('회원가입', () => {
  it('규칙에 맞으면 201 + 세션 시작', async () => {
    cookie = ''
    const { status, body } = await api('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ username: 'new_user_01', password: 'password123' }),
    })
    assert.equal(status, 201)
    assert.equal(body.username, 'new_user_01')
    assert.equal(body.onboardingCompleted, false)

    const me = await api('/auth/me')
    assert.equal(me.status, 200, '가입 직후 바로 로그인 상태여야 함')
  })

  it('같은 아이디는 409', async () => {
    const { status, body } = await api('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ username: 'new_user_01', password: 'password123' }),
    })
    assert.equal(status, 409)
    assert.match(body.detail, /이미 사용/)
  })

  it('규칙을 어긴 아이디는 422', async () => {
    const { status, body } = await api('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ username: 'AB', password: 'password123' }),
    })
    assert.equal(status, 422)
    assert.equal(body.code, 'INVALID_USERNAME')
  })

  it('짧은 비밀번호는 422', async () => {
    const { status, body } = await api('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ username: 'another_one', password: 'short' }),
    })
    assert.equal(status, 422)
    assert.equal(body.code, 'INVALID_PASSWORD')
  })
})

describe('데모 진입', () => {
  it('POST /auth/demo 는 데모 계정으로 세션을 연다', async () => {
    cookie = ''
    const { status, body } = await api('/auth/demo', { method: 'POST' })
    assert.equal(status, 200)
    assert.equal(body.demo, true)

    const me = await api('/auth/me')
    assert.equal(me.body.demo, true)
  })
})
