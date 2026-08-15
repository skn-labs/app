/**
 * 목 서버 계정을 초기 상태로 되돌립니다.
 *   npm run mock:reset
 */
import { rmSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const file = fileURLToPath(new URL('./data/db.json', import.meta.url))
rmSync(file, { force: true })
console.log('목 계정을 지웠어요. 다음 실행 때 sktn_test / demo_user 만 남습니다.')
