-- gatabottle schema v0
-- data-model-v0.md 準拠（MVP は devices + bottles のみ。likes/picks/reports は次フェーズ）

CREATE TABLE IF NOT EXISTS devices (
  device_id     TEXT    PRIMARY KEY,
  pick_credits  INTEGER NOT NULL DEFAULT 0,
  created_at    INTEGER NOT NULL,
  last_seen_at  INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS bottles (
  id            TEXT    PRIMARY KEY,
  youtube_url   TEXT    NOT NULL,
  youtube_id    TEXT    NOT NULL,
  comment       TEXT    NOT NULL,
  device_id     TEXT    NOT NULL,
  created_at    INTEGER NOT NULL,
  expires_at    INTEGER NOT NULL,
  is_archived   INTEGER NOT NULL DEFAULT 0,
  status        TEXT    NOT NULL DEFAULT 'active',
  like_count    INTEGER NOT NULL DEFAULT 0,
  pick_count    INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (device_id) REFERENCES devices(device_id)
);

CREATE INDEX IF NOT EXISTS idx_bottles_active   ON bottles(is_archived, status, expires_at);
CREATE INDEX IF NOT EXISTS idx_bottles_archived ON bottles(is_archived, like_count DESC);
CREATE INDEX IF NOT EXISTS idx_bottles_owner    ON bottles(device_id);
