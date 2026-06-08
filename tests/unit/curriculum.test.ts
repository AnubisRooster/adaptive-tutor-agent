import { describe, it, expect } from "vitest";
import { SUBJECTS, TOPICS, BLOOM_LEVELS, bloomName } from "@/db/curriculum";

describe("curriculum integrity", () => {
  it("includes the original and newly added subjects", () => {
    const ids = SUBJECTS.map((s) => s.id).sort();
    expect(ids).toEqual([
      "ai",
      "biology",
      "coding",
      "health-nutrition",
      "organic-chemistry",
      "philosophy",
      "physics",
      "psychology",
    ]);
  });

  it("has a unique orderIndex per subject", () => {
    const orders = SUBJECTS.map((s) => s.orderIndex);
    expect(new Set(orders).size).toBe(orders.length);
  });

  it("has topics for every subject", () => {
    for (const s of SUBJECTS) {
      const topics = TOPICS.filter((t) => t.subjectId === s.id);
      expect(topics.length).toBeGreaterThanOrEqual(4);
    }
  });

  it("uses unique topic ids", () => {
    const ids = TOPICS.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("references only existing topics as prerequisites (no dangling/self refs)", () => {
    const ids = new Set(TOPICS.map((t) => t.id));
    for (const t of TOPICS) {
      for (const p of t.prerequisites) {
        expect(ids.has(p)).toBe(true);
        expect(p).not.toBe(t.id);
      }
    }
  });

  it("orders prerequisites before dependents within a subject", () => {
    const byId = new Map(TOPICS.map((t) => [t.id, t]));
    for (const t of TOPICS) {
      for (const p of t.prerequisites) {
        const pre = byId.get(p)!;
        expect(pre.orderIndex).toBeLessThan(t.orderIndex);
      }
    }
  });

  it("maps Bloom levels 1-6 to names", () => {
    expect(BLOOM_LEVELS.length).toBe(6);
    expect(bloomName(1)).toBe("Remember");
    expect(bloomName(6)).toBe("Create");
    // clamps out-of-range input
    expect(bloomName(0)).toBe("Remember");
    expect(bloomName(99)).toBe("Create");
  });
});
