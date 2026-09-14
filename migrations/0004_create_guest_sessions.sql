CREATE TABLE IF NOT EXISTS guest_sessions (
  id TEXT PRIMARY KEY NOT NULL,
  fingerprint TEXT NOT NULL UNIQUE,
  energy INTEGER NOT NULL DEFAULT 5,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);
