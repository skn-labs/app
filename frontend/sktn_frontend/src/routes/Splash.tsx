import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PhoneFrame from '@/components/PhoneFrame'
import AssetVideo from '@/components/AssetVideo'
import { useAuth } from '@/store/AuthContext'

/** 로고 애니메이션 길이(ms). 영상이 안 뜨는 환경 대비용 타이머. */
const INTRO_MS = 2100

/**
 * 앱 첫 진입 화면.
 * 로고 애니메이션을 끝까지 재생하고, 그동안 /auth/me 로 세션을 확인합니다.
 */
export default function Splash() {
  const { status, skinProfileDone } = useAuth()
  const navigate = useNavigate()

  const [introDone, setIntroDone] = useState(false)
  const finishIntro = useCallback(() => setIntroDone(true), [])

  useEffect(() => {
    const timer = setTimeout(finishIntro, INTRO_MS)
    return () => clearTimeout(timer)
  }, [finishIntro])

  useEffect(() => {
    if (!introDone || status === 'loading') return
    if (status === 'guest') navigate('/welcome', { replace: true })
    else if (skinProfileDone) navigate('/main', { replace: true })
    else navigate('/onboarding', { replace: true })
  }, [introDone, status, skinProfileDone, navigate])

  return (
    <PhoneFrame>
      <div className="flex flex-1 items-center justify-center bg-white">
        <AssetVideo
          name="logo-intro"
          poster="/media/logo-intro-poster.png"
          alt="sktn"
          onEnded={finishIntro}
          className="w-[62%] object-contain"
        />
      </div>
    </PhoneFrame>
  )
}
