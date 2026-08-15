PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS user_skin_profile (
    user_id INTEGER PRIMARY KEY,
    age_range TEXT NOT NULL CHECK (age_range IN ('10S', '20S', '30S', '40S', '50S', '60_PLUS')),
    gender TEXT NOT NULL CHECK (gender IN ('MALE', 'FEMALE')),
    skin_type TEXT NOT NULL CHECK (skin_type IN ('DRY', 'OILY', 'COMBINATION', 'NORMAL', 'UNSURE')),
    skin_condition INTEGER NOT NULL CHECK (skin_condition BETWEEN 1 AND 5),
    concerns_json TEXT NOT NULL CHECK (json_valid(concerns_json) AND json_type(concerns_json) = 'array'),
    textures_json TEXT NOT NULL CHECK (json_valid(textures_json) AND json_type(textures_json) = 'array'),
    avoids_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(avoids_json) AND json_type(avoids_json) = 'array'),
    avoid_note TEXT NOT NULL DEFAULT '',
    trial_frequency TEXT NOT NULL CHECK (trial_frequency IN (
        'RARELY', 'EVERY_FEW_MONTHS', 'ONE_OR_TWO_MONTHLY', 'THREE_PLUS_MONTHLY'
    )),
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES app_user(id) ON DELETE CASCADE
);
