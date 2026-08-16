const welcomeKey = (userId: number) => `skn:onboarding-welcome:${userId}`

export function markOnboardingWelcome(userId: number) {
  try { sessionStorage.setItem(welcomeKey(userId), 'pending') } catch { /* 저장소가 막히면 온보딩 자체는 계속 진행한다 */ }
}

export function hasPendingOnboardingWelcome(userId: number) {
  try { return sessionStorage.getItem(welcomeKey(userId)) === 'pending' } catch { return false }
}

export function consumeOnboardingWelcome(userId: number) {
  try { sessionStorage.removeItem(welcomeKey(userId)) } catch { /* 웰컴 화면 종료가 우선이다 */ }
}
