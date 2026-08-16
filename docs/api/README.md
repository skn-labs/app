# API 계약

- 원본: [openapi.yaml](./openapi.yaml)
- 사람이 보는 문서: [GitHub Pages Redoc](https://skn-labs.github.io/app/api/)

OpenAPI는 현재 Spring Boot 구현이 실제로 제공하는 P0 계약이다. API를 바꾸면 같은 변경에서 이 파일과 통합 테스트를 함께 고친다.

## 공통 규칙

- 기준 URL은 `/api/v1`이다.
- 인증 API를 제외하고 발급 후 30일에 절대 만료되는 `HttpOnly` 액세스 토큰 쿠키가 필요하다. 리프레시 토큰은 없다.
- 루틴 교체는 `Idempotency-Key` 헤더를, 경험·대화·Rescue 쓰기는 body의 `clientRequestId`를 사용한다.
- AI 답변은 현재 요청에서 동기로 반환한다. 공급자 오류가 나면 사용자 입력을 보존하고 요청 모드의 저장된 도메인 데이터로 직접 답한다.
- 오류는 `application/problem+json`과 안정적인 `code`를 사용한다.
- 시각은 현재 SQLite의 UTC 문자열로 저장하며 프론트엔드가 표시 시각으로 변환한다.
- 화면 문구는 응답의 코드와 사실을 바탕으로 프론트엔드가 표현한다. API 문구 자체를 제품 규칙으로 사용하지 않는다.
