import { describe, it, expect, beforeAll } from "vitest";
import crypto from "node:crypto";
import { db } from "@/db";
import { knowledgeChunks } from "@/db/schema";
import { retrieveContext, contextBlock } from "@/lib/rag";

beforeAll(() => {
  // Insert a couple of chunks (no embeddings) to exercise the fallback path.
  db.insert(knowledgeChunks)
    .values({
      id: crypto.randomUUID(),
      subjectId: "philosophy",
      topicId: "philosophy.logic",
      source: "test/logic.md",
      text: "An argument is valid if the conclusion must follow from the premises.",
      embedding: null,
      createdAt: Date.now(),
    })
    .run();
  db.insert(knowledgeChunks)
    .values({
      id: crypto.randomUUID(),
      subjectId: "philosophy",
      topicId: "philosophy.ethics",
      source: "test/ethics.md",
      text: "Consequentialism judges actions by their outcomes.",
      embedding: null,
      createdAt: Date.now(),
    })
    .run();
});

describe("retrieveContext (embeddings unavailable -> fallback)", () => {
  it("prefers chunks for the current topic when embeddings are missing", async () => {
    const results = await retrieveContext("philosophy", "philosophy.logic", "what is validity?", 4);
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results.every((r) => r.topicId === "philosophy.logic")).toBe(true);
    expect(results[0].text).toContain("valid");
  });

  it("returns an empty array for a subject with no chunks", async () => {
    const results = await retrieveContext("nonexistent-subject", null, "anything", 4);
    expect(results).toEqual([]);
  });
});

describe("contextBlock", () => {
  it("formats chunks with numbered citations and source", () => {
    const block = contextBlock([
      { text: "Hello world", source: "a.md", topicId: null, score: 0.9 },
      { text: "Second", source: "", topicId: null, score: 0.5 },
    ]);
    expect(block).toContain("[1] Hello world");
    expect(block).toContain("source: a.md");
    expect(block).toContain("[2] Second");
  });

  it("returns empty string for no chunks", () => {
    expect(contextBlock([])).toBe("");
  });
});
