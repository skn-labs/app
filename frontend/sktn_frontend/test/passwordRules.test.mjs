/**
 * 비밀번호 규칙 스위치가 양쪽 다 제대로 동작하는지 확인합니다.
 *
 * 실제 src/lib/passwordRules.ts 를 불러오되,
 * Vite 전용 별칭(@/types)과 ENFORCE_COMPOSITION 값만 바꿔치기해서
 * 켠 상태 / 끈 상태를 둘 다 검사합니다.
 */
import { describe, it, after } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, writeFileSync, rmSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const srcPath = fileURLToPath(new URL('../src/lib/passwordRules.ts', import.meta.url))
const tmpDir = fileURLToPath(new URL('./.tmp/', import.meta.url))
mkdirSync(tmpDir, { recursive: true })

const created = []

async function loadRules(enforce) {
  const source = readFileSync(srcPath, 'utf8')
    .replace(
      "import { PASSWORD_MAX, PASSWORD_MIN } from '@/types'",
      'const PASSWORD_MIN = 8; const PASSWORD_MAX = 72;',
    )
    .replace(
      /export const ENFORCE_COMPOSITION = (true|false)/,
      `export const ENFORCE_COMPOSITION = ${enforce}`,
    )

  const path = `${tmpDir}rules-${enforce}.ts`
  writeFileSync(path, source)
  created.push(path)
  return import(path)
}

after(() => {
  created.forEach((p) => rmSync(p, { force: true }))
  rmSync(tmpDir, { recursive: true, force: true })
})

describe('조합 규칙 ON (기본값)', () => {
  it('네 가지 조건을 모두 보여준다', async () => {
    const { passwordChecks } = await loadRules(true)
    const labels = passwordChecks('').map((c) => c.label)
    assert.deepEqual(labels, ['8~72자', '영문 포함', '숫자 포함', '특수문자 포함'])
  })

  it('영문+숫자+특수문자를 모두 갖춰야 통과', async () => {
    const { isPasswordValid } = await loadRules(true)
    assert.equal(isPasswordValid('Passw0rd!'), true)
    assert.equal(isPasswordValid('password123'), false, '특수문자 없음')
    assert.equal(isPasswordValid('password!!!'), false, '숫자 없음')
    assert.equal(isPasswordValid('12345678!'), false, '영문 없음')
    assert.equal(isPasswordValid('Pw0rd!'), false, '8자 미만')
    assert.equal(isPasswordValid('A1!' + 'a'.repeat(70)), false, '72자 초과')
  })

  it('흔히 쓰는 특수문자를 모두 인정한다', async () => {
    const { isPasswordValid } = await loadRules(true)
    for (const ch of ['!', '@', '#', '$', '%', '^', '&', '*', '?', '-', '_', '.', '~']) {
      assert.equal(isPasswordValid(`Passw0rd${ch}`), true, `${ch} 를 특수문자로 못 알아봄`)
    }
  })

  it('안내 문구도 조합 기준으로 나온다', async () => {
    const { PASSWORD_PLACEHOLDER, PASSWORD_ERROR } = await loadRules(true)
    assert.match(PASSWORD_PLACEHOLDER, /특수문자/)
    assert.match(PASSWORD_ERROR, /조건을 모두/)
  })
})

describe('조합 규칙 OFF (스위치를 내렸을 때)', () => {
  it('길이 조건 하나만 남는다', async () => {
    const { passwordChecks } = await loadRules(false)
    assert.deepEqual(
      passwordChecks('').map((c) => c.label),
      ['8~72자'],
    )
  })

  it('서버 스펙(8~72자)과 똑같이 동작한다', async () => {
    const { isPasswordValid } = await loadRules(false)
    assert.equal(isPasswordValid('password123'), true, '스위치를 내리면 통과해야 함')
    assert.equal(isPasswordValid('12345678'), true)
    assert.equal(isPasswordValid('short'), false)
    assert.equal(isPasswordValid('a'.repeat(73)), false)
  })

  it('안내 문구도 길이 기준으로 바뀐다', async () => {
    const { PASSWORD_PLACEHOLDER, PASSWORD_ERROR } = await loadRules(false)
    assert.doesNotMatch(PASSWORD_PLACEHOLDER, /특수문자/)
    assert.match(PASSWORD_ERROR, /8~72자/)
  })
})
