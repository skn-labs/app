import { createContext, useContext } from 'react'
import type { NavigationMotion } from './navigationMotion'

export const NavigationMotionContext = createContext<NavigationMotion>('none')

export function useNavigationMotion() {
  return useContext(NavigationMotionContext)
}
