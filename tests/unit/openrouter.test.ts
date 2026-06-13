import { describe, it, expect } from "vitest";
import { normalizeModel, rankModels } from "@/lib/openrouter";

describe("normalizeModel", () => {
  it("marks a model as free when both prices are '0'", () => {
    const m = normalizeModel({
      id: "vendor/model-free",
      name: "Free Model",
      context_length: 8192,
      pricing: { prompt: "0", completion: "0" },
    });
    expect(m.isFree).toBe(true);
    expect(m.promptPricePer1M).toBe(0);
    expect(m.completionPricePer1M).toBe(0);
  });

  it("marks a model as free when pricing is absent", () => {
    const m = normalizeModel({ id: "vendor/no-price" });
    expect(m.isFree).toBe(true);
  });

  it("marks a paid model correctly and converts per-token to per-1M", () => {
    const m = normalizeModel({
      id: "vendor/paid",
      name: "Paid Model",
      context_length: 128_000,
      // $0.000003 per token = $3.00 per 1M tokens
      pricing: { prompt: "0.000001", completion: "0.000003" },
    });
    expect(m.isFree).toBe(false);
    expect(m.completionPricePer1M).toBeCloseTo(3.0);
    expect(m.promptPricePer1M).toBeCloseTo(1.0);
    expect(m.contextLength).toBe(128_000);
  });

  it("uses the id as name when name is absent", () => {
    const m = normalizeModel({ id: "vendor/nameless" });
    expect(m.name).toBe("vendor/nameless");
  });
});

describe("rankModels", () => {
  const free1 = normalizeModel({ id: "a/free-small", context_length: 4096, pricing: { prompt: "0", completion: "0" } });
  const free2 = normalizeModel({ id: "a/free-large", context_length: 128_000, pricing: { prompt: "0", completion: "0" } });
  const cheap = normalizeModel({ id: "a/cheap", context_length: 8192, pricing: { prompt: "0.0000005", completion: "0.000001" } });
  const expensive = normalizeModel({ id: "a/expensive", context_length: 8192, pricing: { prompt: "0.000003", completion: "0.000006" } });

  it("puts free models before paid", () => {
    const ranked = rankModels([cheap, free1, expensive]);
    expect(ranked[0].isFree).toBe(true);
    expect(ranked[1].isFree).toBe(false);
  });

  it("within free models, orders by context length descending", () => {
    const ranked = rankModels([free1, free2]);
    expect(ranked[0].id).toBe("a/free-large");
    expect(ranked[1].id).toBe("a/free-small");
  });

  it("within paid models, orders by completion price ascending", () => {
    const ranked = rankModels([expensive, cheap]);
    expect(ranked[0].id).toBe("a/cheap");
    expect(ranked[1].id).toBe("a/expensive");
  });

  it("does not mutate the input array", () => {
    const original = [cheap, free1];
    rankModels(original);
    expect(original[0].id).toBe("a/cheap");
  });
});
