import { describe, it, expect } from "vitest";
import { resolveLlmConfig, localFallbackConfig } from "@/lib/llm";
import type { Student } from "@/db/schema";

function makeStudent(overrides: Partial<Student> = {}): Student {
  return {
    id: "test-id",
    name: "Test",
    color: "#6366f1",
    pinHash: null,
    isAdmin: false,
    pacePref: "normal",
    tonePref: "encouraging",
    themePref: "system",
    llmProvider: "local",
    openrouterApiKey: null,
    openrouterModel: null,
    createdAt: 0,
    lastActiveAt: 0,
    ...overrides,
  } as Student;
}

describe("resolveLlmConfig", () => {
  it("falls back to local Ollama when provider is 'local'", () => {
    const cfg = resolveLlmConfig(makeStudent({ llmProvider: "local" }));
    expect(cfg.provider).toBe("local");
    expect(cfg.apiKey).toBeUndefined();
  });

  it("falls back to local when provider is openrouter but key is missing", () => {
    const cfg = resolveLlmConfig(makeStudent({
      llmProvider: "openrouter",
      openrouterApiKey: null,
      openrouterModel: "some/model",
    }));
    expect(cfg.provider).toBe("local");
  });

  it("falls back to local when provider is openrouter but model is missing", () => {
    const cfg = resolveLlmConfig(makeStudent({
      llmProvider: "openrouter",
      openrouterApiKey: "sk-or-test",
      openrouterModel: null,
    }));
    expect(cfg.provider).toBe("local");
  });

  it("resolves to openrouter when provider, key, and model are all set", () => {
    const cfg = resolveLlmConfig(makeStudent({
      llmProvider: "openrouter",
      openrouterApiKey: "sk-or-test",
      openrouterModel: "google/gemma-3-27b-it:free",
    }));
    expect(cfg.provider).toBe("openrouter");
    expect(cfg.model).toBe("google/gemma-3-27b-it:free");
    expect(cfg.apiKey).toBe("sk-or-test");
  });
});

describe("localFallbackConfig", () => {
  it("always returns provider=local", () => {
    const cfg = localFallbackConfig();
    expect(cfg.provider).toBe("local");
    expect(cfg.model.length).toBeGreaterThan(0);
  });
});
