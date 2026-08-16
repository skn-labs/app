import { describe, expect, it } from 'vitest'
import { resolveNavigationMotion } from '../lib/navigationMotion'

describe('resolveNavigationMotion', () => {
  it('crossfades between the persistent tab roots', () => {
    expect(resolveNavigationMotion('/', '/my-products', 'PUSH')).toBe('tab')
    expect(resolveNavigationMotion('/my-products', '/routines', 'PUSH')).toBe('tab')
  })

  it('distinguishes detail entry and back navigation', () => {
    expect(resolveNavigationMotion('/routines', '/routines/12', 'PUSH')).toBe('forward')
    expect(resolveNavigationMotion('/routines/12', '/routines', 'POP')).toBe('back')
  })

  it('uses a quiet replacement transition and skips the first render', () => {
    expect(resolveNavigationMotion('/ai/new', '/ai/31', 'REPLACE')).toBe('replace')
    expect(resolveNavigationMotion(null, '/', 'POP')).toBe('none')
  })
})
