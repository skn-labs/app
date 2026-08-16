PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS product_achievement (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    achievement_type TEXT NOT NULL CHECK (achievement_type IN ('AWARD', 'RANKING', 'MILESTONE')),
    period_label TEXT NOT NULL CHECK (length(trim(period_label)) > 0),
    title TEXT NOT NULL CHECK (length(trim(title)) > 0),
    detail TEXT NOT NULL CHECK (length(trim(detail)) > 0),
    source_label TEXT NOT NULL CHECK (length(trim(source_label)) > 0),
    source_url TEXT NOT NULL CHECK (source_url LIKE 'https://%' OR source_url LIKE 'http://%'),
    checked_at TEXT NOT NULL,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES product(id) ON DELETE CASCADE,
    UNIQUE (product_id, achievement_type, title, period_label, source_url)
);

CREATE INDEX IF NOT EXISTS ix_product_achievement_product
    ON product_achievement(product_id, display_order, id);

INSERT OR IGNORE INTO product_achievement(
    product_id, achievement_type, period_label, title, detail,
    source_label, source_url, checked_at, display_order
)
SELECT id, 'AWARD', '2019–2021', '화해 어워드 5회 수상',
       '뷰티 어워드 3년 연속 1위와 2021 명예의 전당 1위 포함',
       '화해 비즈니스', 'https://business.hwahae.co.kr/insight/torriden-sales-growth-01/',
       '2026-08-17T00:00:00Z', 10
  FROM product
 WHERE id = 409 AND brand = '토리든' AND name = '다이브인 저분자 히알루론산 세럼';

INSERT OR IGNORE INTO product_achievement(
    product_id, achievement_type, period_label, title, detail,
    source_label, source_url, checked_at, display_order
)
SELECT id, 'RANKING', '2023 상반기', '글로우픽 어워드 1위',
       '마일드선크림 부문',
       '글로우픽', 'https://glowpick.com/awards/v2/31?categoryIdFirst=3250&categoryIdSecond=3451&categoryIdThird=3455',
       '2026-08-17T00:00:00Z', 10
  FROM product
 WHERE id = 1722 AND brand = '라운드랩' AND name = '자작나무 수분 선크림';

INSERT OR IGNORE INTO product_achievement(
    product_id, achievement_type, period_label, title, detail,
    source_label, source_url, checked_at, display_order
)
SELECT id, 'AWARD', '2023', 'Allure Best of Beauty',
       'Best of Beauty 어워드 위너',
       'LANEIGE 공식 제품 페이지', 'https://us.laneige.com/products/cream-skin-toner-moisturizer?variant=41084692267060',
       '2026-08-17T00:00:00Z', 10
  FROM product
 WHERE id = 106 AND brand = '라네즈' AND name = '크림 스킨 토너 앤 모이스처라이저';

DROP VIEW IF EXISTS product_catalog_public;
CREATE VIEW product_catalog_public AS
SELECT
    p.*,
    ba.logo_url AS brand_logo_url,
    pcc.summary AS guide_summary,
    pcc.routine_step AS guide_routine_step,
    pcc.usage_type AS guide_usage_type,
    pcc.usage_timing_json AS guide_usage_timing_json,
    pcc.usage_tips_json AS guide_usage_tips_json,
    pcc.observation_points_json AS guide_observation_points_json,
    pcc.origin AS guide_origin,
    pcc.generated_at AS guide_generated_at,
    CASE
        WHEN p.verified = 1 AND EXISTS (
            SELECT 1 FROM product_source_fact identity_source
            WHERE identity_source.product_id = p.id
        ) THEN 1 ELSE 0
    END AS public_verified,
    COALESCE((
        SELECT json_group_array(json_object(
            'type', psf.fact_type,
            'text', psf.fact_text,
            'sourceLabel', psf.source_label,
            'sourceUrl', psf.source_url,
            'checkedAt', psf.checked_at
        ))
        FROM product_source_fact psf
        WHERE psf.product_id = p.id
          AND length(trim(psf.source_label)) > 0
          AND length(trim(psf.source_url)) > 0
          AND length(trim(psf.checked_at)) > 0
    ), '[]') AS source_facts_json,
    COALESCE((
        SELECT json_group_array(json_object(
            'type', achievement.achievement_type,
            'periodLabel', achievement.period_label,
            'title', achievement.title,
            'detail', achievement.detail,
            'sourceLabel', achievement.source_label,
            'sourceUrl', achievement.source_url,
            'checkedAt', achievement.checked_at
        ))
        FROM (
            SELECT pa.achievement_type, pa.period_label, pa.title, pa.detail,
                   pa.source_label, pa.source_url, pa.checked_at
              FROM product_achievement pa
             WHERE pa.product_id = p.id
             ORDER BY pa.display_order, pa.id
             LIMIT 3
        ) achievement
    ), '[]') AS achievements_json
FROM product p
JOIN product_catalog_content pcc ON pcc.product_id = p.id
LEFT JOIN brand_asset ba ON ba.brand = p.brand;
