import crypto from "node:crypto";
import { and, asc, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  students,
  subjects,
  topics,
  mastery,
  sessions,
  messages,
  gaps,
  knowledgeChunks,
  sources,
  type Student,
  type Subject,
  type Topic,
  type Mastery,
  type Gap,
  type KnowledgeChunk,
  type Message,
  type Source,
} from "@/db/schema";

const now = () => Date.now();
const uuid = () => crypto.randomUUID();

// PIN hashing is intentionally lightweight — it guards against accidental
// cross-use on a trusted LAN, not against real attackers.
function hashPin(studentId: string, pin: string): string {
  return crypto.createHash("sha256").update(`${studentId}:${pin}`).digest("hex");
}

// ---------- Students / profiles ----------

export function listStudents(): Student[] {
  return db.select().from(students).orderBy(desc(students.lastActiveAt)).all();
}

export function getStudent(id: string): Student | undefined {
  return db.select().from(students).where(eq(students.id, id)).get();
}

export function createStudent(input: {
  name: string;
  color?: string;
  pin?: string;
}): Student {
  const id = uuid();
  const ts = now();
  const pinHash = input.pin ? hashPin(id, input.pin) : null;
  const row = {
    id,
    name: input.name.trim().slice(0, 60),
    color: input.color || "#6366f1",
    pinHash,
    isAdmin: false,
    pacePref: "normal",
    tonePref: "encouraging",
    createdAt: ts,
    lastActiveAt: ts,
  };
  db.insert(students).values(row).run();
  return row as Student;
}

/** Grant or revoke admin access for a profile. */
export function setAdmin(studentId: string, isAdmin: boolean): void {
  db.update(students).set({ isAdmin }).where(eq(students.id, studentId)).run();
}

export function verifyPin(student: Student, pin?: string): boolean {
  if (!student.pinHash) return true; // no PIN set
  if (!pin) return false;
  return hashPin(student.id, pin) === student.pinHash;
}

export function touchStudent(id: string): void {
  db.update(students).set({ lastActiveAt: now() }).where(eq(students.id, id)).run();
}

// ---------- Subjects & topics ----------

export function listSubjects(): Subject[] {
  return db.select().from(subjects).orderBy(asc(subjects.orderIndex)).all();
}

export function getSubject(id: string): Subject | undefined {
  return db.select().from(subjects).where(eq(subjects.id, id)).get();
}

export function listTopics(subjectId: string): Topic[] {
  return db
    .select()
    .from(topics)
    .where(eq(topics.subjectId, subjectId))
    .orderBy(asc(topics.orderIndex))
    .all();
}

export function getTopic(id: string): Topic | undefined {
  return db.select().from(topics).where(eq(topics.id, id)).get();
}

export function getAllTopics(): Topic[] {
  return db.select().from(topics).orderBy(asc(topics.orderIndex)).all();
}

export function topicPrerequisites(topic: Topic): string[] {
  try {
    const parsed = JSON.parse(topic.prerequisites);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Turn a free-text subject name into a stable, url-safe slug id. */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
}

/** A slug not already taken by a subject, suffixing -2, -3, ... if needed. */
export function uniqueSubjectId(name: string): string {
  const base = slugify(name) || "subject";
  let candidate = base;
  let n = 2;
  while (getSubject(candidate)) {
    candidate = `${base}-${n++}`;
  }
  return candidate;
}

export function createSubject(input: {
  id: string;
  name: string;
  description?: string;
  framing?: string;
  orderIndex?: number;
}): Subject {
  const nextOrder =
    input.orderIndex ??
    ((db.select().from(subjects).all().reduce((max, s) => Math.max(max, s.orderIndex), -1)) + 1);
  const row = {
    id: input.id,
    name: input.name.trim().slice(0, 80),
    description: (input.description ?? "").slice(0, 400),
    framing: (input.framing ?? "").slice(0, 800),
    orderIndex: nextOrder,
  };
  db.insert(subjects).values(row).run();
  return row as Subject;
}

/** Bulk-insert topics for a subject. Prerequisites are stored as a JSON array. */
export function createTopics(
  rows: {
    id: string;
    subjectId: string;
    name: string;
    description?: string;
    prerequisites?: string[];
    orderIndex: number;
  }[]
): void {
  if (rows.length === 0) return;
  for (const r of rows) {
    db.insert(topics)
      .values({
        id: r.id,
        subjectId: r.subjectId,
        name: r.name.trim().slice(0, 120),
        description: (r.description ?? "").slice(0, 400),
        prerequisites: JSON.stringify(r.prerequisites ?? []),
        orderIndex: r.orderIndex,
      })
      .run();
  }
}

// ---------- Mastery ----------

export function getMastery(studentId: string, topicId: string): Mastery | undefined {
  return db
    .select()
    .from(mastery)
    .where(and(eq(mastery.studentId, studentId), eq(mastery.topicId, topicId)))
    .get();
}

export function getMasteryMap(studentId: string): Map<string, Mastery> {
  const rows = db.select().from(mastery).where(eq(mastery.studentId, studentId)).all();
  return new Map(rows.map((r) => [r.topicId, r]));
}

export function upsertMastery(
  studentId: string,
  topicId: string,
  patch: Partial<Pick<Mastery, "mastery" | "bloomLevel" | "attempts" | "correct">>
): Mastery {
  const existing = getMastery(studentId, topicId);
  if (existing) {
    const updated = {
      mastery: patch.mastery ?? existing.mastery,
      bloomLevel: patch.bloomLevel ?? existing.bloomLevel,
      attempts: patch.attempts ?? existing.attempts,
      correct: patch.correct ?? existing.correct,
      lastSeen: now(),
    };
    db.update(mastery).set(updated).where(eq(mastery.id, existing.id)).run();
    return { ...existing, ...updated };
  }
  const row = {
    id: uuid(),
    studentId,
    topicId,
    mastery: patch.mastery ?? 0,
    bloomLevel: patch.bloomLevel ?? 1,
    attempts: patch.attempts ?? 0,
    correct: patch.correct ?? 0,
    lastSeen: now(),
  };
  db.insert(mastery).values(row).run();
  return row as Mastery;
}

// ---------- Sessions & messages ----------

export function getOrCreateSession(studentId: string, subjectId: string) {
  const existing = db
    .select()
    .from(sessions)
    .where(and(eq(sessions.studentId, studentId), eq(sessions.subjectId, subjectId)))
    .orderBy(desc(sessions.lastActiveAt))
    .get();
  if (existing) {
    db.update(sessions).set({ lastActiveAt: now() }).where(eq(sessions.id, existing.id)).run();
    return existing;
  }
  const row = {
    id: uuid(),
    studentId,
    subjectId,
    startedAt: now(),
    lastActiveAt: now(),
  };
  db.insert(sessions).values(row).run();
  return row;
}

export function addMessage(input: {
  sessionId: string;
  studentId: string;
  role: "user" | "assistant" | "system";
  content: string;
  topicId?: string | null;
}): void {
  db.insert(messages)
    .values({
      id: uuid(),
      sessionId: input.sessionId,
      studentId: input.studentId,
      role: input.role,
      content: input.content,
      topicId: input.topicId ?? null,
      createdAt: now(),
    })
    .run();
}

export function getRecentMessages(sessionId: string, limit = 20): Message[] {
  // rowid is a stable, monotonic tiebreaker for messages created in the same ms.
  const rows = db
    .select()
    .from(messages)
    .where(eq(messages.sessionId, sessionId))
    .orderBy(sql`${messages.createdAt} desc, rowid desc`)
    .limit(limit)
    .all();
  return rows.reverse();
}

// ---------- Gaps ----------

export function addGap(studentId: string, topicId: string, misconception: string): void {
  db.insert(gaps)
    .values({
      id: uuid(),
      studentId,
      topicId,
      misconception: misconception.slice(0, 400),
      status: "open",
      detectedAt: now(),
      clearedAt: null,
    })
    .run();
}

export function listOpenGaps(studentId: string, topicId?: string): Gap[] {
  const where = topicId
    ? and(eq(gaps.studentId, studentId), eq(gaps.topicId, topicId), eq(gaps.status, "open"))
    : and(eq(gaps.studentId, studentId), eq(gaps.status, "open"));
  return db.select().from(gaps).where(where).orderBy(desc(gaps.detectedAt)).all();
}

export function clearGapsForTopic(studentId: string, topicId: string): void {
  db.update(gaps)
    .set({ status: "cleared", clearedAt: now() })
    .where(and(eq(gaps.studentId, studentId), eq(gaps.topicId, topicId), eq(gaps.status, "open")))
    .run();
}

// ---------- Knowledge chunks ----------

export function getChunksForSubject(subjectId: string): KnowledgeChunk[] {
  return db.select().from(knowledgeChunks).where(eq(knowledgeChunks.subjectId, subjectId)).all();
}

export function insertKnowledgeChunk(input: {
  subjectId: string;
  topicId?: string | null;
  source?: string;
  sourceId?: string | null;
  text: string;
  embedding?: number[] | null;
}): void {
  db.insert(knowledgeChunks)
    .values({
      id: uuid(),
      subjectId: input.subjectId,
      topicId: input.topicId ?? null,
      source: input.source ?? "",
      sourceId: input.sourceId ?? null,
      text: input.text,
      embedding: input.embedding ? JSON.stringify(input.embedding) : null,
      createdAt: now(),
    })
    .run();
}

// ---------- Sources (ingested documents) ----------

export function createSource(input: {
  subjectId: string;
  topicId?: string | null;
  kind?: string;
  name: string;
}): Source {
  const ts = now();
  const row = {
    id: uuid(),
    subjectId: input.subjectId,
    topicId: input.topicId ?? null,
    kind: input.kind ?? "pdf",
    name: input.name.slice(0, 200),
    status: "pending",
    chunkCount: 0,
    embeddedCount: 0,
    error: null,
    createdAt: ts,
    updatedAt: ts,
  };
  db.insert(sources).values(row).run();
  return row as Source;
}

export function updateSource(
  id: string,
  patch: Partial<Pick<Source, "status" | "chunkCount" | "embeddedCount" | "error">>
): void {
  db.update(sources)
    .set({ ...patch, updatedAt: now() })
    .where(eq(sources.id, id))
    .run();
}

export function getSource(id: string): Source | undefined {
  return db.select().from(sources).where(eq(sources.id, id)).get();
}

export function listSources(subjectId?: string): Source[] {
  const q = db.select().from(sources);
  const rows = subjectId ? q.where(eq(sources.subjectId, subjectId)).all() : q.all();
  return rows.sort((a, b) => b.createdAt - a.createdAt);
}

export function getChunk(id: string): KnowledgeChunk | undefined {
  return db.select().from(knowledgeChunks).where(eq(knowledgeChunks.id, id)).get();
}

export function listChunks(subjectId: string, topicId?: string | null): KnowledgeChunk[] {
  const where =
    topicId === undefined
      ? eq(knowledgeChunks.subjectId, subjectId)
      : topicId === null
        ? and(eq(knowledgeChunks.subjectId, subjectId), isNull(knowledgeChunks.topicId))
        : and(eq(knowledgeChunks.subjectId, subjectId), eq(knowledgeChunks.topicId, topicId));
  return db.select().from(knowledgeChunks).where(where).orderBy(desc(knowledgeChunks.createdAt)).all();
}

export function getChunksForSource(sourceId: string): KnowledgeChunk[] {
  return db.select().from(knowledgeChunks).where(eq(knowledgeChunks.sourceId, sourceId)).all();
}

export function setChunkEmbedding(id: string, embedding: number[] | null): void {
  db.update(knowledgeChunks)
    .set({ embedding: embedding ? JSON.stringify(embedding) : null })
    .where(eq(knowledgeChunks.id, id))
    .run();
}

export function deleteChunk(id: string): void {
  db.delete(knowledgeChunks).where(eq(knowledgeChunks.id, id)).run();
}

export function deleteSource(id: string): void {
  db.delete(knowledgeChunks).where(eq(knowledgeChunks.sourceId, id)).run();
  db.delete(sources).where(eq(sources.id, id)).run();
}

// ---------- Admin curriculum mutations ----------

export function updateSubject(
  id: string,
  patch: Partial<Pick<Subject, "name" | "description" | "framing" | "orderIndex">>
): void {
  const set: Record<string, unknown> = {};
  if (patch.name !== undefined) set.name = patch.name.trim().slice(0, 80);
  if (patch.description !== undefined) set.description = patch.description.slice(0, 400);
  if (patch.framing !== undefined) set.framing = patch.framing.slice(0, 800);
  if (patch.orderIndex !== undefined) set.orderIndex = patch.orderIndex;
  if (Object.keys(set).length === 0) return;
  db.update(subjects).set(set).where(eq(subjects.id, id)).run();
}

export function updateTopic(
  id: string,
  patch: Partial<Pick<Topic, "name" | "description" | "orderIndex">> & { prerequisites?: string[] }
): void {
  const set: Record<string, unknown> = {};
  if (patch.name !== undefined) set.name = patch.name.trim().slice(0, 120);
  if (patch.description !== undefined) set.description = patch.description.slice(0, 400);
  if (patch.orderIndex !== undefined) set.orderIndex = patch.orderIndex;
  if (patch.prerequisites !== undefined) set.prerequisites = JSON.stringify(patch.prerequisites);
  if (Object.keys(set).length === 0) return;
  db.update(topics).set(set).where(eq(topics.id, id)).run();
}

/** Delete a topic and any data that references it (chunks, mastery, gaps, prereq links). */
export function deleteTopic(id: string): void {
  const topic = getTopic(id);
  if (!topic) return;
  db.delete(knowledgeChunks).where(eq(knowledgeChunks.topicId, id)).run();
  db.delete(mastery).where(eq(mastery.topicId, id)).run();
  db.delete(gaps).where(eq(gaps.topicId, id)).run();
  db.update(sources).set({ topicId: null }).where(eq(sources.topicId, id)).run();
  // Remove this topic from sibling prerequisites.
  for (const sibling of listTopics(topic.subjectId)) {
    const prereqs = topicPrerequisites(sibling);
    if (prereqs.includes(id)) {
      db.update(topics)
        .set({ prerequisites: JSON.stringify(prereqs.filter((p) => p !== id)) })
        .where(eq(topics.id, sibling.id))
        .run();
    }
  }
  db.delete(topics).where(eq(topics.id, id)).run();
}

/** Delete a subject and all of its topics, chunks, sources, and learner state. */
export function deleteSubject(id: string): void {
  const topicIds = listTopics(id).map((t) => t.id);
  if (topicIds.length > 0) {
    db.delete(mastery).where(inArray(mastery.topicId, topicIds)).run();
    db.delete(gaps).where(inArray(gaps.topicId, topicIds)).run();
  }
  db.delete(knowledgeChunks).where(eq(knowledgeChunks.subjectId, id)).run();
  db.delete(sources).where(eq(sources.subjectId, id)).run();
  db.delete(sessions).where(eq(sessions.subjectId, id)).run();
  db.delete(topics).where(eq(topics.subjectId, id)).run();
  db.delete(subjects).where(eq(subjects.id, id)).run();
}
