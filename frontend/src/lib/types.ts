export type Auth = { userId: number; username: string; displayName: string; demo: boolean; onboardingCompleted: boolean }
export type QuickAccount = { username: string; displayName: string }
/** ONB-01. 온보딩에서 선택적으로 받는 사용감 선호. 비어 있는 상태가 정상이다. */
export type Preference = { likes: string[]; avoids: string[]; note: string }
export type SkinProfile = {
  ageRange: '10S' | '20S' | '30S' | '40S' | '50S' | '60_PLUS';
  gender: 'MALE' | 'FEMALE';
  skinType: 'DRY' | 'OILY' | 'COMBINATION' | 'NORMAL' | 'UNSURE';
  skinCondition: number;
  concerns: string[];
  textures: string[];
  avoids: string[];
  avoidNote: string;
  trialFrequency: 'RARELY' | 'EVERY_FEW_MONTHS' | 'ONE_OR_TWO_MONTHLY' | 'THREE_PLUS_MONTHLY';
}

export type ProductGuide = {
  summary: string;
  routineStep: string;
  usageType: string;
  usageTiming: string[];
  usageInstructions: string[];
  highlights: { title: string; detail: string }[];
  origin: 'AI_GENERATED' | 'EDITORIAL';
  generatedAt: string;
}

export type ProductFact = {
  type: string;
  text: string;
  sourceLabel: string;
  sourceUrl: string;
  checkedAt: string;
}

export type Product = {
  id: number; brand: string; brandLogoUrl?: string; name: string; category: string; volume?: string;
  versionLabel?: string; description?: string; texture?: string; verified: boolean;
  guide?: ProductGuide | null; facts: ProductFact[];
  personalRecordCount: number; owned: boolean; imageUrl?: string;
}

export type ProductPage = { items: Product[]; nextCursor?: string; hasMore: boolean }

export type UserProduct = {
  id: number; product?: Product; customBrand?: string; brandLogoUrl?: string; customName?: string;
  customCategory?: string; memo?: string; addedAt: string;
  personalRecordCount: number; inCurrentRoutine: boolean;
}

export type RoutineItem = {
  userProductId: number; productName: string; brand: string; brandLogoUrl?: string; category: string;
  timeSlot: 'MORNING' | 'EVENING' | 'BOTH'; position: number; frequency: string;
}

export type RoutineItemInput = { userProductId: number; timeSlot: 'MORNING' | 'EVENING' | 'BOTH'; frequency: string }

export type RoutineInsight = { text: string; keywords: string[]; generatedAt: string }

export type Routine = {
  id: number; name: string; dayPart: 'MORNING' | 'EVENING' | 'ANYTIME';
  status: 'CURRENT' | 'BASELINE' | 'PAST'; startedAt: string; items: RoutineItem[]; insight?: RoutineInsight;
}

export type RoutineNameSuggestion = { name: string; aiGenerated: boolean; insight?: RoutineInsight }

export type ExperienceRecord = {
  id: number; sessionId?: number; userProductId?: number; productName: string;
  sentiment: 'LIKED' | 'DISAPPOINTED' | 'UNSURE'; note: string;
  discomfort: 'NOT_REPORTED' | 'REPORTED' | 'UNKNOWN'; adherence: string;
  tags: string[]; createdAt: string;
}

export type ExperienceRecordSummary = {
  totalCount: number; likedCount: number; disappointedCount: number;
  unsureCount: number; discomfortCount: number;
}

export type Experience = {
  id: number; subjectType: 'ROUTINE' | 'PRODUCT'; routineId?: number; userProductId?: number;
  title: string; subtitle: string; status: string; startedAt: string; reviewDueAt: string;
  day: number; daysUntilReview: number; reviewDue: boolean; routine?: Routine;
  product?: UserProduct; latestRecord?: ExperienceRecord; recordSummary: ExperienceRecordSummary;
}

export type PatternEvidence = {
  recordId: number; productName: string; note: string; sentiment: string;
  polarity: 'SUPPORTS' | 'CONTRADICTS'; createdAt: string;
}

export type Pattern = {
  id: number; title: string; summary: string; confidenceNote: string;
  supportingCount: number; contradictingCount: number; evidence: PatternEvidence[];
}

export type Home = {
  displayName: string; currentExperience?: Experience; patterns: Pattern[];
  productCount: number; recordCount: number; primaryAction: string;
}

export type NotificationAction = {
  type: 'RECORD_EXPERIENCE' | 'RECORDS' | 'PATTERN' | 'PROFILE' | 'EXPLORE';
  label: string; href: string;
}

export type AppNotification = {
  id: number;
  type: 'EXPERIENCE_CHECK_IN' | 'EXPERIENCE_REVIEW_DUE' | 'PROFILE_READY' | 'PROFILE_UPDATED' | 'PATTERN_READY' | 'PRODUCT_DISCOVERY';
  title: string; body: string; createdAt: string; availableAt: string;
  readAt?: string; snoozedUntil?: string; completedAt?: string;
  read: boolean; completed: boolean; action: NotificationAction;
}

export type NotificationInbox = { items: AppNotification[]; unreadCount: number }

export type Message = {
  id: number; role: 'USER' | 'ASSISTANT'; content: string; suggestedReplies: string[];
  evidenceRefs: string[];
  webSources?: WebSource[];
  status: 'READY' | 'FALLBACK' | 'FAILED'; createdAt: string;
}

export type WebSource = {
  ref: string;
  title: string;
  url: string;
  tier: 'P1' | 'P2' | 'P3' | 'P4';
}

export type RescuePlan = {
  id: number; baseRoutineId?: number; title: string; rationale: string;
  removeUserProductId?: number; removeProductName?: string;
  status: 'PROPOSED' | 'APPLIED' | 'BLOCKED' | 'DECLINED'; appliedExperienceId?: number;
}

export type Conversation = {
  id: number; mode: 'GENERAL' | 'PRODUCT' | 'RECOMMEND' | 'PATTERN' | 'RESCUE'; productId?: number;
  experienceId?: number; status: string; messages: Message[]; quickReplies: string[];
  rescuePlan?: RescuePlan; safetyBoundary: boolean;
}

export type SavedRecord = { record: ExperienceRecord; linkedPatternId?: number; rescueSuggested: boolean }
export type OnboardingResult = { user: Auth; profile: SkinProfile }
export type Problem = { detail?: string; code?: string; status?: number; retryable?: boolean }
