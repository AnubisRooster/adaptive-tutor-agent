import { sqliteTable, text, integer, real, uniqueIndex, index } from "drizzle-orm/sqlite-core";

// A learner profile. No real authentication — an optional PIN simply prevents
// accidental cross-use on a trusted local network.
export const students = sqliteTable("students", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  color: text("color").notNull().default("#6366f1"),
  pinHash: text("pin_hash"),
  // Admin profiles (e.g. the owner) can access the /admin portal.
  isAdmin: integer("is_admin", { mode: "boolean" }).notNull().default(false),
  pacePref: text("pace_pref").notNull().default("normal"),
  tonePref: text("tone_pref").notNull().default("encouraging"),
  // "system" | "light" | "dark"
  themePref: text("theme_pref").notNull().default("system"),
  createdAt: integer("created_at").notNull(),
  lastActiveAt: integer("last_active_at").notNull(),
});

export const subjects = sqliteTable("subjects", {
  id: text("id").primaryKey(), // slug, e.g. "philosophy"
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  framing: text("framing").notNull().default(""),
  orderIndex: integer("order_index").notNull().default(0),
});

export const topics = sqliteTable(
  "topics",
  {
    id: text("id").primaryKey(), // slug, e.g. "philosophy.epistemology"
    subjectId: text("subject_id").notNull(),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    // JSON array of topic ids that should be learned first.
    prerequisites: text("prerequisites").notNull().default("[]"),
    // JSON array of { name, description } sub-areas a student can drill into.
    subtopics: text("subtopics").notNull().default("[]"),
    orderIndex: integer("order_index").notNull().default(0),
  },
  (t) => ({
    bySubject: index("topics_by_subject").on(t.subjectId),
  })
);

// Per-student, per-topic mastery state. mastery in [0,1]; bloomLevel 1..6.
// phase: "learn" | "quiz" | "mastery" | "complete"
// progress: JSON object keyed by subtopic name: { taught, quizzed, lastScore }
export const mastery = sqliteTable(
  "mastery",
  {
    id: text("id").primaryKey(),
    studentId: text("student_id").notNull(),
    topicId: text("topic_id").notNull(),
    mastery: real("mastery").notNull().default(0),
    bloomLevel: integer("bloom_level").notNull().default(1),
    attempts: integer("attempts").notNull().default(0),
    correct: integer("correct").notNull().default(0),
    lastSeen: integer("last_seen").notNull().default(0),
    phase: text("phase").notNull().default("learn"),
    // JSON: Record<subtopicName, { taught: boolean; quizzed: boolean; lastScore: number | null }>
    progress: text("progress").notNull().default("{}"),
  },
  (t) => ({
    uniq: uniqueIndex("mastery_student_topic").on(t.studentId, t.topicId),
    byStudent: index("mastery_by_student").on(t.studentId),
  })
);

export const sessions = sqliteTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    studentId: text("student_id").notNull(),
    subjectId: text("subject_id").notNull(),
    startedAt: integer("started_at").notNull(),
    lastActiveAt: integer("last_active_at").notNull(),
  },
  (t) => ({
    byStudentSubject: index("sessions_by_student_subject").on(t.studentId, t.subjectId),
  })
);

export const messages = sqliteTable(
  "messages",
  {
    id: text("id").primaryKey(),
    sessionId: text("session_id").notNull(),
    studentId: text("student_id").notNull(),
    role: text("role").notNull(), // "user" | "assistant" | "system"
    content: text("content").notNull(),
    topicId: text("topic_id"),
    createdAt: integer("created_at").notNull(),
  },
  (t) => ({
    bySession: index("messages_by_session").on(t.sessionId),
  })
);

export const gaps = sqliteTable(
  "gaps",
  {
    id: text("id").primaryKey(),
    studentId: text("student_id").notNull(),
    topicId: text("topic_id").notNull(),
    misconception: text("misconception").notNull(),
    status: text("status").notNull().default("open"), // "open" | "cleared"
    detectedAt: integer("detected_at").notNull(),
    clearedAt: integer("cleared_at"),
  },
  (t) => ({
    byStudent: index("gaps_by_student").on(t.studentId),
  })
);

export const knowledgeChunks = sqliteTable(
  "knowledge_chunks",
  {
    id: text("id").primaryKey(),
    subjectId: text("subject_id").notNull(),
    topicId: text("topic_id"),
    source: text("source").notNull().default(""),
    // Optional link to the sources row this chunk was ingested from.
    sourceId: text("source_id"),
    text: text("text").notNull(),
    // JSON-encoded number[] embedding (null until embedded).
    embedding: text("embedding"),
    createdAt: integer("created_at").notNull(),
  },
  (t) => ({
    bySubject: index("chunks_by_subject").on(t.subjectId),
  })
);

// One row per ingested document (uploaded PDF, pasted text, etc.). Drives the
// ingestion status UI and lets the embedding work run in the background.
export const sources = sqliteTable(
  "sources",
  {
    id: text("id").primaryKey(),
    subjectId: text("subject_id").notNull(),
    topicId: text("topic_id"),
    kind: text("kind").notNull().default("pdf"), // "pdf" | "text"
    name: text("name").notNull(),
    status: text("status").notNull().default("pending"), // pending | embedding | done | error
    chunkCount: integer("chunk_count").notNull().default(0),
    embeddedCount: integer("embedded_count").notNull().default(0),
    error: text("error"),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (t) => ({
    bySubject: index("sources_by_subject").on(t.subjectId),
  })
);

export type Student = typeof students.$inferSelect;
export type Subject = typeof subjects.$inferSelect;
export type Topic = typeof topics.$inferSelect;
export type Mastery = typeof mastery.$inferSelect;
export type Session = typeof sessions.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type Gap = typeof gaps.$inferSelect;
export type KnowledgeChunk = typeof knowledgeChunks.$inferSelect;
export type Source = typeof sources.$inferSelect;
