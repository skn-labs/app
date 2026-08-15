/**
 * 개발 서버 한 번에 띄우기.
 *
 *   npm run dev   →  목 API(8080) + Vite(5173)
 *
 * 8080 을 이미 누가 쓰고 있으면(= 진짜 Spring 서버가 떠 있으면)
 * 목 서버는 건너뛰고 Vite 만 띄웁니다. 그대로 실서버에 붙어요.
 *
 * 의존성 없이 Node 만 씁니다. (concurrently 같은 패키지 불필요)
 */
import { spawn } from 'node:child_process'
import { createConnection } from 'node:net'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const API_PORT = Number(process.env.MOCK_PORT ?? 8080)
const root = new URL('../', import.meta.url)

/** 그 포트에서 이미 뭔가 듣고 있는지 */
const portInUse = (port) =>
  new Promise((resolve) => {
    const socket = createConnection({ port, host: '127.0.0.1' })
    const done = (result) => {
      socket.destroy()
      resolve(result)
    }
    socket.setTimeout(600)
    socket.once('connect', () => done(true))
    socket.once('timeout', () => done(false))
    socket.once('error', () => done(false))
  })

const children = []

function run(label, file, args = []) {
  const child = spawn(process.execPath, [file, ...args], {
    stdio: ['ignore', 'pipe', 'pipe'],
    cwd: fileURLToPath(root),
  })

  const prefix = (line) => `[${label}] ${line}`
  const pipe = (stream, out) => {
    stream.setEncoding('utf8')
    let buffer = ''
    stream.on('data', (chunk) => {
      buffer += chunk
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''
      lines.filter((l) => l.trim()).forEach((l) => out(prefix(l)))
    })
  }
  pipe(child.stdout, (l) => console.log(l))
  pipe(child.stderr, (l) => console.error(l))

  child.on('exit', (code) => {
    if (code !== 0 && code !== null) console.error(prefix(`종료됨 (code ${code})`))
    shutdown()
  })

  children.push(child)
  return child
}

let closing = false
function shutdown() {
  if (closing) return
  closing = true
  children.forEach((c) => {
    if (!c.killed) c.kill()
  })
  process.exit(0)
}
process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)

const vitePath = fileURLToPath(new URL('node_modules/vite/bin/vite.js', root))
if (!existsSync(vitePath)) {
  console.error('[dev] Vite 가 설치돼 있지 않아요. 먼저 `npm install` 을 실행해주세요.')
  process.exit(1)
}

const busy = await portInUse(API_PORT)

if (busy) {
  console.log(`[dev] ${API_PORT} 포트를 이미 쓰고 있어요. 목 서버는 건너뜁니다.`)
  console.log('[dev] 거기에 떠 있는 서버(예: Spring)로 그대로 붙습니다.')
} else {
  run('mock', fileURLToPath(new URL('mock-server/index.mjs', root)))
}

run('web', vitePath)

console.log('[dev] http://localhost:5173  (종료: Ctrl+C)')
