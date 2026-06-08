import { describe, it, expect } from "vitest";
import { buildTutorSystemPrompt, buildGradeMessages } from "@/lib/prompts";
import type { Student, Subject, Topic, Mastery, Gap } from "@/db/schema";

const student: Student = {
  id: "s1",
  name: "Maya",
  color: "#10b981",
  pinHash: null,
  isAdmin: false,
  pacePref: "normal",
  tonePref: "encouraging",
  createdAt: 0,
  lastActiveAt: 0,
};

const subject: Subject = {
  id: "philosophy",
  name: "Philosophy",
  description: "Reasoning about knowledge.",
  framing: "Teach Socratically.",
  orderIndex: 0,
};

const topic: Topic = {
  id: "philosophy.logic",
  subjectId: "philosophy",
  name: "Logic & Argument",
  description: "Validity and soundness.",
  prerequisites: "[]",
  orderIndex: 0,
};

const masteryRow: Mastery = {
  id: "m1",
  studentId: "s1",
  topicId: "philosophy.logic",
  mastery: 0.3,
  bloomLevel: 2,
  attempts: 3,
  correct: 1,
  lastSeen: 0,
};

describe("buildTutorSystemPrompt", () => {
  it("includes topic, mastery, Bloom level, and tone guidance", () => {
    const p = buildTutorSystemPrompt({
      student,
      subject,
      topic,
      masteryRow,
      openGaps: [],
      contextText: "",
      mode: "teach",
    });
    expect(p).toContain("Logic & Argument");
    expect(p).toContain("Philosophy");
    expect(p).toContain("Understand"); // Bloom level 2
    expect(p).toContain("30%");
    expect(p).toMatch(/MODE: TEACH/);
    expect(p).toContain("Socratically");
  });

  it("injects open gaps and reference context when present", () => {
    const gap: Gap = {
      id: "g1",
      studentId: "s1",
      topicId: "philosophy.logic",
      misconception: "confuses validity with truth",
      status: "open",
      detectedAt: 0,
      clearedAt: null,
    };
    const p = buildTutorSystemPrompt({
      student,
      subject,
      topic,
      masteryRow,
      openGaps: [gap],
      contextText: "Validity is about structure.",
      mode: "review",
    });
    expect(p).toContain("confuses validity with truth");
    expect(p).toContain("Validity is about structure.");
    expect(p).toMatch(/MODE: REVIEW/);
  });

  it("switches mode lines for quiz and diagnostic", () => {
    const quiz = buildTutorSystemPrompt({ student, subject, topic, masteryRow, openGaps: [], contextText: "", mode: "quiz" });
    expect(quiz).toMatch(/MODE: QUIZ/);
    const diag = buildTutorSystemPrompt({ student, subject, topic, masteryRow, openGaps: [], contextText: "", mode: "diagnostic" });
    expect(diag).toMatch(/MODE: DIAGNOSTIC/);
  });
});

describe("buildGradeMessages", () => {
  it("produces system + user messages containing the question and answer", () => {
    const msgs = buildGradeMessages({
      subject,
      topic,
      bloomLevel: 2,
      question: "What makes an argument valid?",
      answer: "When the premises are true.",
      contextText: "",
    });
    expect(msgs).toHaveLength(2);
    expect(msgs[0].role).toBe("system");
    expect(msgs[1].role).toBe("user");
    expect(msgs[1].content).toContain("What makes an argument valid?");
    expect(msgs[1].content).toContain("When the premises are true.");
  });
});
