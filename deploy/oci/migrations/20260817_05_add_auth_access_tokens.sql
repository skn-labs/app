PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS auth_access_token (
    token_hash TEXT PRIMARY KEY CHECK (length(token_hash) = 64),
    user_id INTEGER NOT NULL,
    expires_at INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES app_user(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS ix_auth_access_token_user
    ON auth_access_token(user_id, expires_at);
