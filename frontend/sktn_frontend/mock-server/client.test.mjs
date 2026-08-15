/**
 * 프론트가 **실제로 쓰는** src/api/client.ts 를 그대로 불러와 검증합니다.
 * (Vite 전용인 import.meta.env 만 테스트용 값으로 바꿔치기)
 *
 *   node --test mock-server/
 */
import { after, before, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { readFileSync, writeFileSync, rmSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const PORT = 8098
const BASE = `http://127.0.0.1:${PORT}`

const srcPath = fileURLToPath(new URL('../src/api/client.ts', import.meta.url))
const tmpPath = fileURLToPath(new URL('./.client.undertest.ts', import.meta.url))

let child
let client

before(async () => {
  // import.meta.env → 테스트 값. 나머지 코드는 손대지 않습니다.
  const source = readFileSync(srcPath, 'utf8')
    .replace('import.meta.env.VITE_API_BASE_URL', JSON.stringify(BASE))
    .replace('import.meta.env.VITE_USE_MOCK', JSON.stringify('false'))
  writeFileSync(tmpPath, source)
  client = await import(tmpPath)

  child = spawn(process.execPath, [fileURLToPath(new URL('./index.mjs', import.meta.url))], {
    // MOCK_DATA_FILE=none → 테스트가 실제 계정 파일을 건드리지 않게 (반복 실행해도 같은 결과)
    env: { ...process.env, PORT: String(PORT), MOCK_DATA_FILE: 'none' },
    stdio: 'ignore',
  })
  for (let i = 0; i < 50; i++) {
    try {
      await fetch(`${BASE}/api/v1/auth/me`)
      return
    } catch {
      await new Promise((r) => setTimeout(r, 100))
    }
  }
  throw new Error('목 서버가 뜨지 않았어요')
})

after(() => {
  child?.kill()
  rmSync(tmpPath, { force: true })
})

describe('client.ts', () => {
  it('스펙의 /api/v1 을 자동으로 붙인다', () => {
    assert.equal(client.API_BASE, `${BASE}/api/v1`)
  })

  it('VITE_USE_MOCK 이 false 면 isMock 도 false', () => {
    assert.equal(client.isMock, false)
  })

  it('성공 응답은 파싱해서 돌려준다', async () => {
    const auth = await client.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: 'sktn_test', password: 'password123' }),
    })
    assert.equal(auth.username, 'sktn_test')
  })

  it('Problem 의 detail 을 ApiError.message 로 옮긴다', async () => {
    await assert.rejects(
      () =>
        client.request('/auth/login', {
          method: 'POST',
          body: JSON.stringify({ username: 'sktn_test', password: 'wrongpassword' }),
          skipUnauthorizedHandler: true,
        }),
      (err) => {
        assert.equal(err.name, 'ApiError')
        assert.equal(err.status, 422)
        assert.equal(err.message, '아이디 또는 비밀번호가 일치하지 않아요.')
        assert.equal(err.code, 'INVALID_CREDENTIALS')
        return true
      },
    )
  })

  it('204 응답은 undefined 로 돌려준다 (JSON 파싱 오류가 나지 않아야 함)', async () => {
    const result = await client.request('/auth/logout', { method: 'POST' })
    assert.equal(result, undefined)
  })

  it('401 이 오면 등록된 로그아웃 훅이 불린다', async () => {
    let called = 0
    client.setUnauthorizedHandler(() => called++)

    await assert.rejects(() => client.request('/auth/me'))
    assert.equal(called, 1, '세션 만료를 앱 전체에 알려야 함')

    client.setUnauthorizedHandler(null)
  })

  it('skipUnauthorizedHandler 를 주면 훅을 건너뛴다 (로그인 실패는 세션 만료가 아님)', async () => {
    let called = 0
    client.setUnauthorizedHandler(() => called++)

    await assert.rejects(() =>
      client.request('/auth/me', { skipUnauthorizedHandler: true }),
    )
    assert.equal(called, 0)

    client.setUnauthorizedHandler(null)
  })

  it('없는 경로는 Problem 의 detail 을 그대로 보여준다', async () => {
    await assert.rejects(
      () => client.request('/auth/nope', { method: 'POST', skipUnauthorizedHandler: true }),
      (err) => {
        assert.equal(err.status, 404)
        assert.match(err.message, /목 서버에 없어요/)
        return true
      },
    )
  })
})
