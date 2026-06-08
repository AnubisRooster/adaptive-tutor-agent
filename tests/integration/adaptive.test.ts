import { describe, it, expect } from "vitest";
import { createStudent, upsertMastery, getMastery, listOpenGaps } from "@/lib/data";
import { applyGrade, selectNextTopic, recommendStartTopic } from "@/lib/adaptive";
import type { Grade } from "@/lib/schemas";

function grade(partial: Partial<Grade>): Grade {
  return {
    correct: true,
    score: 0.9,
    misconceptions: [],
    masteryDelta: 0.2,
    nextRecommendation: "reinforce",
    feedbackForStudent: "ok",
    ...partial,
  };
}

describe("applyGrade", () => {
  it("raises mastery on a correct answer", () => {
    const s = createStudent({ name: "Riser" });
    const before = getMastery(s.id, "ai.intro")?.mastery ?? 0;
    const res = applyGrade(s.id, "ai.intro", grade({ masteryDelta: 0.25 }));
    expect(res.mastery.mastery).toBeGreaterThan(before);
    expect(res.mastery.attempts).toBe(1);
    expect(res.mastery.correct).toBe(1);
  });

  it("records misconceptions as open gaps", () => {
    const s = createStudent({ name: "Gapper" });
    applyGrade(
      s.id,
      "ai.intro",
      grade({ correct: false, masteryDelta: -0.1, misconceptions: ["confuses agent with environment"] })
    );
    const gaps = listOpenGaps(s.id, "ai.intro");
    expect(gaps.some((g) => g.misconception.includes("agent"))).toBe(true);
  });

  it("levels up the Bloom level and advances when a topic is mastered", () => {
    const s = createStudent({ name: "Advancer" });
    // Seed prerequisite + current topic high so advancement is unlocked.
    upsertMastery(s.id, "philosophy.logic", { mastery: 0.85, bloomLevel: 1 });
    const res = applyGrade(
      s.id,
      "philosophy.logic",
      grade({ masteryDelta: 0.1, nextRecommendation: "advance" })
    );
    expect(res.mastery.mastery).toBeGreaterThanOrEqual(0.8);
    expect(res.mastery.bloomLevel).toBe(2);
    expect(res.leveledUp).toBe(true);
    // logic -> epistemology is the next topic once logic is mastered.
    expect(res.next.topicId).toBe("philosophy.epistemology");
    expect(res.next.reason).toBe("advance");
  });

  it("drops to the weakest prerequisite when recommended", () => {
    const s = createStudent({ name: "Backtracker" });
    // epistemology requires logic; leave logic weak.
    upsertMastery(s.id, "philosophy.logic", { mastery: 0.1 });
    const res = applyGrade(
      s.id,
      "philosophy.epistemology",
      grade({ correct: false, masteryDelta: -0.15, nextRecommendation: "prerequisite" })
    );
    expect(res.next.reason).toBe("prerequisite");
    expect(res.next.topicId).toBe("philosophy.logic");
  });
});

describe("selectNextTopic", () => {
  it("reinforces the current topic when not yet mastered", () => {
    const s = createStudent({ name: "Steady" });
    const next = selectNextTopic(s.id, "physics.mechanics", "reinforce", 0.4);
    expect(next.topicId).toBe("physics.mechanics");
    expect(next.reason).toBe("reinforce");
  });
});

describe("recommendStartTopic", () => {
  it("returns the first not-yet-mastered topic of a subject", () => {
    const s = createStudent({ name: "Newcomer" });
    const t = recommendStartTopic(s.id, "coding");
    expect(t?.id).toBe("coding.basics");
  });

  it("skips mastered topics", () => {
    const s = createStudent({ name: "Partly" });
    upsertMastery(s.id, "coding.basics", { mastery: 0.9 });
    const t = recommendStartTopic(s.id, "coding");
    expect(t?.id).not.toBe("coding.basics");
  });
});
