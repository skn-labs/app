import { Link, useNavigate } from 'react-router-dom'
import PhoneFrame from '@/components/PhoneFrame'
import StatusBar from '@/components/StatusBar'
import HomeIndicator from '@/components/HomeIndicator'
import TopMark from '@/components/TopMark'
import AssetVideo from '@/components/AssetVideo'
import { Button } from '@/components/ui'

/** 로그인 전 시작 화면 — 패트리 접시 애니메이션 */
export default function Welcome() {
  const navigate = useNavigate()

  return (
    <PhoneFrame>
      <StatusBar />
      <TopMark />

      <div className="flex flex-1 flex-col px-7">
        <div className="pt-10">
          <h1 className="text-[22px] leading-[1.4] font-bold tracking-tight text-ink">
            당신의 피부를 연구할
            <br />
            준비가 되었어요.
          </h1>
          <p className="mt-3 text-[13px] leading-[1.6] text-ink-muted">
            몇 가지 질문으로 당신에게 맞는
            <br />
            케어를 시작할게요.
          </p>
        </div>

        <div className="flex flex-1 items-center justify-center">
          <AssetVideo
            name="petri"
            poster="/media/petri-poster.png"
            loop
            className="w-[86%] object-contain"
          />
        </div>

        <Button full onClick={() => navigate('/login')}>
          로그인
        </Button>

        <p className="pt-4 pb-2 text-center text-[12px] text-ink-muted">
          아직 계정이 없으신가요?{' '}
          <Link to="/signup" className="font-medium text-ink underline underline-offset-2">
            회원가입
          </Link>
        </p>
      </div>

      <HomeIndicator />
    </PhoneFrame>
  )
}
