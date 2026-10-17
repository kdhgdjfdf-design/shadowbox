-- Run against the Cloudflare D1 database before deploying the Worker.
-- Only the project owner should insert or approve knowledge entries.
CREATE TABLE IF NOT EXISTS coach_knowledge (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  approved INTEGER NOT NULL DEFAULT 0 CHECK (approved IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_coach_knowledge_approved
  ON coach_knowledge (approved);
