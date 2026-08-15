/**
 * openapi.json 의 Auth 부분만 흉내 내는 목 서버.
 *
 * Spring 서버가 아직 안 떠 있을 때 로그인 화면을 개발·테스트하려고 만든 것입니다.
 * 의존성 없이 Node 만으로 돌아갑니다.
 *
 *   node mock-server/index.mjs          # http://localhost:8080
 *
 * 실제 서버와 맞춘 것:
 *   - 기본 경로 /api/v1
 *   - HttpOnly 세션 쿠키(JSESSIONID)
 *   - 실패 응답은 RFC 9457 Problem (application/problem+json)
 *   - username 규칙 ^[a-z0-9_]{4,24}$, 비밀번호 8~72자
 */
import { createServer } from 'node:http'
import { randomUUID, timingSafeEqual, scryptSync, randomBytes } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const PORT = Number(process.env.PORT ?? 8080)
const USERNAME_RE = /^[a-z0-9_]{4,24}$/

/**
 * 계정 저장 파일.
 * 가입한 계정이 서버를 껐다 켜도 남도록 JSON 으로 씁니다.
 * MOCK_DATA_FILE 을 'none' 으로 주면 메모리에만 두고 저장하지 않습니다(테스트용).
 */
const DATA_FILE =
  process.env.MOCK_DATA_FILE ?? fileURLToPath(new URL('./data/db.json', import.meta.url))
const PERSIST = DATA_FILE !== 'none'

/** username → { userId, username, displayName, demo, onboardingCompleted, hash } */
const users = new Map()
/** sessionId → username (세션은 저장하지 않습니다 — 재시작하면 다시 로그인) */
const sessions = new Map()
let nextUserId = 1

const hash = (pw) => {
  const salt = randomBytes(16)
  return `${salt.toString('hex')}:${scryptSync(pw, salt, 64).toString('hex')}`
}
const verify = (pw, stored) => {
  const [saltHex, hashHex] = stored.split(':')
  const expected = Buffer.from(hashHex, 'hex')
  const actual = scryptSync(pw, Buffer.from(saltHex, 'hex'), expected.length)
  return actual.length === expected.length && timingSafeEqual(actual, expected)
}

function save() {
  if (!PERSIST) return
  try {
    mkdirSync(dirname(DATA_FILE), { recursive: true })
    writeFileSync(DATA_FILE, JSON.stringify({ nextUserId, users: [...users.values()] }, null, 2))
  } catch (err) {
    console.warn('계정을 저장하지 못했어요:', err.message)
  }
}

function load() {
  if (!PERSIST) return false
  try {
    const db = JSON.parse(readFileSync(DATA_FILE, 'utf8'))
    for (const u of db.users) users.set(u.username, u)
    nextUserId = db.nextUserId ?? users.size + 1
    return users.size > 0
  } catch {
    return false // 파일이 없으면 처음 실행
  }
}

function seed(username, displayName, demo = false, onboardingCompleted = false) {
  if (users.has(username)) return
  users.set(username, {
    userId: nextUserId++,
    username,
    displayName,
    demo,
    onboardingCompleted,
    hash: hash('password123'),
  })
}

const restored = load()
// 기본 계정은 저장 파일이 있어도 항상 있어야 합니다.
seed('sktn_test', '테스트 계정')
seed('demo_user', '데모 계정', true, true)
save()

const publicUser = ({ userId, username, displayName, demo, onboardingCompleted }) => ({
  userId,
  username,
  displayName,
  demo,
  onboardingCompleted,
})

const problem = (status, title, detail, code) => ({
  type: 'about:blank',
  title,
  status,
  detail,
  code,
  retryable: false,
})

function sessionUser(req) {
  const raw = req.headers.cookie ?? ''
  const match = /(?:^|;\s*)JSESSIONID=([^;]+)/.exec(raw)
  if (!match) return null
  const username = sessions.get(match[1])
  return username ? (users.get(username) ?? null) : null
}

const server = createServer((req, res) => {
  const chunks = []
  req.on('data', (c) => chunks.push(c))
  req.on('end', () => {
    const url = new URL(req.url ?? '/', 'http://localhost')
    const path = url.pathname.replace(/^\/api\/v1/, '')
    const origin = req.headers.origin

    // CORS — 쿠키를 쓰려면 와일드카드가 아니라 정확한 출처를 돌려줘야 합니다.
    if (origin) {
      res.setHeader('Access-Control-Allow-Origin', origin)
      res.setHeader('Access-Control-Allow-Credentials', 'true')
      res.setHeader('Vary', 'Origin')
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Accept')

    if (req.method === 'OPTIONS') return res.writeHead(204).end()

    const send = (status, body, cookie) => {
      const headers = {}
      if (cookie) headers['Set-Cookie'] = cookie
      if (body === undefined) return res.writeHead(status, headers).end()
      headers['Content-Type'] =
        status >= 400 ? 'application/problem+json' : 'application/json; charset=utf-8'
      res.writeHead(status, headers).end(JSON.stringify(body))
    }

    let body = {}
    const raw = Buffer.concat(chunks).toString()
    if (raw) {
      try {
        body = JSON.parse(raw)
      } catch {
        return send(400, problem(400, 'Bad Request', 'JSON 형식이 아니에요.', 'INVALID_JSON'))
      }
    }

    const startSession = (user) => {
      const sid = randomUUID()
      sessions.set(sid, user.username)
      // 로컬 http 에서도 동작하도록 SameSite=Lax. 실제 배포에서는 Secure 를 함께 씁니다.
      return `JSESSIONID=${sid}; Path=/; HttpOnly; SameSite=Lax`
    }

    const route = `${req.method} ${path}`

    if (route === 'POST /auth/signup') {
      const { username, password } = body
      if (typeof username !== 'string' || !USERNAME_RE.test(username)) {
        return send(422, problem(422, 'Unprocessable Entity',
          '아이디는 영문 소문자·숫자·밑줄 4~24자여야 해요.', 'INVALID_USERNAME'))
      }
      if (typeof password !== 'string' || password.length < 8 || password.length > 72) {
        return send(422, problem(422, 'Unprocessable Entity',
          '비밀번호는 8~72자여야 해요.', 'INVALID_PASSWORD'))
      }
      if (users.has(username)) {
        return send(409, problem(409, 'Conflict', '이미 사용 중인 아이디예요.', 'USERNAME_TAKEN'))
      }
      const user = {
        userId: nextUserId++,
        username,
        displayName: username,
        demo: false,
        onboardingCompleted: false,
        hash: hash(password),
      }
      users.set(username, user)
      save()
      return send(201, publicUser(user), startSession(user))
    }

    if (route === 'POST /auth/login') {
      const { username, password } = body
      const user = typeof username === 'string' ? users.get(username) : null
      // 아이디 존재 여부가 새지 않도록 실패 메시지를 하나로 통일합니다.
      if (!user || typeof password !== 'string' || !verify(password, user.hash)) {
        return send(422, problem(422, 'Unprocessable Entity',
          '아이디 또는 비밀번호가 일치하지 않아요.', 'INVALID_CREDENTIALS'))
      }
      return send(200, publicUser(user), startSession(user))
    }

    if (route === 'POST /auth/demo') {
      const user = users.get('demo_user')
      return send(200, publicUser(user), startSession(user))
    }

    if (route === 'GET /auth/me') {
      const user = sessionUser(req)
      if (!user) return send(401, problem(401, 'Unauthorized', '로그인이 필요해요.', 'NO_SESSION'))
      return send(200, publicUser(user))
    }

    if (route === 'POST /auth/logout') {
      const raw = req.headers.cookie ?? ''
      const match = /(?:^|;\s*)JSESSIONID=([^;]+)/.exec(raw)
      if (match) sessions.delete(match[1])
      return send(204, undefined, 'JSESSIONID=; Path=/; HttpOnly; Max-Age=0')
    }

    if (route === 'GET /auth/quick-accounts') {
      return send(200, [...users.values()].filter((u) => !u.demo)
        .map(({ username, displayName }) => ({ username, displayName })))
    }

    if (req.method === 'POST' && path.startsWith('/auth/quick-login/')) {
      const username = decodeURIComponent(path.slice('/auth/quick-login/'.length))
      const user = users.get(username)
      if (!user || user.demo) {
        return send(404, problem(404, 'Not Found', '없는 계정이에요.', 'ACCOUNT_NOT_FOUND'))
      }
      return send(200, publicUser(user), startSession(user))
    }

    send(404, problem(404, 'Not Found', `${route} 는 이 목 서버에 없어요.`, 'NOT_FOUND'))
  })
})

if (process.env.MOCK_SILENT !== 'true') {
  server.listen(PORT, () => {
    console.log(`sktn mock API → http://localhost:${PORT}/api/v1`)
    console.log(`계정 ${users.size}개 ${restored ? '복원됨' : '새로 만듦'}` +
      (PERSIST ? ` (${DATA_FILE})` : ' (저장 안 함)'))
    console.log('기본 계정: sktn_test / password123')
  })
}

export { server }
