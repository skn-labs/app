PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS routine_insight_keyword (
    routine_id INTEGER NOT NULL,
    position INTEGER NOT NULL CHECK (position BETWEEN 0 AND 2),
    keyword TEXT NOT NULL CHECK (length(keyword) BETWEEN 1 AND 30),
    PRIMARY KEY (routine_id, position),
    UNIQUE (routine_id, keyword),
    FOREIGN KEY (routine_id) REFERENCES routine_insight(routine_id) ON DELETE CASCADE
);
