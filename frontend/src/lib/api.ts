import type { Auth, Conversation, Experience, ExperienceRecord, Home, OnboardingResult, Pattern, Preference, Product, ProductPage, QuickAccount, Routine, RoutineItemInput, SavedRecord, SkinProfile, UserProduct } from './types'

export class ApiError extends Error {
  status: number
  code?: string
  constructor(status: number, message: string, code?: string) {
    super(message); this.status = status; this.code = code
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(path, {
    credentials: 'include',
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init.headers || {}) },
  })
  if (response.status === 204) return undefined as T
  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw new ApiError(response.status, body.detail || '요청을 처리하지 못했어요.', body.code)
  return body as T
}

export const uid = () => crypto.randomUUID()

export const api = {
  me: () => request<Auth>('/api/v1/auth/me'),
  login: (username: string, password: string) => request<Auth>('/api/v1/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
  signup: (username: string, password: string) => request<Auth>('/api/v1/auth/signup', { method: 'POST', body: JSON.stringify({ username, password }) }),
  demo: () => request<Auth>('/api/v1/auth/demo', { method: 'POST', body: '{}' }),
  quickAccounts: () => request<QuickAccount[]>('/api/v1/auth/quick-accounts'),
  quickLogin: (username: string) => request<Auth>(`/api/v1/auth/quick-login/${encodeURIComponent(username)}`, { method: 'POST', body: '{}' }),
  logout: () => request<void>('/api/v1/auth/logout', { method: 'POST', body: '{}' }),
  deleteAccount: () => request<void>('/api/v1/auth/me', { method: 'DELETE' }),
  completeOnboarding: (profile: SkinProfile, clientRequestId: string = uid()) => request<OnboardingResult>('/api/v1/auth/onboarding', { method: 'POST', body: JSON.stringify({ profile, clientRequestId }) }),
  skinProfile: () => request<SkinProfile>('/api/v1/me/skin-profile'),
  saveSkinProfile: (profile: SkinProfile) => request<SkinProfile>('/api/v1/me/skin-profile', { method: 'PUT', body: JSON.stringify(profile) }),
  preferences: () => request<Preference>('/api/v1/me/preferences'),
  savePreferences: (value: Preference) => request<Preference>('/api/v1/me/preferences', { method: 'PUT', body: JSON.stringify(value) }),
  home: () => request<Home>('/api/v1/home'),
  products: (query = '', cursor?: string | null, limit = 24) => {
    const params = new URLSearchParams({ query, limit: String(limit) })
    if (cursor) params.set('cursor', cursor)
    return request<ProductPage>(`/api/v1/products?${params.toString()}`)
  },
  product: (id: number) => request<Product>(`/api/v1/products/${id}`),
  userProducts: () => request<UserProduct[]>('/api/v1/me/products'),
  addProduct: (productId: number) => request<UserProduct>('/api/v1/me/products', { method: 'POST', body: JSON.stringify({ productId }) }),
  addCustomProduct: (customBrand: string, customName: string, customCategory: string) => request<UserProduct>('/api/v1/me/products', { method: 'POST', body: JSON.stringify({ customBrand, customName, customCategory }) }),
  currentRoutine: () => request<Routine>('/api/v1/me/routines/current'),
  baselineRoutine: () => request<Routine>('/api/v1/me/routines/baseline'),
  replaceRoutine: (name: string, items: RoutineItemInput[]) => request<Experience>('/api/v1/me/routines/current', { method: 'PUT', headers: { 'Idempotency-Key': uid() }, body: JSON.stringify({ name, items }) }),
  startExperience: (userProductId: number, mode: 'PRODUCT' | 'ROUTINE', dayPart = 'EVENING') => request<Experience>('/api/v1/me/experiences', { method: 'POST', body: JSON.stringify({ userProductId, mode, dayPart, clientRequestId: uid() }) }),
  experience: (id: number) => request<Experience>(`/api/v1/me/experiences/${id}`),
  recordExperience: (id: number, value: { sentiment: string; note: string; tags: string[]; discomfort: string; adherence?: string }) => request<SavedRecord>(`/api/v1/me/experiences/${id}/records`, { method: 'POST', body: JSON.stringify({ ...value, clientRequestId: uid() }) }),
  completeExperience: (id: number) => request<{ message: string }>(`/api/v1/me/experiences/${id}/complete`, { method: 'POST', body: '{}' }),
  records: () => request<ExperienceRecord[]>('/api/v1/me/experience-records'),
  patterns: () => request<Pattern[]>('/api/v1/me/patterns'),
  pattern: (id: number) => request<Pattern>(`/api/v1/me/patterns/${id}`),
  conversations: () => request<Conversation[]>('/api/v1/ai/conversations'),
  conversation: (id: number) => request<Conversation>(`/api/v1/ai/conversations/${id}`),
  createConversation: (mode: string, initialPrompt: string, extras: { productId?: number; experienceId?: number } = {}, clientRequestId: string = uid()) => request<Conversation>('/api/v1/ai/conversations', { method: 'POST', body: JSON.stringify({ mode, initialPrompt, ...extras, clientRequestId }) }),
  sendMessage: (id: number, text: string, clientRequestId: string = uid()) => request<Conversation>(`/api/v1/ai/conversations/${id}/messages`, { method: 'POST', body: JSON.stringify({ text, clientRequestId }) }),
  applyRescue: (id: number) => request<Experience>(`/api/v1/ai/conversations/${id}/rescue/apply`, { method: 'POST', body: JSON.stringify({ clientRequestId: uid() }) }),
  resetDemo: (scenario: 'default' | 'empty-experience' | 'cold-start') => request<{ message: string }>(`/api/v1/demo/reset?scenario=${scenario}`, { method: 'POST', body: '{}' }),
}
