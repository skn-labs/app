PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS routine_insight (
    routine_id INTEGER PRIMARY KEY,
    insight_text TEXT NOT NULL CHECK (length(insight_text) BETWEEN 1 AND 500),
    model TEXT NOT NULL,
    prompt_version TEXT NOT NULL,
    input_snapshot_json TEXT NOT NULL DEFAULT '{}',
    generated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (routine_id) REFERENCES routine(id) ON DELETE CASCADE
);
