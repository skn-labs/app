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
import { OnboardingPage } from './pages/OnboardingPage'

export default function App() {
  const auth = useQuery({ queryKey: ['auth'], queryFn: api.me, retry: false })
  // 세션을 확인하는 동안 로고 모션을 보여준다. 스피너 자리를 대신할 뿐 흐름은 그대로다.
  const content = auth.isPending ? <div className="mobile-shell grid h-full place-items-center bg-white">
      <BrandMotion name="skn-wordmark-motion" poster="/skn-assets/skn-wordmark.png" alt="SKN" className="w-[62%] max-w-[280px] object-contain"/>
    </div>
    : auth.isError ? <AuthPage />
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
