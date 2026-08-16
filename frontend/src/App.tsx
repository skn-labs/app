import { lazy, Suspense, useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Navigate, Route, Routes } from 'react-router-dom'
import { api } from './lib/api'
import { AssetMotion, Loading } from './components/ui'
import { AppViewport, PrototypePhone } from './components/PrototypeChrome'

const AuthPage = lazy(() => import('./pages/AuthPage').then(module => ({ default: module.AuthPage })))
const OnboardingPage = lazy(() => import('./pages/OnboardingPage').then(module => ({ default: module.OnboardingPage })))
const HomePage = lazy(() => import('./pages/HomePage').then(module => ({ default: module.HomePage })))
const ExplorePage = lazy(() => import('./pages/ExplorePages').then(module => ({ default: module.ExplorePage })))
const ProductPage = lazy(() => import('./pages/ExplorePages').then(module => ({ default: module.ProductPage })))
const CustomProductPage = lazy(() => import('./pages/ExplorePages').then(module => ({ default: module.CustomProductPage })))
const ShelfPage = lazy(() => import('./pages/ExplorePages').then(module => ({ default: module.ShelfPage })))
const ExperiencePage = lazy(() => import('./pages/ExperiencePages').then(module => ({ default: module.ExperiencePage })))
const RecordPage = lazy(() => import('./pages/ExperiencePages').then(module => ({ default: module.RecordPage })))
const RoutineEditPage = lazy(() => import('./pages/ExperiencePages').then(module => ({ default: module.RoutineEditPage })))
const AiLandingPage = lazy(() => import('./pages/ChatPages').then(module => ({ default: module.AiLandingPage })))
const ChatPage = lazy(() => import('./pages/ChatPages').then(module => ({ default: module.ChatPage })))
const ChatStartPage = lazy(() => import('./pages/ChatPages').then(module => ({ default: module.ChatStartPage })))
const ProductSearchPage = lazy(() => import('./pages/ChatPages').then(module => ({ default: module.ProductSearchPage })))
const PatternPage = lazy(() => import('./pages/RecordsPages').then(module => ({ default: module.PatternPage })))
const RecordsPage = lazy(() => import('./pages/RecordsPages').then(module => ({ default: module.RecordsPage })))
const ProfileEditPage = lazy(() => import('./pages/RecordsPages').then(module => ({ default: module.ProfileEditPage })))
const RoutineDetailPage = lazy(() => import('./pages/RoutinesPages').then(module => ({ default: module.RoutineDetailPage })))
const RoutineListPage = lazy(() => import('./pages/RoutinesPages').then(module => ({ default: module.RoutineListPage })))
const NotificationsPage = lazy(() => import('./pages/NotificationsPage').then(module => ({ default: module.NotificationsPage })))

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
  if (!introCompleted || auth.isPending) return <AppViewport><PrototypePhone>
      <div className="grid min-h-0 flex-1 place-items-center bg-white">
        <AssetMotion name="skn-wordmark-motion" poster="/skn-assets/skn-wordmark-motion-poster.png" alt="SKN" onEnded={() => setIntroMotionEnded(true)} className="aspect-[3/2] w-[62%] max-w-[280px]"/>
      </div>
    </PrototypePhone></AppViewport>

  const content = auth.isError ? <AuthPage />
    : !auth.data.onboardingCompleted ? <OnboardingPage auth={auth.data}/>
    : <Routes>
    <Route path="/" element={<HomePage/>}/>
    <Route path="/explore" element={<ExplorePage/>}/>
    <Route path="/products/:id" element={<ProductPage/>}/>
    <Route path="/my-products" element={<ShelfPage/>}/>
    <Route path="/my-products/:id" element={<CustomProductPage/>}/>
    <Route path="/routine/new" element={<RoutineEditPage/>}/>
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
    <Route path="/profile/edit" element={<ProfileEditPage/>}/>
    <Route path="/patterns/:id" element={<PatternPage/>}/>
    <Route path="/notifications" element={<NotificationsPage/>}/>
    <Route path="*" element={<Navigate to="/" replace/>}/>
  </Routes>

  return <AppViewport><Suspense fallback={<PrototypePhone><Loading label="화면을 준비하는 중"/></PrototypePhone>}>
    {content}
  </Suspense></AppViewport>
}
