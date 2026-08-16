# 제품별 사용 가이드 생성

`catalog_guides.py`는 SQLite의 모든 제품을 읽고, 제품이 무엇이며 루틴에서 어떻게 사용하는지 설명하는 가이드를 생성·검증·저장한다. 제품에 없는 효능이나 성분을 추정하지 않는다. 제품 ID, 브랜드, 제품명, 카테고리, 제형과 DB에 이미 있는 설명·표기 정보를 입력으로 사용한다.

현재 앱의 정적 제품 원본은 `backend/data/subagent-catalog/products.jsonl`, 제품별 문구는 `backend/data/subagent-catalog/catalog-*.jsonl` 세 파일이다. 다음 명령은 외부 API를 호출하지 않으며, 제품과 문구가 각각 2,654개 있고 계약을 통과할 때에만 SQLite를 한 번에 갱신한다.

```bash
python3 scripts/import_subagent_catalog.py
```

갱신 직전 DB는 `backend/data/skn.before-subagent-catalog.db`로 백업된다.

결과는 항상 아래 여덟 필드를 가진다.

```text
summary
routineStep
usageType
usageTiming[]
usageInstructions[]
highlights[{title, detail}]
origin
generatedAt
```

## 안전장치

- DB의 46개 카테고리와 규칙의 46개 카테고리가 정확히 일치하지 않으면 생성 전에 중단한다. `OTHER` 기본값은 없다.
- 요약은 상세 상단의 제품명을 반복하지 않고, 정확한 카테고리·제형으로 이 제품이 무엇인지 한 문장으로 설명한다.
- 사용법은 카테고리별 일반 사용법에서만 고른다. 효능·성분·안전·적합성·의학적 판단과 공식 주장은 만들 수 없다.
- 강조 정보는 제형·제품 종류·사용 형태·루틴 위치만 설명한다. 기록·비교·관찰을 유도하는 문구는 허용하지 않는다.
- Responses API의 Strict Structured Outputs와 애플리케이션 검증을 모두 통과해야 AI 결과로 인정한다.
- 누락 ID, 중복 ID, 범위 밖 ID, 금지 표현, 계약 오류, API 오류가 생긴 제품은 같은 필드 구조의 `EDITORIAL` 규칙으로 대체한다.
- 제품별 입력 해시와 결과 파일을 남긴다. 생성 모드는 검증된 `AI_GENERATED` 결과만 재사용하고 `EDITORIAL` 대체 결과는 다음 실행에서 AI로 다시 시도한다.
- 429 응답은 `Retry-After`를 우선 따르고, 헤더가 없으면 15초·30초·60초 순서로 기다린다. 중단하면 아직 시작하지 않은 배치를 취소한다.
- API 호출은 DB 트랜잭션 밖에서 끝낸다. `upsert` 단계만 짧은 SQLite 트랜잭션을 사용한다.
- 실행이 성공했다면 마지막 출력은 반드시 `coverage=N/N`, `failed=0`이다.

## 환경 변수

저장소 루트의 `.env` 또는 실행 환경에 다음 값을 둔다. 스크립트는 키를 출력하지 않는다.

```dotenv
OPENAI_API_KEY=...
OPENAI_MODEL=gpt-5.6-terra
OPENAI_REASONING_EFFORT=low
```

`OPENAI_REASONING_EFFORT`의 기본값은 `low`다. 대량 편집 작업에서 불필요한 지연과 비용을 줄이기 위한 값이다.

## 실행

전체 카테고리 매핑과 편집 규칙만 검증한다. API와 DB 쓰기는 없다.

```bash
python3 scripts/catalog_guides.py --mode dry-run
```

첫 20개를 평가한다. 로컬 동기 요청을 10개씩 최대 두 개 병렬로 보낸다.

```bash
python3 scripts/catalog_guides.py \
  --mode generate \
  --limit 20 \
  --batch-size 10 \
  --workers 2 \
  --force
```

샘플을 검토한 뒤 전체 결과를 생성한다. 기본 배치는 15개이고, 허용 범위는 10~20개다.

```bash
python3 scripts/catalog_guides.py --mode generate --batch-size 15 --workers 2
```

검증된 로컬 결과를 DB에 반영한다. 결과 파일이 없는 제품은 `EDITORIAL` 규칙으로 채워서 선택 범위를 비우지 않는다.

```bash
python3 scripts/catalog_guides.py --mode upsert
```

생성과 반영을 한 번에 실행할 수도 있다. 외부 호출이 모두 끝난 뒤 DB 쓰기가 시작된다.

```bash
python3 scripts/catalog_guides.py --mode generate-upsert --batch-size 15 --workers 2
```

결과와 매핑 보고서는 기본적으로 Git에서 제외된 아래 경로에 생성된다.

```text
backend/data/catalog-guides/mapping-report.json
backend/data/catalog-guides/products/{productId}.json
```

## DB 쓰기 계약

스크립트는 스키마를 만들거나 수정하지 않는다. 다음 컬럼을 가진 `product_catalog_content` 테이블이 먼저 준비되어 있어야 한다.

```text
product_id
summary
routine_step
usage_type
usage_timing_json
usage_tips_json          # usageInstructions 배열 저장
observation_points_json  # highlights 배열 저장
origin                 # AI_GENERATED | EDITORIAL
generated_at
```

테이블이나 컬럼이 다르면 쓰기 전에 중단한다. 제품별 입력 해시는 재시작용 결과 파일에 보존하고 서비스 테이블에는 넣지 않는다.

## 검증

```bash
python3 -m unittest scripts/test_catalog_guides.py
```

테스트는 카테고리 46/46 매핑, 전체 편집 규칙 계약, 금지 문구, 누락·중복·초과 ID 대체, SQLite upsert 계약을 확인한다.
