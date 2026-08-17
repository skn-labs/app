import { describe, expect, it } from 'vitest'
import { formatKstTime } from './kstTime'

describe('formatKstTime', () => {
  it('uses Korea Standard Time in 24-hour format', () => {
    expect(formatKstTime(new Date('2026-08-16T15:05:00Z'))).toBe('00:05')
    expect(formatKstTime(new Date('2026-08-17T05:07:00Z'))).toBe('14:07')
  })
})
