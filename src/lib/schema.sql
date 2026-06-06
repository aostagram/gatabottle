-- gatabottle schema v0
-- data-model-v0.md 準拠（MVP は devices + bottles のみ。likes/picks/reports は次フェーズ）

CREATE TABLE IF NOT EXISTS devices (
  device_id            TEXT    PRIMARY KEY,
  pick_credits         INTEGER NOT NULL DEFAULT 0,
  created_at           INTEGER NOT NULL,
  last_seen_at         INTEGER NOT NULL,
  -- 海探索モード（3本目を流すと当日限定で解放）。
  -- explore_unlocked_day = 解放した JST 0:00 の UTC ms（0 = 未解放）。
  -- 「今日の 0:00」と一致するときだけ有効。翌日になると自然に失効する（cron 不要）。
  explore_unlocked_day INTEGER NOT NULL DEFAULT 0,
  -- その解放日に探索で消費した本数。
  explore_used         INTEGER NOT NULL DEFAULT 0
);

-- 既存 DB 向けの後付けカラム。fresh DB では上の CREATE 済みなので
-- "duplicate column name" になるが、migrate.mjs 側で握りつぶす。
ALTER TABLE devices ADD COLUMN explore_unlocked_day INTEGER NOT NULL DEFAULT 0;
ALTER TABLE devices ADD COLUMN explore_used INTEGER NOT NULL DEFAULT 0;

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

CREATE TABLE IF NOT EXISTS picks (
  id                TEXT    PRIMARY KEY,
  bottle_id         TEXT    NOT NULL,
  picker_device_id  TEXT    NOT NULL,
  picked_at         INTEGER NOT NULL,
  FOREIGN KEY (bottle_id) REFERENCES bottles(id),
  FOREIGN KEY (picker_device_id) REFERENCES devices(device_id)
);

CREATE INDEX IF NOT EXISTS idx_picks_picker ON picks(picker_device_id);
CREATE INDEX IF NOT EXISTS idx_picks_bottle ON picks(bottle_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_picks_unique ON picks(bottle_id, picker_device_id);

CREATE TABLE IF NOT EXISTS likes (
  bottle_id   TEXT    NOT NULL,
  device_id   TEXT    NOT NULL,
  created_at  INTEGER NOT NULL,
  PRIMARY KEY (bottle_id, device_id),
  FOREIGN KEY (bottle_id) REFERENCES bottles(id),
  FOREIGN KEY (device_id) REFERENCES devices(device_id)
);

CREATE INDEX IF NOT EXISTS idx_likes_device ON likes(device_id);
