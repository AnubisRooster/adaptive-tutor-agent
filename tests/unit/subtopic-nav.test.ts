import { describe, it, expect } from "vitest";
import { findNextSubtopic, allQuizzed, type SubtopicItem, type ProgressMap } from "@/lib/subtopic-nav";

const items: SubtopicItem[] = [
  { name: "Intro", description: "Introduction" },
  { name: "Deep dive", description: "More detail" },
  { name: "Summary", description: "Recap" },
];

// ---------- findNextSubtopic ----------

describe("findNextSubtopic", () => {
  it("returns the first item when progress map is empty", () => {
    const result = findNextSubtopic(items, {});
    expect(result?.name).toBe("Intro");
  });

  it("skips fully quizzed items and returns the first unquizzed one", () => {
    const prog: ProgressMap = {
      Intro: { taught: true, quizzed: true, lastScore: 0.9 },
    };
    const result = findNextSubtopic(items, prog);
    expect(result?.name).toBe("Deep dive");
  });

  it("includes taught-but-not-quizzed items as candidates", () => {
    const prog: ProgressMap = {
      Intro: { taught: true, quizzed: false, lastScore: null },
    };
    const result = findNextSubtopic(items, prog);
    expect(result?.name).toBe("Intro");
  });

  it("returns null when all items are quizzed", () => {
    const prog: ProgressMap = {
      Intro: { taught: true, quizzed: true, lastScore: 1 },
      "Deep dive": { taught: true, quizzed: true, lastScore: 0.8 },
      Summary: { taught: true, quizzed: true, lastScore: 0.7 },
    };
    const result = findNextSubtopic(items, prog);
    expect(result).toBeNull();
  });

  it("returns null for an empty items list", () => {
    expect(findNextSubtopic([], {})).toBeNull();
  });

  it("returns the last item when only the last is unquizzed", () => {
    const prog: ProgressMap = {
      Intro: { taught: true, quizzed: true, lastScore: 1 },
      "Deep dive": { taught: true, quizzed: true, lastScore: 0.8 },
    };
    const result = findNextSubtopic(items, prog);
    expect(result?.name).toBe("Summary");
  });

  it("preserves list order — returns first unquizzed not second", () => {
    const prog: ProgressMap = {
      "Deep dive": { taught: true, quizzed: true, lastScore: 0.9 },
    };
    // Intro is still unquizzed; it comes before Summary in the list
    const result = findNextSubtopic(items, prog);
    expect(result?.name).toBe("Intro");
  });
});

// ---------- allQuizzed ----------

describe("allQuizzed", () => {
  it("returns false for an empty items list", () => {
    expect(allQuizzed([], {})).toBe(false);
  });

  it("returns false when some items are not quizzed", () => {
    const prog: ProgressMap = {
      Intro: { taught: true, quizzed: true, lastScore: 1 },
    };
    expect(allQuizzed(items, prog)).toBe(false);
  });

  it("returns true when all items are quizzed", () => {
    const prog: ProgressMap = {
      Intro: { taught: true, quizzed: true, lastScore: 1 },
      "Deep dive": { taught: true, quizzed: true, lastScore: 0.8 },
      Summary: { taught: true, quizzed: true, lastScore: 0.7 },
    };
    expect(allQuizzed(items, prog)).toBe(true);
  });

  it("returns false when all entries exist but quizzed is false", () => {
    const prog: ProgressMap = {
      Intro: { taught: true, quizzed: false, lastScore: null },
      "Deep dive": { taught: true, quizzed: false, lastScore: null },
      Summary: { taught: true, quizzed: false, lastScore: null },
    };
    expect(allQuizzed(items, prog)).toBe(false);
  });
});
