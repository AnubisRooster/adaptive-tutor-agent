import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { applySchema } from "@/db/ddl";
import { SUBJECTS, TOPICS } from "@/db/curriculum";

// Ensure the shared test database has the schema and seeded curriculum before
// each test file runs. Idempotent and cheap.
const dbPath = process.env.DATABASE_PATH || "./data/test.db";
fs.mkdirSync(path.dirname(path.resolve(dbPath)), { recursive: true });

const db = new Database(dbPath);
db.pragma("journal_mode = WAL");
applySchema(db);

const upsertSubject = db.prepare(
  `INSERT INTO subjects (id, name, description, framing, order_index)
   VALUES (@id, @name, @description, @framing, @orderIndex)
   ON CONFLICT(id) DO UPDATE SET name=@name, description=@description, framing=@framing, order_index=@orderIndex`
);
for (const s of SUBJECTS) upsertSubject.run(s);

const upsertTopic = db.prepare(
  `INSERT INTO topics (id, subject_id, name, description, prerequisites, order_index)
   VALUES (@id, @subjectId, @name, @description, @prerequisites, @orderIndex)
   ON CONFLICT(id) DO UPDATE SET subject_id=@subjectId, name=@name, description=@description, prerequisites=@prerequisites, order_index=@orderIndex`
);
for (const t of TOPICS) upsertTopic.run({ ...t, prerequisites: JSON.stringify(t.prerequisites) });

db.close();
