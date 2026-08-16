# 과거 구현 우선순위와 Task

> 2026년 8월 초기 일정 기록이다. 현재 완료 상태나 다음 작업의 기준으로 사용하지 않는다. 현재 구현과 요구사항은 루트 `AGENTS.md`와 `docs/README.md`를 따른다.

## P0 · 8월 7일~20일

P0는 화면 수가 아니라 아래 순환이 실제 데이터로 한 번 닫히는 범위다.

```text
제품 탐색 → 사용 맥락 저장 → 경험 기록 → 패턴 생성 → 다음 탐색에서 재사용
                                      ↘ 불편하면 Rescue
```

| 순서 | Task | 완료 결과 | 선행 |
| --- | --- | --- | --- |
| 1 | [#187 개인 경험 SQLite 무결성 구현](https://github.com/skn-labs/app/issues/187) | 사용자·제품·루틴·경험·패턴 소유권과 불변식 보장 | 없음 |
| 2 | [#188 시연 제품 카탈로그 구축](https://github.com/skn-labs/app/issues/188) | 30~50개 제품을 실제 버전으로 선택 가능 | 없음 |
| 3 | [#166 계정·데이터 삭제 구현](https://github.com/skn-labs/app/issues/166) | 공개 사용자의 기록이 분리되고 삭제 가능 | #187 |
| 4 | [#167 제품 검색·내 화장품 구현](https://github.com/skn-labs/app/issues/167) | 검색·직접 이름으로 제품 등록 | #188 |
| 5 | [#171 루틴·사용 맥락 버전 구현](https://github.com/skn-labs/app/issues/171) | 제품·시간대·순서·빈도와 회고 due 저장 | #167, #187 |
| 6 | [#173 사용 경험 기록·7일 회고 구현](https://github.com/skn-labs/app/issues/173) | 만족·아쉬움·모름·원문·불편을 분리 저장 | #171 |
| 7 | [#180 AI 구조화·근거 참조 검증 구현](https://github.com/skn-labs/app/issues/180) | AI 출력이 실제 개인 기록과 제품 근거만 참조 | #187 |
| 8 | [#177 경험 기록·제품 연결 이력 구현](https://github.com/skn-labs/app/issues/177) | 시간순 경험과 제품별 원문을 조회 | #173 |
| 9 | [#178 경험 중심 홈·패턴 구현](https://github.com/skn-labs/app/issues/178) | 현재 경험·새 패턴·빠른 기록·다음 탐색 노출 | #173, #177, #180 |
| 10 | [#169 AI 제품 비교·공통 채팅 구현](https://github.com/skn-labs/app/issues/169) | 과거 평가·태그가 새 제품 비교에 근거로 재사용 | #167, #178, #180 |
| 11 | [#175 불편 기록·Rescue 대화 구현](https://github.com/skn-labs/app/issues/175) | 저장된 불편 기록에서 변경 확인까지 같은 채팅으로 연결 | #171, #173 |
| 12 | [#176 Rescue 다음 루틴 적용 구현](https://github.com/skn-labs/app/issues/176) | 승인한 제안만 독립된 새 루틴으로 적용 | #175 |

## P1 · P0 순환 확인 뒤

| Task | 결과 | 착수 신호 |
| --- | --- | --- |
| [#186 제품 근거 snapshot 구축](https://github.com/skn-labs/app/issues/186) | 공식 제품 사실을 재현 가능하게 보존 | P0 제품 비교에 근거 부족이 반복됨 |
| [#179 AI 비동기 실행 구현](https://github.com/skn-labs/app/issues/179) | 재시도·lease·실행 이력 | 응답 시간이 사용자 흐름을 막음 |
| [#189 제품·패턴 후속 채팅 강화](https://github.com/skn-labs/app/issues/189) | 같은 snapshot으로 후속 질문 | 결과 뒤 질문 행동이 반복됨 |
| [#190 회고·AI 작업 앱 안 알림](https://github.com/skn-labs/app/issues/190) | due와 작업 완료 복귀 | 홈만으로 기록 회수가 부족함 |
| [#191 제품별 경험 상세 구현](https://github.com/skn-labs/app/issues/191) | 제품에서 모든 원문·루틴 조회 | 제품별 기억 복원 요구가 반복됨 |
| [#192 반복 Rescue·외부 근거 연동](https://github.com/skn-labs/app/issues/192) | 과거 불편과 근거 snapshot 재사용 | 변경 사실만으로 설명이 부족함 |
| [#172 AI 루틴 순서·제품 설명](https://github.com/skn-labs/app/issues/172) | 사용자가 승인하는 배치 제안 | 루틴 입력 직후 도움 요구가 반복됨 |
| [#174 조기 기록·회고 알림 보강](https://github.com/skn-labs/app/issues/174) | due 전 기록 회수와 실제 사용 차이 | 회고 시점 전에 루틴 변경이 잦음 |

## P2 · 편의 확장

| Task | 결과 |
| --- | --- |
| [#165 선택형 온보딩·범용 AI 기억](https://github.com/skn-labs/app/issues/165) | 실제 경험 밖의 약한 개인 맥락 관리 |
| [#168 영수증 OCR](https://github.com/skn-labs/app/issues/168) | 여러 제품 등록 편의 |
| [#170 광범위 제품 후보 탐색](https://github.com/skn-labs/app/issues/170) | 전체 카탈로그에서 새 후보 검색 |

P0가 끝나기 전 P1·P2를 `Ready`로 옮기지 않는다. 날짜는 착수 우선순위이며 병렬 작업은 계약 선행 조건을 지킨다.
