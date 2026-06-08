import { describe, it, expect } from "vitest";
import { chunkText } from "@/lib/chunk";

describe("chunkText", () => {
  it("returns a single chunk for short text", () => {
    const chunks = chunkText("A short paragraph.");
    expect(chunks).toEqual(["A short paragraph."]);
  });

  it("splits long multi-paragraph text into multiple chunks under/around the target", () => {
    const para = "word ".repeat(60).trim(); // ~300 chars
    const text = Array.from({ length: 6 }, () => para).join("\n\n");
    const chunks = chunkText(text, 400, 50);
    expect(chunks.length).toBeGreaterThan(1);
    // Every chunk should contain real content.
    expect(chunks.every((c) => c.trim().length > 0)).toBe(true);
  });

  it("ignores blank lines and trims", () => {
    const chunks = chunkText("\n\n  First.  \n\n\n  Second.  \n\n");
    expect(chunks).toEqual(["First.\n\nSecond."]);
  });

  it("returns an empty array for empty input", () => {
    expect(chunkText("")).toEqual([]);
    expect(chunkText("   \n  \n")).toEqual([]);
  });
});
