import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Navigate, Route, Routes } from 'react-router-dom'
import { api } from './lib/api'
import { BrandMotion } from './components/ui'
import { AuthPage } from './pages/AuthPage'
import { HomePage } from './pages/HomePage'
import { ExplorePage, ProductPage, ShelfPage } from './pages/ExplorePages'
import { ExperiencePage, RecordPage, RoutineEditPage } from './pages/ExperiencePages'
import { AiLandingPage, ChatPage, ChatStartPage, ProductSearchPage } from './pages/ChatPages'
import { PatternPage, RecordsPage } from './pages/RecordsPages'
import { RoutineDetailPage, RoutineListPage } from './pages/RoutinesPages'
import { ExperienceHubPage } from './pages/ExperienceHubPage'
import { DesktopQuickLogin } from './components/DesktopQuickLogin'
import { PrototypePhone } from './components/PrototypeChrome'
import { OnboardingPage } from './pages/OnboardingPage'

export default function App() {
  const auth = useQuery({ queryKey: ['auth'], queryFn: api.me, retry: false })
  const [introMinimumElapsed, setIntroMinimumElapsed] = useState(false)
  const [introMotionEnded, setIntroMotionEnded] = useState(false)
  const [introFallbackElapsed, setIntroFallbackElapsed] = useState(false)

  useEffect(() => {
    const minimum = window.setTimeout(() => setIntroMinimumElapsed(true), 900)
    const fallback = window.setTimeout(() => setIntroFallbackElapsed(true), 2400)
    return () => { window.clearTimeout(minimum); window.clearTimeout(fallback) }
  }, [])

  // 세션 응답이 빨라도 브랜드 모션이 끝나기 전에는 첫 화면을 교체하지 않는다.
  const introCompleted = introMinimumElapsed && (introMotionEnded || introFallbackElapsed)
  if (!introCompleted || auth.isPending) return <PrototypePhone>
    <div className="grid min-h-0 flex-1 place-items-center bg-white">
      <BrandMotion name="skn-wordmark-motion" poster="/skn-assets/skn-wordmark.png" alt="SKN" onEnded={() => setIntroMotionEnded(true)} className="w-[62%] max-w-[280px] object-contain"/>
    </div>
  </PrototypePhone>

  const content = auth.isError ? <AuthPage />
    : !auth.data.onboardingCompleted ? <OnboardingPage auth={auth.data}/>
    : <Routes>
    <Route path="/" element={<HomePage/>}/>
    <Route path="/explore" element={<ExplorePage/>}/>
    <Route path="/experience" element={<ExperienceHubPage/>}/>
    <Route path="/products/:id" element={<ProductPage/>}/>
    <Route path="/my-products" element={<ShelfPage/>}/>
    <Route path="/routine/edit" element={<RoutineEditPage/>}/>
    <Route path="/routines" element={<RoutineListPage/>}/>
    <Route path="/routines/:id" element={<RoutineDetailPage/>}/>
    <Route path="/experiences/:id" element={<ExperiencePage/>}/>
    <Route path="/experiences/:id/record" element={<RecordPage/>}/>
    <Route path="/ai" element={<AiLandingPage/>}/>
    <Route path="/ai/search" element={<ProductSearchPage/>}/>
    <Route path="/ai/new" element={<ChatStartPage/>}/>
    <Route path="/ai/:id" element={<ChatPage/>}/>
    <Route path="/records" element={<RecordsPage/>}/>
    <Route path="/patterns/:id" element={<PatternPage/>}/>
    <Route path="*" element={<Navigate to="/" replace/>}/>
  </Routes>

  return <>{content}<DesktopQuickLogin currentUsername={auth.data?.username}/></>
}
