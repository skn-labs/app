# 문서 안내

| 순서 | 문서 | 역할 |
| --- | --- | --- |
| 0 | [제품 브리프](./01-product-brief.md) | 문제·해법·차별성·검증 가설 |
| 1 | [요구사항](./04-requirements/README.md) | 구현과 무관하게 지킬 제품 의무 |
| 2 | [협업 흐름](./02-collaboration-workflow.md) | 기획·개발·디자인이 갱신되는 방식 |
| 3 | [작업 계획](./03-delivery-plan.md) | P0·P1·P2와 GitHub Task 순서 |
| 4 | [GitHub Feature](https://github.com/orgs/skn-labs/projects/2) | 기능 흐름·분기·오류·완료 조건의 원본 |
| 5 | [OpenAPI](./api/openapi.yaml) | 프론트엔드와 서버 계약 |
| 6 | [데이터 모델](./06-data-model/README.md) | 경험·근거·AI 실행을 저장하는 규칙 |
| 7 | [AI 프롬프트](./ai/README.md) | AI 모드·근거 경계·동적 후속 입력 계약 |
| 8 | [백엔드 배포](./deployment.md) | OCI 배포 구조·공개 URL·헬스체크·비밀정보 경계 |

보조 문서는 [제품 규칙](./product/product-rules.md), [앱 내비게이션과 화면 역할](./product/navigation-model.md), [근거와 가정](./evidence/README.md), [요구사항 추적표](./04-requirements/traceability.md)다.

사용자가 실제로 보는 흐름은 [프로토타입](https://skn-labs.github.io/app/prototype/)을 우선한다. 제품 의미는 브리프와 요구사항, 기능 분기는 GitHub Feature, API 필드는 OpenAPI, 저장 무결성은 데이터 모델을 따른다. 충돌을 발견하면 관련 Feature에서 결정을 기록하고 모든 계약을 함께 고친다.
