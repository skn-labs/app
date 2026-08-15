import type { ReactNode } from 'react'

/**
 * 프로필 완성 화면이 사라진 자리를 이어받아 서서히 나타나는 껍데기.
 *
 * ★ 메인 화면 컴포넌트가 무엇으로 바뀌든 전환 효과가 유지되도록
 *   화면 코드가 아니라 이 껍데기에 넣어뒀습니다.
 *   다른 브랜치의 메인 화면은 자체 등장 애니메이션을 넣지 마세요. (두 번 겹쳐 보입니다)
 */
export default function MainTransition({ children }: { children: ReactNode }) {
  return <div className="fade-in flex flex-1 flex-col overflow-hidden">{children}</div>
}
