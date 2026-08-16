# 요구사항 추적표

| 우선순위 | 영역 | 요구사항 | 주요 API | 주요 데이터 |
| --- | --- | --- | --- | --- |
| P0 | 계정·데이터 경계 | ACC, SEC | `/api/v1/auth/*`, `/api/v1/me/skin-profile` | `app_user`, `user_onboarding`, `user_skin_profile` |
| P0 | 카탈로그·내 화장품 | PRD-01~02, CAT-01, CAT-05 | `/api/v1/products`, `/api/v1/me/products` | `product`, `product_catalog_content`, `product_source_fact`, `user_product` |
| P0 | AI 제품 탐색 | EXP-01~06 | `/api/v1/products/{id}`, `/api/v1/ai/conversations` | `product`, `conversation`, `conversation_message`, `conversation_message_source` |
| P0 | 루틴·사용 맥락 | RTN-01~05 | `/api/v1/me/routines` | `routine`, `routine_item` |
| P0 | 경험 기록·회고 | REC-01~08 | `/api/v1/me/experiences` | `experience_session`, `experience_record`, `comparison_baseline` |
| P0 | AI Rescue | RSC-01~08 | `/api/v1/ai/conversations/{id}/messages`, `/api/v1/ai/conversations/{id}/rescue/apply` | `conversation`, `conversation_message`, `rescue_plan` |
| P0 | 홈·기록·패턴 | HOME, HIS, PAT | `/api/v1/home`, `/api/v1/me/experience-records`, `/api/v1/me/patterns` | `experience_record`, `personal_pattern`, `pattern_evidence` |
| P0 | AI·보안·운영 | AI, OPS, SEC | 모든 P0 API | 세션 소유권 조건, `client_request_id`, `evidence_refs_json`, `conversation_message_source` |
| P1 | 경험 순환 강화 | CAT-02~03, PRD-03~04, EXP-07, RTN-06~07, REC-09, RSC-09~10, HIS-02, PAT-05, AI-05~06 | `/api/v1/me/notifications`, 관련 OpenAPI 참조 | `notification`, evidence_snapshot, ai_job |
| P2 | 입력·구매 편의 | ONB-01, MEM, PRD-05, CAT-04, EXP-08 | `/api/v1/auth/onboarding`, `/api/v1/me/skin-profile`, `/api/v1/me/preferences`, `/receipts`, `/wishlist` | `user_skin_profile`, `user_preference`, ai_memory, receipt, wishlist_item |

세부 operation과 schema는 [OpenAPI](../api/openapi.yaml), 컬럼과 제약은 [데이터 모델](../06-data-model/README.md)을 따른다.
