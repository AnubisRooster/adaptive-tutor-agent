import { db } from "@/db";
import { students, subjects, topics, mastery, sessions, messages, gaps, knowledgeChunks, sources } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getActiveStudent } from "@/lib/session";
import { getAllTopics, listTopics, topicPrerequisites } from "@/lib/data";
import type { Student } from "@/db/schema";

const MASTERED = 0.8;

/** Returns the active student iff they are an admin, else null. */
export async function requireAdmin(): Promise<Student | null> {
  const student = await getActiveStudent();
  if (!student || !student.isAdmin) return null;
  return student;
}

export type AdminProfileSummary = {
  id: string;
  name: string;
  color: string;
  isAdmin: boolean;
  hasPin: boolean;
  createdAt: number;
  lastActiveAt: number;
  subjectsTouched: number;
  topicsAttempted: number;
  topicsMastered: number;
  avgMastery: number;
  totalAttempts: number;
  totalCorrect: number;
  openGaps: number;
};

/** One row per profile with aggregate learning stats for the admin table. */
export function adminListProfiles(): AdminProfileSummary[] {
  const allStudents = db.select().from(students).all();
  const masteryRows = db.select().from(mastery).all();
  const openGapRows = db.select().from(gaps).where(eq(gaps.status, "open")).all();
  const topicToSubject = new Map(getAllTopics().map((t) => [t.id, t.subjectId]));

  const byStudent = new Map<string, typeof masteryRows>();
  for (const m of masteryRows) {
    const list = byStudent.get(m.studentId) ?? [];
    list.push(m);
    byStudent.set(m.studentId, list);
  }
  const gapsByStudent = new Map<string, number>();
  for (const g of openGapRows) gapsByStudent.set(g.studentId, (gapsByStudent.get(g.studentId) ?? 0) + 1);

  return allStudents
    .map((s) => {
      const rows = byStudent.get(s.id) ?? [];
      const subjectsTouched = new Set(rows.map((r) => topicToSubject.get(r.topicId)).filter(Boolean));
      const avg = rows.length ? rows.reduce((a, r) => a + r.mastery, 0) / rows.length : 0;
      return {
        id: s.id,
        name: s.name,
        color: s.color,
        isAdmin: s.isAdmin,
        hasPin: !!s.pinHash,
        createdAt: s.createdAt,
        lastActiveAt: s.lastActiveAt,
        subjectsTouched: subjectsTouched.size,
        topicsAttempted: rows.length,
        topicsMastered: rows.filter((r) => r.mastery >= MASTERED).length,
        avgMastery: avg,
        totalAttempts: rows.reduce((a, r) => a + r.attempts, 0),
        totalCorrect: rows.reduce((a, r) => a + r.correct, 0),
        openGaps: gapsByStudent.get(s.id) ?? 0,
      };
    })
    .sort((a, b) => b.lastActiveAt - a.lastActiveAt);
}

export type AdminProfileDetail = {
  profile: { id: string; name: string; color: string; isAdmin: boolean; hasPin: boolean; createdAt: number; lastActiveAt: number };
  subjects: {
    id: string;
    name: string;
    topics: { id: string; name: string; mastery: number; bloomLevel: number; attempts: number; correct: number; lastSeen: number }[];
  }[];
  gaps: { id: string; topicId: string; topicName: string; subjectName: string; misconception: string; detectedAt: number }[];
  sessionCount: number;
  messageCount: number;
};

/** Full per-profile breakdown: mastery by subject/topic, open gaps, activity. */
export function adminProfileDetail(studentId: string): AdminProfileDetail | null {
  const student = db.select().from(students).where(eq(students.id, studentId)).get();
  if (!student) return null;

  const masteryRows = db.select().from(mastery).where(eq(mastery.studentId, studentId)).all();
  const masteryByTopic = new Map(masteryRows.map((m) => [m.topicId, m]));
  const allSubjects = db.select().from(subjects).all();
  const topicMeta = new Map(getAllTopics().map((t) => [t.id, t]));

  const subjectsOut = allSubjects
    .map((s) => {
      const subjectTopics = listTopics(s.id)
        .map((t) => {
          const m = masteryByTopic.get(t.id);
          if (!m) return null;
          return {
            id: t.id,
            name: t.name,
            mastery: m.mastery,
            bloomLevel: m.bloomLevel,
            attempts: m.attempts,
            correct: m.correct,
            lastSeen: m.lastSeen,
          };
        })
        .filter((x): x is NonNullable<typeof x> => x !== null);
      return subjectTopics.length ? { id: s.id, name: s.name, topics: subjectTopics } : null;
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  const subjectName = new Map(allSubjects.map((s) => [s.id, s.name]));
  const openGaps = db.select().from(gaps).where(eq(gaps.studentId, studentId)).all().filter((g) => g.status === "open");
  const gapsOut = openGaps.map((g) => {
    const t = topicMeta.get(g.topicId);
    return {
      id: g.id,
      topicId: g.topicId,
      topicName: t?.name ?? g.topicId,
      subjectName: t ? subjectName.get(t.subjectId) ?? "" : "",
      misconception: g.misconception,
      detectedAt: g.detectedAt,
    };
  });

  const sessionCount = db.select().from(sessions).where(eq(sessions.studentId, studentId)).all().length;
  const messageCount = db.select().from(messages).where(eq(messages.studentId, studentId)).all().length;

  return {
    profile: {
      id: student.id,
      name: student.name,
      color: student.color,
      isAdmin: student.isAdmin,
      hasPin: !!student.pinHash,
      createdAt: student.createdAt,
      lastActiveAt: student.lastActiveAt,
    },
    subjects: subjectsOut,
    gaps: gapsOut,
    sessionCount,
    messageCount,
  };
}

export type AdminChatMessage = {
  id: string;
  role: string;
  content: string;
  topicId: string | null;
  topicName: string | null;
  createdAt: number;
};
export type AdminChatSession = {
  id: string;
  subjectId: string;
  subjectName: string;
  startedAt: number;
  lastActiveAt: number;
  messageCount: number;
  messages: AdminChatMessage[];
};
export type AdminProfileChats = {
  profile: { id: string; name: string };
  sessions: AdminChatSession[];
};

/** Full chat transcript for one profile, grouped by session (newest first). */
export function adminProfileChats(studentId: string): AdminProfileChats | null {
  const student = db.select().from(students).where(eq(students.id, studentId)).get();
  if (!student) return null;

  const subjectName = new Map(db.select().from(subjects).all().map((s) => [s.id, s.name]));
  const topicName = new Map(getAllTopics().map((t) => [t.id, t.name]));

  const msgRows = db.select().from(messages).where(eq(messages.studentId, studentId)).all();
  const msgsBySession = new Map<string, typeof msgRows>();
  for (const m of msgRows) {
    const list = msgsBySession.get(m.sessionId) ?? [];
    list.push(m);
    msgsBySession.set(m.sessionId, list);
  }

  const sessionRows = db.select().from(sessions).where(eq(sessions.studentId, studentId)).all();
  // Include any orphan sessions referenced only by messages (defensive).
  const knownSessionIds = new Set(sessionRows.map((s) => s.id));
  const orphanSessionIds = [...msgsBySession.keys()].filter((id) => !knownSessionIds.has(id));

  const toMessage = (m: (typeof msgRows)[number]): AdminChatMessage => ({
    id: m.id,
    role: m.role,
    content: m.content,
    topicId: m.topicId ?? null,
    topicName: m.topicId ? topicName.get(m.topicId) ?? null : null,
    createdAt: m.createdAt,
  });

  const sessionsOut: AdminChatSession[] = sessionRows.map((s) => {
    const msgs = (msgsBySession.get(s.id) ?? []).sort((a, b) => a.createdAt - b.createdAt);
    return {
      id: s.id,
      subjectId: s.subjectId,
      subjectName: subjectName.get(s.subjectId) ?? s.subjectId,
      startedAt: s.startedAt,
      lastActiveAt: s.lastActiveAt,
      messageCount: msgs.length,
      messages: msgs.map(toMessage),
    };
  });

  for (const sid of orphanSessionIds) {
    const msgs = (msgsBySession.get(sid) ?? []).sort((a, b) => a.createdAt - b.createdAt);
    if (msgs.length === 0) continue;
    sessionsOut.push({
      id: sid,
      subjectId: "",
      subjectName: "(unknown subject)",
      startedAt: msgs[0].createdAt,
      lastActiveAt: msgs[msgs.length - 1].createdAt,
      messageCount: msgs.length,
      messages: msgs.map(toMessage),
    });
  }

  sessionsOut.sort((a, b) => b.lastActiveAt - a.lastActiveAt);
  return { profile: { id: student.id, name: student.name }, sessions: sessionsOut };
}

export type AdminCurriculumSubject = {
  id: string;
  name: string;
  description: string;
  framing: string;
  orderIndex: number;
  chunkCount: number;
  sourceCount: number;
  topics: {
    id: string;
    name: string;
    description: string;
    orderIndex: number;
    prerequisites: string[];
    chunkCount: number;
  }[];
};

/** Subjects + topics with content counts, for the curriculum editor. */
export function adminCurriculum(): AdminCurriculumSubject[] {
  const allChunks = db.select().from(knowledgeChunks).all();
  const allSources = db.select().from(sources).all();
  const chunkBySubject = new Map<string, number>();
  const chunkByTopic = new Map<string, number>();
  for (const c of allChunks) {
    chunkBySubject.set(c.subjectId, (chunkBySubject.get(c.subjectId) ?? 0) + 1);
    if (c.topicId) chunkByTopic.set(c.topicId, (chunkByTopic.get(c.topicId) ?? 0) + 1);
  }
  const sourceBySubject = new Map<string, number>();
  for (const s of allSources) sourceBySubject.set(s.subjectId, (sourceBySubject.get(s.subjectId) ?? 0) + 1);

  return db
    .select()
    .from(subjects)
    .all()
    .sort((a, b) => a.orderIndex - b.orderIndex)
    .map((s) => ({
      id: s.id,
      name: s.name,
      description: s.description,
      framing: s.framing,
      orderIndex: s.orderIndex,
      chunkCount: chunkBySubject.get(s.id) ?? 0,
      sourceCount: sourceBySubject.get(s.id) ?? 0,
      topics: listTopics(s.id).map((t) => ({
        id: t.id,
        name: t.name,
        description: t.description,
        orderIndex: t.orderIndex,
        prerequisites: topicPrerequisites(t),
        chunkCount: chunkByTopic.get(t.id) ?? 0,
      })),
    }));
}
