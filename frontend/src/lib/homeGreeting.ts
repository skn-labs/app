import type { Home } from './types'

export type HomeGreetingTone = 'welcome' | 'action' | 'saved' | 'review' | 'neutral'
export type HomeGreeting = { message: string; tone: HomeGreetingTone }

function isSameLocalDay(value: string, now: Date) {
  const normalized = /Z$|[+-]\d\d:\d\d$/.test(value) ? value : `${value.replace(' ', 'T')}Z`
  const date = new Date(normalized)
  return !Number.isNaN(date.getTime())
    && date.getFullYear() === now.getFullYear()
    && date.getMonth() === now.getMonth()
    && date.getDate() === now.getDate()
}

export function getHomeGreeting(home: Home, now = new Date()): HomeGreeting {
  const experience = home.currentExperience

  if (!experience && home.productCount === 0 && home.recordCount === 0) {
    return { message: 'SKN에 오신 걸 환영해요.', tone: 'welcome' }
  }
  if (experience?.reviewDue || home.primaryAction === 'REVIEW_EXPERIENCE') {
    return { message: '오늘은 남긴 기록을 함께 돌아보는 날이에요.', tone: 'review' }
  }
  if (experience?.latestRecord && isSameLocalDay(experience.latestRecord.createdAt, now)) {
    return { message: '오늘의 기록은 잘 남아 있어요.', tone: 'saved' }
  }
  if (experience) {
    return { message: '오늘 사용한 느낌이 있다면 짧게 기록해보세요.', tone: 'action' }
  }
  if (home.productCount > 0 && home.recordCount === 0) {
    return { message: '담아둔 제품으로 첫 루틴을 시작해보세요.', tone: 'action' }
  }
  if (home.recordCount > 0) {
    return { message: '이전 기록은 그대로 두고, 새 경험을 시작해보세요.', tone: 'neutral' }
  }
  return { message: '오늘의 사용 경험을 편하게 이어가세요.', tone: 'neutral' }
}
