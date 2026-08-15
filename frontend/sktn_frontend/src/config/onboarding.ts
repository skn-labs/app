/**
 * ★ 온보딩 문구·선택지는 전부 여기 한 곳에 있습니다.
 *   화면 코드는 건드리지 말고 이 파일만 고치면 질문이 바뀝니다.
 *   (와이어프레임에서 읽은 문구라 오탈자는 여기서 바로 수정하세요.)
 */

export const AGE_RANGES = ['10대', '20대', '30대', '40대', '50대', '60대 이상'] as const

export const GENDERS = [
  { value: 'male', label: '남성' },
  { value: 'female', label: '여성' },
] as const

export const SKIN_TYPES = ['건성', '지성', '복합성', '중성', '잘 모르겠어요'] as const

export const SKIN_CONDITION_SCALE = {
  min: 1,
  max: 5,
  minLabel: '매우 불안정',
  midLabel: '보통',
  maxLabel: '매우 안정',
} as const

/** 5. 지금 가장 해결하고 싶은 것은? (복수 선택) */
export const CONCERN_GROUPS = [
  {
    key: 'moisture',
    title: '수분·유분',
    options: ['건조함', '당김', '유분기', '번들거림'],
  },
  {
    key: 'trouble',
    title: '트러블·자극',
    options: ['여드름', '좁쌀 트러블', '홍조', '민감함'],
  },
  {
    key: 'tone',
    title: '톤·색소',
    options: ['잡티', '칙칙함', '다크서클', '색소침착'],
  },
  {
    key: 'texture',
    title: '결·모공',
    options: ['각질', '거친 피부결', '모공', '블랙헤드'],
  },
  {
    key: 'aging',
    title: '탄력·주름',
    options: ['주름', '탄력 저하', '처짐'],
  },
] as const

/** 6. 어떤 사용감을 선호하시나요? (복수 선택) */
export const TEXTURE_GROUPS = [
  {
    key: 'apply',
    title: '발림',
    options: ['가벼운', '촉촉한', '쫀쫀한', '무거운'],
  },
  {
    key: 'finish',
    title: '마무리감',
    options: ['산뜻한', '보송한', '촉촉한', '윤기 있는'],
  },
  {
    key: 'scent',
    title: '향',
    options: ['무향', '시트러스·허브', '플로럴', '우디·머스크', '기타'],
  },
] as const

/** 7. 사용하면서 피하고 싶은 것이 있나요? (복수 선택) */
export const AVOID_GROUPS = [
  {
    key: 'ingredient',
    title: '성분',
    options: ['알러지 유발 성분', '향료', '알코올', '에센셜 오일', '실리콘'],
  },
  {
    key: 'feel',
    title: '사용감',
    options: ['답답함', '끈적거림', '따가움', '향이 강한 것', '무거운 잔여감'],
  },
] as const

export const AVOID_NOTE_PLACEHOLDER = '피하고 싶은 성분을 직접 적어주세요. (선택)'

/** 8. 새로운 제품을 얼마나 자주 시도하시나요? */
export const TRIAL_FREQUENCIES = [
  '거의 시도하지 않아요',
  '몇 달에 한 번 시도해요',
  '한 달에 1~2개 정도 시도해요',
  '한 달에 3개 이상 시도해요',
] as const

/* ────────────────────────────────────────────────────────────
   칩 값 다루기

   ⚠️ 저장하는 값은 보이는 글자가 아니라 **`그룹키:선택지`** 입니다.
      「촉촉한」처럼 발림·마무리감 두 그룹에 같은 이름이 있어서,
      이름만으로 저장하면 한쪽을 누를 때 양쪽이 함께 눌립니다.
      예) 'apply:촉촉한' 과 'finish:촉촉한' 은 서로 다른 값
   ──────────────────────────────────────────────────────────── */

export interface ChipGroup {
  key: string
  title: string
  options: readonly string[]
}

const ALL_CHIP_GROUPS: readonly ChipGroup[] = [
  ...CONCERN_GROUPS,
  ...TEXTURE_GROUPS,
  ...AVOID_GROUPS,
]

export const chipId = (groupKey: string, option: string) => `${groupKey}:${option}`

export function parseChipId(id: string): { groupKey: string; option: string } {
  const at = id.indexOf(':')
  return at < 0
    ? { groupKey: '', option: id }
    : { groupKey: id.slice(0, at), option: id.slice(at + 1) }
}

/** 화면에 보여줄 문구 — 'apply:촉촉한' → '발림 촉촉한' */
export function describeChip(id: string): string {
  const { groupKey, option } = parseChipId(id)
  const group = ALL_CHIP_GROUPS.find((g) => g.key === groupKey)
  return group ? `${group.title} ${option}` : option
}

/** 지금 설정에 실제로 존재하는 값인지 (예전 형식으로 저장된 값 걸러내기) */
export function isKnownChipId(id: string): boolean {
  const { groupKey, option } = parseChipId(id)
  const group = ALL_CHIP_GROUPS.find((g) => g.key === groupKey)
  return !!group && group.options.includes(option)
}

/** 화면 상단 문구 — 순서가 곧 온보딩 순서입니다. */
export const STEP_COPY = {
  age: {
    title: '현재 연령대를 알려주세요.',
    subtitle: '나이대에 따라 피부 변화와 추천할 케어 방향이 달라져요.',
  },
  gender: {
    title: '성별을 선택해주세요.',
    subtitle: '성별에 따라 피부 분비와 추천 제품이 달라질 수 있어요.',
  },
  skinType: {
    title: '피부 타입은 어떻게 알고 있나요?',
    subtitle: '정확하지 않아도 괜찮아요. 나중에 다시 바꿀 수 있어요.',
  },
  skinCondition: {
    title: '지금 피부 상태는 어떤가요?',
    subtitle: '최근 2주 정도의 컨디션을 기준으로 골라주세요.',
  },
  concerns: {
    title: '지금 가장 해결하고 싶은 것은?',
    subtitle: '가장 신경 쓰이는 고민을 골라주세요. (복수 선택 가능)',
  },
  textures: {
    title: '어떤 사용감을 선호하시나요?',
    subtitle: '평소에 손이 자주 가는 제형을 떠올리면 쉬워요.',
  },
  avoids: {
    title: '사용하면서 피하고 싶은 것이 있나요?',
    subtitle: '피해야 할 성분이 있다면 추천에서 빼드릴게요.',
  },
  trialFrequency: {
    title: '새로운 제품을 얼마나 자주 시도하시나요?',
    subtitle: '추천 주기와 제품 수를 정하는 데 쓰여요.',
  },
} as const

/** 온보딩 단계 순서 (진행 표시 개수도 이 배열 길이를 따릅니다) */
export const STEP_ORDER = [
  'age',
  'gender',
  'skinType',
  'skinCondition',
  'concerns',
  'textures',
  'avoids',
  'trialFrequency',
] as const

export type StepKey = (typeof STEP_ORDER)[number]
