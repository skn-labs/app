-- 마지막 성공 배포(683f160) 이후 schema.sql에 들어온 운영 데이터·DDL을
-- 기존 SQLite에도 같은 의미로 적용한다.
UPDATE product
   SET image_url = '/skn-assets/dermalive-cica-gel.png'
 WHERE id = 8;

CREATE TABLE IF NOT EXISTS user_preference (
    user_id INTEGER PRIMARY KEY,
    texture_likes_json TEXT NOT NULL DEFAULT '[]',
    texture_avoids_json TEXT NOT NULL DEFAULT '[]',
    note TEXT NOT NULL DEFAULT '',
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES app_user(id) ON DELETE CASCADE
);
