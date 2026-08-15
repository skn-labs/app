import MainTransition from './MainTransition'

/* ════════════════════════════════════════════════════════════
   ★ 다른 브랜치의 메인 화면을 붙이는 곳 — 이 두 줄만 바꾸면 됩니다.

   import MainScreen from '@/routes/main/YourMainScreen'
   ──────────────────────────────────────────────────────────── */
import MainScreen from './MainPlaceholder'
/* ════════════════════════════════════════════════════════════ */

/**
 * /main 라우트의 입구.
 *
 * 여기서 하는 일은 두 가지뿐입니다.
 *   1) 완성 화면에서 넘어오는 페이드인 전환을 씌운다
 *   2) 실제 메인 화면을 그린다
 *
 * 병합 충돌을 줄이려고 일부러 얇게 뒀습니다.
 * 붙이는 방법과 쓸 수 있는 데이터는 같은 폴더의 README.md 를 보세요.
 */
export default function Main() {
  return (
    <MainTransition>
      <MainScreen />
    </MainTransition>
  )
}
