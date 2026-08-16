# SKN 프로젝트 맵

이 문서는 에이전트가 현재 구현 위치와 함께 바꿔야 할 계약을 빠르게 찾기 위한 길잡이다. 제품 결정의 원본은 사용자의 현재 요청, `docs/04-requirements`, `docs/product/product-rules.md`, OpenAPI와 데이터 모델이다.

## 현재 제품

- 라이브 웹: <https://skn.today>
- 핵심 순환: `제품 탐색 → 실제 루틴 사용 → 경험 기록 → 원본 기반 패턴 → 다음 탐색에 재사용`
- 주요 화면: 홈, 제품 탐색·상세, 내 화장품, 루틴, 경험 기록, 기록·패턴, 공통 AI 채팅, 알림
- 제품 경계: 7일은 기본 회고 시점이고 LAB은 시각적 은유다. AI는 진단·적합 판정·무승인 데이터 변경을 하지 않는다.

## 실제 구현 위치

| 작업 | 먼저 볼 곳 | 함께 바꿀 것 |
| --- | --- | --- |
| 화면·상호작용 | `frontend/src/pages`, `frontend/src/components`, `frontend/src/index.css` | 관련 요구사항, 접근성 상태, UI 테스트 |
| 프론트 데이터 | `frontend/src/lib/api.ts`, `frontend/src/lib/types.ts` | OpenAPI와 백엔드 응답 모델 |
| API·도메인 | `backend/src/main/java/app/skn` | OpenAPI, 통합 테스트 |
| 데이터 의미 | `backend/src/main/resources/schema.sql` | 데이터 모델 문서와 새 `deploy/oci/migrations/*.sql` |
| AI 동작 | `backend/src/main/resources/prompts`, `backend/src/main/java/app/skn/ai` | `docs/ai`, 제품 규칙, 실패 fallback |
| 브랜드 애셋 | `assets`, `frontend/public/skn-assets` | `insert-asset` skill과 애셋 카탈로그 |
| 운영 | `.github/workflows`, `deploy/oci`, `docs/deployment.md` | 백업·롤백·헬스 검증 |

## 변경 결합 규칙

- API 필드가 바뀌면 OpenAPI, Java 모델, 프론트 타입과 계약 테스트를 같은 변경으로 묶는다.
- 테이블·컬럼·제약이 바뀌면 `schema.sql`, DBML, 데이터 문서와 새 운영 migration을 함께 갱신한다.
- AI가 참조하는 개인 사실은 서버가 소유권과 실제 ID를 검증한다. 외부 호출은 SQLite 쓰기 트랜잭션 밖에서 한다.
- 화면은 로딩·빈 상태·실패·재시도·중복 제출까지 실제 API 상태로 완성한다.
- 운영 설정과 비밀값은 저장소에 넣지 않는다. 공개 저장소에는 인스턴스 식별정보와 사용자 기록을 남기지 않는다.

## 참고 자료 경계

- `site/`, `deck/`, `docs/05-features/`는 기획·발표 과정의 참고 자료다. 현재 제품 동작의 원본이 아니다.
- GitHub Issues와 Projects, 로컬 브랜치와 stash는 작업 이력일 뿐 기능명세 원본이 아니다.
- Figma는 시각 근거로만 사용한다. 서버 상태 전이와 데이터 의미는 저장소 계약이 결정한다.
- 실제 제품 코드는 `frontend/src`와 `backend/src`다. 참고 자료를 고쳐 운영 UI를 대신하지 않는다.

## 빠른 검증

```bash
cd frontend && npm run lint && npm run build && npx vitest run
cd ../backend && ./gradlew test bootJar
```

배포 DB 변경은 새 SQLite에서 schema와 migration을 처음부터 적용하고, 멱등 재실행과 외래키·무결성을 확인한다.
