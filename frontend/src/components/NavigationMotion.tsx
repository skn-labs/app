import { useEffect, useMemo, useRef } from 'react'
import type { PropsWithChildren } from 'react'
import { useLocation, useNavigationType } from 'react-router-dom'
import { resolveNavigationMotion } from '../lib/navigationMotion'
import { NavigationMotionContext } from '../lib/navigationMotionContext'

export function NavigationMotionProvider({ children }: PropsWithChildren) {
  const location = useLocation()
  const navigationType = useNavigationType()
  const previousPath = useRef<string | null>(null)
  const motion = useMemo(
    () => resolveNavigationMotion(previousPath.current, location.pathname, navigationType),
    [location.pathname, navigationType],
  )

  useEffect(() => {
    previousPath.current = location.pathname
  }, [location.pathname])

  return <NavigationMotionContext.Provider value={motion}>{children}</NavigationMotionContext.Provider>
}
