import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import CompletionScreen from '@/components/CompletionScreen'

export interface SignUpCompleteState {
  username: string
}

/**
 * 회원가입 완료 화면.
 * 체크표시 애니메이션을 보여준 뒤 로그인 화면으로 돌려보냅니다.
 * 방금 만든 아이디는 로그인 화면 입력창에 채워서 넘깁니다.
 */
export default function SignUpComplete() {
  const navigate = useNavigate()
  const state = useLocation().state as SignUpCompleteState | null

  // 주소창으로 직접 들어온 경우엔 보여줄 게 없으니 로그인으로 보냅니다.
  if (!state?.username) return <Navigate to="/login" replace />

  return (
    <CompletionScreen
      title={
        <>
          회원가입이
          <br />
          완료됐어요.
        </>
      }
      subtitle={state.username}
      hint="로그인 화면으로 이동해요"
      onDone={() =>
        navigate('/login', { replace: true, state: { username: state.username } })
      }
    />
  )
}
