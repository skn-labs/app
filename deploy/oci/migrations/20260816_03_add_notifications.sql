PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS notification (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    notification_type TEXT NOT NULL CHECK (notification_type IN (
        'EXPERIENCE_CHECK_IN', 'EXPERIENCE_REVIEW_DUE',
        'PROFILE_READY', 'PROFILE_UPDATED', 'PATTERN_READY', 'PRODUCT_DISCOVERY'
    )),
    experience_id INTEGER,
    pattern_id INTEGER,
    title TEXT NOT NULL CHECK (length(trim(title)) > 0),
    body TEXT NOT NULL DEFAULT '',
    available_at TEXT NOT NULL,
    read_at TEXT,
    snoozed_until TEXT,
    completed_at TEXT,
    cancelled_at TEXT,
    dedupe_key TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES app_user(id) ON DELETE CASCADE,
    FOREIGN KEY (experience_id) REFERENCES experience_session(id) ON DELETE CASCADE,
    FOREIGN KEY (pattern_id) REFERENCES personal_pattern(id) ON DELETE CASCADE,
    UNIQUE (user_id, dedupe_key),
    CHECK (
        (notification_type IN ('EXPERIENCE_CHECK_IN', 'EXPERIENCE_REVIEW_DUE')
            AND experience_id IS NOT NULL AND pattern_id IS NULL)
        OR (notification_type = 'PATTERN_READY' AND experience_id IS NULL AND pattern_id IS NOT NULL)
        OR (notification_type IN ('PROFILE_READY', 'PROFILE_UPDATED', 'PRODUCT_DISCOVERY')
            AND experience_id IS NULL AND pattern_id IS NULL)
    )
);

CREATE INDEX IF NOT EXISTS ix_notifications_inbox
    ON notification(user_id, available_at DESC, id DESC)
    WHERE cancelled_at IS NULL;

INSERT OR IGNORE INTO notification(
    user_id, notification_type, experience_id, title, body,
    available_at, completed_at, dedupe_key
)
SELECT es.user_id, 'EXPERIENCE_CHECK_IN', es.id,
       'DAY 2, 오늘은 어땠나요?',
       '작은 변화라도 괜찮아요. 느낀 점을 남겨보세요.',
       datetime(es.started_at, '+1 day'),
       (SELECT MIN(er.created_at) FROM experience_record er WHERE er.session_id = es.id),
       'experience-check-in:' || es.id
  FROM experience_session es
 WHERE es.status = 'ACTIVE';

INSERT OR IGNORE INTO notification(
    user_id, notification_type, experience_id, title, body,
    available_at, dedupe_key
)
SELECT es.user_id, 'EXPERIENCE_REVIEW_DUE', es.id,
       '7일 경험을 돌아볼 시간이에요',
       es.title || '에서 느낀 점을 남겨보세요.',
       es.review_due_at,
       'experience-review:' || es.id
  FROM experience_session es
 WHERE es.status = 'ACTIVE';

INSERT OR IGNORE INTO notification(
    user_id, notification_type, title, body, available_at, read_at, dedupe_key
)
SELECT usp.user_id, 'PROFILE_READY', '첫 피부 프로필이 생성되었어요',
       '온보딩에서 직접 고른 스킨케어 맥락을 확인해보세요.',
       usp.updated_at, usp.updated_at, 'profile-ready'
  FROM user_skin_profile usp;

INSERT OR IGNORE INTO notification(
    user_id, notification_type, title, body, available_at, read_at, dedupe_key
)
SELECT id, 'PROFILE_READY', '첫 피부 프로필이 생성되었어요',
    '나의 자기보고 스킨케어 맥락을 확인해보세요.',
    datetime('now', '-23 day'), datetime('now', '-22 day'), 'demo-profile-ready'
  FROM app_user WHERE id = 1 AND is_demo = 1;

INSERT OR IGNORE INTO notification(
    user_id, notification_type, title, body, available_at, read_at, dedupe_key
)
SELECT id, 'PROFILE_UPDATED', '스킨케어 프로필이 업데이트되었어요',
       '직접 수정한 내용이 다음 탐색 맥락에 반영됐어요.',
       datetime('now', '-3 day'), datetime('now', '-3 day'), 'demo-profile-updated'
  FROM app_user WHERE id = 1 AND is_demo = 1;

INSERT OR IGNORE INTO notification(
    user_id, notification_type, pattern_id, title, body, available_at, dedupe_key
)
SELECT 1, 'PATTERN_READY', id, '새로운 취향 패턴을 발견했어요',
       '최근 기록을 바탕으로 근거와 반대 기록을 함께 연결했어요.',
       datetime('now', '-11 minute'), 'demo-pattern-ready:1'
  FROM personal_pattern WHERE id = 1 AND user_id = 1;

INSERT OR IGNORE INTO notification(
    user_id, notification_type, pattern_id, title, body, available_at, read_at, dedupe_key
)
SELECT 1, 'PATTERN_READY', id, '나만의 스킨케어 맥락이 더 선명해졌어요',
       '최근 기록이 개인 패턴의 근거에 반영되었어요.',
       datetime('now', '-2 hour'), datetime('now', '-90 minute'), 'demo-pattern-ready:2'
  FROM personal_pattern WHERE id = 2 AND user_id = 1;

INSERT OR IGNORE INTO notification(
    user_id, notification_type, title, body, available_at, dedupe_key
)
SELECT id, 'PRODUCT_DISCOVERY', '어떤 제품을 써볼지 고민되나요?',
    '확인된 제품 정보와 내 경험을 구분해서 탐색해보세요.',
    datetime('now', '-14 hour'), 'demo-product-discovery'
  FROM app_user WHERE id = 1 AND is_demo = 1;
