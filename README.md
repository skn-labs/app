<div align="center">

<img src="./assets/프로젝트 이미지 (썸네일).png" alt="SKN — 매일의 경험이 나만의 기준이 되도록" width="100%" />

# SKN

**매번 새로 사는데, 매번 처음이라면 — AI가 내 스킨케어 경험을 나만의 기준으로.**

스킨케어 헤비유저를 위한 AI 경험 아카이브

[서비스 체험](https://skn.today) · [제품 요구사항](./docs/04-requirements/README.md) · [API](https://skn-labs.github.io/app/api/) · [데이터 모델](./docs/06-data-model/README.md)

</div>

## 무엇을 해결하나요?

새 제품을 계속 탐색해도 실제로 어떤 조합에서 무엇을 느꼈는지는 쉽게 흩어집니다. SKN은 써본 제품, 당시의 루틴과 사용 시점, 내 말로 남긴 경험을 연결해 보존합니다. AI는 그 기록에서 반복되는 표현과 반대 기록을 함께 찾아 다음 제품을 살펴볼 때 다시 보여줍니다.

```text
제품 탐색 → 실제 사용 → 경험 기록 → 과거 기록 연결 → 내 기준 발견
    ↑                                                ↓
    └──────────────── 다음 탐색에 재사용 ────────────┘
```

## 현재 구현

- 2,654개 제품 카탈로그 탐색과 내 화장품 관리
- 제품 순서와 시점을 보존하는 루틴 버전 관리
- 만족·아쉬움·모름, 불편 여부와 자유 원문 기록
- 근거와 반대 기록을 함께 보여주는 개인 패턴
- 개인 기록과 확인된 제품 정보를 구분하는 AI 채팅과 Rescue
- 온보딩, 알림, 기록 아카이브와 모바일·데스크톱 반응형 UI

AI는 진단하거나 제품의 적합성을 확정하지 않습니다. 사용자가 적용하기 전에는 루틴이나 개인 사실을 바꾸지 않으며, 서버가 데이터 소유권과 실제 근거 참조를 검증합니다.

## 기술 구성

| 영역 | 구성 |
| --- | --- |
| Web | React 19 · TypeScript · Vite · TanStack Query |
| API | Java 17 · Spring Boot · SQLite |
| AI | OpenAI Responses API · 웹 검색 · 근거 참조 검증 |
| 운영 | Vercel · OCI · GitHub Actions |

## 저장소

| 경로 | 역할 |
| --- | --- |
| [`frontend/`](./frontend) | 실제 웹 앱 |
| [`backend/`](./backend) | API, 도메인 규칙과 SQLite schema |
| [`docs/`](./docs/README.md) | 제품·API·데이터 계약 |
| [`deploy/oci/`](./deploy/oci) | 운영 배포와 멱등 migration |
| [`assets/`](./assets) | 브랜드 원본 애셋 |

로컬에서는 `frontend` 의존성을 설치한 뒤 통합 개발 스크립트를 실행합니다.

```bash
cd frontend && npm ci && cd ..
./scripts/dev.sh
```

웹은 `http://127.0.0.1:5173`, API는 `http://127.0.0.1:8080`에서 열립니다. 구현 작업 전에는 [AGENTS.md](./AGENTS.md)의 제품 경계와 변경 규칙을 먼저 확인합니다.
