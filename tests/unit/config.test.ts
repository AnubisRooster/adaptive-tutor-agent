import { describe, it, expect } from "vitest";
import { ollamaHost, tutorModel, embedModel, databasePath } from "@/lib/config";

describe("config", () => {
  it("respects the OLLAMA_HOST set for tests", () => {
    expect(ollamaHost()).toContain("59999");
  });

  it("returns non-empty model names", () => {
    expect(tutorModel().length).toBeGreaterThan(0);
    expect(embedModel().length).toBeGreaterThan(0);
  });

  it("points the database at the test path", () => {
    expect(databasePath()).toContain("test.db");
  });
});
