import { describe, it, expect } from "vitest";
import {
  createStudent,
  getStudent,
  listStudents,
  verifyPin,
  listSubjects,
  listTopics,
  getTopic,
  topicPrerequisites,
  getMastery,
  upsertMastery,
  getMasteryMap,
  getOrCreateSession,
  addMessage,
  getRecentMessages,
  addGap,
  listOpenGaps,
  clearGapsForTopic,
} from "@/lib/data";

describe("profiles", () => {
  it("creates and reads a profile", () => {
    const s = createStudent({ name: "Alice", color: "#ef4444" });
    const fetched = getStudent(s.id);
    expect(fetched?.name).toBe("Alice");
    expect(fetched?.color).toBe("#ef4444");
    expect(listStudents().some((x) => x.id === s.id)).toBe(true);
  });

  it("enforces PIN only when one is set", () => {
    const noPin = createStudent({ name: "NoPin" });
    expect(verifyPin(noPin)).toBe(true);

    const withPin = createStudent({ name: "Secure", pin: "1234" });
    const reloaded = getStudent(withPin.id)!;
    expect(verifyPin(reloaded, "1234")).toBe(true);
    expect(verifyPin(reloaded, "0000")).toBe(false);
    expect(verifyPin(reloaded)).toBe(false);
  });
});

describe("curriculum reads", () => {
  it("lists all subjects and their topics", () => {
    // At least the 8 built-in subjects (other tests may add dynamic ones).
    expect(listSubjects().length).toBeGreaterThanOrEqual(8);
    const philTopics = listTopics("philosophy");
    expect(philTopics.length).toBeGreaterThanOrEqual(4);
    expect(philTopics[0].orderIndex).toBe(0);
  });

  it("parses prerequisites from JSON", () => {
    const epi = getTopic("philosophy.epistemology")!;
    expect(topicPrerequisites(epi)).toContain("philosophy.logic");
  });
});

describe("mastery", () => {
  it("inserts then updates mastery for a student/topic", () => {
    const s = createStudent({ name: "Mastery" });
    expect(getMastery(s.id, "ai.intro")).toBeUndefined();

    upsertMastery(s.id, "ai.intro", { mastery: 0.4, attempts: 1 });
    let row = getMastery(s.id, "ai.intro")!;
    expect(row.mastery).toBeCloseTo(0.4);
    expect(row.attempts).toBe(1);

    upsertMastery(s.id, "ai.intro", { mastery: 0.7, attempts: 2 });
    row = getMastery(s.id, "ai.intro")!;
    expect(row.mastery).toBeCloseTo(0.7);
    expect(row.attempts).toBe(2);

    const map = getMasteryMap(s.id);
    expect(map.get("ai.intro")?.mastery).toBeCloseTo(0.7);
  });
});

describe("sessions & messages", () => {
  it("reuses one session per student/subject and stores messages in order", () => {
    const s = createStudent({ name: "Chatter" });
    const a = getOrCreateSession(s.id, "coding");
    const b = getOrCreateSession(s.id, "coding");
    expect(a.id).toBe(b.id);

    addMessage({ sessionId: a.id, studentId: s.id, role: "user", content: "first" });
    addMessage({ sessionId: a.id, studentId: s.id, role: "assistant", content: "second" });
    const msgs = getRecentMessages(a.id, 10);
    expect(msgs.map((m) => m.content)).toEqual(["first", "second"]);
  });
});

describe("gaps", () => {
  it("adds, lists, and clears gaps", () => {
    const s = createStudent({ name: "Gappy" });
    addGap(s.id, "physics.mechanics", "thinks heavier objects fall faster");
    let open = listOpenGaps(s.id, "physics.mechanics");
    expect(open.length).toBe(1);
    expect(open[0].misconception).toContain("heavier");

    clearGapsForTopic(s.id, "physics.mechanics");
    open = listOpenGaps(s.id, "physics.mechanics");
    expect(open.length).toBe(0);
  });
});
