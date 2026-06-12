import type DatabaseType from "better-sqlite3";

// Single source of truth for the SQLite schema. Used by scripts/migrate.ts and
// by the test setup so they never drift apart.
export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS students (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#6366f1',
  pin_hash TEXT,
  is_admin INTEGER NOT NULL DEFAULT 0,
  pace_pref TEXT NOT NULL DEFAULT 'normal',
  tone_pref TEXT NOT NULL DEFAULT 'encouraging',
  created_at INTEGER NOT NULL,
  last_active_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS subjects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  framing TEXT NOT NULL DEFAULT '',
  order_index INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS topics (
  id TEXT PRIMARY KEY,
  subject_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  prerequisites TEXT NOT NULL DEFAULT '[]',
  subtopics TEXT NOT NULL DEFAULT '[]',
  order_index INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS topics_by_subject ON topics(subject_id);

CREATE TABLE IF NOT EXISTS mastery (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  topic_id TEXT NOT NULL,
  mastery REAL NOT NULL DEFAULT 0,
  bloom_level INTEGER NOT NULL DEFAULT 1,
  attempts INTEGER NOT NULL DEFAULT 0,
  correct INTEGER NOT NULL DEFAULT 0,
  last_seen INTEGER NOT NULL DEFAULT 0
);
CREATE UNIQUE INDEX IF NOT EXISTS mastery_student_topic ON mastery(student_id, topic_id);
CREATE INDEX IF NOT EXISTS mastery_by_student ON mastery(student_id);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  subject_id TEXT NOT NULL,
  started_at INTEGER NOT NULL,
  last_active_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_by_student_subject ON sessions(student_id, subject_id);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  topic_id TEXT,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS messages_by_session ON messages(session_id);

CREATE TABLE IF NOT EXISTS gaps (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  topic_id TEXT NOT NULL,
  misconception TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  detected_at INTEGER NOT NULL,
  cleared_at INTEGER
);
CREATE INDEX IF NOT EXISTS gaps_by_student ON gaps(student_id);

CREATE TABLE IF NOT EXISTS knowledge_chunks (
  id TEXT PRIMARY KEY,
  subject_id TEXT NOT NULL,
  topic_id TEXT,
  source TEXT NOT NULL DEFAULT '',
  source_id TEXT,
  text TEXT NOT NULL,
  embedding TEXT,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS chunks_by_subject ON knowledge_chunks(subject_id);

-- Global key-value settings (e.g. active tutor model override).
CREATE TABLE IF NOT EXISTS system_settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- Tracks each ingested document (e.g. an uploaded PDF) so the UI can show
-- progress/status and chunks can be managed per source.
CREATE TABLE IF NOT EXISTS sources (
  id TEXT PRIMARY KEY,
  subject_id TEXT NOT NULL,
  topic_id TEXT,
  kind TEXT NOT NULL DEFAULT 'pdf',
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  chunk_count INTEGER NOT NULL DEFAULT 0,
  embedded_count INTEGER NOT NULL DEFAULT 0,
  error TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS sources_by_subject ON sources(subject_id);
`;

/** Add a column if it is missing, so existing databases pick up additive changes. */
function ensureColumn(
  db: DatabaseType.Database,
  table: string,
  column: string,
  type: string
): void {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
  if (!cols.some((c) => c.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
  }
}

export function applySchema(db: DatabaseType.Database): void {
  db.exec(SCHEMA_SQL);
  // Backfill columns introduced after the initial schema for pre-existing DBs.
  ensureColumn(db, "knowledge_chunks", "source_id", "TEXT");
  ensureColumn(db, "students", "is_admin", "INTEGER NOT NULL DEFAULT 0");
  ensureColumn(db, "topics", "subtopics", "TEXT NOT NULL DEFAULT '[]'");
  ensureColumn(db, "students", "theme_pref", "TEXT NOT NULL DEFAULT 'system'");
  ensureColumn(db, "mastery", "phase", "TEXT NOT NULL DEFAULT 'learn'");
  ensureColumn(db, "mastery", "progress", "TEXT NOT NULL DEFAULT '{}'");
}
