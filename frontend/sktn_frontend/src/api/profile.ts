import type { SkinProfile } from '@/types'

/**
 * ⚠️ 피부 프로필은 아직 **서버에 저장되지 않습니다.**
 *
 * openapi.json 의 온보딩(POST /auth/onboarding)은 "쓰는 화장품 고르기"라서
 * 와이어프레임의 피부 질문 8개와 담는 내용이 다릅니다.
 * 그래서 지금은 브라우저(localStorage)에만 계정별로 저장하고,
 * ProtectedRoute 는 이 값으로 온보딩 완료 여부를 판단합니다.
 *
 * 서버에 붙이려면 백엔드에 이런 엔드포인트 하나만 있으면 됩니다.
 *   PUT /api/v1/me/skin-profile   body: SkinProfile  → 200 SkinProfile
 *   GET /api/v1/me/skin-profile                      → 200 SkinProfile | 204
 * 생기면 아래 두 함수 안만 request() 호출로 바꾸면 화면 코드는 그대로입니다.
 */

const key = (userId: number) => `sktn.skinProfile.${userId}`

export async function saveSkinProfile(userId: number, profile: SkinProfile): Promise<SkinProfile> {
  localStorage.setItem(key(userId), JSON.stringify(profile))
  return profile
}

export async function fetchSkinProfile(userId: number): Promise<SkinProfile | null> {
  const raw = localStorage.getItem(key(userId))
  if (!raw) return null
  try {
    return JSON.parse(raw) as SkinProfile
  } catch {
    return null
  }
}

/** 이 계정이 피부 프로필 질문을 끝냈는지 */
export function hasSkinProfile(userId: number): boolean {
  return localStorage.getItem(key(userId)) !== null
}

export function clearSkinProfile(userId: number): void {
  localStorage.removeItem(key(userId))
}
