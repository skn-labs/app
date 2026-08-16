import { describe, expect, it } from 'vitest'
import type { Home } from './types'
import { getHomeGreeting } from './homeGreeting'

const base: Home = {
  displayName: '느긋한 오리',
  patterns: [],
  productCount: 0,
  recordCount: 0,
  primaryAction: 'START_EXPERIENCE',
}

describe('getHomeGreeting', () => {
  it('welcomes a first-time user', () => {
    expect(getHomeGreeting(base)).toEqual({ message: 'SKN에 오신 걸 환영해요.', tone: 'welcome' })
  })

  it('prioritizes a due review over the regular recording prompt', () => {
    expect(getHomeGreeting({
      ...base,
      productCount: 1,
      recordCount: 2,
      primaryAction: 'REVIEW_EXPERIENCE',
      currentExperience: { id: 1, subjectType: 'ROUTINE', title: '저녁 루틴', subtitle: '', status: 'ACTIVE', startedAt: '2026-08-10T00:00:00Z', reviewDueAt: '2026-08-17T00:00:00Z', day: 7, daysUntilReview: 0, reviewDue: true, recordSummary: { totalCount: 2, likedCount: 1, disappointedCount: 1, unsureCount: 0, discomfortCount: 0 } },
    })).toEqual({ message: '오늘은 남긴 기록을 함께 돌아보는 날이에요.', tone: 'review' })
  })

  it('acknowledges a record already saved today', () => {
    const now = new Date('2026-08-17T03:00:00Z')
    expect(getHomeGreeting({
      ...base,
      productCount: 1,
      recordCount: 1,
      primaryAction: 'RECORD_EXPERIENCE',
      currentExperience: { id: 1, subjectType: 'PRODUCT', title: '토너', subtitle: '', status: 'ACTIVE', startedAt: '2026-08-16T00:00:00Z', reviewDueAt: '2026-08-23T00:00:00Z', day: 2, daysUntilReview: 6, reviewDue: false, latestRecord: { id: 1, productName: '토너', sentiment: 'LIKED', note: '', discomfort: 'NOT_REPORTED', adherence: '', tags: [], createdAt: '2026-08-17T01:00:00Z' }, recordSummary: { totalCount: 1, likedCount: 1, disappointedCount: 0, unsureCount: 0, discomfortCount: 0 } },
    }, now)).toEqual({ message: '오늘의 기록은 잘 남아 있어요.', tone: 'saved' })
  })
})
