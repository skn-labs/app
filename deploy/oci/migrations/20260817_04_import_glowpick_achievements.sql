PRAGMA foreign_keys = ON;

-- 글로우픽의 공개 어워드 목록(2014~2026 상반기)을 2026-08-17에 대조했다.
-- 브랜드와 제품명이 카탈로그와 정확히 일치하는 수상 이력만 포함한다.
-- 2025~2026 21건을 포함한 총 165건이며 유사 이름·리뉴얼 추정 제품은 제외한다.
DELETE FROM product_achievement WHERE product_id = 1722 AND period_label = '2023 상반기' AND title = '글로우픽 어워드 1위';
DELETE FROM product_achievement
 WHERE source_label = '글로우픽'
   AND title IN (
       '2021 상반기 글로우픽 어워드 0위',
       '2020 글로우픽 어워드 0위'
   );

INSERT OR IGNORE INTO product_achievement(
    product_id, achievement_type, period_label, title, detail,
    source_label, source_url, checked_at, display_order
) VALUES
    (409, 'RANKING', '2026 상반기', '2026 상반기 글로우픽 어워드 2위', '클린뷰티 스킨케어 부문', '글로우픽', 'https://www.glowpick.com/awards/v2/37', '2026-08-17T00:00:00Z', 1),
    (654, 'RANKING', '2026 상반기', '2026 상반기 글로우픽 어워드 3위', '바디로션 부문', '글로우픽', 'https://www.glowpick.com/awards/v2/37', '2026-08-17T00:00:00Z', 1),
    (660, 'RANKING', '2026 상반기', '2026 상반기 글로우픽 어워드 1위', '보습로션 부문', '글로우픽', 'https://www.glowpick.com/awards/v2/37', '2026-08-17T00:00:00Z', 1),
    (674, 'RANKING', '2026 상반기', '2026 상반기 글로우픽 어워드 1위', '수분로션 부문', '글로우픽', 'https://www.glowpick.com/awards/v2/37', '2026-08-17T00:00:00Z', 1),
    (876, 'RANKING', '2026 상반기', '2026 상반기 글로우픽 어워드 1위', '수분크림 부문', '글로우픽', 'https://www.glowpick.com/awards/v2/37', '2026-08-17T00:00:00Z', 1),
    (19, 'RANKING', '2025', '2025 글로우픽 어워드 3위', '워터토너 부문', '글로우픽', 'https://www.glowpick.com/awards/v2/36', '2026-08-17T00:00:00Z', 10),
    (425, 'RANKING', '2025', '2025 글로우픽 어워드 3위', '진정에센스 부문', '글로우픽', 'https://www.glowpick.com/awards/v2/36', '2026-08-17T00:00:00Z', 10),
    (470, 'RANKING', '2025', '2025 글로우픽 어워드 1위', '수분에센스 부문', '글로우픽', 'https://www.glowpick.com/awards/v2/36', '2026-08-17T00:00:00Z', 10),
    (654, 'RANKING', '2025', '2025 글로우픽 어워드 1위', '바디로션 부문', '글로우픽', 'https://www.glowpick.com/awards/v2/36', '2026-08-17T00:00:00Z', 10),
    (660, 'RANKING', '2025', '2025 글로우픽 어워드 1위', '보습로션 부문', '글로우픽', 'https://www.glowpick.com/awards/v2/36', '2026-08-17T00:00:00Z', 10),
    (674, 'RANKING', '2025', '2025 글로우픽 어워드 1위', '수분로션 부문', '글로우픽', 'https://www.glowpick.com/awards/v2/36', '2026-08-17T00:00:00Z', 10),
    (907, 'RANKING', '2025', '2025 글로우픽 어워드 1위', '안티에이징크림 부문', '글로우픽', 'https://www.glowpick.com/awards/v2/36', '2026-08-17T00:00:00Z', 10),
    (2124, 'RANKING', '2025', '2025 글로우픽 어워드 1위', '수분마스크 부문', '글로우픽', 'https://www.glowpick.com/awards/v2/36', '2026-08-17T00:00:00Z', 10),
    (425, 'RANKING', '2025 상반기', '2025 상반기 글로우픽 어워드 2위', '진정에센스 부문', '글로우픽', 'https://www.glowpick.com/awards/v2/35', '2026-08-17T00:00:00Z', 11),
    (654, 'RANKING', '2025 상반기', '2025 상반기 글로우픽 어워드 2위', '바디로션 부문', '글로우픽', 'https://www.glowpick.com/awards/v2/35', '2026-08-17T00:00:00Z', 11),
    (660, 'RANKING', '2025 상반기', '2025 상반기 글로우픽 어워드 1위', '보습로션 부문', '글로우픽', 'https://www.glowpick.com/awards/v2/35', '2026-08-17T00:00:00Z', 11),
    (674, 'RANKING', '2025 상반기', '2025 상반기 글로우픽 어워드 1위', '수분로션 부문', '글로우픽', 'https://www.glowpick.com/awards/v2/35', '2026-08-17T00:00:00Z', 11),
    (808, 'RANKING', '2025 상반기', '2025 상반기 글로우픽 어워드 2위', '브라이트닝크림 부문', '글로우픽', 'https://www.glowpick.com/awards/v2/35', '2026-08-17T00:00:00Z', 11),
    (907, 'RANKING', '2025 상반기', '2025 상반기 글로우픽 어워드 1위', '안티에이징크림 부문', '글로우픽', 'https://www.glowpick.com/awards/v2/35', '2026-08-17T00:00:00Z', 11),
    (1056, 'RANKING', '2025 상반기', '2025 상반기 글로우픽 어워드 1위', '베이비 부문', '글로우픽', 'https://www.glowpick.com/awards/v2/35', '2026-08-17T00:00:00Z', 11),
    (2124, 'RANKING', '2025 상반기', '2025 상반기 글로우픽 어워드 1위', '수분마스크 부문', '글로우픽', 'https://www.glowpick.com/awards/v2/35', '2026-08-17T00:00:00Z', 11),
    (443, 'RANKING', '2024', '2024 글로우픽 어워드 1위', 'PDRN 부문', '글로우픽', 'https://www.glowpick.com/awards/v2/34', '2026-08-17T00:00:00Z', 20),
    (654, 'RANKING', '2024', '2024 글로우픽 어워드 1위', '바디로션 부문', '글로우픽', 'https://www.glowpick.com/awards/v2/34', '2026-08-17T00:00:00Z', 20),
    (660, 'RANKING', '2024', '2024 글로우픽 어워드 1위', '보습로션 부문', '글로우픽', 'https://www.glowpick.com/awards/v2/34', '2026-08-17T00:00:00Z', 20),
    (674, 'RANKING', '2024', '2024 글로우픽 어워드 2위', '수분로션 부문', '글로우픽', 'https://www.glowpick.com/awards/v2/34', '2026-08-17T00:00:00Z', 20),
    (808, 'RANKING', '2024', '2024 글로우픽 어워드 1위', '브라이트닝크림 부문', '글로우픽', 'https://www.glowpick.com/awards/v2/34', '2026-08-17T00:00:00Z', 20),
    (907, 'RANKING', '2024', '2024 글로우픽 어워드 1위', '안티에이징크림 부문', '글로우픽', 'https://www.glowpick.com/awards/v2/34', '2026-08-17T00:00:00Z', 20),
    (1056, 'RANKING', '2024', '2024 글로우픽 어워드 2위', '베이비 부문', '글로우픽', 'https://www.glowpick.com/awards/v2/34', '2026-08-17T00:00:00Z', 20),
    (1939, 'RANKING', '2024', '2024 글로우픽 어워드 3위', '안티에이징마스크 부문', '글로우픽', 'https://www.glowpick.com/awards/v2/34', '2026-08-17T00:00:00Z', 20),
    (2124, 'RANKING', '2024', '2024 글로우픽 어워드 1위', '수분마스크 부문', '글로우픽', 'https://www.glowpick.com/awards/v2/34', '2026-08-17T00:00:00Z', 20),
    (2149, 'RANKING', '2024', '2024 글로우픽 어워드 1위', '슬리핑팩 부문', '글로우픽', 'https://www.glowpick.com/awards/v2/34', '2026-08-17T00:00:00Z', 20),
    (409, 'RANKING', '2024 상반기', '2024 상반기 글로우픽 어워드 2위', '클린뷰티 스킨케어 부문', '글로우픽', 'https://www.glowpick.com/awards/v2/33', '2026-08-17T00:00:00Z', 21),
    (470, 'RANKING', '2024 상반기', '2024 상반기 글로우픽 어워드 2위', '수분에센스 부문', '글로우픽', 'https://www.glowpick.com/awards/v2/33', '2026-08-17T00:00:00Z', 21),
    (654, 'RANKING', '2024 상반기', '2024 상반기 글로우픽 어워드 1위', '바디로션 부문', '글로우픽', 'https://www.glowpick.com/awards/v2/33', '2026-08-17T00:00:00Z', 21),
    (674, 'RANKING', '2024 상반기', '2024 상반기 글로우픽 어워드 1위', '수분/트러블로션 부문', '글로우픽', 'https://www.glowpick.com/awards/v2/33', '2026-08-17T00:00:00Z', 21),
    (808, 'RANKING', '2024 상반기', '2024 상반기 글로우픽 어워드 1위', '브라이트닝크림 부문', '글로우픽', 'https://www.glowpick.com/awards/v2/33', '2026-08-17T00:00:00Z', 21),
    (891, 'RANKING', '2024 상반기', '2024 상반기 글로우픽 어워드 3위', '안티에이징크림 부문', '글로우픽', 'https://www.glowpick.com/awards/v2/33', '2026-08-17T00:00:00Z', 21),
    (1056, 'RANKING', '2024 상반기', '2024 상반기 글로우픽 어워드 1위', '베이비 부문', '글로우픽', 'https://www.glowpick.com/awards/v2/33', '2026-08-17T00:00:00Z', 21),
    (1150, 'RANKING', '2024 상반기', '2024 상반기 글로우픽 어워드 2위', '아이크림 부문', '글로우픽', 'https://www.glowpick.com/awards/v2/33', '2026-08-17T00:00:00Z', 21),
    (1939, 'RANKING', '2024 상반기', '2024 상반기 글로우픽 어워드 3위', '안티에이징마스크 부문', '글로우픽', 'https://www.glowpick.com/awards/v2/33', '2026-08-17T00:00:00Z', 21),
    (2124, 'RANKING', '2024 상반기', '2024 상반기 글로우픽 어워드 1위', '수분마스크 부문', '글로우픽', 'https://www.glowpick.com/awards/v2/33', '2026-08-17T00:00:00Z', 21),
    (2149, 'RANKING', '2024 상반기', '2024 상반기 글로우픽 어워드 2위', '슬리핑팩 부문', '글로우픽', 'https://www.glowpick.com/awards/v2/33', '2026-08-17T00:00:00Z', 21),
    (210, 'RANKING', '2023', '2023 글로우픽 어워드 2위', '안티에이징에센스 부문', '글로우픽', 'https://www.glowpick.com/awards/v2/32', '2026-08-17T00:00:00Z', 30),
    (654, 'RANKING', '2023', '2023 글로우픽 어워드 1위', '바디로션 부문', '글로우픽', 'https://www.glowpick.com/awards/v2/32', '2026-08-17T00:00:00Z', 30),
    (660, 'RANKING', '2023', '2023 글로우픽 어워드 1위', '보습로션 부문', '글로우픽', 'https://www.glowpick.com/awards/v2/32', '2026-08-17T00:00:00Z', 30),
    (674, 'RANKING', '2023', '2023 글로우픽 어워드 2위', '수분로션 부문', '글로우픽', 'https://www.glowpick.com/awards/v2/32', '2026-08-17T00:00:00Z', 30),
    (808, 'RANKING', '2023', '2023 글로우픽 어워드 2위', '브라이트닝크림 부문', '글로우픽', 'https://www.glowpick.com/awards/v2/32', '2026-08-17T00:00:00Z', 30),
    (941, 'RANKING', '2023', '2023 글로우픽 어워드 3위', '진정크림 부문', '글로우픽', 'https://www.glowpick.com/awards/v2/32', '2026-08-17T00:00:00Z', 30),
    (1056, 'RANKING', '2023', '2023 글로우픽 어워드 2위', '베이비 부문', '글로우픽', 'https://www.glowpick.com/awards/v2/32', '2026-08-17T00:00:00Z', 30),
    (1812, 'RANKING', '2023', '2023 글로우픽 어워드 2위', '톤업선크림 부문', '글로우픽', 'https://www.glowpick.com/awards/v2/32', '2026-08-17T00:00:00Z', 30),
    (1939, 'RANKING', '2023', '2023 글로우픽 어워드 2위', '안티에이징마스크 부문', '글로우픽', 'https://www.glowpick.com/awards/v2/32', '2026-08-17T00:00:00Z', 30),
    (2124, 'RANKING', '2023', '2023 글로우픽 어워드 2위', '수분마스크 부문', '글로우픽', 'https://www.glowpick.com/awards/v2/32', '2026-08-17T00:00:00Z', 30),
    (2149, 'RANKING', '2023', '2023 글로우픽 어워드 2위', '슬리핑팩 부문', '글로우픽', 'https://www.glowpick.com/awards/v2/32', '2026-08-17T00:00:00Z', 30),
    (2176, 'RANKING', '2023', '2023 글로우픽 어워드 1위', '워시오프팩 부문', '글로우픽', 'https://www.glowpick.com/awards/v2/32', '2026-08-17T00:00:00Z', 30),
    (72, 'RANKING', '2023 상반기', '2023 상반기 글로우픽 어워드 2위', '토너패드 부문', '글로우픽', 'https://www.glowpick.com/awards/v2/31', '2026-08-17T00:00:00Z', 31),
    (210, 'RANKING', '2023 상반기', '2023 상반기 글로우픽 어워드 1위', '안티에이징에센스 부문', '글로우픽', 'https://www.glowpick.com/awards/v2/31', '2026-08-17T00:00:00Z', 31),
    (409, 'RANKING', '2023 상반기', '2023 상반기 글로우픽 어워드 3위', '클린뷰티 스킨케어 부문', '글로우픽', 'https://www.glowpick.com/awards/v2/31', '2026-08-17T00:00:00Z', 31),
    (654, 'RANKING', '2023 상반기', '2023 상반기 글로우픽 어워드 1위', '바디로션 부문', '글로우픽', 'https://www.glowpick.com/awards/v2/31', '2026-08-17T00:00:00Z', 31),
    (660, 'RANKING', '2023 상반기', '2023 상반기 글로우픽 어워드 1위', '보습로션 부문', '글로우픽', 'https://www.glowpick.com/awards/v2/31', '2026-08-17T00:00:00Z', 31),
    (674, 'RANKING', '2023 상반기', '2023 상반기 글로우픽 어워드 1위', '수분로션 부문', '글로우픽', 'https://www.glowpick.com/awards/v2/31', '2026-08-17T00:00:00Z', 31),
    (682, 'RANKING', '2023 상반기', '2023 상반기 글로우픽 어워드 3위', '진정로션 부문', '글로우픽', 'https://www.glowpick.com/awards/v2/31', '2026-08-17T00:00:00Z', 31),
    (808, 'RANKING', '2023 상반기', '2023 상반기 글로우픽 어워드 3위', '브라이트닝크림 부문', '글로우픽', 'https://www.glowpick.com/awards/v2/31', '2026-08-17T00:00:00Z', 31),
    (822, 'RANKING', '2023 상반기', '2023 상반기 글로우픽 어워드 2위', '진정크림 부문', '글로우픽', 'https://www.glowpick.com/awards/v2/31', '2026-08-17T00:00:00Z', 31),
    (891, 'RANKING', '2023 상반기', '2023 상반기 글로우픽 어워드 2위', '클린뷰티 스킨케어 부문', '글로우픽', 'https://www.glowpick.com/awards/v2/31', '2026-08-17T00:00:00Z', 31),
    (941, 'RANKING', '2023 상반기', '2023 상반기 글로우픽 어워드 1위', '진정크림 부문', '글로우픽', 'https://www.glowpick.com/awards/v2/31', '2026-08-17T00:00:00Z', 31),
    (1056, 'RANKING', '2023 상반기', '2023 상반기 글로우픽 어워드 1위', '베이비 부문', '글로우픽', 'https://www.glowpick.com/awards/v2/31', '2026-08-17T00:00:00Z', 31),
    (1722, 'RANKING', '2023 상반기', '2023 상반기 글로우픽 어워드 1위', '마일드선크림 부문', '글로우픽', 'https://www.glowpick.com/awards/v2/31', '2026-08-17T00:00:00Z', 31),
    (1812, 'RANKING', '2023 상반기', '2023 상반기 글로우픽 어워드 2위', '톤업선크림 부문', '글로우픽', 'https://www.glowpick.com/awards/v2/31', '2026-08-17T00:00:00Z', 31),
    (1939, 'RANKING', '2023 상반기', '2023 상반기 글로우픽 어워드 1위', '안티에이징마스크 부문', '글로우픽', 'https://www.glowpick.com/awards/v2/31', '2026-08-17T00:00:00Z', 31),
    (2124, 'RANKING', '2023 상반기', '2023 상반기 글로우픽 어워드 3위', '수분마스크 부문', '글로우픽', 'https://www.glowpick.com/awards/v2/31', '2026-08-17T00:00:00Z', 31),
    (2149, 'RANKING', '2023 상반기', '2023 상반기 글로우픽 어워드 2위', '슬리핑팩 부문', '글로우픽', 'https://www.glowpick.com/awards/v2/31', '2026-08-17T00:00:00Z', 31),
    (2176, 'RANKING', '2023 상반기', '2023 상반기 글로우픽 어워드 2위', '워시오프팩 부문', '글로우픽', 'https://www.glowpick.com/awards/v2/31', '2026-08-17T00:00:00Z', 31),
    (72, 'RANKING', '2022', '2022 글로우픽 어워드 2위', '클린뷰티 스킨케어 부문', '글로우픽', 'https://www.glowpick.com/awards/v2/30', '2026-08-17T00:00:00Z', 40),
    (654, 'RANKING', '2022', '2022 글로우픽 어워드 1위', '바디로션 부문', '글로우픽', 'https://www.glowpick.com/awards/v2/30', '2026-08-17T00:00:00Z', 40),
    (660, 'RANKING', '2022', '2022 글로우픽 어워드 1위', '보습로션 부문', '글로우픽', 'https://www.glowpick.com/awards/v2/30', '2026-08-17T00:00:00Z', 40),
    (674, 'RANKING', '2022', '2022 글로우픽 어워드 3위', '수분로션 부문', '글로우픽', 'https://www.glowpick.com/awards/v2/30', '2026-08-17T00:00:00Z', 40),
    (808, 'RANKING', '2022', '2022 글로우픽 어워드 3위', '브라이트닝크림 부문', '글로우픽', 'https://www.glowpick.com/awards/v2/30', '2026-08-17T00:00:00Z', 40),
    (907, 'RANKING', '2022', '2022 글로우픽 어워드 3위', '안티에이징크림 부문', '글로우픽', 'https://www.glowpick.com/awards/v2/30', '2026-08-17T00:00:00Z', 40),
    (1056, 'RANKING', '2022', '2022 글로우픽 어워드 2위', '베이비 부문', '글로우픽', 'https://www.glowpick.com/awards/v2/30', '2026-08-17T00:00:00Z', 40),
    (1150, 'RANKING', '2022', '2022 글로우픽 어워드 1위', '아이크림 부문', '글로우픽', 'https://www.glowpick.com/awards/v2/30', '2026-08-17T00:00:00Z', 40),
    (1939, 'RANKING', '2022', '2022 글로우픽 어워드 3위', '안티에이징마스크 부문', '글로우픽', 'https://www.glowpick.com/awards/v2/30', '2026-08-17T00:00:00Z', 40),
    (2124, 'RANKING', '2022', '2022 글로우픽 어워드 1위', '수분마스크 부문', '글로우픽', 'https://www.glowpick.com/awards/v2/30', '2026-08-17T00:00:00Z', 40),
    (2149, 'RANKING', '2022', '2022 글로우픽 어워드 2위', '슬리핑팩 부문', '글로우픽', 'https://www.glowpick.com/awards/v2/30', '2026-08-17T00:00:00Z', 40),
    (2176, 'RANKING', '2022', '2022 글로우픽 어워드 1위', '워시오프팩 부문', '글로우픽', 'https://www.glowpick.com/awards/v2/30', '2026-08-17T00:00:00Z', 40),
    (72, 'RANKING', '2022 상반기', '2022 상반기 글로우픽 어워드 2위', '토너패드 부문', '글로우픽', 'https://www.glowpick.com/awards/v2/29', '2026-08-17T00:00:00Z', 41),
    (654, 'RANKING', '2022 상반기', '2022 상반기 글로우픽 어워드 1위', '바디로션 부문', '글로우픽', 'https://www.glowpick.com/awards/v2/29', '2026-08-17T00:00:00Z', 41),
    (660, 'RANKING', '2022 상반기', '2022 상반기 글로우픽 어워드 1위', '보습로션 부문', '글로우픽', 'https://www.glowpick.com/awards/v2/29', '2026-08-17T00:00:00Z', 41),
    (674, 'RANKING', '2022 상반기', '2022 상반기 글로우픽 어워드 1위', '수분로션 부문', '글로우픽', 'https://www.glowpick.com/awards/v2/29', '2026-08-17T00:00:00Z', 41),
    (875, 'RANKING', '2022 상반기', '2022 상반기 글로우픽 어워드 2위', '진정크림 부문', '글로우픽', 'https://www.glowpick.com/awards/v2/29', '2026-08-17T00:00:00Z', 41),
    (907, 'RANKING', '2022 상반기', '2022 상반기 글로우픽 어워드 1위', '안티에이징크림 부문', '글로우픽', 'https://www.glowpick.com/awards/v2/29', '2026-08-17T00:00:00Z', 41),
    (1150, 'RANKING', '2022 상반기', '2022 상반기 글로우픽 어워드 2위', '아이크림 부문', '글로우픽', 'https://www.glowpick.com/awards/v2/29', '2026-08-17T00:00:00Z', 41),
    (2149, 'RANKING', '2022 상반기', '2022 상반기 글로우픽 어워드 3위', '슬리핑팩 부문', '글로우픽', 'https://www.glowpick.com/awards/v2/29', '2026-08-17T00:00:00Z', 41),
    (2176, 'RANKING', '2022 상반기', '2022 상반기 글로우픽 어워드 1위', '워시오프팩 부문', '글로우픽', 'https://www.glowpick.com/awards/v2/29', '2026-08-17T00:00:00Z', 41),
    (470, 'RANKING', '2021', '2021 글로우픽 어워드 2위', '수분에센스 부문', '글로우픽', 'https://www.glowpick.com/awards/v2/25', '2026-08-17T00:00:00Z', 50),
    (475, 'RANKING', '2021', '2021 글로우픽 어워드 3위', '수분에센스 부문', '글로우픽', 'https://www.glowpick.com/awards/v2/25', '2026-08-17T00:00:00Z', 50),
    (654, 'RANKING', '2021', '2021 글로우픽 어워드 1위', '바디로션 부문', '글로우픽', 'https://www.glowpick.com/awards/v2/25', '2026-08-17T00:00:00Z', 50),
    (660, 'RANKING', '2021', '2021 글로우픽 어워드 1위', '보습로션 부문', '글로우픽', 'https://www.glowpick.com/awards/v2/25', '2026-08-17T00:00:00Z', 50),
    (875, 'RANKING', '2021', '2021 글로우픽 어워드 1위', '진정크림 부문', '글로우픽', 'https://www.glowpick.com/awards/v2/25', '2026-08-17T00:00:00Z', 50),
    (907, 'RANKING', '2021', '2021 글로우픽 어워드 1위', '안티에이징크림 부문', '글로우픽', 'https://www.glowpick.com/awards/v2/25', '2026-08-17T00:00:00Z', 50),
    (928, 'RANKING', '2021', '2021 글로우픽 어워드 3위', '안티에이징크림 부문', '글로우픽', 'https://www.glowpick.com/awards/v2/25', '2026-08-17T00:00:00Z', 50),
    (1722, 'RANKING', '2021', '2021 글로우픽 어워드 1위', '마일드선크림 부문', '글로우픽', 'https://www.glowpick.com/awards/v2/25', '2026-08-17T00:00:00Z', 50),
    (2176, 'RANKING', '2021', '2021 글로우픽 어워드 1위', '워시오프팩 부문', '글로우픽', 'https://www.glowpick.com/awards/v2/25', '2026-08-17T00:00:00Z', 50),
    (15, 'RANKING', '2021 상반기', '2021 상반기 글로우픽 어워드 2위', '워터토너 부문', '글로우픽', 'https://www.glowpick.com/awards/v2/24', '2026-08-17T00:00:00Z', 51),
    (470, 'RANKING', '2021 상반기', '2021 상반기 글로우픽 어워드 2위', '수분에센스 부문', '글로우픽', 'https://www.glowpick.com/awards/v2/24', '2026-08-17T00:00:00Z', 51),
    (475, 'AWARD', '2021 상반기', '2021 상반기 글로우픽 어워드 선정', '에센스/세럼 부문', '글로우픽', 'https://www.glowpick.com/awards/v2/24', '2026-08-17T00:00:00Z', 51),
    (654, 'RANKING', '2021 상반기', '2021 상반기 글로우픽 어워드 1위', '바디로션 부문', '글로우픽', 'https://www.glowpick.com/awards/v2/24', '2026-08-17T00:00:00Z', 51),
    (660, 'RANKING', '2021 상반기', '2021 상반기 글로우픽 어워드 1위', '보습로션 부문', '글로우픽', 'https://www.glowpick.com/awards/v2/24', '2026-08-17T00:00:00Z', 51),
    (674, 'RANKING', '2021 상반기', '2021 상반기 글로우픽 어워드 2위', '수분로션 부문', '글로우픽', 'https://www.glowpick.com/awards/v2/24', '2026-08-17T00:00:00Z', 51),
    (928, 'RANKING', '2021 상반기', '2021 상반기 글로우픽 어워드 2위', '안티에이징크림 부문', '글로우픽', 'https://www.glowpick.com/awards/v2/24', '2026-08-17T00:00:00Z', 51),
    (1056, 'RANKING', '2021 상반기', '2021 상반기 글로우픽 어워드 1위', '베이비 부문', '글로우픽', 'https://www.glowpick.com/awards/v2/24', '2026-08-17T00:00:00Z', 51),
    (1722, 'AWARD', '2021 상반기', '2021 상반기 글로우픽 어워드 선정', '선크림 부문', '글로우픽', 'https://www.glowpick.com/awards/v2/24', '2026-08-17T00:00:00Z', 51),
    (1766, 'RANKING', '2021 상반기', '2021 상반기 글로우픽 어워드 1위', '톤업선크림 부문', '글로우픽', 'https://www.glowpick.com/awards/v2/24', '2026-08-17T00:00:00Z', 51),
    (1898, 'RANKING', '2021 상반기', '2021 상반기 글로우픽 어워드 2위', '마일드선크림 부문', '글로우픽', 'https://www.glowpick.com/awards/v2/24', '2026-08-17T00:00:00Z', 51),
    (2176, 'RANKING', '2021 상반기', '2021 상반기 글로우픽 어워드 2위', '워시오프팩 부문', '글로우픽', 'https://www.glowpick.com/awards/v2/24', '2026-08-17T00:00:00Z', 51),
    (12, 'RANKING', '2020', '2020 글로우픽 어워드 1위', '워터토너 부문', '글로우픽', 'https://www.glowpick.com/awards/v2/23', '2026-08-17T00:00:00Z', 60),
    (56, 'RANKING', '2020', '2020 글로우픽 어워드 2위', '토너패드 부문', '글로우픽', 'https://www.glowpick.com/awards/v2/23', '2026-08-17T00:00:00Z', 60),
    (409, 'RANKING', '2020', '2020 글로우픽 어워드 1위', '수분에센스 부문', '글로우픽', 'https://www.glowpick.com/awards/v2/23', '2026-08-17T00:00:00Z', 60),
    (475, 'RANKING', '2020', '2020 글로우픽 어워드 2위', '수분에센스 부문', '글로우픽', 'https://www.glowpick.com/awards/v2/23', '2026-08-17T00:00:00Z', 60),
    (654, 'RANKING', '2020', '2020 글로우픽 어워드 1위', '바디로션 부문', '글로우픽', 'https://www.glowpick.com/awards/v2/23', '2026-08-17T00:00:00Z', 60),
    (660, 'RANKING', '2020', '2020 글로우픽 어워드 1위', '보습로션 부문', '글로우픽', 'https://www.glowpick.com/awards/v2/23', '2026-08-17T00:00:00Z', 60),
    (833, 'RANKING', '2020', '2020 글로우픽 어워드 2위', '보습크림 부문', '글로우픽', 'https://www.glowpick.com/awards/v2/23', '2026-08-17T00:00:00Z', 60),
    (928, 'RANKING', '2020', '2020 글로우픽 어워드 1위', '안티에이징크림 부문', '글로우픽', 'https://www.glowpick.com/awards/v2/23', '2026-08-17T00:00:00Z', 60),
    (941, 'AWARD', '2020', '2020 글로우픽 어워드 선정', '크림 부문', '글로우픽', 'https://www.glowpick.com/awards/v2/23', '2026-08-17T00:00:00Z', 60),
    (992, 'RANKING', '2020', '2020 글로우픽 어워드 2위', '브라이트닝크림 부문', '글로우픽', 'https://www.glowpick.com/awards/v2/23', '2026-08-17T00:00:00Z', 60),
    (1056, 'RANKING', '2020', '2020 글로우픽 어워드 1위', '베이비 부문', '글로우픽', 'https://www.glowpick.com/awards/v2/23', '2026-08-17T00:00:00Z', 60),
    (1587, 'RANKING', '2020', '2020 글로우픽 어워드 3위', '토너패드 부문', '글로우픽', 'https://www.glowpick.com/awards/v2/23', '2026-08-17T00:00:00Z', 60),
    (1898, 'RANKING', '2020', '2020 글로우픽 어워드 2위', '마일드선크림 부문', '글로우픽', 'https://www.glowpick.com/awards/v2/23', '2026-08-17T00:00:00Z', 60),
    (2146, 'RANKING', '2020', '2020 글로우픽 어워드 3위', '슬리핑팩 부문', '글로우픽', 'https://www.glowpick.com/awards/v2/23', '2026-08-17T00:00:00Z', 60),
    (409, 'RANKING', '2020 상반기', '2020 상반기 글로우픽 어워드 1위', '수분에센스 부문', '글로우픽', 'https://www.glowpick.com/awards/v2/22', '2026-08-17T00:00:00Z', 61),
    (654, 'RANKING', '2020 상반기', '2020 상반기 글로우픽 어워드 2위', '바디로션 부문', '글로우픽', 'https://www.glowpick.com/awards/v2/22', '2026-08-17T00:00:00Z', 61),
    (660, 'RANKING', '2020 상반기', '2020 상반기 글로우픽 어워드 1위', '보습로션 부문', '글로우픽', 'https://www.glowpick.com/awards/v2/22', '2026-08-17T00:00:00Z', 61),
    (674, 'RANKING', '2020 상반기', '2020 상반기 글로우픽 어워드 2위', '수분로션 부문', '글로우픽', 'https://www.glowpick.com/awards/v2/22', '2026-08-17T00:00:00Z', 61),
    (822, 'RANKING', '2020 상반기', '2020 상반기 글로우픽 어워드 2위', '수분크림 부문', '글로우픽', 'https://www.glowpick.com/awards/v2/22', '2026-08-17T00:00:00Z', 61),
    (928, 'RANKING', '2020 상반기', '2020 상반기 글로우픽 어워드 1위', '안티에이징크림 부문', '글로우픽', 'https://www.glowpick.com/awards/v2/22', '2026-08-17T00:00:00Z', 61),
    (992, 'RANKING', '2020 상반기', '2020 상반기 글로우픽 어워드 2위', '브라이트닝/진정크림 부문', '글로우픽', 'https://www.glowpick.com/awards/v2/22', '2026-08-17T00:00:00Z', 61),
    (1056, 'RANKING', '2020 상반기', '2020 상반기 글로우픽 어워드 1위', '베이비 부문', '글로우픽', 'https://www.glowpick.com/awards/v2/22', '2026-08-17T00:00:00Z', 61),
    (2146, 'RANKING', '2020 상반기', '2020 상반기 글로우픽 어워드 3위', '슬리핑팩 부문', '글로우픽', 'https://www.glowpick.com/awards/v2/22', '2026-08-17T00:00:00Z', 61),
    (660, 'RANKING', '2019', '2019 글로우픽 컨슈머 뷰티 어워드 1위', '보습로션 부문', '글로우픽', 'https://www.glowpick.com/awards/v1/21', '2026-08-17T00:00:00Z', 70),
    (822, 'RANKING', '2019', '2019 글로우픽 컨슈머 뷰티 어워드 1위', '수분크림 부문', '글로우픽', 'https://www.glowpick.com/awards/v1/21', '2026-08-17T00:00:00Z', 70),
    (928, 'RANKING', '2019', '2019 글로우픽 컨슈머 뷰티 어워드 1위', '안티에이징크림 부문', '글로우픽', 'https://www.glowpick.com/awards/v1/21', '2026-08-17T00:00:00Z', 70),
    (660, 'RANKING', '2019 상반기', '2019 상반기 글로우픽 컨슈머 뷰티 어워드 1위', '로션 부문', '글로우픽', 'https://www.glowpick.com/awards/v1/20', '2026-08-17T00:00:00Z', 71),
    (928, 'RANKING', '2019 상반기', '2019 상반기 글로우픽 컨슈머 뷰티 어워드 1위', '링클케어 부문', '글로우픽', 'https://www.glowpick.com/awards/v1/20', '2026-08-17T00:00:00Z', 71),
    (1587, 'RANKING', '2019 상반기', '2019 상반기 글로우픽 컨슈머 뷰티 어워드 3위', '필링&보습패드 부문', '글로우픽', 'https://www.glowpick.com/awards/v1/20', '2026-08-17T00:00:00Z', 71),
    (56, 'RANKING', '2018', '2018 글로우픽 컨슈머 뷰티 어워드 2위', '필링&보습패드 부문', '글로우픽', 'https://www.glowpick.com/awards/v1/19', '2026-08-17T00:00:00Z', 80),
    (211, 'AWARD', '2018', '2018 글로우픽 컨슈머 뷰티 어워드 수상', 'ROOKIE OF THE YEAR 부문', '글로우픽', 'https://www.glowpick.com/awards/v1/19', '2026-08-17T00:00:00Z', 80),
    (654, 'RANKING', '2018', '2018 글로우픽 컨슈머 뷰티 어워드 3위', '바디로션 부문', '글로우픽', 'https://www.glowpick.com/awards/v1/19', '2026-08-17T00:00:00Z', 80),
    (822, 'RANKING', '2018', '2018 글로우픽 컨슈머 뷰티 어워드 2위', '트러블크림 부문', '글로우픽', 'https://www.glowpick.com/awards/v1/19', '2026-08-17T00:00:00Z', 80),
    (970, 'AWARD', '2018', '2018 글로우픽 컨슈머 뷰티 어워드 수상', 'ROOKIE OF THE YEAR 부문', '글로우픽', 'https://www.glowpick.com/awards/v1/19', '2026-08-17T00:00:00Z', 80),
    (2146, 'RANKING', '2018', '2018 글로우픽 컨슈머 뷰티 어워드 1위', '수면팩 부문', '글로우픽', 'https://www.glowpick.com/awards/v1/19', '2026-08-17T00:00:00Z', 80),
    (56, 'RANKING', '2018 상반기', '2018 상반기 글로우픽 컨슈머 뷰티 어워드 3위', '필링&보습패드 부문', '글로우픽', 'https://www.glowpick.com/awards/v1/18', '2026-08-17T00:00:00Z', 81),
    (154, 'RANKING', '2018 상반기', '2018 상반기 글로우픽 컨슈머 뷰티 어워드 3위', '스킨 부문', '글로우픽', 'https://www.glowpick.com/awards/v1/18', '2026-08-17T00:00:00Z', 81),
    (654, 'RANKING', '2018 상반기', '2018 상반기 글로우픽 컨슈머 뷰티 어워드 2위', '바디로션 부문', '글로우픽', 'https://www.glowpick.com/awards/v1/18', '2026-08-17T00:00:00Z', 81),
    (896, 'RANKING', '2018 상반기', '2018 상반기 글로우픽 컨슈머 뷰티 어워드 2위', '수딩젤/팩 부문', '글로우픽', 'https://www.glowpick.com/awards/v1/18', '2026-08-17T00:00:00Z', 81),
    (2146, 'RANKING', '2018 상반기', '2018 상반기 글로우픽 컨슈머 뷰티 어워드 3위', '수면팩 부문', '글로우픽', 'https://www.glowpick.com/awards/v1/18', '2026-08-17T00:00:00Z', 81),
    (2559, 'RANKING', '2018 상반기', '2018 상반기 글로우픽 컨슈머 뷰티 어워드 3위', '화이트닝케어 부문', '글로우픽', 'https://www.glowpick.com/awards/v1/18', '2026-08-17T00:00:00Z', 81),
    (12, 'RANKING', '2017', '2017 글로우픽 컨슈머 뷰티 어워드 3위', '스킨 부문', '글로우픽', 'https://www.glowpick.com/awards/v1/17', '2026-08-17T00:00:00Z', 90),
    (654, 'RANKING', '2017', '2017 글로우픽 컨슈머 뷰티 어워드 2위', '바디로션 부문', '글로우픽', 'https://www.glowpick.com/awards/v1/17', '2026-08-17T00:00:00Z', 90),
    (950, 'RANKING', '2017', '2017 글로우픽 컨슈머 뷰티 어워드 3위', '보습/영양크림 부문', '글로우픽', 'https://www.glowpick.com/awards/v1/17', '2026-08-17T00:00:00Z', 90),
    (2146, 'RANKING', '2017', '2017 글로우픽 컨슈머 뷰티 어워드 2위', '수면팩 부문', '글로우픽', 'https://www.glowpick.com/awards/v1/17', '2026-08-17T00:00:00Z', 90),
    (654, 'RANKING', '2017 상반기', '2017 상반기 글로우픽 컨슈머 뷰티 어워드 3위', '바디로션 부문', '글로우픽', 'https://www.glowpick.com/awards/v1/16', '2026-08-17T00:00:00Z', 91),
    (833, 'RANKING', '2017 상반기', '2017 상반기 글로우픽 컨슈머 뷰티 어워드 2위', '크림 부문', '글로우픽', 'https://www.glowpick.com/awards/v1/16', '2026-08-17T00:00:00Z', 91),
    (2146, 'RANKING', '2017 상반기', '2017 상반기 글로우픽 컨슈머 뷰티 어워드 3위', '수면팩 부문', '글로우픽', 'https://www.glowpick.com/awards/v1/16', '2026-08-17T00:00:00Z', 91),
    (907, 'RANKING', '2016', '2016 글로우픽 컨슈머 뷰티 어워드 3위', '크림_안티에이징 부문', '글로우픽', 'https://www.glowpick.com/awards/v1/15', '2026-08-17T00:00:00Z', 100),
    (2146, 'RANKING', '2016', '2016 글로우픽 컨슈머 뷰티 어워드 2위', '수면팩 부문', '글로우픽', 'https://www.glowpick.com/awards/v1/15', '2026-08-17T00:00:00Z', 100),
    (833, 'RANKING', '2015', '2015 글로우픽 컨슈머 뷰티 어워드 2위', '최고의 신상품 부문', '글로우픽', 'https://www.glowpick.com/awards/v1/13', '2026-08-17T00:00:00Z', 110);

-- 기존 대표 성과도 최신 항목 뒤에 일관되게 정렬한다.
UPDATE product_achievement
   SET display_order = CASE
       WHEN period_label LIKE '2026%상반기%' THEN 1
       WHEN period_label LIKE '2026%' THEN 0
       WHEN period_label LIKE '2025%상반기%' THEN 11
       WHEN period_label LIKE '2025%' THEN 10
       WHEN period_label LIKE '2024%상반기%' THEN 21
       WHEN period_label LIKE '2024%' THEN 20
       WHEN period_label LIKE '2023%상반기%' THEN 31
       WHEN period_label LIKE '2023%' THEN 30
       WHEN period_label LIKE '2022%상반기%' THEN 41
       WHEN period_label LIKE '2022%' THEN 40
       WHEN period_label LIKE '2021%상반기%' THEN 51
       WHEN period_label LIKE '2021%' THEN 50
       WHEN period_label LIKE '2020%상반기%' THEN 61
       WHEN period_label LIKE '2020%' THEN 60
       WHEN period_label LIKE '2019%상반기%' THEN 71
       WHEN period_label LIKE '2019%' THEN 70
       WHEN period_label LIKE '2018%상반기%' THEN 81
       WHEN period_label LIKE '2018%' THEN 80
       WHEN period_label LIKE '2017%상반기%' THEN 91
       WHEN period_label LIKE '2017%' THEN 90
       WHEN period_label LIKE '2016%상반기%' THEN 101
       WHEN period_label LIKE '2016%' THEN 100
       WHEN period_label LIKE '2015%상반기%' THEN 111
       WHEN period_label LIKE '2015%' THEN 110
       WHEN period_label LIKE '2014%상반기%' THEN 121
       WHEN period_label LIKE '2014%' THEN 120
       ELSE 200
   END;
