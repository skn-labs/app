/**
 * 칩 선택 값 회귀 테스트.
 *
 * 「촉촉한」이 발림·마무리감 두 그룹에 있는데 이름만으로 저장하던 시절,
 * 한쪽을 누르면 양쪽이 함께 눌리는 버그가 있었습니다. 다시 생기지 않도록 못 박아 둡니다.
 */
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'

const {
  CONCERN_GROUPS,
  TEXTURE_GROUPS,
  AVOID_GROUPS,
  chipId,
  parseChipId,
  describeChip,
  isKnownChipId,
} = await import(fileURLToPath(new URL('../src/config/onboarding.ts', import.meta.url)))

const ALL = [...CONCERN_GROUPS, ...TEXTURE_GROUPS, ...AVOID_GROUPS]

describe('칩 값 만들기', () => {
  it('같은 이름이 다른 그룹에 있으면 값이 서로 달라야 한다', () => {
    assert.notEqual(chipId('apply', '촉촉한'), chipId('finish', '촉촉한'))
  })

  it('실제로 「촉촉한」이 두 그룹에 들어 있다 (이 전제가 깨지면 테스트 의미가 없음)', () => {
    const groups = TEXTURE_GROUPS.filter((g) => g.options.includes('촉촉한')).map((g) => g.key)
    assert.deepEqual(groups, ['apply', 'finish'])
  })

  it('토글해도 서로 영향을 주지 않는다', () => {
    const apply = chipId('apply', '촉촉한')
    const finish = chipId('finish', '촉촉한')

    let selected = []
    const toggle = (id) =>
      (selected = selected.includes(id) ? selected.filter((v) => v !== id) : [...selected, id])

    toggle(apply)
    assert.deepEqual(selected, [apply], '발림만 켜져야 함')

    toggle(finish)
    assert.deepEqual(selected, [apply, finish])

    toggle(apply)
    assert.deepEqual(selected, [finish], '발림만 꺼지고 마무리감은 남아야 함')
  })

  it('선택지에 콜론이 있어도 그룹과 이름이 안 섞인다', () => {
    assert.deepEqual(parseChipId('scent:시트러스:허브'), {
      groupKey: 'scent',
      option: '시트러스:허브',
    })
  })
})

describe('화면 표시', () => {
  it('그룹 이름을 붙여 보여준다', () => {
    assert.equal(describeChip('apply:촉촉한'), '발림 촉촉한')
    assert.equal(describeChip('finish:촉촉한'), '마무리감 촉촉한')
  })

  it('모르는 값이면 원래 글자라도 보여준다 (빈칸으로 두지 않기)', () => {
    assert.equal(describeChip('촉촉한'), '촉촉한')
    assert.equal(describeChip('nope:이상한값'), '이상한값')
  })
})

describe('저장된 값 걸러내기', () => {
  it('지금 설정에 있는 값만 통과시킨다', () => {
    assert.equal(isKnownChipId('apply:촉촉한'), true)
    assert.equal(isKnownChipId('촉촉한'), false, '예전 형식(그룹 없음)은 버려야 함')
    assert.equal(isKnownChipId('apply:없는선택지'), false)
    assert.equal(isKnownChipId('nope:촉촉한'), false)
  })
})

describe('설정 파일 자체 점검', () => {
  it('그룹 키가 겹치지 않는다', () => {
    const keys = ALL.map((g) => g.key)
    assert.equal(new Set(keys).size, keys.length, `중복된 그룹 키: ${keys}`)
  })

  it('한 그룹 안에 같은 선택지가 두 번 있지 않다', () => {
    for (const g of ALL) {
      assert.equal(
        new Set(g.options).size,
        g.options.length,
        `${g.title} 그룹에 중복된 선택지가 있어요`,
      )
    }
  })

  it('모든 칩 값이 서로 유일하다', () => {
    const ids = ALL.flatMap((g) => g.options.map((o) => chipId(g.key, o)))
    assert.equal(new Set(ids).size, ids.length)
  })
})
