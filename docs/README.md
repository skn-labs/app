# 문서 안내

SKN의 현재 제품·API·데이터 계약만 아래 순서로 사용한다. GitHub Issues와 Projects, 과거 기획 자료는 명세 원본이 아니다.

| 순서 | 문서 | 역할 |
| --- | --- | --- |
| 1 | [제품 브리프](./01-product-brief.md) | 문제, 핵심 순환과 검증 가설 |
| 2 | [기능별 요구사항](./04-requirements/README.md) | 사용자 결과, 예외와 완료 조건 |
| 3 | [제품 규칙](./product/product-rules.md) | 용어, AI·의료·데이터 경계 |
| 4 | [내비게이션 모델](./product/navigation-model.md) | 실제 화면별 책임 |
| 5 | [OpenAPI](./api/openapi.yaml) | 프론트엔드와 서버 계약 |
| 6 | [데이터 모델](./06-data-model/README.md) | 저장 의미, 제약과 AI 근거 |
| 7 | [AI 프롬프트](./ai/README.md) | 모드, 근거와 실패 처리 |
| 8 | [백엔드 배포](./deployment.md) | OCI 배포, migration과 복구 |

화면은 실제 `frontend/src`, 서버 동작은 `backend/src`와 자동화 테스트가 구현 근거다. 제품 결정이 바뀌면 관련 요구사항과 계약 문서를 코드와 같은 변경에서 갱신한다.

`site/`, `deck/`, `docs/05-features/`와 과거 협업·일정 문서는 기획 과정의 참고 자료로만 보존한다.
