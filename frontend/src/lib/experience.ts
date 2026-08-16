import type { ExperienceRecord } from './types'

export function experienceRecordHref(record: ExperienceRecord) {
  if (record.sessionId) return `/experiences/${record.sessionId}`
  if (record.userProductId) return `/my-products/${record.userProductId}`
  return undefined
}

export function formatExperienceRecordDate(value: string) {
  const normalized = /Z$|[+-]\d\d:\d\d$/.test(value) ? value : `${value.replace(' ', 'T')}Z`
  const date = new Date(normalized)
  return Number.isNaN(date.getTime())
    ? value.slice(0, 10)
    : new Intl.DateTimeFormat('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(date)
}
