export type NavigationMotion = 'none' | 'tab' | 'forward' | 'back' | 'replace'

const TAB_ROOTS = new Set(['/', '/my-products', '/routines', '/ai'])

function routeDepth(pathname: string) {
  return pathname.split('/').filter(Boolean).length
}

export function resolveNavigationMotion(previousPath: string | null, pathname: string, navigationType: string): NavigationMotion {
  if (!previousPath || previousPath === pathname) return 'none'
  if (TAB_ROOTS.has(previousPath) && TAB_ROOTS.has(pathname)) return 'tab'
  if (navigationType === 'POP') return 'back'
  if (navigationType === 'REPLACE') return 'replace'
  if (TAB_ROOTS.has(pathname) || routeDepth(pathname) < routeDepth(previousPath)) return 'back'
  return 'forward'
}
