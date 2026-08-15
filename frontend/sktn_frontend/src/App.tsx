import { Navigate, Route, Routes } from 'react-router-dom'
import Splash from './routes/Splash'
import Welcome from './routes/Welcome'
import Login from './routes/Login'
import SignUp from './routes/SignUp'
import SignUpComplete from './routes/SignUpComplete'
import Main from './routes/main'
import ProtectedRoute from './routes/ProtectedRoute'
import OnboardingFlow from './routes/onboarding/OnboardingFlow'
import ProfileComplete from './routes/onboarding/ProfileComplete'
import { STEP_ORDER } from './config/onboarding'

export default function App() {
  return (
    <Routes>
      {/* 진입 → 상태에 따라 분기 */}
      <Route path="/" element={<Splash />} />

      {/* 비로그인 구간 */}
      <Route path="/welcome" element={<Welcome />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<SignUp />} />
      <Route path="/signup/complete" element={<SignUpComplete />} />

      {/* 로그인 O · 온보딩 진행 구간 */}
      <Route element={<ProtectedRoute />}>
        <Route path="/onboarding" element={<Navigate to={`/onboarding/${STEP_ORDER[0]}`} replace />} />
        <Route path="/onboarding/complete" element={<ProfileComplete />} />
        <Route path="/onboarding/:step" element={<OnboardingFlow />} />
      </Route>

      {/* 로그인 O · 온보딩 O */}
      <Route element={<ProtectedRoute requireOnboarded />}>
        <Route path="/main" element={<Main />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
